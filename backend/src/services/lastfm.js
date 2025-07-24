const axios = require('axios');
const NodeCache = require('node-cache');

// Fallback in-memory cache if Redis is not available
const memoryCache = new NodeCache({ stdTTL: 86400 }); // 24 hours

class LastFmService {
  constructor() {
    this.apiKey = process.env.LASTFM_API_KEY;
    this.baseUrl = 'https://ws.audioscrobbler.com/2.0/';
    this.requestQueue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // 5 requests per second max
  }

  async makeRequest(params) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ params, resolve, reject });
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

      const { params, resolve, reject } = this.requestQueue.shift();

      try {
        const response = await axios.get(this.baseUrl, {
          params: {
            ...params,
            api_key: this.apiKey,
            format: 'json'
          },
          timeout: 10000
        });

        this.lastRequestTime = Date.now();
        resolve(response.data);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  async getFromCache(key, fastify) {
    try {
      if (fastify.redis) {
        const cached = await fastify.redis.get(key);
        return cached ? JSON.parse(cached) : null;
      } else {
        return memoryCache.get(key) || null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setCache(key, data, fastify, ttl = 86400) {
    try {
      if (fastify.redis) {
        await fastify.redis.setex(key, ttl, JSON.stringify(data));
      } else {
        memoryCache.set(key, data, ttl);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  parseArtistInput(input) {
    // Handle Last.fm URLs
    const urlMatch = input.match(/last\.fm\/music\/([^/?]+)/i);
    if (urlMatch) {
      return decodeURIComponent(urlMatch[1]).replace(/\+/g, ' ');
    }
    
    // Return plain artist name
    return input.trim();
  }

  async getSimilarArtists(artistName, limit = 25, fastify) {
    const cacheKey = `similar:${artistName.toLowerCase()}:${limit}`;
    
    // Try cache first
    const cached = await this.getFromCache(cacheKey, fastify);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.makeRequest({
        method: 'artist.getsimilar',
        artist: artistName,
        limit: Math.min(limit, 100),
        autocorrect: 1
      });

      if (data.error) {
        throw new Error(data.message || 'Last.fm API error');
      }

      const similar = data.similarartists?.artist || [];
      const result = {
        artist: artistName,
        similar: similar.map(artist => ({
          name: artist.name,
          mbid: artist.mbid,
          match: parseFloat(artist.match),
          url: artist.url,
          image: artist.image?.[2]?.['#text'] || ''
        }))
      };

      // Cache for 24 hours
      await this.setCache(cacheKey, result, fastify);
      
      return result;
    } catch (error) {
      if (error.response?.status === 429) {
        throw { statusCode: 429, message: 'Rate limit exceeded' };
      }
      throw new Error(`Failed to fetch similar artists: ${error.message}`);
    }
  }

  async getArtistInfo(artistName, fastify) {
    const cacheKey = `info:${artistName.toLowerCase()}`;
    
    // Try cache first
    const cached = await this.getFromCache(cacheKey, fastify);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.makeRequest({
        method: 'artist.getinfo',
        artist: artistName,
        autocorrect: 1
      });

      if (data.error) {
        throw new Error(data.message || 'Last.fm API error');
      }

      const artist = data.artist;
      const result = {
        name: artist.name,
        mbid: artist.mbid,
        listeners: parseInt(artist.stats?.listeners || 0),
        playcount: parseInt(artist.stats?.playcount || 0),
        url: artist.url,
        image: artist.image?.[3]?.['#text'] || '',
        bio: artist.bio?.summary || '',
        tags: artist.tags?.tag?.slice(0, 5).map(tag => tag.name) || []
      };

      // Cache for 24 hours
      await this.setCache(cacheKey, result, fastify);
      
      return result;
    } catch (error) {
      if (error.response?.status === 429) {
        throw { statusCode: 429, message: 'Rate limit exceeded' };
      }
      throw new Error(`Failed to fetch artist info: ${error.message}`);
    }
  }

  async getArtistTopTracks(artistName, limit = 5, fastify) {
    const cacheKey = `toptracks:${artistName.toLowerCase()}:${limit}`;
    
    // Try cache first
    const cached = await this.getFromCache(cacheKey, fastify);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.makeRequest({
        method: 'artist.gettoptracks',
        artist: artistName,
        limit: Math.min(limit, 50),
        autocorrect: 1
      });

      if (data.error) {
        throw new Error(data.message || 'Last.fm API error');
      }

      const tracks = data.toptracks?.track || [];
      const result = (Array.isArray(tracks) ? tracks : [tracks]).slice(0, limit).map(track => ({
        name: track.name,
        playcount: parseInt(track.playcount || 0),
        listeners: parseInt(track.listeners || 0),
        url: track.url,
        mbid: track.mbid,
        image: track.image?.[2]?.['#text'] || ''
      }));

      // Cache for 24 hours
      await this.setCache(cacheKey, result, fastify);
      
      return result;
    } catch (error) {
      if (error.response?.status === 429) {
        throw { statusCode: 429, message: 'Rate limit exceeded' };
      }
      throw new Error(`Failed to fetch top tracks: ${error.message}`);
    }
  }

  async getArtistTopAlbums(artistName, limit = 3, fastify) {
    const cacheKey = `topalbums:${artistName.toLowerCase()}:${limit}`;
    
    // Try cache first
    const cached = await this.getFromCache(cacheKey, fastify);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.makeRequest({
        method: 'artist.gettopalbums',
        artist: artistName,
        limit: Math.min(limit, 50),
        autocorrect: 1
      });

      if (data.error) {
        throw new Error(data.message || 'Last.fm API error');
      }

      const albums = data.topalbums?.album || [];
      const result = (Array.isArray(albums) ? albums : [albums]).slice(0, limit).map(album => ({
        name: album.name,
        playcount: parseInt(album.playcount || 0),
        url: album.url,
        mbid: album.mbid,
        image: album.image?.[2]?.['#text'] || ''
      }));

      // Cache for 24 hours
      await this.setCache(cacheKey, result, fastify);
      
      return result;
    } catch (error) {
      if (error.response?.status === 429) {
        throw { statusCode: 429, message: 'Rate limit exceeded' };
      }
      throw new Error(`Failed to fetch top albums: ${error.message}`);
    }
  }
}

// Register as Fastify plugin
async function lastFmPlugin(fastify, options) {
  console.log('🎵 Registering Last.fm service...');
  console.log('API Key available:', !!process.env.LASTFM_API_KEY);
  
  if (!process.env.LASTFM_API_KEY) {
    console.error('❌ LASTFM_API_KEY not found in environment');
    throw new Error('LASTFM_API_KEY is required');
  }
  
  const lastFmService = new LastFmService();
  fastify.decorate('lastfm', lastFmService);
  console.log('✅ Last.fm service registered successfully');
}

// Add plugin metadata to ensure proper registration
lastFmPlugin[Symbol.for('skip-override')] = true;
lastFmPlugin[Symbol.for('plugin-meta')] = {
  name: 'lastfm-service'
};

module.exports = lastFmPlugin; 