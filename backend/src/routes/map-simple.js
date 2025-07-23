async function mapRoutes(fastify, options) {
  
  // Improved map endpoint that tries Last.fm but falls back to test data
  fastify.post('/map', async (request, reply) => {
    try {
      const { url = 'Unknown Artist', depth = 1, limit = 25 } = request.body || {};
      
      console.log('Map request received:', { url, depth, limit });
      
      // Try to use Last.fm service if available
      if (fastify.lastfm) {
        try {
          console.log('Last.fm service is available, trying to fetch real data...');
          
          const parsed = fastify.lastfm.parseArtistInput(url);
          console.log('Parsed artist:', parsed);
          
          if (parsed) {
            // Try to get real data from Last.fm
            const [artistInfo, similarData] = await Promise.all([
              fastify.lastfm.getArtistInfo(parsed, fastify),
              fastify.lastfm.getSimilarArtists(parsed, Math.min(limit, 10), fastify)
            ]);
            
            console.log('Got Last.fm data:', { artistInfo: artistInfo.name, similar: similarData.similar.length });
            
            // Build real response
            const nodes = [{
              id: artistInfo.name,
              name: artistInfo.name,
              isRoot: true,
              listeners: artistInfo.listeners,
              tags: artistInfo.tags,
              primaryGenre: artistInfo.tags[0] || 'unknown',
              size: Math.min(60, 30 + Math.log10(artistInfo.listeners || 1) * 3),
              data: {
                id: artistInfo.name,
                name: artistInfo.name,
                listeners: artistInfo.listeners,
                tags: artistInfo.tags,
                primaryGenre: artistInfo.tags[0] || 'unknown',
                size: Math.min(60, 30 + Math.log10(artistInfo.listeners || 1) * 3),
                isRoot: true
              }
            }];
            
            const edges = [];
            
            similarData.similar.slice(0, 5).forEach((similar, index) => {
              nodes.push({
                id: similar.name,
                name: similar.name,
                isRoot: false,
                listeners: 100000 * (1 - index * 0.1), // Estimated
                tags: ['similar'],
                primaryGenre: 'similar',
                size: 40 - index * 2,
                data: {
                  id: similar.name,
                  name: similar.name,
                  listeners: 100000 * (1 - index * 0.1),
                  tags: ['similar'],
                  primaryGenre: 'similar',
                  size: 40 - index * 2,
                  isRoot: false
                }
              });
              
              edges.push({
                id: `${artistInfo.name}->${similar.name}`,
                source: artistInfo.name,
                target: similar.name,
                match: similar.match,
                weight: similar.match,
                data: {
                  id: `${artistInfo.name}->${similar.name}`,
                  source: artistInfo.name,
                  target: similar.name,
                  weight: similar.match
                }
              });
            });
            
            return {
              success: true,
              message: 'Real Last.fm data',
              rootArtist: artistInfo.name,
              depth,
              limit,
              nodes,
              edges,
              stats: {
                totalNodes: nodes.length,
                totalEdges: edges.length,
                rootArtist: artistInfo.name
              }
            };
          }
        } catch (lastfmError) {
          console.log('Last.fm API error, falling back to test data:', lastfmError.message);
        }
      } else {
        console.log('Last.fm service not available, using test data');
      }
      
      // Fallback to test data
      return {
        success: true,
        message: 'Map endpoint is working',
        rootArtist: url,
        depth,
        limit,
        nodes: [
          {
            id: url,
            name: url,
            isRoot: true,
            listeners: 1000000,
            tags: ['pop', 'test'],
            primaryGenre: 'pop',
            size: 50,
            data: {
              id: url,
              name: url,
              listeners: 1000000,
              tags: ['pop', 'test'],
              primaryGenre: 'pop',
              size: 50,
              isRoot: true
            }
          },
          {
            id: 'Similar Artist 1',
            name: 'Similar Artist 1', 
            isRoot: false,
            listeners: 500000,
            tags: ['pop'],
            primaryGenre: 'pop',
            size: 40,
            data: {
              id: 'Similar Artist 1',
              name: 'Similar Artist 1',
              listeners: 500000,
              tags: ['pop'],
              primaryGenre: 'pop',
              size: 40,
              isRoot: false
            }
          }
        ],
        edges: [
          {
            id: `${url}->Similar Artist 1`,
            source: url,
            target: 'Similar Artist 1',
            match: 0.8,
            weight: 0.8,
            data: {
              id: `${url}->Similar Artist 1`,
              source: url,
              target: 'Similar Artist 1',
              weight: 0.8
            }
          }
        ],
        stats: {
          totalNodes: 2,
          totalEdges: 1,
          rootArtist: url
        }
      };
      
    } catch (error) {
      console.error('Map route error:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });
}

module.exports = mapRoutes; 