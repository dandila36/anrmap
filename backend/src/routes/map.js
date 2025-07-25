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
      
      if (error.message.includes('timeout')) {
        return reply.code(504).send({
          error: 'Request Timeout',
          message: 'Last.fm API is responding slowly. Please try again in a moment.'
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
        message: 'Failed to build artist map. Please try again.'
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
      nodes.push(createArtistNode(artistInfo, true, 0));
      
      // Add similar artists as nodes
      similarData.similar.forEach((similar, index) => {
        const info = artistInfos[index];
        if (!info.error) {
          nodes.push(createArtistNode(info, false, 1));
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

// OPTIMIZED VERSION - PARALLEL PROCESSING + ROOT-RELATIVE SIMILARITY
async function buildArtistGraph(rootArtistName, depth, limit, fastify) {
  console.log(`🔧 Building ${depth}-hop graph for "${rootArtistName}" with limit ${limit}`);
  
  // Get root artist info and similar artists (larger list for 2nd hop lookups)
  const extendedLimit = depth > 1 ? Math.min(100, limit * 4) : limit;
  const [rootInfo, rootSimilar] = await Promise.all([
    fastify.lastfm.getArtistInfo(rootArtistName, fastify),
    fastify.lastfm.getSimilarArtists(rootArtistName, extendedLimit, fastify)
  ]);
  
  // Create similarity lookup map for root artist
  const rootSimilarityMap = new Map();
  rootSimilar.similar.forEach(similar => {
    rootSimilarityMap.set(similar.name.toLowerCase(), similar.match);
  });
  
  // Start with ONLY the root node
  const nodes = [createArtistNode(rootInfo, true, 0)];
  const edges = [];
  
  console.log(`📍 Root: ${rootInfo.name}`);
  console.log(`🎯 Found ${rootSimilar.similar.length} similar artists`);
  
  // PARALLEL PROCESSING: Get all 1st hop artist info at once
  const firstHopLimit = Math.min(limit, rootSimilar.similar.length);
  const firstHopPromises = rootSimilar.similar.slice(0, firstHopLimit).map(async (similar) => {
    try {
      const artistInfo = await fastify.lastfm.getArtistInfo(similar.name, fastify);
      return { similar, artistInfo, success: true };
    } catch (error) {
      console.warn(`⚠️ Failed to get info for ${similar.name}: ${error.message}`);
      return { similar, error, success: false };
    }
  });
  
  console.log(`⏳ Fetching ${firstHopPromises.length} 1st hop artists in parallel...`);
  const firstHopResults = await Promise.all(firstHopPromises);
  
  // Add successful 1st hop results
  const existingNames = new Set([rootInfo.name.toLowerCase()]);
  firstHopResults.forEach(result => {
    if (result.success && result.artistInfo.name.toLowerCase() !== rootInfo.name.toLowerCase()) {
      nodes.push(createArtistNode(result.artistInfo, false, 1));
      existingNames.add(result.artistInfo.name.toLowerCase());
      
      // 1st hop: similarity is already relative to root
      edges.push({
        id: `${rootInfo.name}->${result.artistInfo.name}`,
        source: rootInfo.name,
        target: result.artistInfo.name,
        match: result.similar.match,
        weight: result.similar.match
      });
      
      console.log(`✅ 1ST HOP: ${rootInfo.name} → ${result.artistInfo.name} (${result.similar.match})`);
    }
  });
  
  // For 2-hop, add NEW artists similar to 1-hop artists with ROOT-RELATIVE similarity
  if (depth > 1) {
    console.log(`🔄 Adding 2nd hop with ROOT-RELATIVE similarity...`);
    const firstHopArtists = nodes.filter(n => !n.isRoot).slice(0, 8); // Limit to prevent explosion
    
    // Get similar artists for all 1st hop artists and take 1-2 from each for balanced distribution
    const batchSize = 4;
    const selectedSecondHopCandidates = [];
    const globalSeenNames = new Set(); // Track globally to avoid duplicates across sources
    
    for (let i = 0; i < firstHopArtists.length; i += batchSize) {
      const batch = firstHopArtists.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (sourceNode) => {
        try {
          const similarData = await fastify.lastfm.getSimilarArtists(sourceNode.name, 5, fastify);
          return { sourceNode, similarData, success: true };
        } catch (error) {
          console.warn(`⚠️ Failed to get similar for ${sourceNode.name}: ${error.message}`);
          return { sourceNode, error, success: false };
        }
      });
      
      console.log(`⏳ Processing 2nd hop batch ${Math.floor(i/batchSize) + 1}...`);
      const batchResults = await Promise.all(batchPromises);
      
      // Take 1-2 unique candidates from each successful source
      batchResults.forEach(result => {
        if (result.success) {
          let addedFromSource = 0;
          const maxPerSource = 2; // Take up to 2 from each first-hop artist
          
          for (const similar of result.similarData.similar) {
            if (addedFromSource >= maxPerSource) break;
            
            const similarNameLower = similar.name.toLowerCase();
            const sourceNameLower = result.sourceNode.name.toLowerCase();
            
            // Skip if already exists globally or is the source itself
            if (!existingNames.has(similarNameLower) && 
                !globalSeenNames.has(similarNameLower) &&
                similarNameLower !== sourceNameLower) {
              
              selectedSecondHopCandidates.push({
                artistName: similar.name,
                parentNode: result.sourceNode,
                parentSimilarity: similar.match
              });
              
              globalSeenNames.add(similarNameLower);
              addedFromSource++;
              
              console.log(`🌐 Selected from ${result.sourceNode.name}: ${similar.name} (${similar.match.toFixed(3)})`);
            }
          }
          
          console.log(`📊 Added ${addedFromSource} artists from ${result.sourceNode.name}`);
        }
      });
    }
    
    console.log(`🎯 Selected ${selectedSecondHopCandidates.length} distributed 2nd hop candidates (1-2 per source)`);
    
    // Fetch artist info for selected 2nd hop candidates in parallel
    const secondHopPromises = selectedSecondHopCandidates.map(async (candidate) => {
      try {
        const artistInfo = await fastify.lastfm.getArtistInfo(candidate.artistName, fastify);
        
        // Calculate ROOT-RELATIVE similarity
        let rootSimilarity = rootSimilarityMap.get(artistInfo.name.toLowerCase());
        
        if (!rootSimilarity) {
          // Artist not in root's top similar list, assign lower similarity based on path
          // Use geometric mean of path similarities, capped at 0.5
          rootSimilarity = Math.min(0.5, Math.sqrt(
            rootSimilarityMap.get(candidate.parentNode.name.toLowerCase()) * candidate.parentSimilarity
          ));
          console.log(`📐 Calculated indirect similarity for ${artistInfo.name}: ${rootSimilarity.toFixed(3)}`);
        } else {
          console.log(`✅ Found direct similarity for ${artistInfo.name}: ${rootSimilarity}`);
        }
        
        return { 
          candidate, 
          artistInfo, 
          rootSimilarity,
          success: true 
        };
      } catch (error) {
        console.warn(`⚠️ Failed to get info for 2nd hop ${candidate.artistName}: ${error.message}`);
        return { candidate, error, success: false };
      }
    });
    
    console.log(`⏳ Fetching ${secondHopPromises.length} 2nd hop artists in parallel...`);
    const secondHopResults = await Promise.all(secondHopPromises);
    
    // Add successful 2nd hop results with ROOT-RELATIVE similarity
    secondHopResults.forEach(result => {
      if (result.success) {
        // Add the new node
        nodes.push(createArtistNode(result.artistInfo, false, 2));
        existingNames.add(result.artistInfo.name.toLowerCase());
        
        // Connect to parent with original similarity
        edges.push({
          id: `${result.candidate.parentNode.name}->${result.artistInfo.name}`,
          source: result.candidate.parentNode.name,
          target: result.artistInfo.name,
          match: result.candidate.parentSimilarity,
          weight: result.candidate.parentSimilarity
        });
        
        // ALSO connect directly to root with ROOT-RELATIVE similarity (if significant)
        if (result.rootSimilarity > 0.1) {
          edges.push({
            id: `${rootInfo.name}->${result.artistInfo.name}_root`,
            source: rootInfo.name,
            target: result.artistInfo.name,
            match: result.rootSimilarity,
            weight: result.rootSimilarity
          });
          
          console.log(`✅ 2ND HOP (ROOT-RELATIVE): ${rootInfo.name} → ${result.artistInfo.name} (${result.rootSimilarity.toFixed(3)})`);
        } else {
          console.log(`✅ 2ND HOP (INDIRECT): ${result.candidate.parentNode.name} → ${result.artistInfo.name} (${result.candidate.parentSimilarity.toFixed(3)})`);
        }
      }
    });
  }
  
  console.log(`🎯 OPTIMIZED RESULT: ${nodes.length} nodes, ${edges.length} edges`);
  console.log(`📊 All similarities are now relative to root: "${rootInfo.name}"`);
  
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
function createArtistNode(artistInfo, isRoot = false, hopLevel = 0) {
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
    hopLevel, // 0 = root, 1 = first hop, 2 = second hop
    // Cytoscape.js specific properties
    data: {
      id: artistInfo.name,
      name: artistInfo.name,
      listeners: artistInfo.listeners,
      tags: artistInfo.tags || [],
      primaryGenre,
      size,
      isRoot,
      hopLevel
    }
  };
}

module.exports = mapRoutes; 