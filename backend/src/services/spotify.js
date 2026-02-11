const axios = require('axios');

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    this.baseUrl = 'https://api.spotify.com/v1';
    this.authUrl = 'https://accounts.spotify.com';
    this.accessToken = null;
    this.tokenExpiry = null;
    this.requestQueue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 600; // 600ms between requests = ~100 requests per minute
  }

  // Get client credentials access token (for public API calls)
  async getClientCredentialsToken() {
    try {
      const response = await axios.post(`${this.authUrl}/api/token`, 
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Spotify client credentials token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  // Ensure we have a valid access token
  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.getClientCredentialsToken();
    }
    return this.accessToken;
  }

  // Rate-limited request method
  async makeRateLimitedRequest(url, config = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, config, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        );
      }

      const { url, config, resolve, reject } = this.requestQueue.shift();

      try {
        await this.ensureValidToken();
        const response = await axios.get(url, {
          ...config,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            ...config.headers
          }
        });

        this.lastRequestTime = Date.now();
        resolve(response.data);
      } catch (error) {
        if (error.response?.status === 429) {
          // If rate limited, wait longer and retry
          console.log('Rate limited, waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          this.requestQueue.unshift({ url, config, resolve, reject }); // Put back at front
        } else {
          reject(error);
        }
      }
    }

    this.processing = false;
  }

  // Search for an artist on Spotify
  async searchArtist(artistName, limit = 1) {
    try {
      const response = await this.makeRateLimitedRequest(`${this.baseUrl}/search`, {
        params: {
          q: artistName,
          type: 'artist',
          limit: limit
        }
      });

      return response.artists.items;
    } catch (error) {
      console.error(`Failed to search for artist ${artistName}:`, error.response?.data || error.message);
      return [];
    }
  }

  // Get artist's top tracks (most popular)
  async getArtistTopTracks(spotifyArtistId, market = 'US') {
    try {
      const response = await this.makeRateLimitedRequest(`${this.baseUrl}/artists/${spotifyArtistId}/top-tracks`, {
        params: {
          market: market
        }
      });

      return response.tracks;
    } catch (error) {
      console.error(`Failed to get top tracks for artist ${spotifyArtistId}:`, error.response?.data || error.message);
      return [];
    }
  }

  // Get artist's albums sorted by release date (for finding most recent tracks)
  async getArtistAlbums(spotifyArtistId, market = 'US', limit = 20) {
    try {
      const response = await this.makeRateLimitedRequest(`${this.baseUrl}/artists/${spotifyArtistId}/albums`, {
        params: {
          include_groups: 'album,single',
          market: market,
          limit: limit
        }
      });

      // Sort by release date (newest first)
      const albums = response.items.sort((a, b) => {
        const dateA = new Date(a.release_date);
        const dateB = new Date(b.release_date);
        return dateB.getTime() - dateA.getTime();
      });

      return albums;
    } catch (error) {
      console.error(`Failed to get albums for artist ${spotifyArtistId}:`, error.response?.data || error.message);
      return [];
    }
  }

  // Get tracks from an album
  async getAlbumTracks(albumId) {
    try {
      const response = await this.makeRateLimitedRequest(`${this.baseUrl}/albums/${albumId}/tracks`);
      return response.items;
    } catch (error) {
      console.error(`Failed to get tracks for album ${albumId}:`, error.response?.data || error.message);
      return [];
    }
  }

  // Get artist's most recent track
  async getArtistMostRecentTrack(spotifyArtistId, market = 'US') {
    try {
      const albums = await this.getArtistAlbums(spotifyArtistId, market, 10);
      
      // Look through recent albums/singles to find the newest track
      for (const album of albums) {
        const tracks = await this.getAlbumTracks(album.id);
        if (tracks.length > 0) {
          // Return the first track from the most recent release
          return {
            ...tracks[0],
            album: album,
            release_date: album.release_date
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get most recent track for artist ${spotifyArtistId}:`, error.message);
      return null;
    }
  }

  // Create a Spotify authorization URL for user login
  generateAuthUrl(state = '') {
    const scopes = [
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: this.redirectUri,
      state: state
    });

    return `${this.authUrl}/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(`${this.authUrl}/api/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to exchange code for token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  // Create a playlist
  async createPlaylist(accessToken, userId, name, description = '', isPublic = true) {
    try {
      const response = await axios.post(`${this.baseUrl}/users/${userId}/playlists`,
        {
          name: name,
          description: description,
          public: isPublic
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to create playlist:', error.response?.data || error.message);
      throw new Error('Failed to create Spotify playlist');
    }
  }

  // Add tracks to a playlist
  async addTracksToPlaylist(accessToken, playlistId, trackUris) {
    try {
      // Spotify allows max 100 tracks per request
      const chunks = [];
      for (let i = 0; i < trackUris.length; i += 100) {
        chunks.push(trackUris.slice(i, i + 100));
      }

      const results = [];
      for (const chunk of chunks) {
        const response = await axios.post(`${this.baseUrl}/playlists/${playlistId}/tracks`,
          {
            uris: chunk
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        results.push(response.data);
      }

      return results;
    } catch (error) {
      console.error('Failed to add tracks to playlist:', error.response?.data || error.message);
      throw new Error('Failed to add tracks to Spotify playlist');
    }
  }

  // Get user's profile
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error.response?.data || error.message);
      throw new Error('Failed to get Spotify user profile');
    }
  }

  // Get the "correct" Spotify URL for an artist
  async getArtistSpotifyUrl(artistName) {
    const artists = await this.searchArtist(artistName, 1);
    if (artists.length > 0) {
      return artists[0].external_urls.spotify;
    }
    // Fallback to search URL
    return `https://open.spotify.com/search/${encodeURIComponent(artistName)}`;
  }

  // Get artist image from Spotify
  async getArtistImage(artistName) {
    const artists = await this.searchArtist(artistName, 1);
    if (artists.length > 0 && artists[0].images.length > 0) {
      // Return the largest image (usually the first one)
      return artists[0].images[0].url;
    }
    return null;
  }
}

module.exports = SpotifyService;