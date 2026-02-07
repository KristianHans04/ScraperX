import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { scrapeRoutes, healthRoutes } from './routes/index.js';
import { ScraperXError } from '../utils/errors.js';
import { releaseConcurrentSlot } from './middleware/rateLimit.js';

/**
 * Create and configure Fastify server
 */
export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: config.server.logLevel,
      transport: config.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
  });

  // Register plugins
  await registerPlugins(server);

  // Register routes
  await registerRoutes(server);

  // Register error handlers
  registerErrorHandlers(server);

  // Register hooks
  registerHooks(server);

  return server;
}

/**
 * Register Fastify plugins
 */
async function registerPlugins(server: FastifyInstance): Promise<void> {
  // CORS
  await server.register(cors, {
    origin: config.isDevelopment ? true : (origin, callback) => {
      // In production, validate origin
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Concurrent-Limit',
      'X-Concurrent-Active',
      'Retry-After',
    ],
    credentials: true,
    maxAge: 86400,
  });

  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  });

  // Sensible defaults (adds reply.notFound(), etc.)
  await server.register(sensible);

  // Swagger documentation
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'ScraperX API',
        description: 'Enterprise-grade web scraping platform API',
        version: '1.0.0',
        contact: {
          name: 'ScraperX Support',
          email: 'support@scraperx.io',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.server.port}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'Scraping', description: 'Web scraping endpoints' },
        { name: 'Jobs', description: 'Job management endpoints' },
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Metrics', description: 'Metrics endpoints' },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API key for authentication',
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Bearer token authentication',
          },
        },
      },
      security: [{ apiKey: [] }, { bearerAuth: [] }],
    },
  });

  // Swagger UI
  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });

  logger.info('Plugins registered');
}

/**
 * Register routes
 */
async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health routes (no prefix)
  await server.register(healthRoutes);

  // API v1 routes
  await server.register(async (api) => {
    await api.register(scrapeRoutes);
  }, { prefix: '/v1' });

  // Root redirect to docs
  server.get('/', async (_request, reply) => {
    return reply.redirect('/docs');
  });

  logger.info('Routes registered');
}

/**
 * Register error handlers
 */
function registerErrorHandlers(server: FastifyInstance): void {
  // Global error handler
  server.setErrorHandler((error: FastifyError | ScraperXError, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;

    // Handle ScraperX errors
    if (error instanceof ScraperXError) {
      logger.warn(
        { 
          err: error, 
          requestId, 
          code: error.code,
          statusCode: error.statusCode,
        },
        error.message
      );

      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: error.retryable,
        },
        requestId,
      });
    }

    // Handle validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
          retryable: false,
        },
        requestId,
      });
    }

    // Handle 404
    if (error.statusCode === 404) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message || 'Resource not found',
          retryable: false,
        },
        requestId,
      });
    }

    // Log unexpected errors
    logger.error({ err: error, requestId }, 'Unhandled error');

    // Generic error response
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: config.isDevelopment ? error.message : 'Internal server error',
        retryable: statusCode >= 500,
      },
      requestId,
    });
  });

  // Not found handler
  server.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        retryable: false,
      },
    });
  });
}

/**
 * Register hooks
 */
function registerHooks(server: FastifyInstance): void {
  // Request logging
  server.addHook('onRequest', async (request) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      'Request received'
    );
  });

  // Response logging
  server.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
      },
      'Request completed'
    );
  });

  // Cleanup on response
  server.addHook('onResponse', async (request) => {
    await releaseConcurrentSlot(request);
  });

  // Graceful shutdown
  server.addHook('onClose', async () => {
    logger.info('Server closing');
  });
}

/**
 * Start the server
 */
export async function startServer(server: FastifyInstance): Promise<void> {
  try {
    await server.listen({
      port: config.server.port,
      host: config.server.host,
    });
    
    logger.info(
      { 
        port: config.server.port, 
        host: config.server.host,
        environment: config.env,
      },
      'Server started'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    throw error;
  }
}

/**
 * Stop the server
 */
export async function stopServer(server: FastifyInstance): Promise<void> {
  try {
    await server.close();
    logger.info('Server stopped');
  } catch (error) {
    logger.error({ error }, 'Error stopping server');
    throw error;
  }
}

export type { FastifyInstance };
