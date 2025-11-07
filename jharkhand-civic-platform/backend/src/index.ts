import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { db } from './config/database';

// Routes
import authRoutes from './routes/auth';
import reportRoutes from './routes/reports';
import categoryRoutes from './routes/categories';
import wardRoutes from './routes/wards';
import departmentRoutes from './routes/departments';
import mediaRoutes from './routes/media';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import routingRoutes from './routes/routing';
import geocodeRoutes from './routes/geocode';

const fastify = Fastify({
  logger: {
    level: config.logLevel,
    transport: config.env === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

async function start() {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: config.corsOrigin,
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: config.jwtSecret,
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '15 minutes',
    });

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register routes
    fastify.register(authRoutes, { prefix: '/api/v1/auth' });
    fastify.register(reportRoutes, { prefix: '/api/v1/reports' });
    fastify.register(categoryRoutes, { prefix: '/api/v1/categories' });
    fastify.register(wardRoutes, { prefix: '/api/v1/wards' });
    fastify.register(departmentRoutes, { prefix: '/api/v1/departments' });
    fastify.register(mediaRoutes, { prefix: '/api/v1/media' });
    fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' });
    fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
    fastify.register(routingRoutes, { prefix: '/api/v1/routing' });
    fastify.register(geocodeRoutes, { prefix: '/api/v1/geocode' });

    // Test database connection
    await db.query('SELECT NOW()');
    fastify.log.info('Database connected successfully');

    // Start server
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    fastify.log.info(`Server listening on port ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await fastify.close();
  await db.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await fastify.close();
  await db.end();
  process.exit(0);
});

start();
