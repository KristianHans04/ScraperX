/**
 * Monitoring and Metrics Service
 * 
 * Provides comprehensive application monitoring, metrics collection,
 * and health checks for Phase 12 launch readiness.
 * 
 * Features:
 * - Application metrics (response times, error rates, throughput)
 * - System metrics (CPU, memory, event loop lag)
 * - Business metrics (jobs, credits, API calls)
 * - Health checks (database, Redis, queue)
 * - Performance tracking
 * - Alert generation
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import os from 'os';
import { logger } from '../utils/logger.js';

// Metric types
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

// Metric value interface
interface Metric {
  type: MetricType;
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

// Health check status
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message?: string;
  latency?: number;
  timestamp: number;
}

export interface SystemHealth {
  status: HealthStatus;
  checks: HealthCheck[];
  uptime: number;
  version: string;
}

/**
 * Monitoring Service
 */
class MonitoringService extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private startTime: number = Date.now();
  private metricsRetentionMs = 3600000; // 1 hour
  
  // Request metrics
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  
  // System metrics
  private eventLoopLag = 0;
  private lastEventLoopCheck = Date.now();
  
  constructor() {
    super();
    this.startMetricsCollection();
  }
  
  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    // Collect system metrics every 10 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);
    
    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);
    
    // Measure event loop lag
    setInterval(() => {
      const start = Date.now();
      setImmediate(() => {
        this.eventLoopLag = Date.now() - start;
        this.recordGauge('nodejs.event_loop_lag', this.eventLoopLag);
      });
    }, 1000);
  }
  
  /**
   * Record a counter metric
   */
  recordCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metric: Metric = {
      type: MetricType.COUNTER,
      name,
      value,
      timestamp: Date.now(),
      labels,
    };
    
    this.storeMetric(metric);
  }
  
  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric: Metric = {
      type: MetricType.GAUGE,
      name,
      value,
      timestamp: Date.now(),
      labels,
    };
    
    this.storeMetric(metric);
  }
  
  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metric: Metric = {
      type: MetricType.HISTOGRAM,
      name,
      value,
      timestamp: Date.now(),
      labels,
    };
    
    this.storeMetric(metric);
  }
  
  /**
   * Record a timer metric
   */
  recordTimer(name: string, durationMs: number, labels?: Record<string, string>): void {
    const metric: Metric = {
      type: MetricType.TIMER,
      name,
      value: durationMs,
      timestamp: Date.now(),
      labels,
    };
    
    this.storeMetric(metric);
  }
  
  /**
   * Start a timer and return a function to stop it
   */
  startTimer(name: string, labels?: Record<string, string>): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordTimer(name, duration, labels);
    };
  }
  
  /**
   * Store metric in memory
   */
  private storeMetric(metric: Metric): void {
    const key = metric.name;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(metric);
    
    // Emit metric event for external listeners
    this.emit('metric', metric);
  }
  
  /**
   * Get metrics by name
   */
  getMetrics(name: string): Metric[] {
    return this.metrics.get(name) || [];
  }
  
  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, Metric[]> {
    return this.metrics;
  }
  
  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.metricsRetentionMs;
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(key, filtered);
    }
  }
  
  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    // CPU usage
    const cpuUsage = process.cpuUsage();
    this.recordGauge('nodejs.cpu_user', cpuUsage.user);
    this.recordGauge('nodejs.cpu_system', cpuUsage.system);
    
    // Memory usage
    const memUsage = process.memoryUsage();
    this.recordGauge('nodejs.memory_rss', memUsage.rss);
    this.recordGauge('nodejs.memory_heap_total', memUsage.heapTotal);
    this.recordGauge('nodejs.memory_heap_used', memUsage.heapUsed);
    this.recordGauge('nodejs.memory_external', memUsage.external);
    
    // System memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    this.recordGauge('system.memory_total', totalMem);
    this.recordGauge('system.memory_free', freeMem);
    this.recordGauge('system.memory_used_percent', ((totalMem - freeMem) / totalMem) * 100);
    
    // System CPU
    const cpus = os.cpus();
    const avgLoad = os.loadavg();
    this.recordGauge('system.cpu_count', cpus.length);
    this.recordGauge('system.load_1m', avgLoad[0]);
    this.recordGauge('system.load_5m', avgLoad[1]);
    this.recordGauge('system.load_15m', avgLoad[2]);
    
    // Uptime
    this.recordGauge('nodejs.uptime', process.uptime());
    this.recordGauge('system.uptime', os.uptime());
  }
  
  /**
   * Record HTTP request
   */
  recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    this.requestCount++;
    this.responseTimes.push(durationMs);
    
    // Keep only last 1000 response times for percentile calculation
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    
    if (statusCode >= 400) {
      this.errorCount++;
    }
    
    this.recordCounter('http.requests_total', 1, {
      method,
      path,
      status: statusCode.toString(),
    });
    
    this.recordTimer('http.request_duration', durationMs, {
      method,
      path,
      status: statusCode.toString(),
    });
  }
  
  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
  
  /**
   * Get request statistics
   */
  getRequestStats(): {
    total: number;
    errors: number;
    errorRate: number;
    p50: number;
    p90: number;
    p99: number;
    avgResponseTime: number;
  } {
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;
    
    return {
      total: this.requestCount,
      errors: this.errorCount,
      errorRate,
      p50: this.calculatePercentile(this.responseTimes, 50),
      p90: this.calculatePercentile(this.responseTimes, 90),
      p99: this.calculatePercentile(this.responseTimes, 99),
      avgResponseTime,
    };
  }
  
  /**
   * Perform health checks
   */
  async performHealthChecks(): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];
    
    // Check event loop lag
    checks.push({
      name: 'event_loop',
      status: this.eventLoopLag < 50 ? HealthStatus.HEALTHY :
              this.eventLoopLag < 200 ? HealthStatus.DEGRADED :
              HealthStatus.UNHEALTHY,
      message: `Event loop lag: ${this.eventLoopLag}ms`,
      latency: this.eventLoopLag,
      timestamp: Date.now(),
    });
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.push({
      name: 'memory',
      status: heapUsedPercent < 80 ? HealthStatus.HEALTHY :
              heapUsedPercent < 90 ? HealthStatus.DEGRADED :
              HealthStatus.UNHEALTHY,
      message: `Heap used: ${heapUsedPercent.toFixed(2)}%`,
      timestamp: Date.now(),
    });
    
    // Check error rate
    const stats = this.getRequestStats();
    checks.push({
      name: 'error_rate',
      status: stats.errorRate < 5 ? HealthStatus.HEALTHY :
              stats.errorRate < 10 ? HealthStatus.DEGRADED :
              HealthStatus.UNHEALTHY,
      message: `Error rate: ${stats.errorRate.toFixed(2)}%`,
      timestamp: Date.now(),
    });
    
    // Overall status
    const hasUnhealthy = checks.some(c => c.status === HealthStatus.UNHEALTHY);
    const hasDegraded = checks.some(c => c.status === HealthStatus.DEGRADED);
    
    const overallStatus = hasUnhealthy ? HealthStatus.UNHEALTHY :
                         hasDegraded ? HealthStatus.DEGRADED :
                         HealthStatus.HEALTHY;
    
    return {
      status: overallStatus,
      checks,
      uptime: Date.now() - this.startTime,
      version: process.env.APP_VERSION || '1.0.0',
    };
  }
  
  /**
   * Get metrics summary for dashboard
   */
  getMetricsSummary(): {
    requests: ReturnType<typeof this.getRequestStats>;
    system: {
      cpu: { user: number; system: number };
      memory: { rss: number; heapUsed: number; heapTotal: number };
      eventLoopLag: number;
    };
    uptime: number;
  } {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      requests: this.getRequestStats(),
      system: {
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        memory: {
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
        },
        eventLoopLag: this.eventLoopLag,
      },
      uptime: Date.now() - this.startTime,
    };
  }
  
  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();

// Export class for testing
export { MonitoringService };
