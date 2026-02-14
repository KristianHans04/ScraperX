import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initializeDatabase, closeDatabase } from './db/connection.js';
import { getRedisClient, closeRedisConnections } from './queue/redis.js';
import { closeAllQueues } from './queue/queues.js';
import { createServer, startServer, stopServer, Express } from './api/server.js';
import { startAllWorkers, stopAllWorkers } from './workers/index.js';
import { closeBrowserPool } from './engines/browser/index.js';

let server: Express | null = null;
let shuttingDown = false;

/**
 * Start the application
 */
async function start(): Promise<void> {
  logger.info({ env: config.env }, 'Starting Scrapifie...');

  try {
    // Initialize database
    logger.info('Initializing database connection...');
    await initializeDatabase();

    // Initialize Redis
    logger.info('Initializing Redis connection...');
    await getRedisClient();

    // Create and start server
    logger.info('Starting API server...');
    server = createServer();
    await startServer(server);

    // Start workers (if configured to run in same process)
    if (process.env.RUN_WORKERS === 'true') {
      logger.info('Starting workers...');
      startAllWorkers();
    } else {
      logger.info('Workers disabled (set RUN_WORKERS=true to enable)');
    }

    logger.info({
      port: config.server.port,
      environment: config.env,
    }, 'Scrapifie started successfully');

  } catch (error) {
    logger.error({ error }, 'Failed to start Scrapifie');
    process.exit(1);
  }
}

/**
 * Gracefully shutdown the application
 */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, 'Shutting down Scrapifie...');

  const shutdownTimeout = setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);

  try {
    // Stop accepting new requests
    if (server) {
      logger.info('Stopping API server...');
      await stopServer(server);
    }

    // Stop workers
    logger.info('Stopping workers...');
    await stopAllWorkers();

    // Close browser pool
    logger.info('Closing browser pool...');
    await closeBrowserPool();

    // Close queues
    logger.info('Closing queues...');
    await closeAllQueues();

    // Close Redis
    logger.info('Closing Redis connections...');
    await closeRedisConnections();

    // Close database
    logger.info('Closing database connection...');
    await closeDatabase();

    clearTimeout(shutdownTimeout);
    logger.info('Scrapifie shutdown complete');
    process.exit(0);

  } catch (error) {
    clearTimeout(shutdownTimeout);
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  // Don't shutdown on unhandled rejection, just log
});

// Start the application
start();
