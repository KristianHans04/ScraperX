import { FastifyPluginAsync } from 'fastify';
import { getPool } from '../../db/connection.js';
import { checkRedisHealth, getRedisClient } from '../../queue/redis.js';
import { getAllQueueStats } from '../../queue/queues.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { monitoring } from '../../utils/monitoring.js';

const startTime = Date.now();

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /health - Basic health check
   */
  fastify.get('/health', {
    schema: {
      description: 'Basic health check endpoint',
      tags: ['Health'],
    },
  }, async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/ready - Readiness check (for k8s)
   */
  fastify.get('/health/ready', {
    schema: {
      description: 'Readiness check for orchestration',
      tags: ['Health'],
    },
  }, async (_request, reply) => {
    try {
      // Check database
      const pool = getPool();
      await pool.query('SELECT 1');

      // Check Redis
      const redis = await getRedisClient();
      await redis.ping();

      return reply.status(200).send({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error }, 'Readiness check failed');
      return reply.status(503).send({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /health/live - Liveness check (for k8s)
   */
  fastify.get('/health/live', {
    schema: {
      description: 'Liveness check for orchestration',
      tags: ['Health'],
    },
  }, async (_request, reply) => {
    return reply.status(200).send({
      status: 'alive',
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/detailed - Detailed health check
   */
  fastify.get('/health/detailed', {
    schema: {
      description: 'Detailed health check with service status',
      tags: ['Health'],
    },
  }, async (_request, reply) => {
    const services: Record<string, { healthy: boolean; latencyMs?: number; error?: string; details?: unknown }> = {};
    let overallHealthy = true;

    // Check database
    try {
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
      const redisHealth = await checkRedisHealth();
      services.redis = redisHealth;
      if (!redisHealth.healthy) {
        overallHealthy = false;
      }
    } catch (error) {
      overallHealthy = false;
      services.redis = { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    // Get queue stats
    try {
      const queueStats = await getAllQueueStats();
      services.queues = {
        healthy: true,
        details: queueStats,
      };
    } catch (error) {
      services.queues = {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Get system health from monitoring service
    const systemHealth = await monitoring.performHealthChecks();
    
    // Combine with system health
    if (systemHealth.status === 'unhealthy') {
      overallHealthy = false;
    }

    const status = overallHealthy ? 'healthy' : 'degraded';

    return reply.status(overallHealthy ? 200 : 503).send({
      status,
      version: '1.0.0',
      environment: config.env,
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      services,
      systemHealth: systemHealth.checks,
    });
  });

  /**
   * GET /metrics - Prometheus metrics (basic implementation)
   */
  fastify.get('/metrics', {
    schema: {
      description: 'Prometheus metrics endpoint',
      tags: ['Metrics'],
    },
  }, async (_request, reply) => {
    if (!config.metrics.enabled) {
      return reply.status(404).send({ error: 'Metrics disabled' });
    }

    try {
      const queueStats = await getAllQueueStats();
      const requestStats = monitoring.getRequestStats();
      const metricsSummary = monitoring.getMetricsSummary();
      
      let metrics = '';
      
      // Uptime metric
      metrics += `# HELP scrapifie_uptime_seconds Uptime in seconds\n`;
      metrics += `# TYPE scrapifie_uptime_seconds gauge\n`;
      metrics += `scrapifie_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}\n\n`;

      // HTTP request metrics
      metrics += `# HELP scrapifie_http_requests_total Total HTTP requests\n`;
      metrics += `# TYPE scrapifie_http_requests_total counter\n`;
      metrics += `scrapifie_http_requests_total ${requestStats.total}\n\n`;

      metrics += `# HELP scrapifie_http_errors_total Total HTTP errors\n`;
      metrics += `# TYPE scrapifie_http_errors_total counter\n`;
      metrics += `scrapifie_http_errors_total ${requestStats.errors}\n\n`;

      metrics += `# HELP scrapifie_http_error_rate HTTP error rate percentage\n`;
      metrics += `# TYPE scrapifie_http_error_rate gauge\n`;
      metrics += `scrapifie_http_error_rate ${requestStats.errorRate}\n\n`;

      metrics += `# HELP scrapifie_http_response_time_p50 50th percentile response time\n`;
      metrics += `# TYPE scrapifie_http_response_time_p50 gauge\n`;
      metrics += `scrapifie_http_response_time_p50 ${requestStats.p50}\n\n`;

      metrics += `# HELP scrapifie_http_response_time_p90 90th percentile response time\n`;
      metrics += `# TYPE scrapifie_http_response_time_p90 gauge\n`;
      metrics += `scrapifie_http_response_time_p90 ${requestStats.p90}\n\n`;

      metrics += `# HELP scrapifie_http_response_time_p99 99th percentile response time\n`;
      metrics += `# TYPE scrapifie_http_response_time_p99 gauge\n`;
      metrics += `scrapifie_http_response_time_p99 ${requestStats.p99}\n\n`;

      // System metrics
      metrics += `# HELP scrapifie_nodejs_memory_heap_used Heap memory used in bytes\n`;
      metrics += `# TYPE scrapifie_nodejs_memory_heap_used gauge\n`;
      metrics += `scrapifie_nodejs_memory_heap_used ${metricsSummary.system.memory.heapUsed}\n\n`;

      metrics += `# HELP scrapifie_nodejs_memory_heap_total Total heap memory in bytes\n`;
      metrics += `# TYPE scrapifie_nodejs_memory_heap_total gauge\n`;
      metrics += `scrapifie_nodejs_memory_heap_total ${metricsSummary.system.memory.heapTotal}\n\n`;

      metrics += `# HELP scrapifie_nodejs_event_loop_lag Event loop lag in milliseconds\n`;
      metrics += `# TYPE scrapifie_nodejs_event_loop_lag gauge\n`;
      metrics += `scrapifie_nodejs_event_loop_lag ${metricsSummary.system.eventLoopLag}\n\n`;

      // Queue metrics
      for (const [queueName, stats] of Object.entries(queueStats)) {
        metrics += `# HELP scrapifie_queue_${queueName}_waiting Jobs waiting in queue\n`;
        metrics += `# TYPE scrapifie_queue_${queueName}_waiting gauge\n`;
        metrics += `scrapifie_queue_${queueName}_waiting ${stats.waiting}\n`;
        
        metrics += `# HELP scrapifie_queue_${queueName}_active Jobs currently active\n`;
        metrics += `# TYPE scrapifie_queue_${queueName}_active gauge\n`;
        metrics += `scrapifie_queue_${queueName}_active ${stats.active}\n`;
        
        metrics += `# HELP scrapifie_queue_${queueName}_completed Total completed jobs\n`;
        metrics += `# TYPE scrapifie_queue_${queueName}_completed counter\n`;
        metrics += `scrapifie_queue_${queueName}_completed ${stats.completed}\n`;
        
        metrics += `# HELP scrapifie_queue_${queueName}_failed Total failed jobs\n`;
        metrics += `# TYPE scrapifie_queue_${queueName}_failed counter\n`;
        metrics += `scrapifie_queue_${queueName}_failed ${stats.failed}\n\n`;
      }

      reply.header('Content-Type', 'text/plain; charset=utf-8');
      return reply.status(200).send(metrics);
    } catch (error) {
      logger.error({ error }, 'Failed to generate metrics');
      return reply.status(500).send({ error: 'Failed to generate metrics' });
    }
  });

  /**
   * GET /metrics/summary - JSON metrics summary
   */
  fastify.get('/metrics/summary', {
    schema: {
      description: 'JSON metrics summary for dashboards',
      tags: ['Metrics'],
    },
  }, async (_request, reply) => {
    if (!config.metrics.enabled) {
      return reply.status(404).send({ error: 'Metrics disabled' });
    }

    try {
      const summary = monitoring.getMetricsSummary();
      const health = await monitoring.performHealthChecks();

      return reply.status(200).send({
        timestamp: new Date().toISOString(),
        health: health.status,
        ...summary,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate metrics summary');
      return reply.status(500).send({ error: 'Failed to generate metrics summary' });
    }
  });
};
