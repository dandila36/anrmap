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
        .header('Content-Disposition', `attachment; filename="similar-artists-${rootArtistName.replace(/[^a-zA-Z0-9]/g, '-')}.csv"`)
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
        .header('Content-Disposition', 'attachment; filename="artist-connections.csv"')
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

// Helper function to generate CSV from graph data
function generateCSV(graph) {
  const lines = [];
  
  // Header
  lines.push('Type,Source,Target,Name,Listeners,Playcount,Match,Tags,URL');
  
  // Add nodes
  graph.nodes.forEach(node => {
    const tags = (node.tags || []).join(';');
    lines.push([
      'Artist',
      '',
      '',
      `"${node.name}"`,
      node.listeners || 0,
      node.playcount || 0,
      '',
      `"${tags}"`,
      `"${node.url || ''}"`
    ].join(','));
  });
  
  // Add edges
  graph.edges.forEach(edge => {
    lines.push([
      'Connection',
      `"${edge.source}"`,
      `"${edge.target}"`,
      '',
      '',
      '',
      edge.match || 0,
      '',
      ''
    ].join(','));
  });
  
  return lines.join('\n');
}

// Helper function to generate CSV from provided graph
function generateCSVFromGraph(graph) {
  const lines = [];
  
  // Header
  lines.push('Type,Source,Target,Name,Listeners,Playcount,Match,Tags,URL');
  
  // Add nodes
  graph.nodes.forEach(node => {
    const tags = (node.tags || []).join(';');
    lines.push([
      'Artist',
      '',
      '',
      `"${node.name}"`,
      node.listeners || 0,
      node.playcount || 0,
      '',
      `"${tags}"`,
      `"${node.url || ''}"`
    ].join(','));
  });
  
  // Add edges
  graph.edges.forEach(edge => {
    lines.push([
      'Connection',
      `"${edge.source}"`,
      `"${edge.target}"`,
      '',
      '',
      '',
      edge.match || 0,
      '',
      ''
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
  nodes.push(createArtistNode(rootInfo, true));
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
      nodes.push(createArtistNode(info, false));
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

function createArtistNode(artistInfo, isRoot = false) {
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
    isRoot
  };
}

module.exports = exportRoutes; 