async function spotifyRoutes(fastify, options) {
  const SpotifyService = require('../services/spotify');
  const spotifyService = new SpotifyService();

  // Get Spotify authorization URL
  fastify.get('/auth', async (request, reply) => {
    try {
      if (!process.env.SPOTIFY_CLIENT_ID) {
        return reply.code(400).send({
          error: 'Spotify Not Configured',
          message: 'Spotify integration is not configured. Please add your Spotify API credentials.'
        });
      }

      const state = Math.random().toString(36).substring(2, 15);
      const authUrl = spotifyService.generateAuthUrl(state);
      
      return {
        success: true,
        authUrl: authUrl,
        state: state
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Auth Error',
        message: 'Failed to generate Spotify authorization URL'
      });
    }
  });

  // Handle Spotify OAuth callback
  fastify.get('/callback', async (request, reply) => {
    try {
      const { code, state, error } = request.query;

      if (error) {
        return reply.code(400).send({
          error: 'Authorization Failed',
          message: `Spotify authorization failed: ${error}`
        });
      }

      if (!code) {
        return reply.code(400).send({
          error: 'Missing Code',
          message: 'Authorization code is required'
        });
      }

      const tokenData = await spotifyService.exchangeCodeForToken(code);
      
      // In a real app, you'd store this token securely
      // For now, we'll redirect with the token (not recommended for production)
      const frontendUrl = process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL || 'https://nodemap.vercel.app'
        : 'http://localhost:5173';
      
      const redirectUrl = `${frontendUrl}?spotify_token=${tokenData.access_token}`;
      return reply.redirect(redirectUrl);
      
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Callback Error',
        message: 'Failed to handle Spotify callback'
      });
    }
  });

  // Create playlist from artist list
  fastify.post('/create-playlist', {
    schema: {
      body: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          artists: { 
            type: 'array',
            items: { type: 'string' }
          },
          playlistName: { type: 'string' },
          trackType: { type: 'string', enum: ['popular', 'recent'], default: 'popular' }
        },
        required: ['accessToken', 'artists']
      }
    }
  }, async (request, reply) => {
    try {
      const { accessToken, artists, playlistName, trackType = 'popular' } = request.body;

      // Get user profile
      const userProfile = await spotifyService.getUserProfile(accessToken);
      
      // Generate playlist name if not provided
      const currentDate = new Date();
      const timestamp = currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const trackTypeLabel = trackType === 'recent' ? 'Latest' : 'Popular';
      const finalPlaylistName = playlistName || `AnR Map (${trackTypeLabel}) - ${timestamp}`;
      const description = `Curated playlist with ${trackType === 'recent' ? 'latest releases' : 'popular tracks'} based on Last.fm artist network analysis. Generated on ${timestamp}.`;

      // Create the playlist
      const playlist = await spotifyService.createPlaylist(
        accessToken,
        userProfile.id,
        finalPlaylistName,
        description,
        true
      );

      // Process artists in smaller batches to avoid rate limits
      const batchSize = 5; // Process 5 artists at a time
      const validTracks = [];
      
      console.log(`Processing ${artists.length} artists in batches of ${batchSize}...`);
      
      for (let i = 0; i < artists.length; i += batchSize) {
        const batch = artists.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(artists.length/batchSize)}: ${batch.join(', ')}`);
        
        const batchPromises = batch.map(async (artistName) => {
          try {
            const searchResults = await spotifyService.searchArtist(artistName, 1);
            if (searchResults.length > 0) {
              const spotifyArtist = searchResults[0];
              
              let track = null;
              if (trackType === 'recent') {
                track = await spotifyService.getArtistMostRecentTrack(spotifyArtist.id);
              } else {
                const topTracks = await spotifyService.getArtistTopTracks(spotifyArtist.id);
                track = topTracks.length > 0 ? topTracks[0] : null;
              }
              
              if (track) {
                return {
                  artist: artistName,
                  track: track,
                  uri: track.uri,
                  trackType: trackType,
                  releaseDate: track.release_date || track.album?.release_date
                };
              }
            }
            return null;
          } catch (error) {
            console.warn(`Failed to get ${trackType} track for ${artistName}:`, error.message);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const batchValidTracks = batchResults.filter(result => result !== null);
        validTracks.push(...batchValidTracks);
        
        // Small delay between batches
        if (i + batchSize < artists.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const trackUris = validTracks.map(result => result.uri);
      console.log(`Successfully found ${trackUris.length} tracks out of ${artists.length} artists`);

      // Add tracks to playlist
      if (trackUris.length > 0) {
        await spotifyService.addTracksToPlaylist(accessToken, playlist.id, trackUris);
      }

      return {
        success: true,
        playlist: {
          id: playlist.id,
          name: playlist.name,
          url: playlist.external_urls.spotify,
          tracksAdded: trackUris.length,
          totalArtists: artists.length,
          trackType: trackType
        },
        tracks: validTracks.map(t => ({
          artist: t.artist,
          trackName: t.track.name,
          trackUrl: t.track.external_urls?.spotify || t.track.uri,
          releaseDate: t.releaseDate,
          trackType: t.trackType
        }))
      };

    } catch (error) {
      fastify.log.error(error);
      
      if (error.message.includes('Invalid access token')) {
        return reply.code(401).send({
          error: 'Invalid Token',
          message: 'Spotify access token is invalid or expired'
        });
      }
      
      return reply.code(500).send({
        error: 'Playlist Creation Failed',
        message: error.message || 'Failed to create Spotify playlist'
      });
    }
  });

  // Get correct Spotify URL for an artist
  fastify.get('/artist-url/:artistName', async (request, reply) => {
    try {
      const artistName = decodeURIComponent(request.params.artistName);
      const spotifyUrl = await spotifyService.getArtistSpotifyUrl(artistName);
      
      return {
        success: true,
        artist: artistName,
        spotifyUrl: spotifyUrl
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'URL Lookup Failed',
        message: 'Failed to get Spotify URL for artist'
      });
    }
  });

  // Get artist image from Spotify
  fastify.get('/artist-image/:artistName', async (request, reply) => {
    try {
      const artistName = decodeURIComponent(request.params.artistName);
      const imageUrl = await spotifyService.getArtistImage(artistName);
      
      return {
        success: true,
        artist: artistName,
        imageUrl: imageUrl
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Image Lookup Failed',
        message: 'Failed to get Spotify image for artist'
      });
    }
  });
}

module.exports = spotifyRoutes;