async function mapRoutes(fastify, options) {
  
  // Main mapping endpoint
  fastify.post('/map', {
    schema: {
      body: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          depth: { type: 'integer', minimum: 1, maximum: 2, default: 1 },
          limit: { type: 'integer', minimum: 5, maximum: 50, default: 25 }
        },
        required: ['url']
      }
    }
  }, async (request, reply) => {
    try {
      const { url, depth = 1, limit = 25 } = request.body;
      
      // Parse artist name from input
      const rootArtistName = fastify.lastfm.parseArtistInput(url);
      
      if (!rootArtistName) {
        return reply.code(400).send({
          error: 'Invalid Input',
          message: 'Please provide a valid Last.fm URL or artist name'
        });
      }

      // Build the graph
      const graph = await buildArtistGraph(rootArtistName, depth, limit, fastify);
      
      return {
        success: true,
        rootArtist: rootArtistName,
        depth,
        limit,
        ...graph
      };
      
    } catch (error) {
      fastify.log.error(error);
      
      if (error.statusCode === 429) {
        return reply.code(429).send({
          error: 'Rate Limit Exceeded',
          message: 'Too many requests to Last.fm API. Please wait a moment and try again.'
        });
      }
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          error: 'Artist Not Found',
          message: `Could not find artist "${request.body.url}". Please check the spelling and try again.`
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to build artist map'
      });
    }
  });

  // Expand node endpoint for adding similar artists to existing graph
  fastify.post('/expand', {
    schema: {
      body: {
        type: 'object',
        properties: {
          artistName: { type: 'string' },
          limit: { type: 'integer', minimum: 5, maximum: 50, default: 25 }
        },
        required: ['artistName']
      }
    }
  }, async (request, reply) => {
    try {
      const { artistName, limit = 25 } = request.body;
      
      // Get similar artists for expansion
      const [similarData, artistInfo] = await Promise.all([
        fastify.lastfm.getSimilarArtists(artistName, limit, fastify),
        fastify.lastfm.getArtistInfo(artistName, fastify)
      ]);

      // Get detailed info for each similar artist
      const artistInfoPromises = similarData.similar.map(artist =>
        fastify.lastfm.getArtistInfo(artist.name, fastify)
          .catch(err => ({ name: artist.name, error: true }))
      );
      
      const artistInfos = await Promise.all(artistInfoPromises);
      
      // Build nodes and edges
      const nodes = [];
      const edges = [];
      
      // Add the center artist if not already present
      nodes.push(createArtistNode(artistInfo, true));
      
      // Add similar artists as nodes
      similarData.similar.forEach((similar, index) => {
        const info = artistInfos[index];
        if (!info.error) {
          nodes.push(createArtistNode(info, false));
          edges.push({
            id: `${artistName}->${similar.name}`,
            source: artistName,
            target: similar.name,
            match: similar.match,
            weight: similar.match
          });
        }
      });
      
      return {
        success: true,
        artist: artistName,
        nodes,
        edges
      };
      
    } catch (error) {
      fastify.log.error(error);
      
      if (error.statusCode === 429) {
        return reply.code(429).send({
          error: 'Rate Limit Exceeded', 
          message: 'Too many requests to Last.fm API. Please wait a moment and try again.'
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to expand artist node'
      });
    }
  });
}

// SIMPLE VERSION - ONLY ROOT + DIRECT CONNECTIONS
async function buildArtistGraph(rootArtistName, depth, limit, fastify) {
  console.log(`🔧 Building ${depth}-hop graph for "${rootArtistName}" with limit ${limit}`);
  
  // Get root artist info and similar artists
  const [rootInfo, rootSimilar] = await Promise.all([
    fastify.lastfm.getArtistInfo(rootArtistName, fastify),
    fastify.lastfm.getSimilarArtists(rootArtistName, limit, fastify)
  ]);
  
  // Start with ONLY the root node
  const nodes = [createArtistNode(rootInfo, true)];
  const edges = [];
  
  console.log(`📍 Root: ${rootInfo.name}`);
  console.log(`🎯 Found ${rootSimilar.similar.length} similar artists`);
  
  // SIMPLE RULE: Only add nodes that connect DIRECTLY to root
  for (const similar of rootSimilar.similar.slice(0, limit)) {
    try {
      console.log(`⏳ Processing: ${similar.name}...`);
      const artistInfo = await fastify.lastfm.getArtistInfo(similar.name, fastify);
      
      // Skip if same as root
      if (artistInfo.name === rootInfo.name) {
        console.log(`⚠️ Skipped: ${similar.name} (same as root)`);
        continue;
      }
      
      // Add node
      nodes.push(createArtistNode(artistInfo, false));
      
      // Add edge to root - GUARANTEED CONNECTION
      edges.push({
        id: `${rootInfo.name}->${artistInfo.name}`,
        source: rootInfo.name,
        target: artistInfo.name,
        match: similar.match,
        weight: similar.match
      });
      
      console.log(`✅ CONNECTED: ${rootInfo.name} → ${artistInfo.name} (${similar.match})`);
      
    } catch (error) {
      console.warn(`⚠️ Failed to add ${similar.name}: ${error.message}`);
    }
  }
  
  // For 2-hop, add NEW artists similar to 1-hop artists
  if (depth > 1) {
    console.log(`🔄 Adding 2nd hop - NEW artists similar to 1-hop artists...`);
    const firstHopArtists = nodes.filter(n => !n.isRoot).slice(0, 8); // Limit to prevent explosion
    const existingNames = new Set(nodes.map(n => n.name));
    
    for (const sourceNode of firstHopArtists) {
      try {
        console.log(`🔍 Finding artists similar to ${sourceNode.name}...`);
        const similarData = await fastify.lastfm.getSimilarArtists(sourceNode.name, 5, fastify);
        
        for (const similar of similarData.similar.slice(0, 2)) { // Limit 2nd hop
          try {
            // Skip if root, existing, or same as source
            if (similar.name === rootInfo.name || existingNames.has(similar.name) || similar.name === sourceNode.name) {
              console.log(`⚠️ Skipped ${similar.name} - already exists or is root`);
              continue;
            }
            
            // Add NEW 2-hop artist
            console.log(`⏳ Adding NEW 2-hop artist: ${similar.name}...`);
            const artistInfo = await fastify.lastfm.getArtistInfo(similar.name, fastify);
            
            // Add the new node
            nodes.push(createArtistNode(artistInfo, false));
            existingNames.add(artistInfo.name);
            
            // Connect NEW artist to its 1-hop parent
            edges.push({
              id: `${sourceNode.name}->${artistInfo.name}`,
              source: sourceNode.name,
              target: artistInfo.name,
              match: similar.match,
              weight: similar.match
            });
            
            console.log(`✅ 2ND HOP (NEW): ${sourceNode.name} → ${artistInfo.name} (${similar.match})`);
            
          } catch (error) {
            console.warn(`⚠️ Failed to add 2nd hop ${similar.name}: ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get similar artists for ${sourceNode.name}: ${error.message}`);
      }
    }
  }
  
  console.log(`🎯 SIMPLE RESULT: ${nodes.length} nodes, ${edges.length} edges`);
  console.log(`📊 Every node (except root) has exactly 1+ edges to root!`);
  
  return {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      rootArtist: rootInfo.name
    }
  };
}

// Helper function to create a standardized artist node
function createArtistNode(artistInfo, isRoot = false) {
  // Determine primary genre from tags
  const primaryGenre = artistInfo.tags?.[0] || 'unknown';
  
  // Calculate node size based on listeners (log scale)
  const minSize = 20;
  const maxSize = 60;
  const listeners = artistInfo.listeners || 1;
  const size = Math.min(maxSize, minSize + Math.log10(listeners) * 5);
  
  return {
    id: artistInfo.name,
    name: artistInfo.name,
    listeners: artistInfo.listeners,
    playcount: artistInfo.playcount,
    url: artistInfo.url,
    image: artistInfo.image,
    bio: artistInfo.bio,
    tags: artistInfo.tags || [],
    primaryGenre,
    size,
    isRoot,
    // Cytoscape.js specific properties
    data: {
      id: artistInfo.name,
      name: artistInfo.name,
      listeners: artistInfo.listeners,
      tags: artistInfo.tags || [],
      primaryGenre,
      size,
      isRoot
    }
  };
}

module.exports = mapRoutes; 