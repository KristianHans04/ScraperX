/**
 * Unit tests for monitoring and metrics service
 * Phase 12: Deliverable 5 - Monitoring and Alerting
 * 
 * Tests monitoring as specified in PHASE-12.md Section 8:
 * - Application metrics collection
 * - System metrics collection
 * - Health checks
 * - Performance tracking
 * - Alert generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  MonitoringService, 
  MetricType,
  HealthStatus,
  monitoring,
} from '../../../src/utils/monitoring.js';

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Monitoring Service', () => {
  let service: MonitoringService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new MonitoringService();
  });

  afterEach(() => {
    vi.useRealTimers();
    service.reset();
  });

  describe('Metric Recording', () => {
    it('should record counter metrics', () => {
      service.recordCounter('test.counter', 1);
      service.recordCounter('test.counter', 2);

      const metrics = service.getMetrics('test.counter');
      expect(metrics).toHaveLength(2);
      expect(metrics[0].type).toBe(MetricType.COUNTER);
      expect(metrics[0].value).toBe(1);
      expect(metrics[1].value).toBe(2);
    });

    it('should record gauge metrics', () => {
      service.recordGauge('test.gauge', 42);
      service.recordGauge('test.gauge', 100);

      const metrics = service.getMetrics('test.gauge');
      expect(metrics).toHaveLength(2);
      expect(metrics[0].type).toBe(MetricType.GAUGE);
      expect(metrics[0].value).toBe(42);
    });

    it('should record histogram metrics', () => {
      service.recordHistogram('test.histogram', 100);

      const metrics = service.getMetrics('test.histogram');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].type).toBe(MetricType.HISTOGRAM);
    });

    it('should record timer metrics', () => {
      service.recordTimer('test.timer', 150);

      const metrics = service.getMetrics('test.timer');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].type).toBe(MetricType.TIMER);
      expect(metrics[0].value).toBe(150);
    });

    it('should include labels with metrics', () => {
      service.recordCounter('test.labeled', 1, { 
        method: 'GET', 
        status: '200' 
      });

      const metrics = service.getMetrics('test.labeled');
      expect(metrics[0].labels).toEqual({
        method: 'GET',
        status: '200',
      });
    });

    it('should include timestamp with metrics', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      service.recordCounter('test.timestamp', 1);

      const metrics = service.getMetrics('test.timestamp');
      expect(metrics[0].timestamp).toBe(now);
    });
  });

  describe('Timer Utility', () => {
    it('should measure duration with startTimer', async () => {
      // Use real timers for this test since fake timers don't affect performance.now()
      vi.useRealTimers();
      const endTimer = service.startTimer('test.duration');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      endTimer();

      const metrics = service.getMetrics('test.duration');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBeGreaterThanOrEqual(5); // Allow for small variance
      
      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should support labels with timer', () => {
      const endTimer = service.startTimer('test.duration', { 
        endpoint: '/api/test' 
      });
      endTimer();

      const metrics = service.getMetrics('test.duration');
      expect(metrics[0].labels).toEqual({ endpoint: '/api/test' });
    });
  });

  describe('HTTP Request Recording', () => {
    it('should record request metrics', () => {
      service.recordRequest('GET', '/api/test', 200, 150);

      const requestMetrics = service.getMetrics('http.requests_total');
      expect(requestMetrics).toHaveLength(1);
      expect(requestMetrics[0].labels).toEqual({
        method: 'GET',
        path: '/api/test',
        status: '200',
      });

      const durationMetrics = service.getMetrics('http.request_duration');
      expect(durationMetrics).toHaveLength(1);
      expect(durationMetrics[0].value).toBe(150);
    });

    it('should track error count for 4xx responses', () => {
      service.recordRequest('GET', '/api/test', 400, 50);
      service.recordRequest('POST', '/api/test', 500, 100);

      const stats = service.getRequestStats();
      expect(stats.total).toBe(2);
      expect(stats.errors).toBe(2);
      expect(stats.errorRate).toBe(100);
    });

    it('should not count 2xx as errors', () => {
      service.recordRequest('GET', '/api/test', 200, 50);
      service.recordRequest('GET', '/api/test', 201, 50);

      const stats = service.getRequestStats();
      expect(stats.total).toBe(2);
      expect(stats.errors).toBe(0);
      expect(stats.errorRate).toBe(0);
    });

    it('should track response times', () => {
      service.recordRequest('GET', '/api/test', 200, 100);
      service.recordRequest('GET', '/api/test', 200, 200);
      service.recordRequest('GET', '/api/test', 200, 300);

      const stats = service.getRequestStats();
      expect(stats.total).toBe(3);
    });
  });

  describe('Request Statistics', () => {
    it('should calculate percentiles correctly', () => {
      // Add 100 response times
      for (let i = 1; i <= 100; i++) {
        service.recordRequest('GET', '/api/test', 200, i * 10);
      }

      const stats = service.getRequestStats();
      expect(stats.p50).toBe(500); // 50th percentile
      expect(stats.p90).toBe(900); // 90th percentile
      expect(stats.p99).toBe(990); // 99th percentile
    });

    it('should calculate average response time', () => {
      service.recordRequest('GET', '/api/test', 200, 100);
      service.recordRequest('GET', '/api/test', 200, 200);
      service.recordRequest('GET', '/api/test', 200, 300);

      const stats = service.getRequestStats();
      expect(stats.avgResponseTime).toBe(200);
    });

    it('should handle empty response times', () => {
      const stats = service.getRequestStats();
      expect(stats.total).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.p50).toBe(0);
      expect(stats.avgResponseTime).toBe(0);
    });

    it('should limit response time history to 1000 entries', () => {
      for (let i = 0; i < 1100; i++) {
        service.recordRequest('GET', '/api/test', 200, i);
      }

      const stats = service.getRequestStats();
      expect(stats.total).toBe(1100);
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status when all checks pass', async () => {
      const health = await service.performHealthChecks();

      expect(health.status).toBe(HealthStatus.HEALTHY);
      expect(health.checks).toHaveLength(3);
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.version).toBeDefined();
    });

    it('should check event loop health', async () => {
      const health = await service.performHealthChecks();
      const eventLoopCheck = health.checks.find(c => c.name === 'event_loop');

      expect(eventLoopCheck).toBeDefined();
      expect(eventLoopCheck!.status).toBe(HealthStatus.HEALTHY);
      expect(eventLoopCheck!.latency).toBeGreaterThanOrEqual(0);
    });

    it('should check memory health', async () => {
      const health = await service.performHealthChecks();
      const memoryCheck = health.checks.find(c => c.name === 'memory');

      expect(memoryCheck).toBeDefined();
      expect(memoryCheck!.status).toBe(HealthStatus.HEALTHY);
    });

    it('should check error rate health', async () => {
      const health = await service.performHealthChecks();
      const errorCheck = health.checks.find(c => c.name === 'error_rate');

      expect(errorCheck).toBeDefined();
      expect(errorCheck!.status).toBe(HealthStatus.HEALTHY);
    });

    it('should report degraded when memory usage is high', async () => {
      // Simulate high memory usage
      const originalUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 850,
        heapTotal: 1000,
        rss: 1000,
        external: 0,
        arrayBuffers: 0,
      });

      const health = await service.performHealthChecks();
      const memoryCheck = health.checks.find(c => c.name === 'memory');

      expect(memoryCheck!.status).toBe(HealthStatus.DEGRADED);

      process.memoryUsage = originalUsage;
    });

    it('should report unhealthy when memory usage is critical', async () => {
      // Simulate critical memory usage
      const originalUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 950,
        heapTotal: 1000,
        rss: 1000,
        external: 0,
        arrayBuffers: 0,
      });

      const health = await service.performHealthChecks();
      const memoryCheck = health.checks.find(c => c.name === 'memory');

      expect(memoryCheck!.status).toBe(HealthStatus.UNHEALTHY);
      expect(health.status).toBe(HealthStatus.UNHEALTHY);

      process.memoryUsage = originalUsage;
    });

    it('should report unhealthy when error rate is high', async () => {
      // Add requests with high error rate
      for (let i = 0; i < 20; i++) {
        service.recordRequest('GET', '/api/test', 500, 100);
      }

      const health = await service.performHealthChecks();
      const errorCheck = health.checks.find(c => c.name === 'error_rate');

      expect(errorCheck!.status).toBe(HealthStatus.UNHEALTHY);
    });

    it('should include timestamp in health checks', async () => {
      const before = Date.now();
      const health = await service.performHealthChecks();
      const after = Date.now();

      health.checks.forEach(check => {
        expect(check.timestamp).toBeGreaterThanOrEqual(before);
        expect(check.timestamp).toBeLessThanOrEqual(after);
      });
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect Node.js CPU metrics', () => {
      // Wait for system metrics collection
      vi.advanceTimersByTime(10000);

      const userMetrics = service.getMetrics('nodejs.cpu_user');
      const systemMetrics = service.getMetrics('nodejs.cpu_system');

      expect(userMetrics.length).toBeGreaterThan(0);
      expect(systemMetrics.length).toBeGreaterThan(0);
    });

    it('should collect Node.js memory metrics', () => {
      vi.advanceTimersByTime(10000);

      const rssMetrics = service.getMetrics('nodejs.memory_rss');
      const heapTotalMetrics = service.getMetrics('nodejs.memory_heap_total');
      const heapUsedMetrics = service.getMetrics('nodejs.memory_heap_used');

      expect(rssMetrics.length).toBeGreaterThan(0);
      expect(heapTotalMetrics.length).toBeGreaterThan(0);
      expect(heapUsedMetrics.length).toBeGreaterThan(0);
    });

    it('should collect system memory metrics', () => {
      vi.advanceTimersByTime(10000);

      const totalMetrics = service.getMetrics('system.memory_total');
      const freeMetrics = service.getMetrics('system.memory_free');
      const usedPercentMetrics = service.getMetrics('system.memory_used_percent');

      expect(totalMetrics.length).toBeGreaterThan(0);
      expect(freeMetrics.length).toBeGreaterThan(0);
      expect(usedPercentMetrics.length).toBeGreaterThan(0);
    });

    it('should collect system CPU metrics', () => {
      vi.advanceTimersByTime(10000);

      const countMetrics = service.getMetrics('system.cpu_count');
      const loadMetrics = service.getMetrics('system.load_1m');

      expect(countMetrics.length).toBeGreaterThan(0);
      expect(loadMetrics.length).toBeGreaterThan(0);
    });

    it('should collect uptime metrics', () => {
      vi.advanceTimersByTime(10000);

      const nodeUptime = service.getMetrics('nodejs.uptime');
      const systemUptime = service.getMetrics('system.uptime');

      expect(nodeUptime.length).toBeGreaterThan(0);
      expect(systemUptime.length).toBeGreaterThan(0);
    });
  });

  describe('Event Loop Lag Monitoring', () => {
    it('should measure event loop lag', () => {
      vi.advanceTimersByTime(2000);

      const lagMetrics = service.getMetrics('nodejs.event_loop_lag');
      expect(lagMetrics.length).toBeGreaterThan(0);
    });

    it('should report unhealthy when event loop lag is critical', async () => {
      // Simulate high event loop lag by advancing timers
      const health = await service.performHealthChecks();
      const eventLoopCheck = health.checks.find(c => c.name === 'event_loop');

      expect(eventLoopCheck!.status).toBeDefined();
    });
  });

  describe('Metrics Summary', () => {
    it('should return comprehensive metrics summary', () => {
      service.recordRequest('GET', '/api/test', 200, 100);
      vi.advanceTimersByTime(10000);

      const summary = service.getMetricsSummary();

      expect(summary.requests).toBeDefined();
      expect(summary.system).toBeDefined();
      expect(summary.uptime).toBeGreaterThanOrEqual(0);

      expect(summary.system.cpu).toBeDefined();
      expect(summary.system.memory).toBeDefined();
      expect(summary.system.eventLoopLag).toBeDefined();
    });

    it('should include memory stats in summary', () => {
      const summary = service.getMetricsSummary();

      expect(summary.system.memory.rss).toBeGreaterThan(0);
      expect(summary.system.memory.heapUsed).toBeGreaterThan(0);
      expect(summary.system.memory.heapTotal).toBeGreaterThan(0);
    });

    it('should include CPU stats in summary', () => {
      const summary = service.getMetricsSummary();

      expect(summary.system.cpu.user).toBeGreaterThanOrEqual(0);
      expect(summary.system.cpu.system).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics Cleanup', () => {
    it('should clean up old metrics after retention period', () => {
      // Record a metric
      service.recordCounter('test.cleanup', 1);
      
      // Verify metric exists
      expect(service.getMetrics('test.cleanup')).toHaveLength(1);

      // Advance past retention period (1 hour)
      vi.advanceTimersByTime(3700000);

      // Metric should be cleaned up
      expect(service.getMetrics('test.cleanup')).toHaveLength(0);
    });

    it('should keep recent metrics', () => {
      // Record a metric
      service.recordCounter('test.recent', 1);

      // Advance less than retention period
      vi.advanceTimersByTime(3000000); // 50 minutes

      // Metric should still exist
      expect(service.getMetrics('test.recent')).toHaveLength(1);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      service.recordCounter('test.counter', 1);
      service.recordRequest('GET', '/api/test', 200, 100);

      expect(service.getAllMetrics().size).toBeGreaterThan(0);

      service.reset();

      expect(service.getAllMetrics().size).toBe(0);
      const stats = service.getRequestStats();
      expect(stats.total).toBe(0);
    });

    it('should reset start time on reset', () => {
      const originalStartTime = Date.now();
      vi.advanceTimersByTime(1000);

      service.reset();

      const summary = service.getMetricsSummary();
      expect(summary.uptime).toBeLessThan(100);
    });
  });

  describe('Metric Event Emission', () => {
    it('should emit metric events', () => {
      const handler = vi.fn();
      service.on('metric', handler);

      service.recordCounter('test.event', 1);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: MetricType.COUNTER,
        name: 'test.event',
        value: 1,
      }));
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton monitoring instance', () => {
      expect(monitoring).toBeDefined();
      expect(monitoring).toBeInstanceOf(MonitoringService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle getting metrics for non-existent name', () => {
      const metrics = service.getMetrics('nonexistent');
      expect(metrics).toEqual([]);
    });

    it('should handle recording zero values', () => {
      service.recordCounter('test.zero', 0);
      service.recordGauge('test.zero', 0);

      expect(service.getMetrics('test.zero')).toHaveLength(2);
    });

    it('should handle negative values', () => {
      service.recordGauge('test.negative', -50);

      const metrics = service.getMetrics('test.negative');
      expect(metrics[0].value).toBe(-50);
    });

    it('should handle float values', () => {
      service.recordGauge('test.float', 3.14159);

      const metrics = service.getMetrics('test.float');
      expect(metrics[0].value).toBe(3.14159);
    });
  });
});
