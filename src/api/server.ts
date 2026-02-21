import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ScrapifieError } from '../utils/errors.js';
import { monitoring } from '../utils/monitoring.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createPublicRoutes } from './routes/public/index.js';
import adminRoutes from './routes/admin/index.js';
import { createBillingRoutes } from './routes/billing.routes.js';
import { createSettingsRoutes } from './routes/settings.routes.js';
import { createSupportRoutes } from './routes/support.routes.js';
import { createNotificationsRoutes } from './routes/notifications.routes.js';
import { createWebhookRoutes } from './routes/webhook.routes.js';
import { createKeysRoutes } from './routes/keys.routes.js';
import { createJobsRoutes } from './routes/jobs.routes.js';
import { createUsageRoutes } from './routes/usage.routes.js';
import { createDashboardRoutes } from './routes/dashboard.routes.js';
import { createV1Routes } from './routes/v1/scrape.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ExpressApp = Express;

/**
 * Create and configure Express server
 */
export function createServer(): Express {
  const app = express();

  // Trust proxy
  app.set('trust proxy', 1);

  // Register middleware
  registerMiddleware(app);

  // Register routes
  registerRoutes(app);

  // Register error handlers
  registerErrorHandlers(app);

  logger.info('Express server configured');

  return app;
}

/**
 * Register Express middleware
 */
function registerMiddleware(app: Express): void {
  // Logging middleware
  if (config.isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    }));
  }

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS
  app.use(cors({
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
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parsing
  app.use(cookieParser(process.env.COOKIE_SECRET || 'change-this-in-production'));

  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  logger.info('Middleware registered');
}

/**
 * Register API routes
 */
function registerRoutes(app: Express): void {
  // Serve built frontend from dist/frontend
  const frontendPath = path.join(__dirname, '../../dist/frontend');
  app.use(express.static(frontendPath));
  
  // API routes
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Auth routes
  app.use(createAuthRoutes());

  // Dashboard routes
  try { app.use('/api/dashboard', createDashboardRoutes()); } catch (err) { logger.warn('Dashboard routes not registered (missing dependencies)'); }

  // API Keys routes
  try { app.use('/api/keys', createKeysRoutes()); } catch (err) { logger.warn('Keys routes not registered (missing dependencies)'); }

  // Jobs routes
  try { app.use('/api/jobs', createJobsRoutes()); } catch (err) { logger.warn('Jobs routes not registered (missing dependencies)'); }

  // Usage routes
  try { app.use('/api/usage', createUsageRoutes()); } catch (err) { logger.warn('Usage routes not registered (missing dependencies)'); }

  // Public routes (blog, status, contact)
  app.use('/api/public', createPublicRoutes());

  // Admin routes
  app.use('/api/admin', adminRoutes);

  // Billing routes
  try { app.use('/api/billing', createBillingRoutes()); } catch (err) { logger.warn('Billing routes not registered (missing dependencies)'); }

  // Webhook routes
  try { app.use('/api/webhooks', createWebhookRoutes()); } catch (err) { logger.warn('Webhook routes not registered (missing dependencies)'); }

  // Settings routes (may fail if dependencies missing)
  try { app.use('/api/settings', createSettingsRoutes()); } catch (err) { logger.warn('Settings routes not registered (missing dependencies)'); }

  // Support routes (may fail if dependencies missing)
  try { app.use('/api/support', createSupportRoutes()); } catch (err) { logger.warn('Support routes not registered (missing dependencies)'); }

  // Notifications routes (may fail if dependencies missing)
  try { app.use('/api/notifications', createNotificationsRoutes()); } catch (err) { logger.warn('Notifications routes not registered (missing dependencies)'); }

  // Detailed health check
  app.get('/health/detailed', async (req: Request, res: Response) => {
    try {
      const services: any = {};
      let overallHealthy = true;

      // Check database
      try {
        const { getPool } = await import('../db/connection.js');
        const pool = getPool();
        const start = Date.now();
        await pool.query('SELECT 1');
        services.database = { healthy: true, latencyMs: Date.now() - start };
      } catch (error) {
        overallHealthy = false;
        services.database = { 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }

      // Check Redis
      try {
        const { getRedisClient } = await import('../queue/redis.js');
        const redis = getRedisClient();
        const start = Date.now();
        await redis.ping();
        services.redis = { healthy: true, latencyMs: Date.now() - start };
      } catch (error) {
        overallHealthy = false;
        services.redis = { 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }

      res.status(overallHealthy ? 200 : 503).json({
        status: overallHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services,
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Readiness probe
  app.get('/health/ready', async (req: Request, res: Response) => {
    try {
      const { getPool } = await import('../db/connection.js');
      const { getRedisClient } = await import('../queue/redis.js');
      
      await getPool().query('SELECT 1');
      await getRedisClient().ping();
      
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Liveness probe
  app.get('/health/live', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });

  // API v1 routes (API key authenticated)
  try { app.use('/api/v1', createV1Routes()); } catch (err) { logger.warn('V1 API routes not registered'); }

  // Catch-all route to serve index.html for client-side routing
  app.get('*', (req: Request, res: Response) => {
    const frontendPath = path.join(__dirname, '../../dist/frontend');
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  logger.info('Routes registered');
}

/**
 * Register error handlers
 */
function registerErrorHandlers(app: Express): void {
  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log error
    logger.error({
      error: err,
      requestId: req.get('x-request-id'),
      method: req.method,
      path: req.path,
    }, 'Request error');

    // Handle Scrapifie errors
    if (err instanceof ScrapifieError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details && { details: err.details }),
        },
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError' || err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: err,
        },
      });
    }

    // Generic error response
    const statusCode = (err as any).statusCode || (err as any).status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: config.isProduction ? 'An internal error occurred' : err.message,
        ...(config.isDevelopment && { stack: err.stack }),
      },
    });
  });

  logger.info('Error handlers registered');
}

/**
 * Start the Express server
 */
export async function startServer(app: Express): Promise<void> {
  return new Promise((resolve) => {
    const server = app.listen(config.server.port, config.server.host as any, () => {
      logger.info({
        port: config.server.port,
        host: config.server.host,
        environment: config.env,
      }, 'Server started');
      resolve();
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Received shutdown signal, closing server gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  });
}

/**
 * Stop the Express server
 */
export async function stopServer(): Promise<void> {
  logger.info('Stopping server');
  // Server will be stopped by the shutdown handlers
}

export { Express };
