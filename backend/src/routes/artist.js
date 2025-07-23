async function artistRoutes(fastify, options) {
  
  // Get individual artist information
  fastify.get('/artist/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    try {
      const artistName = decodeURIComponent(request.params.id);
      
      // Get comprehensive artist information
      const [artistInfo, similarData] = await Promise.all([
        fastify.lastfm.getArtistInfo(artistName, fastify),
        fastify.lastfm.getSimilarArtists(artistName, 10, fastify)
      ]);
      
      return {
        success: true,
        artist: {
          ...artistInfo,
          similar: similarData.similar
        }
      };
      
    } catch (error) {
      fastify.log.error(error);
      
      if (error.statusCode === 429) {
        return reply.code(429).send({
          error: 'Rate Limit Exceeded',
          message: 'Too many requests to Last.fm API'
        });
      }
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          error: 'Artist Not Found',
          message: `Artist "${request.params.id}" not found`
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch artist information'
      });
    }
  });

  // Search for artists (autocomplete)
  fastify.get('/search', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 30, default: 10 }
        },
        required: ['q']
      }
    }
  }, async (request, reply) => {
    try {
      const { q, limit = 10 } = request.query;
      
      // Use Last.fm artist search
      const response = await fastify.lastfm.makeRequest({
        method: 'artist.search',
        artist: q,
        limit: limit
      });
      
      if (response.error) {
        throw new Error(response.message || 'Search failed');
      }
      
      const artists = response.results?.artistmatches?.artist || [];
      const results = (Array.isArray(artists) ? artists : [artists]).map(artist => ({
        name: artist.name,
        listeners: parseInt(artist.listeners || 0),
        url: artist.url,
        image: artist.image?.[1]?.['#text'] || ''
      }));
      
      return {
        success: true,
        query: q,
        results
      };
      
    } catch (error) {
      fastify.log.error(error);
      
      if (error.statusCode === 429) {
        return reply.code(429).send({
          error: 'Rate Limit Exceeded',
          message: 'Too many requests to Last.fm API'
        });
      }
      
      return reply.code(500).send({
        error: 'Search Failed',
        message: 'Failed to search for artists'
      });
    }
  });
}

module.exports = artistRoutes; 