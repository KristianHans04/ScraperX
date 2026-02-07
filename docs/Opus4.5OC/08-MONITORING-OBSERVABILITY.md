# ScraperX Monitoring and Observability

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-DOC-008 |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Platform Team |
| Status | Draft |
| Classification | Internal |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Observability Architecture](#2-observability-architecture)
3. [Metrics Collection](#3-metrics-collection)
4. [Prometheus Configuration](#4-prometheus-configuration)
5. [Grafana Dashboards](#5-grafana-dashboards)
6. [Logging with Pino](#6-logging-with-pino)
7. [Distributed Tracing](#7-distributed-tracing)
8. [Alerting System](#8-alerting-system)
9. [Health Checks and SLIs](#9-health-checks-and-slis)
10. [Runbooks](#10-runbooks)
11. [Appendix](#11-appendix)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete monitoring and observability strategy for ScraperX, enabling real-time visibility into system health, performance, and business metrics.

### 1.2 Observability Goals

| Goal | Target | Priority |
|------|--------|----------|
| Mean Time to Detect (MTTD) | <5 minutes | Critical |
| Mean Time to Resolution (MTTR) | <30 minutes | Critical |
| Metrics Retention | 90 days detailed, 2 years aggregated | High |
| Log Retention | 30 days hot, 1 year cold | High |
| Trace Sampling Rate | 10% normal, 100% errors | Medium |

### 1.3 Three Pillars of Observability

```
+------------------------------------------------------------------+
|                     OBSERVABILITY PILLARS                         |
+------------------------------------------------------------------+
|                                                                   |
|     METRICS              LOGS                TRACES              |
|     (Prometheus)         (Pino/Loki)         (Jaeger)            |
|                                                                   |
|  +----------------+  +----------------+  +------------------+     |
|  | - Request rate |  | - Structured   |  | - Request flow   |     |
|  | - Error rate   |  |   JSON logs    |  | - Service deps   |     |
|  | - Latency      |  | - Error traces |  | - Bottlenecks    |     |
|  | - Saturation   |  | - Audit trail  |  | - Cross-service  |     |
|  | - Business KPIs|  | - Debug info   |  |   correlation    |     |
|  +----------------+  +----------------+  +------------------+     |
|          |                   |                   |                |
|          +-------------------+-------------------+                |
|                              |                                    |
|                     +----------------+                            |
|                     |    Grafana     |                            |
|                     | Unified View   |                            |
|                     +----------------+                            |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 2. Observability Architecture

### 2.1 System Overview

```
+------------------------------------------------------------------+
|                   MONITORING ARCHITECTURE                         |
+------------------------------------------------------------------+
|                                                                   |
|  COLLECTION LAYER                                                |
|  +----------------------------------------------------------+    |
|  |                                                           |    |
|  |  +----------+  +----------+  +----------+  +----------+  |    |
|  |  |   API    |  | Workers  |  |  Redis   |  |   PG     |  |    |
|  |  | /metrics |  | /metrics |  | Exporter |  | Exporter |  |    |
|  |  +----+-----+  +----+-----+  +----+-----+  +----+-----+  |    |
|  |       |             |             |             |         |    |
|  +-------|-------------|-------------|-------------|--------+    |
|          |             |             |             |              |
|          v             v             v             v              |
|  AGGREGATION LAYER                                               |
|  +----------------------------------------------------------+    |
|  |                                                           |    |
|  |  +--------------------------------------------------+    |    |
|  |  |              Prometheus Cluster                   |    |    |
|  |  |                                                   |    |    |
|  |  |  - Scrape targets every 15s                      |    |    |
|  |  |  - Store 90 days of metrics                      |    |    |
|  |  |  - HA with Thanos sidecar                        |    |    |
|  |  +--------------------------------------------------+    |    |
|  |                                                           |    |
|  +----------------------------------------------------------+    |
|                              |                                    |
|  STORAGE LAYER                                                   |
|  +----------------------------------------------------------+    |
|  |                                                           |    |
|  |  +--------------+  +--------------+  +--------------+    |    |
|  |  |    Thanos    |  |     Loki     |  |    Jaeger    |    |    |
|  |  |   (Metrics)  |  |    (Logs)    |  |   (Traces)   |    |    |
|  |  |              |  |              |  |              |    |    |
|  |  |  S3 backend  |  |  S3 backend  |  |  S3 backend  |    |    |
|  |  +--------------+  +--------------+  +--------------+    |    |
|  |                                                           |    |
|  +----------------------------------------------------------+    |
|                              |                                    |
|  VISUALIZATION LAYER                                             |
|  +----------------------------------------------------------+    |
|  |                                                           |    |
|  |  +--------------------------------------------------+    |    |
|  |  |                    Grafana                        |    |    |
|  |  |                                                   |    |    |
|  |  |  - Unified dashboards                            |    |    |
|  |  |  - Alerting                                      |    |    |
|  |  |  - On-call management                            |    |    |
|  |  +--------------------------------------------------+    |    |
|  |                                                           |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 2.2 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Metrics | Prometheus + Thanos | Time-series metrics |
| Logging | Pino + Loki | Structured logging |
| Tracing | OpenTelemetry + Jaeger | Distributed tracing |
| Visualization | Grafana | Unified dashboards |
| Alerting | Alertmanager + PagerDuty | Incident management |
| Uptime Monitoring | Grafana Synthetic | External monitoring |

---

## 3. Metrics Collection

### 3.1 Application Metrics

```typescript
// lib/metrics.ts

import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';

// Create a registry
export const registry = new Registry();

// Add default metrics (CPU, memory, event loop)
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register: registry });

// HTTP Request Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Scraping Metrics
export const scrapeJobsTotal = new Counter({
  name: 'scrape_jobs_total',
  help: 'Total number of scrape jobs',
  labelNames: ['engine', 'proxy_type', 'status'],
  registers: [registry],
});

export const scrapeJobDuration = new Histogram({
  name: 'scrape_job_duration_seconds',
  help: 'Scrape job duration in seconds',
  labelNames: ['engine', 'proxy_type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  registers: [registry],
});

export const scrapeJobsInProgress = new Gauge({
  name: 'scrape_jobs_in_progress',
  help: 'Number of scrape jobs currently in progress',
  labelNames: ['engine', 'worker_id'],
  registers: [registry],
});

// Queue Metrics
export const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name', 'status'],
  registers: [registry],
});

export const queueProcessingTime = new Histogram({
  name: 'queue_processing_time_seconds',
  help: 'Time spent processing queue jobs',
  labelNames: ['queue_name'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
  registers: [registry],
});

// Credit Metrics
export const creditsConsumed = new Counter({
  name: 'credits_consumed_total',
  help: 'Total credits consumed',
  labelNames: ['plan', 'engine', 'proxy_type'],
  registers: [registry],
});

// Proxy Metrics
export const proxyRequestsTotal = new Counter({
  name: 'proxy_requests_total',
  help: 'Total proxy requests',
  labelNames: ['provider', 'proxy_type', 'country', 'status'],
  registers: [registry],
});

export const proxyLatency = new Histogram({
  name: 'proxy_latency_seconds',
  help: 'Proxy request latency',
  labelNames: ['provider', 'proxy_type'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

// Browser Metrics
export const browserPoolSize = new Gauge({
  name: 'browser_pool_size',
  help: 'Number of browsers in the pool',
  labelNames: ['status'],
  registers: [registry],
});

export const browserPageLoadTime = new Histogram({
  name: 'browser_page_load_seconds',
  help: 'Browser page load time',
  labelNames: ['engine'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [registry],
});

// Anti-Detection Metrics
export const captchaEncountered = new Counter({
  name: 'captcha_encountered_total',
  help: 'Total CAPTCHAs encountered',
  labelNames: ['site_domain', 'captcha_type'],
  registers: [registry],
});

export const captchaSolved = new Counter({
  name: 'captcha_solved_total',
  help: 'Total CAPTCHAs solved',
  labelNames: ['site_domain', 'captcha_type', 'solver'],
  registers: [registry],
});

export const detectionScore = new Summary({
  name: 'detection_score',
  help: 'Bot detection score (0-1)',
  labelNames: ['site_domain'],
  percentiles: [0.5, 0.9, 0.99],
  registers: [registry],
});

// Business Metrics
export const activeSubscriptions = new Gauge({
  name: 'active_subscriptions',
  help: 'Number of active subscriptions',
  labelNames: ['plan'],
  registers: [registry],
});

export const monthlyRecurringRevenue = new Gauge({
  name: 'monthly_recurring_revenue_cents',
  help: 'Monthly recurring revenue in cents',
  registers: [registry],
});
```

### 3.2 Metrics Middleware

```typescript
// middleware/metrics.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  httpRequestsTotal,
  httpRequestDuration,
} from '../lib/metrics';

export async function metricsMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const startTime = process.hrtime.bigint();
  
  // Store for use in response hook
  request.metricsStartTime = startTime;
}

export function metricsResponseHook(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
): void {
  const startTime = request.metricsStartTime;
  if (!startTime) {
    done();
    return;
  }
  
  const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
  
  // Normalize path to avoid high cardinality
  const path = normalizePath(request.routerPath || request.url);
  
  // Record metrics
  httpRequestsTotal.inc({
    method: request.method,
    path,
    status_code: reply.statusCode,
  });
  
  httpRequestDuration.observe(
    {
      method: request.method,
      path,
      status_code: reply.statusCode,
    },
    duration,
  );
  
  done();
}

function normalizePath(path: string): string {
  // Replace UUIDs with placeholder
  path = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id',
  );
  
  // Replace numeric IDs
  path = path.replace(/\/\d+/g, '/:id');
  
  // Truncate query string
  const queryIndex = path.indexOf('?');
  if (queryIndex !== -1) {
    path = path.substring(0, queryIndex);
  }
  
  return path;
}
```

### 3.3 Metrics Endpoint

```typescript
// routes/metrics.ts

import { FastifyInstance } from 'fastify';
import { registry } from '../lib/metrics';

export async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
  // Internal metrics endpoint (not exposed publicly)
  fastify.get('/metrics', async (request, reply) => {
    // Basic auth for internal access
    const auth = request.headers.authorization;
    if (auth !== `Basic ${Buffer.from(process.env.METRICS_AUTH!).toString('base64')}`) {
      return reply.status(401).send('Unauthorized');
    }
    
    reply.header('Content-Type', registry.contentType);
    return registry.metrics();
  });
}
```

---

## 4. Prometheus Configuration

### 4.1 Prometheus Server Configuration

```yaml
# prometheus/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: scraperx-production
    replica: $(POD_NAME)

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Rule files
rule_files:
  - /etc/prometheus/rules/*.yml

# Scrape configurations
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # API servers
  - job_name: 'scraperx-api'
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        filters:
          - name: label
            values: ['com.scraperx.service=api']
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        target_label: instance
      - source_labels: [__meta_docker_container_label_com_scraperx_version]
        target_label: version

  # Workers
  - job_name: 'scraperx-workers'
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        filters:
          - name: label
            values: ['com.scraperx.service=worker']
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        target_label: instance
      - source_labels: [__meta_docker_container_label_com_scraperx_worker_type]
        target_label: worker_type

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    metrics_path: /scrape
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: redis-exporter:9121

  # PostgreSQL
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # MinIO
  - job_name: 'minio'
    metrics_path: /minio/v2/metrics/cluster
    scheme: http
    static_configs:
      - targets: ['minio:9000']

  # Node Exporter (host metrics)
  - job_name: 'node'
    static_configs:
      - targets:
          - 'node-exporter-1:9100'
          - 'node-exporter-2:9100'
          - 'node-exporter-3:9100'

  # Docker daemon
  - job_name: 'docker'
    static_configs:
      - targets: ['docker-exporter:9323']

# Remote write to Thanos for long-term storage
remote_write:
  - url: 'http://thanos-receive:19291/api/v1/receive'
```

### 4.2 Recording Rules

```yaml
# prometheus/rules/recording.yml

groups:
  - name: scraperx_recording_rules
    interval: 30s
    rules:
      # Request rate (5m average)
      - record: scraperx:http_requests:rate5m
        expr: sum(rate(http_requests_total[5m])) by (method, path, status_code)

      # Error rate
      - record: scraperx:http_error_rate:rate5m
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))

      # P50 latency
      - record: scraperx:http_latency:p50
        expr: histogram_quantile(0.5, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))

      # P95 latency
      - record: scraperx:http_latency:p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))

      # P99 latency
      - record: scraperx:http_latency:p99
        expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path))

      # Scrape success rate by engine
      - record: scraperx:scrape_success_rate:rate5m
        expr: |
          sum(rate(scrape_jobs_total{status="completed"}[5m])) by (engine)
          /
          sum(rate(scrape_jobs_total[5m])) by (engine)

      # Scrape job duration P95
      - record: scraperx:scrape_duration:p95
        expr: histogram_quantile(0.95, sum(rate(scrape_job_duration_seconds_bucket[5m])) by (le, engine))

      # Queue depth
      - record: scraperx:queue_depth:total
        expr: sum(queue_size) by (queue_name)

      # Credits consumed per hour
      - record: scraperx:credits_consumed:rate1h
        expr: sum(increase(credits_consumed_total[1h])) by (plan)

      # Active concurrent jobs
      - record: scraperx:concurrent_jobs:current
        expr: sum(scrape_jobs_in_progress) by (engine)

      # Proxy success rate by provider
      - record: scraperx:proxy_success_rate:rate5m
        expr: |
          sum(rate(proxy_requests_total{status="success"}[5m])) by (provider, proxy_type)
          /
          sum(rate(proxy_requests_total[5m])) by (provider, proxy_type)
```

### 4.3 Thanos Configuration

```yaml
# thanos/thanos-sidecar.yml

type: S3
config:
  bucket: scraperx-metrics
  endpoint: minio:9000
  access_key: ${MINIO_ACCESS_KEY}
  secret_key: ${MINIO_SECRET_KEY}
  insecure: true

---
# thanos/thanos-query.yml

apiVersion: v1
kind: ConfigMap
metadata:
  name: thanos-query-config
data:
  config.yml: |
    stores:
      - 'thanos-sidecar:10901'
      - 'thanos-store:10901'
    
    query:
      replica_label: replica
      auto_downsampling: true
```

---

## 5. Grafana Dashboards

### 5.1 Dashboard Structure

```
Grafana Dashboards/
├── Overview/
│   ├── Executive Dashboard (business KPIs)
│   └── Operations Dashboard (system health)
├── API/
│   ├── Request Metrics
│   ├── Latency Analysis
│   └── Error Analysis
├── Scraping/
│   ├── Job Metrics
│   ├── Engine Performance
│   └── Success Rates
├── Infrastructure/
│   ├── Node Metrics
│   ├── Container Metrics
│   └── Database Metrics
├── Business/
│   ├── Usage Analytics
│   ├── Revenue Metrics
│   └── Customer Health
└── Alerts/
    └── Active Alerts Dashboard
```

### 5.2 Executive Dashboard JSON

```json
{
  "dashboard": {
    "title": "ScraperX Executive Dashboard",
    "uid": "scraperx-executive",
    "tags": ["executive", "overview"],
    "timezone": "browser",
    "refresh": "1m",
    "panels": [
      {
        "id": 1,
        "title": "Requests Per Second",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))",
            "legendFormat": "RPS"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      },
      {
        "id": 2,
        "title": "Success Rate",
        "type": "gauge",
        "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "1 - scraperx:http_error_rate:rate5m",
            "legendFormat": "Success Rate"
          }
        ],
        "options": {
          "min": 0,
          "max": 1,
          "thresholds": {
            "steps": [
              { "value": 0, "color": "red" },
              { "value": 0.95, "color": "yellow" },
              { "value": 0.99, "color": "green" }
            ]
          }
        }
      },
      {
        "id": 3,
        "title": "P95 Latency",
        "type": "stat",
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000",
            "legendFormat": "P95 (ms)"
          }
        ],
        "options": {
          "unit": "ms"
        }
      },
      {
        "id": 4,
        "title": "Active Jobs",
        "type": "stat",
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(scrape_jobs_in_progress)",
            "legendFormat": "Active"
          }
        ]
      },
      {
        "id": 5,
        "title": "Request Volume (24h)",
        "type": "timeseries",
        "gridPos": { "x": 0, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (status_code)",
            "legendFormat": "{{status_code}}"
          }
        ],
        "options": {
          "legend": { "displayMode": "table" }
        }
      },
      {
        "id": 6,
        "title": "Scrape Success Rate by Engine",
        "type": "timeseries",
        "gridPos": { "x": 12, "y": 4, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "scraperx:scrape_success_rate:rate5m",
            "legendFormat": "{{engine}}"
          }
        ],
        "options": {
          "legend": { "displayMode": "table" }
        }
      },
      {
        "id": 7,
        "title": "Monthly Recurring Revenue",
        "type": "stat",
        "gridPos": { "x": 0, "y": 12, "w": 8, "h": 4 },
        "targets": [
          {
            "expr": "monthly_recurring_revenue_cents / 100",
            "legendFormat": "MRR"
          }
        ],
        "options": {
          "unit": "currencyUSD"
        }
      },
      {
        "id": 8,
        "title": "Active Subscriptions",
        "type": "piechart",
        "gridPos": { "x": 8, "y": 12, "w": 8, "h": 4 },
        "targets": [
          {
            "expr": "active_subscriptions",
            "legendFormat": "{{plan}}"
          }
        ]
      },
      {
        "id": 9,
        "title": "Credits Consumed (Today)",
        "type": "stat",
        "gridPos": { "x": 16, "y": 12, "w": 8, "h": 4 },
        "targets": [
          {
            "expr": "sum(increase(credits_consumed_total[24h]))",
            "legendFormat": "Credits"
          }
        ],
        "options": {
          "unit": "short"
        }
      }
    ]
  }
}
```

### 5.3 Operations Dashboard

```typescript
// grafana/dashboards/operations.ts

const operationsDashboard = {
  title: 'ScraperX Operations Dashboard',
  uid: 'scraperx-ops',
  rows: [
    {
      title: 'System Health',
      panels: [
        {
          title: 'API Response Time (P50/P95/P99)',
          type: 'timeseries',
          targets: [
            { expr: 'scraperx:http_latency:p50', legendFormat: 'P50' },
            { expr: 'scraperx:http_latency:p95', legendFormat: 'P95' },
            { expr: 'scraperx:http_latency:p99', legendFormat: 'P99' },
          ],
        },
        {
          title: 'Error Rate by Path',
          type: 'timeseries',
          targets: [
            {
              expr: 'sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (path) / sum(rate(http_requests_total[5m])) by (path)',
              legendFormat: '{{path}}',
            },
          ],
        },
      ],
    },
    {
      title: 'Queue Health',
      panels: [
        {
          title: 'Queue Depth',
          type: 'timeseries',
          targets: [
            { expr: 'scraperx:queue_depth:total', legendFormat: '{{queue_name}}' },
          ],
        },
        {
          title: 'Queue Processing Time',
          type: 'heatmap',
          targets: [
            {
              expr: 'sum(rate(queue_processing_time_seconds_bucket[5m])) by (le, queue_name)',
              legendFormat: '{{queue_name}}',
            },
          ],
        },
      ],
    },
    {
      title: 'Infrastructure',
      panels: [
        {
          title: 'CPU Usage by Service',
          type: 'timeseries',
          targets: [
            {
              expr: 'sum(rate(container_cpu_usage_seconds_total[5m])) by (container_name) * 100',
              legendFormat: '{{container_name}}',
            },
          ],
        },
        {
          title: 'Memory Usage by Service',
          type: 'timeseries',
          targets: [
            {
              expr: 'container_memory_usage_bytes / 1024 / 1024',
              legendFormat: '{{container_name}}',
            },
          ],
        },
        {
          title: 'Disk I/O',
          type: 'timeseries',
          targets: [
            { expr: 'rate(node_disk_read_bytes_total[5m])', legendFormat: 'Read' },
            { expr: 'rate(node_disk_written_bytes_total[5m])', legendFormat: 'Write' },
          ],
        },
      ],
    },
    {
      title: 'Database Health',
      panels: [
        {
          title: 'PostgreSQL Connections',
          type: 'gauge',
          targets: [
            { expr: 'pg_stat_activity_count', legendFormat: 'Active' },
            { expr: 'pg_settings_max_connections', legendFormat: 'Max' },
          ],
        },
        {
          title: 'Redis Memory Usage',
          type: 'gauge',
          targets: [
            { expr: 'redis_memory_used_bytes / redis_memory_max_bytes', legendFormat: 'Usage' },
          ],
        },
        {
          title: 'Redis Operations/sec',
          type: 'timeseries',
          targets: [
            { expr: 'rate(redis_commands_processed_total[5m])', legendFormat: 'ops/sec' },
          ],
        },
      ],
    },
  ],
};
```

---

## 6. Logging with Pino

### 6.1 Logger Configuration

```typescript
// lib/logger.ts

import pino, { Logger } from 'pino';

interface LogContext {
  requestId?: string;
  organizationId?: string;
  userId?: string;
  jobId?: string;
  [key: string]: any;
}

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  
  // Structured logging format
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      service: 'scraperx',
      version: process.env.APP_VERSION || 'unknown',
    }),
  },
  
  // Timestamp in ISO format
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Redact sensitive fields
  redact: {
    paths: [
      'authorization',
      'password',
      'apiKey',
      'secret',
      'token',
      '*.password',
      '*.apiKey',
      '*.secret',
      '*.token',
      'headers.authorization',
      'headers.x-api-key',
    ],
    remove: true,
  },
  
  // Base context
  base: {
    environment: process.env.NODE_ENV || 'development',
  },
};

// Create logger based on environment
let logger: Logger;

if (process.env.NODE_ENV === 'production') {
  // Production: JSON output for Loki
  logger = pino(baseConfig);
} else {
  // Development: Pretty print
  logger = pino({
    ...baseConfig,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });
}

export { logger };

// Create child logger with context
export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}

// Request-scoped logger
export function createRequestLogger(
  requestId: string,
  organizationId?: string,
): Logger {
  return logger.child({
    requestId,
    organizationId,
  });
}
```

### 6.2 Request Logging Middleware

```typescript
// middleware/request-logger.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { createRequestLogger } from '../lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function requestLoggerMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Generate or extract request ID
  const requestId = (request.headers['x-request-id'] as string) || uuidv4();
  
  // Set request ID header for correlation
  reply.header('x-request-id', requestId);
  
  // Create request-scoped logger
  const apiKey = (request as any).apiKey;
  request.log = createRequestLogger(requestId, apiKey?.organizationId);
  
  // Log request start
  request.log.info({
    event: 'request_start',
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
  });
}

export function requestLoggerResponseHook(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
): void {
  // Log request completion
  request.log.info({
    event: 'request_complete',
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.getResponseTime(),
  });
  
  done();
}

export function requestLoggerErrorHook(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error({
    event: 'request_error',
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  });
}
```

### 6.3 Loki Configuration

```yaml
# loki/loki-config.yml

auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: s3
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: s3
  aws:
    s3: s3://scraperx-logs
    s3forcepathstyle: true
    endpoint: minio:9000
    access_key_id: ${MINIO_ACCESS_KEY}
    secret_access_key: ${MINIO_SECRET_KEY}
    insecure: true

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32
  max_streams_per_user: 10000

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days

---
# promtail/promtail-config.yml

server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_label_com_scraperx_service']
        target_label: 'service'
    pipeline_stages:
      - json:
          expressions:
            level: level
            msg: msg
            requestId: requestId
            organizationId: organizationId
      - labels:
          level:
          requestId:
          organizationId:
```

---

## 7. Distributed Tracing

### 7.1 OpenTelemetry Setup

```typescript
// lib/tracing.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  AlwaysOnSampler,
} from '@opentelemetry/sdk-trace-base';

// Custom sampler: Always trace errors, sample 10% of successes
class ScraperXSampler extends ParentBasedSampler {
  constructor() {
    super({
      root: new TraceIdRatioBasedSampler(0.1), // 10% sampling
    });
  }
}

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'scraperx',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
  }),
  
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable noisy fs instrumentation
      },
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/health', '/metrics'],
      },
    }),
  ],
  
  sampler: new ScraperXSampler(),
});

// Start the SDK
export function initTracing(): void {
  sdk.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.error('Error shutting down tracing', error))
      .finally(() => process.exit(0));
  });
}

export { sdk };
```

### 7.2 Custom Span Creation

```typescript
// lib/trace-helpers.ts

import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('scraperx');

export interface TraceOptions {
  attributes?: Record<string, string | number | boolean>;
}

// Wrap async function with tracing
export function traced<T>(
  name: string,
  fn: () => Promise<T>,
  options?: TraceOptions,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (options?.attributes) {
        span.setAttributes(options.attributes);
      }
      
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Create span for scrape job
export function createScrapeSpan(
  jobId: string,
  url: string,
  engine: string,
): Span {
  return tracer.startSpan('scrape_job', {
    attributes: {
      'scrape.job_id': jobId,
      'scrape.url': url,
      'scrape.engine': engine,
    },
  });
}

// Add event to current span
export function addSpanEvent(name: string, attributes?: Record<string, any>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

// Set span error
export function setSpanError(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
  }
}
```

### 7.3 Jaeger Configuration

```yaml
# jaeger/jaeger-config.yml

collector:
  zipkin:
    host-port: :9411
  otlp:
    enabled: true
    grpc:
      host-port: :4317
    http:
      host-port: :4318

storage:
  type: elasticsearch
  elasticsearch:
    server-urls: http://elasticsearch:9200
    index-prefix: scraperx-traces
    
sampling:
  type: adaptive
  options:
    target-samples-per-second: 100
    sampling-refresh-interval: 10s
    initial-sampling-probability: 0.1
    
query:
  base-path: /jaeger
  
processor:
  jaeger-binary:
    workers: 10
    queue-size: 2000
```

---

## 8. Alerting System

### 8.1 Alertmanager Configuration

```yaml
# alertmanager/alertmanager.yml

global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.sendgrid.net:587'
  smtp_from: 'alerts@scraperx.io'
  smtp_auth_username: 'apikey'
  smtp_auth_password: ${SENDGRID_API_KEY}
  slack_api_url: ${SLACK_WEBHOOK_URL}
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  receiver: 'default'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  
  routes:
    # Critical alerts -> PagerDuty immediately
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      group_wait: 0s
      repeat_interval: 1h
    
    # High alerts -> PagerDuty + Slack
    - match:
        severity: high
      receiver: 'pagerduty-high'
      group_wait: 1m
      repeat_interval: 2h
    
    # Warning alerts -> Slack only
    - match:
        severity: warning
      receiver: 'slack-warnings'
      group_wait: 5m
      repeat_interval: 6h

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: ${PAGERDUTY_CRITICAL_KEY}
        severity: critical
        description: '{{ .GroupLabels.alertname }}'
        details:
          firing: '{{ template "pagerduty.default.instances" .Alerts.Firing }}'
    slack_configs:
      - channel: '#alerts-critical'
        send_resolved: true
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'

  - name: 'pagerduty-high'
    pagerduty_configs:
      - service_key: ${PAGERDUTY_HIGH_KEY}
        severity: error
    slack_configs:
      - channel: '#alerts'
        send_resolved: true

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        color: 'warning'

inhibit_rules:
  # Don't send warning if critical is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname']
  
  # Don't send high if critical is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'high'
    equal: ['alertname']
```

### 8.2 Alert Rules

```yaml
# prometheus/rules/alerts.yml

groups:
  - name: scraperx_critical_alerts
    rules:
      # Service Down
      - alert: ServiceDown
        expr: up{job=~"scraperx-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute."
          runbook: "https://wiki.scraperx.io/runbooks/service-down"

      # High Error Rate
      - alert: HighErrorRate
        expr: scraperx:http_error_rate:rate5m > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ printf \"%.2f\" $value | mul 100 }}% (threshold: 5%)"
          runbook: "https://wiki.scraperx.io/runbooks/high-error-rate"

      # Database Connection Pool Exhausted
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL connection pool nearly exhausted"
          description: "{{ printf \"%.0f\" $value | mul 100 }}% of connections in use"

  - name: scraperx_high_alerts
    rules:
      # High Latency
      - alert: HighLatency
        expr: scraperx:http_latency:p95 > 5
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "High API latency detected"
          description: "P95 latency is {{ printf \"%.2f\" $value }}s (threshold: 5s)"

      # Queue Backlog
      - alert: QueueBacklog
        expr: scraperx:queue_depth:total > 10000
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Job queue backlog growing"
          description: "Queue {{ $labels.queue_name }} has {{ printf \"%.0f\" $value }} pending jobs"

      # Scrape Success Rate Low
      - alert: LowScrapeSuccessRate
        expr: scraperx:scrape_success_rate:rate5m < 0.9
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "Low scrape success rate"
          description: "{{ $labels.engine }} engine success rate is {{ printf \"%.2f\" $value | mul 100 }}%"

      # Redis Memory High
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Redis memory usage high"
          description: "Redis is using {{ printf \"%.0f\" $value | mul 100 }}% of max memory"

  - name: scraperx_warning_alerts
    rules:
      # Certificate Expiring
      - alert: SSLCertificateExpiring
        expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "Certificate for {{ $labels.instance }} expires in {{ printf \"%.0f\" $value | div 86400 }} days"

      # Disk Space Low
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk space running low"
          description: "{{ $labels.mountpoint }} has {{ printf \"%.0f\" $value | mul 100 }}% free"

      # High CPU Usage
      - alert: HighCPUUsage
        expr: sum(rate(container_cpu_usage_seconds_total[5m])) by (container_name) > 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "{{ $labels.container_name }} CPU usage is {{ printf \"%.0f\" $value | mul 100 }}%"

      # Proxy Provider Degraded
      - alert: ProxyProviderDegraded
        expr: scraperx:proxy_success_rate:rate5m < 0.95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Proxy provider performance degraded"
          description: "{{ $labels.provider }} success rate is {{ printf \"%.2f\" $value | mul 100 }}%"
```

### 8.3 Alert Notification Templates

```yaml
# alertmanager/templates/scraperx.tmpl

{{ define "slack.scraperx.title" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .GroupLabels.alertname }}
{{ end }}

{{ define "slack.scraperx.text" }}
{{ range .Alerts }}
*Alert:* {{ .Annotations.summary }}
*Severity:* {{ .Labels.severity }}
*Description:* {{ .Annotations.description }}
*Runbook:* {{ .Annotations.runbook }}
{{ if .Labels.instance }}*Instance:* {{ .Labels.instance }}{{ end }}
{{ end }}
{{ end }}

{{ define "slack.scraperx.color" }}
{{ if eq .Status "firing" }}
{{ if eq (index .Alerts 0).Labels.severity "critical" }}danger{{ else if eq (index .Alerts 0).Labels.severity "high" }}warning{{ else }}#439FE0{{ end }}
{{ else }}good{{ end }}
{{ end }}
```

---

## 9. Health Checks and SLIs

### 9.1 Health Check Endpoints

```typescript
// routes/health.ts

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { Redis } from 'ioredis';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    latency?: number;
    message?: string;
  }[];
  version: string;
  uptime: number;
}

export async function healthRoutes(
  fastify: FastifyInstance,
  db: Pool,
  redis: Redis,
): Promise<void> {
  // Liveness probe (is the process running?)
  fastify.get('/health/live', async () => {
    return { status: 'ok' };
  });

  // Readiness probe (can we serve traffic?)
  fastify.get('/health/ready', async (request, reply) => {
    const checks = await Promise.all([
      checkDatabase(db),
      checkRedis(redis),
    ]);

    const allPassing = checks.every(c => c.status === 'pass');
    const anyFailing = checks.some(c => c.status === 'fail');

    const status: HealthStatus = {
      status: anyFailing ? 'unhealthy' : allPassing ? 'healthy' : 'degraded',
      checks,
      version: process.env.APP_VERSION || 'unknown',
      uptime: process.uptime(),
    };

    const statusCode = anyFailing ? 503 : 200;
    return reply.status(statusCode).send(status);
  });

  // Detailed health check
  fastify.get('/health/details', async (request, reply) => {
    const checks = await Promise.all([
      checkDatabase(db),
      checkRedis(redis),
      checkMinIO(),
      checkQueueHealth(redis),
      checkWorkerHealth(redis),
    ]);

    const status: HealthStatus = {
      status: determineOverallStatus(checks),
      checks,
      version: process.env.APP_VERSION || 'unknown',
      uptime: process.uptime(),
    };

    return reply.send(status);
  });
}

async function checkDatabase(db: Pool): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.query('SELECT 1');
    return {
      name: 'postgresql',
      status: 'pass',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'postgresql',
      status: 'fail',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedis(redis: Redis): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      name: 'redis',
      status: 'pass',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'fail',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkMinIO(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const response = await fetch(`${process.env.MINIO_ENDPOINT}/minio/health/live`);
    return {
      name: 'minio',
      status: response.ok ? 'pass' : 'warn',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'minio',
      status: 'fail',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkQueueHealth(redis: Redis): Promise<HealthCheck> {
  try {
    const queueDepth = await redis.llen('bull:scrape:http:wait');
    const status = queueDepth > 10000 ? 'warn' : 'pass';
    return {
      name: 'queue',
      status,
      message: `${queueDepth} jobs in queue`,
    };
  } catch (error) {
    return {
      name: 'queue',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkWorkerHealth(redis: Redis): Promise<HealthCheck> {
  try {
    const workers = await redis.smembers('scraperx:workers:active');
    const activeCount = workers.length;
    const status = activeCount === 0 ? 'fail' : activeCount < 3 ? 'warn' : 'pass';
    return {
      name: 'workers',
      status,
      message: `${activeCount} active workers`,
    };
  } catch (error) {
    return {
      name: 'workers',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
  if (checks.some(c => c.status === 'fail')) return 'unhealthy';
  if (checks.some(c => c.status === 'warn')) return 'degraded';
  return 'healthy';
}
```

### 9.2 Service Level Indicators (SLIs)

```yaml
# prometheus/rules/sli.yml

groups:
  - name: scraperx_sli
    interval: 1m
    rules:
      # Availability SLI
      - record: sli:availability:ratio
        expr: |
          1 - (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          )

      # Latency SLI (requests < 1s)
      - record: sli:latency:ratio
        expr: |
          sum(rate(http_request_duration_seconds_bucket{le="1"}[5m]))
          /
          sum(rate(http_request_duration_seconds_count[5m]))

      # Scrape Success SLI
      - record: sli:scrape_success:ratio
        expr: |
          sum(rate(scrape_jobs_total{status="completed"}[5m]))
          /
          sum(rate(scrape_jobs_total[5m]))

      # Error Budget Remaining (30-day window)
      - record: sli:error_budget:remaining
        expr: |
          1 - (
            (1 - avg_over_time(sli:availability:ratio[30d]))
            /
            (1 - 0.999)
          )
```

### 9.3 SLO Dashboard

```json
{
  "dashboard": {
    "title": "ScraperX SLO Dashboard",
    "uid": "scraperx-slo",
    "panels": [
      {
        "id": 1,
        "title": "Availability SLO (99.9%)",
        "type": "gauge",
        "targets": [
          {
            "expr": "sli:availability:ratio",
            "legendFormat": "Availability"
          }
        ],
        "options": {
          "min": 0.99,
          "max": 1,
          "thresholds": {
            "steps": [
              { "value": 0.99, "color": "red" },
              { "value": 0.995, "color": "yellow" },
              { "value": 0.999, "color": "green" }
            ]
          }
        }
      },
      {
        "id": 2,
        "title": "Latency SLO (95% < 1s)",
        "type": "gauge",
        "targets": [
          {
            "expr": "sli:latency:ratio",
            "legendFormat": "< 1s"
          }
        ],
        "options": {
          "min": 0.9,
          "max": 1,
          "thresholds": {
            "steps": [
              { "value": 0.9, "color": "red" },
              { "value": 0.93, "color": "yellow" },
              { "value": 0.95, "color": "green" }
            ]
          }
        }
      },
      {
        "id": 3,
        "title": "Error Budget Remaining (30d)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sli:error_budget:remaining * 100",
            "legendFormat": "Error Budget %"
          }
        ],
        "options": {
          "unit": "percent"
        }
      },
      {
        "id": 4,
        "title": "SLO Burn Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "(1 - sli:availability:ratio) / (1 - 0.999)",
            "legendFormat": "Burn Rate"
          }
        ],
        "options": {
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "value": 1, "color": "green" },
              { "value": 2, "color": "yellow" },
              { "value": 10, "color": "red" }
            ]
          }
        }
      }
    ]
  }
}
```

---

## 10. Runbooks

### 10.1 High Error Rate Runbook

```markdown
# Runbook: High Error Rate

## Alert
**Name:** HighErrorRate
**Severity:** Critical
**Threshold:** >5% error rate for 2 minutes

## Symptoms
- HTTP 5xx responses increasing
- Customer complaints about failures
- Error rate alert firing

## Diagnosis

### Step 1: Check Error Distribution
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (status_code, path)
```

### Step 2: Check Recent Deployments
```bash
kubectl get deployments -o wide
kubectl rollout history deployment/scraperx-api
```

### Step 3: Check Logs
```bash
# In Grafana Loki
{service="scraperx-api"} |= "error" | json | level="error"
```

### Step 4: Check Dependencies
- PostgreSQL: `pg_stat_activity_count`
- Redis: `redis_connected_clients`
- MinIO: Health endpoint

## Remediation

### If Recent Deployment
```bash
kubectl rollout undo deployment/scraperx-api
```

### If Database Issues
```bash
# Check connections
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Kill long-running queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE duration > interval '5 minutes';
```

### If Rate Limiting Issues
```bash
# Check rate limit violations
redis-cli KEYS "scrx:ratelimit:*" | head -20

# Clear specific limits if needed
redis-cli DEL "scrx:ratelimit:org:xxx"
```

## Escalation
- After 15 minutes: Page on-call engineer
- After 30 minutes: Page engineering lead
- After 1 hour: Page CTO

## Post-Incident
1. Create incident report
2. Update this runbook if needed
3. Add automation to prevent recurrence
```

### 10.2 Queue Backlog Runbook

```markdown
# Runbook: Queue Backlog

## Alert
**Name:** QueueBacklog
**Severity:** High
**Threshold:** >10,000 pending jobs for 5 minutes

## Symptoms
- Jobs taking longer to process
- Queue depth increasing
- Customer complaints about slow responses

## Diagnosis

### Step 1: Check Queue Metrics
```promql
queue_size{queue_name="scrape:http", status="waiting"}
```

### Step 2: Check Worker Status
```bash
# Active workers
redis-cli SMEMBERS "scraperx:workers:active"

# Worker health
curl http://worker-1:3000/health
```

### Step 3: Check Processing Rate
```promql
rate(queue_processing_time_seconds_count[5m])
```

## Remediation

### Scale Workers
```bash
# Docker Swarm
docker service scale scraperx_worker=20

# Kubernetes
kubectl scale deployment scraperx-worker --replicas=20
```

### Check for Stuck Jobs
```bash
# Find jobs running > 10 minutes
redis-cli ZRANGEBYSCORE "bull:scrape:http:active" 0 $(($(date +%s)*1000 - 600000))
```

### Clear Dead Jobs
```bash
# Remove completed jobs older than 1 hour
redis-cli ZREMRANGEBYSCORE "bull:scrape:http:completed" 0 $(($(date +%s)*1000 - 3600000))
```

## Prevention
- Set up auto-scaling based on queue depth
- Monitor processing time trends
- Set job timeouts appropriately
```

---

## 11. Appendix

### 11.1 Metrics Reference

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, path, status_code | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, path, status_code | Request latency |
| `scrape_jobs_total` | Counter | engine, proxy_type, status | Total scrape jobs |
| `scrape_job_duration_seconds` | Histogram | engine, proxy_type | Job duration |
| `scrape_jobs_in_progress` | Gauge | engine, worker_id | Current active jobs |
| `queue_size` | Gauge | queue_name, status | Queue depth |
| `credits_consumed_total` | Counter | plan, engine, proxy_type | Credits used |
| `proxy_requests_total` | Counter | provider, proxy_type, country, status | Proxy requests |
| `captcha_encountered_total` | Counter | site_domain, captcha_type | CAPTCHAs seen |
| `active_subscriptions` | Gauge | plan | Active subscriptions |

### 11.2 Log Levels and Usage

| Level | Usage | Example |
|-------|-------|---------|
| `fatal` | Application cannot continue | Database connection failed at startup |
| `error` | Operation failed, but app continues | Scrape job failed |
| `warn` | Potential problem | Rate limit approaching |
| `info` | Normal operation events | Request completed |
| `debug` | Debugging information | Cache hit/miss |
| `trace` | Very detailed debugging | Full request/response bodies |

### 11.3 Dashboard URLs

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Executive | /d/scraperx-executive | Business KPIs |
| Operations | /d/scraperx-ops | System health |
| API | /d/scraperx-api | API performance |
| Scraping | /d/scraperx-scraping | Scrape metrics |
| Infrastructure | /d/scraperx-infra | Server metrics |
| SLO | /d/scraperx-slo | Service levels |

---

## Document Control

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-31 | Platform Team | Initial release |

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Platform Lead | | | |
| SRE Lead | | | |
| Engineering Manager | | | |

### Distribution

This document is approved for internal distribution to the ScraperX engineering, platform, and SRE teams.
