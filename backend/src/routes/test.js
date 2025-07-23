async function testRoutes(fastify, options) {
  
  // Test Last.fm API integration
  fastify.get('/test/lastfm', async (request, reply) => {
    try {
      // Check if the service is available
      if (!fastify.lastfm) {
        return reply.code(500).send({
          error: 'Service Not Available',
          message: 'Last.fm service not registered'
        });
      }

      // Test parsing input
      const testArtist = 'Billie Eilish';
      const parsed = fastify.lastfm.parseArtistInput(testArtist);
      
      fastify.log.info(`Parsed artist: ${parsed}`);

      // Test getting artist info
      const artistInfo = await fastify.lastfm.getArtistInfo(parsed, fastify);
      
      fastify.log.info(`Artist info: ${JSON.stringify(artistInfo)}`);
      
      return {
        success: true,
        parsed,
        artistInfo
      };
      
    } catch (error) {
      fastify.log.error('Test error:', error);
      
      return reply.code(500).send({
        error: 'Test Failed',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Test environment variables
  fastify.get('/test/env', async (request, reply) => {
    return {
      hasApiKey: !!process.env.LASTFM_API_KEY,
      hasSecret: !!process.env.LASTFM_SHARED_SECRET,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    };
  });
}

module.exports = testRoutes; 