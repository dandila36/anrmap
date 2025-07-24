async function exportRoutes(fastify, options) {
  
  // Export graph data as CSV
  fastify.get('/export/csv', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          root: { type: 'string' },
          depth: { type: 'integer', minimum: 1, maximum: 2, default: 1 },
          limit: { type: 'integer', minimum: 5, maximum: 50, default: 25 }
        },
        required: ['root']
      }
    }
  }, async (request, reply) => {
    try {
      const { root, depth = 1, limit = 25 } = request.query;
      
      // Parse artist name
      const rootArtistName = fastify.lastfm.parseArtistInput(root);
      
      // Get the same data as the mapping endpoint
      const graph = await buildArtistGraph(rootArtistName, depth, limit, fastify);
      
      // Convert to CSV format
      const csvData = generateCSV(graph);
      
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="artist-network-${rootArtistName.replace(/[^a-zA-Z0-9]/g, '-')}.csv"`)
        .send(csvData);
        
    } catch (error) {
      fastify.log.error(error);
      
      if (error.statusCode === 429) {
        return reply.code(429).send({
          error: 'Rate Limit Exceeded',
          message: 'Too many requests to Last.fm API'
        });
      }
      
      return reply.code(500).send({
        error: 'Export Failed',
        message: 'Failed to export graph data'
      });
    }
  });

  // Export connections data as CSV
  fastify.post('/export/connections', {
    schema: {
      body: {
        type: 'object',
        properties: {
          nodes: { type: 'array' },
          edges: { type: 'array' }
        },
        required: ['nodes', 'edges']
      }
    }
  }, async (request, reply) => {
    try {
      const { nodes, edges } = request.body;
      
      // Generate CSV from provided graph data
      const csvData = generateCSVFromGraph({ nodes, edges });
      
      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="artist-network-export.csv"')
        .send(csvData);
        
    } catch (error) {
      fastify.log.error(error);
      
      return reply.code(500).send({
        error: 'Export Failed',
        message: 'Failed to export connections data'
      });
    }
  });
}

// Helper function to generate CSV from graph data with new format
function generateCSV(graph) {
  const lines = [];
  
  // Header - Artist Name, Orbit, Listeners, Plays, Genres, Similarity To Root, URL
  lines.push('Artist Name,Orbit,Listeners,Plays,Genres,Similarity To Root,URL');
  
  // Find root artist for similarity calculations
  const rootArtist = graph.nodes.find(node => node.isRoot);
  if (!rootArtist) {
    throw new Error('No root artist found in graph data');
  }
  
  // Create similarity lookup map from edges
  const similarityMap = new Map();
  graph.edges.forEach(edge => {
    // If edge connects to root, store the similarity
    if (edge.source === rootArtist.name) {
      similarityMap.set(edge.target, edge.match);
    } else if (edge.target === rootArtist.name) {
      similarityMap.set(edge.source, edge.match);
    }
  });
  
  // Process nodes and add to CSV
  graph.nodes.forEach(node => {
    // Determine orbit based on hopLevel
    let orbit;
    switch (node.hopLevel) {
      case 0: orbit = 'Root'; break;
      case 1: orbit = '1st Hop'; break;
      case 2: orbit = '2nd Hop'; break;
      default: orbit = 'Unknown'; break;
    }
    
    // Format numbers with commas, no decimals
    const formatNumber = (num) => {
      if (!num || num === 0) return '0';
      return Math.floor(num).toLocaleString();
    };
    
    // Get similarity to root
    let similarityToRoot = 0;
    if (node.isRoot) {
      similarityToRoot = 1.0; // Root has 100% similarity to itself
    } else {
      similarityToRoot = similarityMap.get(node.name) || 0;
    }
    
    // Format similarity as percentage
    const similarityPercent = `${Math.round(similarityToRoot * 100)}%`;
    
    // Format genres (tags)
    const genres = (node.tags || []).join(', ');
    
    // Create CSV row
    lines.push([
      `"${node.name}"`,
      `"${orbit}"`,
      `"${formatNumber(node.listeners)}"`,
      `"${formatNumber(node.playcount)}"`,
      `"${genres}"`,
      `"${similarityPercent}"`,
      `"${node.url || ''}"`
    ].join(','));
  });
  
  return lines.join('\n');
}

// Helper function to generate CSV from provided graph with new format
function generateCSVFromGraph(graph) {
  const lines = [];
  
  // Header - Artist Name, Orbit, Listeners, Plays, Genres, Similarity To Root, URL
  lines.push('Artist Name,Orbit,Listeners,Plays,Genres,Similarity To Root,URL');
  
  // Find root artist for similarity calculations
  const rootArtist = graph.nodes.find(node => node.isRoot);
  if (!rootArtist) {
    throw new Error('No root artist found in graph data');
  }
  
  // Create similarity lookup map from edges
  const similarityMap = new Map();
  graph.edges.forEach(edge => {
    // If edge connects to root, store the similarity
    if (edge.source === rootArtist.name) {
      similarityMap.set(edge.target, edge.match);
    } else if (edge.target === rootArtist.name) {
      similarityMap.set(edge.source, edge.match);
    }
  });
  
  // Process nodes and add to CSV
  graph.nodes.forEach(node => {
    // Determine orbit based on hopLevel
    let orbit;
    switch (node.hopLevel) {
      case 0: orbit = 'Root'; break;
      case 1: orbit = '1st Hop'; break;
      case 2: orbit = '2nd Hop'; break;
      default: orbit = 'Unknown'; break;
    }
    
    // Format numbers with commas, no decimals
    const formatNumber = (num) => {
      if (!num || num === 0) return '0';
      return Math.floor(num).toLocaleString();
    };
    
    // Get similarity to root
    let similarityToRoot = 0;
    if (node.isRoot) {
      similarityToRoot = 1.0; // Root has 100% similarity to itself
    } else {
      similarityToRoot = similarityMap.get(node.name) || 0;
    }
    
    // Format similarity as percentage
    const similarityPercent = `${Math.round(similarityToRoot * 100)}%`;
    
    // Format genres (tags)
    const genres = (node.tags || []).join(', ');
    
    // Create CSV row
    lines.push([
      `"${node.name}"`,
      `"${orbit}"`,
      `"${formatNumber(node.listeners)}"`,
      `"${formatNumber(node.playcount)}"`,
      `"${genres}"`,
      `"${similarityPercent}"`,
      `"${node.url || ''}"`
    ].join(','));
  });
  
  return lines.join('\n');
}

// Import the graph building function from map.js
// Note: In a real implementation, this should be moved to a shared utilities file
async function buildArtistGraph(rootArtistName, depth, limit, fastify) {
  const nodes = [];
  const edges = [];
  const processedArtists = new Set();
  
  // Get root artist info and similar artists
  const [rootInfo, rootSimilar] = await Promise.all([
    fastify.lastfm.getArtistInfo(rootArtistName, fastify),
    fastify.lastfm.getSimilarArtists(rootArtistName, limit, fastify)
  ]);
  
  // Add root node
  nodes.push(createArtistNode(rootInfo, true, 0));
  processedArtists.add(rootArtistName.toLowerCase());
  
  // Process first-hop similar artists
  const firstHopPromises = rootSimilar.similar.map(async (similar) => {
    const artistInfo = await fastify.lastfm.getArtistInfo(similar.name, fastify)
      .catch(err => ({ name: similar.name, error: true }));
    
    if (!artistInfo.error) {
      return {
        info: artistInfo,
        similar: similar,
        isFirstHop: true
      };
    }
    return null;
  });
  
  const firstHopResults = (await Promise.all(firstHopPromises)).filter(Boolean);
  
  // Add first-hop nodes and edges
  firstHopResults.forEach(({ info, similar }) => {
    if (!processedArtists.has(info.name.toLowerCase())) {
      nodes.push(createArtistNode(info, false, 1));
      processedArtists.add(info.name.toLowerCase());
    }
    
    edges.push({
      id: `${rootArtistName}->${info.name}`,
      source: rootArtistName,
      target: info.name,
      match: similar.match,
      weight: similar.match
    });
  });
  
  return { nodes, edges };
}

function createArtistNode(artistInfo, isRoot = false, hopLevel = 0) {
  const primaryGenre = artistInfo.tags?.[0] || 'unknown';
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
    hopLevel
  };
}

module.exports = exportRoutes; 