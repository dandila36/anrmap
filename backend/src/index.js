require('dotenv').config();
const fastify = require('fastify')({ 
  logger: true 
});

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Vite dev server
  credentials: true
});

fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: function (request, context) {
    return {
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
      date: Date.now(),
      expiresIn: context.ttl
    };
  }
});

// Redis disabled for now - using in-memory cache fallback
// if (process.env.REDIS_URL) {
//   fastify.register(require('@fastify/redis'), {
//     url: process.env.REDIS_URL
//   });
// }

// Register static file serving for production
if (process.env.NODE_ENV === 'production') {
  fastify.register(require('@fastify/static'), {
    root: require('path').join(__dirname, '../public'),
    prefix: '/'
  });
}

// Register Last.fm service directly
console.log('🔧 Starting service registration...');
const LastFmService = require('./services/lastfm-class');
const lastfmService = new LastFmService();
fastify.decorate('lastfm', lastfmService);
console.log('📝 Last.fm service registered directly');

// Register routes
fastify.register(async function (fastify) {
  // Make sure the lastfm service is available in the route context
  const LastFmService = require('./services/lastfm-class');
  fastify.decorate('lastfm', new LastFmService());
  
  // Register all routes in this context
  await fastify.register(require('./routes/artist'));
  await fastify.register(require('./routes/map'));
  await fastify.register(require('./routes/export'));
}, { prefix: '/api' });

// Check if services are available after registration
fastify.ready().then(() => {
  console.log('🚀 Fastify ready! All routes and services registered!');
  console.log('✅ Ready to process requests with full functionality!');
});

// Health check
fastify.get('/healthz', async (request, reply) => {
  return { ok: true, timestamp: new Date().toISOString() };
});

// Global error handler
fastify.setErrorHandler(function (error, request, reply) {
  fastify.log.error(error);
  
  if (error.statusCode === 429) {
    reply.status(429).send({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests, please slow down'
    });
    return;
  }
  
  reply.status(500).send({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start(); 