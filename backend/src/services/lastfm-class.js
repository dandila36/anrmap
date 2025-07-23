const axios = require('axios');
const NodeCache = require('node-cache');

// Fallback in-memory cache if Redis is not available
const memoryCache = new NodeCache({ stdTTL: 86400 }); // 24 hours

class LastFmService {
  constructor() {
    console.log('🎵 Creating Last.fm service...');
    console.log('API Key available:', !!process.env.LASTFM_API_KEY);
    
    if (!process.env.LASTFM_API_KEY) {
      console.error('❌ LASTFM_API_KEY not found in environment');
      throw new Error('LASTFM_API_KEY is required');
    }
    
    this.apiKey = process.env.LASTFM_API_KEY;
    this.baseUrl = 'https://ws.audioscrobbler.com/2.0/';
    this.requestQueue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // 5 requests per second max
    
    console.log('✅ Last.fm service created successfully');
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
      if (fastify && fastify.redis) {
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
      if (fastify && fastify.redis) {
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
}

module.exports = LastFmService; 