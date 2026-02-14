# Scrapifie Architecture Overview
## System Design and Component Specification

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Classification:** Internal - Technical Documentation

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Core Components](#2-core-components)
3. [Request Processing Flow](#3-request-processing-flow)
4. [Worker Architecture](#4-worker-architecture)
5. [Proxy Management Layer](#5-proxy-management-layer)
6. [Data Flow and Storage](#6-data-flow-and-storage)
7. [Infrastructure Topology](#7-infrastructure-topology)
8. [Scalability Architecture](#8-scalability-architecture)
9. [Failure Handling](#9-failure-handling)
10. [Technology Stack Summary](#10-technology-stack-summary)

---

## 1. High-Level Architecture

### 1.1 System Overview Diagram

```
+-----------------------------------------------------------------------------------+
|                                    CLIENTS                                         |
|  +------------+  +------------+  +------------+  +------------+  +--------------+ |
|  |   Python   |  |  Node.js   |  |     Go     |  |    cURL    |  |   Customer   | |
|  |    SDK     |  |    SDK     |  |    SDK     |  |   / REST   |  | Applications | |
|  +-----+------+  +-----+------+  +-----+------+  +-----+------+  +-------+------+ |
|        |               |               |               |                 |        |
+--------|---------------|---------------|---------------|-----------------|--------+
         |               |               |               |                 |
         +-------+-------+-------+-------+-------+-------+-------+---------+
                 |                       |                       |
                 v                       v                       v
+-----------------------------------------------------------------------------------+
|                              LOAD BALANCER LAYER                                   |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                            TRAEFIK REVERSE PROXY                            |  |
|  |  +-------------------+  +-------------------+  +-------------------------+  |  |
|  |  | TLS Termination   |  |  Health Checks    |  |  Request Rate Limiting  |  |  |
|  |  +-------------------+  +-------------------+  +-------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                                  API LAYER                                         |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                      FASTIFY API SERVERS (Replicated x3+)                   |  |
|  |                                                                             |  |
|  |  +------------------+  +------------------+  +------------------+           |  |
|  |  |  Authentication  |  |   Rate Limiting  |  |    Validation    |           |  |
|  |  |     Plugin       |  |      Plugin      |  |      Plugin      |           |  |
|  |  +------------------+  +------------------+  +------------------+           |  |
|  |                                                                             |  |
|  |  +------------------+  +------------------+  +------------------+           |  |
|  |  |  POST /scrape    |  |  POST /batch     |  |  GET /jobs/:id   |           |  |
|  |  +------------------+  +------------------+  +------------------+           |  |
|  |                                                                             |  |
|  |  +------------------+  +------------------+  +------------------+           |  |
|  |  |  GET /account    |  |  POST /webhooks  |  |   GET /usage     |           |  |
|  |  +------------------+  +------------------+  +------------------+           |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
         |                       |                       |
         v                       v                       v
+------------------+   +------------------+   +-------------------------+
|      REDIS       |   |   POSTGRESQL     |   |     MINIO (S3)          |
|                  |   |                  |   |                         |
| - BullMQ Queues  |   | - Users          |   | - Screenshots           |
| - Session Cache  |   | - API Keys       |   | - HTML Responses        |
| - Rate Limits    |   | - Jobs           |   | - Extracted Data        |
| - Proxy Stats    |   | - Usage Logs     |   | - Error Snapshots       |
|                  |   | - Subscriptions  |   |                         |
+------------------+   +------------------+   +-------------------------+
         |
         v
+-----------------------------------------------------------------------------------+
|                              JOB QUEUE LAYER (BULLMQ)                              |
|                                                                                    |
|  +------------------+  +------------------+  +------------------+                  |
|  |   scrape:http    |  |  scrape:browser  |  |  scrape:stealth  |                  |
|  |  (Static pages)  |  |  (JS-rendered)   |  |   (Camoufox)     |                  |
|  +--------+---------+  +--------+---------+  +--------+---------+                  |
|           |                     |                     |                            |
|  +--------+---------+  +--------+---------+  +--------+---------+                  |
|  |   extract:data   |  |   webhook:send   |  |   cleanup:jobs   |                  |
|  +------------------+  +------------------+  +------------------+                  |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                              WORKER LAYER                                          |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                        HTTP WORKERS (Scaled x10-50)                         |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  impit HTTP Client with TLS Fingerprint Spoofing                      |  |  |
|  |  |  - Chrome/Firefox/Safari TLS fingerprints                             |  |  |
|  |  |  - HTTP/2 and HTTP/3 support                                          |  |  |
|  |  |  - Header generation via fingerprint-suite                            |  |  |
|  |  |  - Proxy rotation across providers                                    |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                      BROWSER WORKERS (Scaled x5-20)                         |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  Playwright Browser Pool                                              |  |  |
|  |  |  - Chromium instances (3-5 per worker container)                      |  |  |
|  |  |  - Fingerprint injection via fingerprint-injector                     |  |  |
|  |  |  - Stealth plugins (puppeteer-extra-plugin-stealth)                   |  |  |
|  |  |  - Human behavior simulation                                          |  |  |
|  |  |  - Screenshot and content capture                                     |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                      STEALTH WORKERS (Scaled x2-5)                          |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  Camoufox (Python Bridge)                                             |  |  |
|  |  |  - Native Firefox TLS fingerprint                                     |  |  |
|  |  |  - Built-in fingerprint spoofing                                      |  |  |
|  |  |  - Advanced behavior simulation                                       |  |  |
|  |  |  - For Akamai/Kasada/PerimeterX protected sites                       |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                          EXTERNAL SERVICES LAYER                                   |
|                                                                                    |
|  +---------------------------+  +---------------------------+                      |
|  |     PROXY PROVIDERS       |  |    CAPTCHA SERVICES       |                      |
|  |                           |  |                           |                      |
|  |  +---------------------+  |  |  +---------------------+  |                      |
|  |  |    Bright Data      |  |  |  |     2Captcha        |  |                      |
|  |  | - Datacenter        |  |  |  | - reCAPTCHA v2/v3   |  |                      |
|  |  | - Residential       |  |  |  | - hCaptcha          |  |                      |
|  |  | - Mobile            |  |  |  | - Cloudflare        |  |                      |
|  |  +---------------------+  |  |  +---------------------+  |                      |
|  |                           |  |                           |                      |
|  |  +---------------------+  |  |  +---------------------+  |                      |
|  |  |      Oxylabs        |  |  |  |   Anti-Captcha      |  |                      |
|  |  +---------------------+  |  |  |    (Fallback)       |  |                      |
|  |                           |  |  +---------------------+  |                      |
|  |  +---------------------+  |  |                           |                      |
|  |  |    Smartproxy       |  |  |                           |                      |
|  |  |    (Fallback)       |  |  |                           |                      |
|  |  +---------------------+  |  |                           |                      |
|  +---------------------------+  +---------------------------+                      |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                          MONITORING AND OBSERVABILITY                              |
|                                                                                    |
|  +------------------+  +------------------+  +------------------+                  |
|  |   PROMETHEUS     |  |     GRAFANA      |  |    ALERTING      |                  |
|  |                  |  |                  |  |                  |                  |
|  | - API Metrics    |  | - Dashboards     |  | - Discord        |                  |
|  | - Worker Metrics |  | - Visualizations |  | - Slack          |                  |
|  | - Queue Metrics  |  | - Alerts Config  |  | - PagerDuty      |                  |
|  | - Proxy Metrics  |  |                  |  | - Email          |                  |
|  +------------------+  +------------------+  +------------------+                  |
+-----------------------------------------------------------------------------------+
```

### 1.2 Architecture Principles

The Scrapifie architecture adheres to the following design principles:

**Separation of Concerns**

Each layer handles a specific responsibility:
- API layer handles request validation, authentication, and routing
- Queue layer manages job distribution and prioritization
- Worker layer executes scraping operations
- Storage layer persists data and state

**Horizontal Scalability**

All stateless components can scale horizontally:
- API servers scale based on request volume
- Workers scale based on queue depth
- No single points of failure in processing path

**Fault Tolerance**

The system continues operating despite component failures:
- Multiple API server replicas behind load balancer
- Job queues persist in Redis with automatic retries
- Circuit breakers prevent cascade failures
- Graceful degradation when external services fail

**Resource Efficiency**

Optimal resource utilization through:
- Connection pooling for databases and proxies
- Browser instance reuse via pooling
- Lazy loading of heavy resources
- Automatic cleanup of idle resources

---

## 2. Core Components

### 2.1 API Layer (Fastify)

**Purpose:** Accept client requests, authenticate users, validate input, queue jobs, return results

**Framework Selection Rationale:**

| Framework | Performance | TypeScript | Ecosystem | Decision |
|-----------|-------------|------------|-----------|----------|
| Fastify | Excellent | Native | Strong | Selected |
| Express | Good | Via types | Extensive | Rejected (performance) |
| Hono | Excellent | Native | Growing | Rejected (maturity) |

**Key Features:**

- Schema-based request validation using JSON Schema
- Plugin architecture for modular functionality
- Built-in serialization optimization
- Native TypeScript support with full type inference
- Lifecycle hooks for request/response manipulation

**Core Dependencies:**

```
fastify: ^4.x              - Core framework
@fastify/jwt: ^8.x         - JWT token support
@fastify/rate-limit: ^9.x  - Per-key rate limiting
@fastify/swagger: ^8.x     - OpenAPI documentation
@fastify/cors: ^9.x        - CORS handling
@fastify/helmet: ^11.x     - Security headers
zod: ^3.x                  - Runtime type validation
```

**API Server Configuration:**

```typescript
interface ApiServerConfig {
  port: number;                    // Default: 3000
  host: string;                    // Default: 0.0.0.0
  maxParamLength: number;          // Default: 200
  bodyLimit: number;               // Default: 10MB
  connectionTimeout: number;       // Default: 30000ms
  keepAliveTimeout: number;        // Default: 72000ms
  requestTimeout: number;          // Default: 60000ms
  trustProxy: boolean;             // Default: true (behind Traefik)
}
```

### 2.2 Job Queue (BullMQ)

**Purpose:** Distribute work across workers, manage retries, track job progress, ensure delivery

**Queue Selection Rationale:**

| Queue System | Backend | Features | TypeScript | Decision |
|--------------|---------|----------|------------|----------|
| BullMQ | Redis | Excellent | Native | Selected |
| Agenda | MongoDB | Good | Limited | Rejected |
| pg-boss | PostgreSQL | Good | Good | Rejected (Redis preference) |

**Queue Definitions:**

| Queue Name | Purpose | Default Concurrency | Priority |
|------------|---------|---------------------|----------|
| `scrape:http` | Static page HTTP requests | 100 | Normal (0) |
| `scrape:browser` | JavaScript-rendered pages | 20 | Normal (0) |
| `scrape:stealth` | Protected sites via Camoufox | 5 | High (-10) |
| `extract:data` | Post-scrape data extraction | 50 | Low (10) |
| `webhook:send` | Result delivery to customers | 20 | Normal (0) |
| `cleanup:jobs` | Garbage collection | 5 | Low (20) |

**Job Configuration:**

```typescript
interface ScrapeJobData {
  jobId: string;
  userId: string;
  url: string;
  options: ScrapeOptions;
  attempts: number;
  createdAt: Date;
  priority: number;
}

interface ScrapeJobOptions {
  attempts: number;              // Default: 3
  backoff: {
    type: 'exponential';
    delay: number;               // Default: 2000ms
  };
  removeOnComplete: {
    age: number;                 // Default: 3600 (1 hour)
    count: number;               // Default: 1000
  };
  removeOnFail: {
    age: number;                 // Default: 86400 (24 hours)
  };
}
```

**Job Flow State Machine:**

```
                    +-------------------+
                    |      CREATED      |
                    +--------+----------+
                             |
                             v
                    +--------+----------+
                    |      WAITING      |
                    +--------+----------+
                             |
                             v
                    +--------+----------+
              +---->|      ACTIVE       |<----+
              |     +--------+----------+     |
              |              |                |
              |    +---------+---------+      |
              |    |                   |      |
              v    v                   v      |
     +--------+----+---+      +--------+------+---+
     |    COMPLETED    |      |      FAILED       |
     +-----------------+      +--------+----------+
                                       |
                              (if attempts < max)
                                       |
                                       v
                              +--------+----------+
                              |    DELAYED        |
                              | (backoff period)  |
                              +-------------------+
```

### 2.3 HTTP Workers (impit)

**Purpose:** Handle static pages and API endpoints with TLS fingerprint spoofing

**Capabilities:**

- Chrome, Firefox, and Safari TLS fingerprint impersonation
- HTTP/2 and HTTP/3 protocol support
- Consistent header generation matching fingerprint
- Proxy authentication and rotation
- Cookie and session management
- Automatic redirect following
- Response decompression

**Resource Requirements:**

| Metric | Value |
|--------|-------|
| Memory per worker | 100-200 MB |
| CPU per worker | 0.1-0.5 cores |
| Connections per worker | 50-100 concurrent |
| Requests per second | 100-500 |

**Worker Configuration:**

```typescript
interface HttpWorkerConfig {
  concurrency: number;           // Default: 50
  timeout: number;               // Default: 30000ms
  maxRedirects: number;          // Default: 5
  decompress: boolean;           // Default: true
  impersonate: BrowserType;      // Default: 'chrome120'
  proxyRotation: 'per-request' | 'per-session';
}
```

### 2.4 Browser Workers (Playwright)

**Purpose:** Render JavaScript-heavy pages with anti-detection measures

**Browser Engine Support:**

| Engine | Use Case | Memory | Startup Time |
|--------|----------|--------|--------------|
| Chromium | Primary, most compatible | 300-500 MB | 1-2 seconds |
| Firefox | Fallback, different fingerprint | 350-550 MB | 1-3 seconds |
| WebKit | Safari emulation | 250-400 MB | 1-2 seconds |

**Browser Pool Configuration:**

```typescript
interface BrowserPoolConfig {
  maxBrowsersPerWorker: number;      // Default: 5
  maxPagesPerBrowser: number;        // Default: 3
  browserRecycleCount: number;       // Default: 20 (recycle after N pages)
  browserIdleTimeout: number;        // Default: 60000ms
  launchTimeout: number;             // Default: 30000ms
  navigationTimeout: number;         // Default: 30000ms
}
```

**Anti-Detection Integration:**

```typescript
interface StealthConfig {
  fingerprintInjection: boolean;     // Default: true
  stealthPlugins: boolean;           // Default: true
  humanBehavior: {
    mouseMovement: boolean;          // Default: true
    scrollSimulation: boolean;       // Default: true
    typingDelay: [number, number];   // Default: [50, 150]ms
  };
  headerConsistency: boolean;        // Default: true
}
```

### 2.5 Stealth Workers (Camoufox)

**Purpose:** Handle the most protected sites requiring native Firefox TLS

**Architecture:**

Camoufox workers run as separate Python processes communicating with Node.js via:
- HTTP-based RPC for job dispatch
- Shared Redis for state synchronization
- File-based result transfer for large payloads

**When Used:**

- After Playwright fails with bot detection
- Sites known to use Akamai Bot Manager
- Sites known to use Kasada protection
- Sites known to use PerimeterX/HUMAN
- Manual override via API parameter

**Resource Requirements:**

| Metric | Value |
|--------|-------|
| Memory per instance | 500-800 MB |
| CPU per instance | 0.5-1.0 cores |
| Startup time | 3-5 seconds |
| Pages per instance | 10-15 before recycle |

---

## 3. Request Processing Flow

### 3.1 Synchronous Request Flow

```
Step 1: INGESTION
+------------------+
| Client Request   |
| POST /v1/scrape  |
| {url, options}   |
+--------+---------+
         |
         v
Step 2: AUTHENTICATION
+------------------+
| Validate API Key |-----> 401 Unauthorized
| Check Rate Limit |-----> 429 Too Many Requests
| Check Credits    |-----> 402 Payment Required
+--------+---------+
         |
         v
Step 3: VALIDATION
+------------------+
| Validate URL     |-----> 400 Bad Request
| Validate Options |-----> 400 Bad Request
| Normalize Input  |
+--------+---------+
         |
         v
Step 4: CLASSIFICATION
+------------------+
| Analyze Target   |
| - Known site?    |
| - Protection?    |
| - JS required?   |
| Select Strategy  |
+--------+---------+
         |
         v
Step 5: QUEUE ROUTING
+------------------+
| Route to Queue   |
| scrape:http      |-----> Static pages
| scrape:browser   |-----> JS required
| scrape:stealth   |-----> Protected site
+--------+---------+
         |
         v
Step 6: WORKER PROCESSING
+------------------------------------------+
| Acquire Resources:                       |
| - Proxy from pool (based on tier)        |
| - Fingerprint (consistent with geo)      |
| - Browser instance (if needed)           |
| - Session/cookies (if sticky)            |
|                                          |
| Execute Request:                         |
| - Apply fingerprint and headers          |
| - Navigate/fetch URL                     |
| - Wait for content (if JS)               |
| - Detect challenges                      |
|   - CAPTCHA: Solve via service           |
|   - Block: Retry with higher tier        |
| - Capture response                       |
+--------+---------------------------------+
         |
         v
Step 7: POST-PROCESSING
+------------------+
| If extraction    |
| rules defined:   |
| - Parse HTML     |
| - Apply CSS/XPath|
| - Structure data |
+--------+---------+
         |
         v
Step 8: RESPONSE
+------------------+
| Return result    |
| to client        |
| {content, meta}  |
+--------+---------+
         |
         v
Step 9: METERING
+------------------+
| Log usage:       |
| - Credits used   |
| - Proxy cost     |
| - Response time  |
| - Success/fail   |
+------------------+
```

### 3.2 Asynchronous Request Flow

```
Step 1-5: Same as synchronous
         |
         v
Step 6: QUEUE AND ACKNOWLEDGE
+------------------+
| Create job       |
| Return job ID    |
| immediately      |
+--------+---------+
         |
         v (async)
Step 7: WORKER PROCESSING
+------------------+
| Process job      |
| (same as sync)   |
+--------+---------+
         |
         v
Step 8: RESULT STORAGE
+------------------+
| Store result in  |
| MinIO (S3)       |
| Generate URL     |
+--------+---------+
         |
         v
Step 9: WEBHOOK DELIVERY
+------------------+
| POST to customer |
| webhook URL      |
| with result      |
+--------+---------+
         |
         v
Step 10: METERING
+------------------+
| Same as sync     |
+------------------+
```

### 3.3 Retry and Escalation Flow

```
                    +-------------------+
                    |   Initial Request |
                    +--------+----------+
                             |
                             v
                    +--------+----------+
                    |   HTTP Worker     |
                    |   (Datacenter)    |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
     +--------+--------+           +--------+--------+
     |     SUCCESS     |           |     FAILURE     |
     +-----------------+           +--------+--------+
                                            |
                                   (Bot detection?)
                                            |
                          +--------+--------+--------+
                          |                          |
                          v                          v
                 +--------+--------+        +--------+--------+
                 |   Yes: Upgrade  |        |   No: Retry     |
                 |   to Browser    |        |   Same Tier     |
                 +--------+--------+        +--------+--------+
                          |                          |
                          v                          |
                 +--------+--------+                 |
                 | Browser Worker  |                 |
                 | (Residential)   |                 |
                 +--------+--------+                 |
                          |                          |
              +-----------+-----------+              |
              |                       |              |
              v                       v              |
     +--------+--------+     +--------+--------+     |
     |     SUCCESS     |     |     FAILURE     |     |
     +-----------------+     +--------+--------+     |
                                      |              |
                             (Still blocked?)        |
                                      |              |
                                      v              |
                             +--------+--------+     |
                             | Stealth Worker  |     |
                             | (Mobile Proxy)  |     |
                             +--------+--------+     |
                                      |              |
                          +-----------+-----------+  |
                          |                       |  |
                          v                       v  |
                 +--------+--------+     +--------+--+-----+
                 |     SUCCESS     |     |   FINAL FAIL    |
                 +-----------------+     +-----------------+
```

---

## 4. Worker Architecture

### 4.1 Worker Container Structure

```
+------------------------------------------------------------------+
|                     WORKER CONTAINER                              |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    WORKER PROCESS                           |  |
|  |                                                             |  |
|  |  +------------------+    +------------------+               |  |
|  |  |  Queue Consumer  |    |  Resource Pool   |               |  |
|  |  |  (BullMQ Worker) |    |  Manager         |               |  |
|  |  +--------+---------+    +--------+---------+               |  |
|  |           |                       |                         |  |
|  |           v                       v                         |  |
|  |  +--------+-----------------------+---------+               |  |
|  |  |           JOB PROCESSOR                  |               |  |
|  |  |                                          |               |  |
|  |  |  +----------------+  +----------------+  |               |  |
|  |  |  | Anti-Detection |  |    Scraper     |  |               |  |
|  |  |  |   Pipeline     |  |    Engine      |  |               |  |
|  |  |  +----------------+  +----------------+  |               |  |
|  |  |                                          |               |  |
|  |  +------------------------------------------+               |  |
|  |           |                       |                         |  |
|  |           v                       v                         |  |
|  |  +--------+---------+    +--------+---------+               |  |
|  |  |  Browser Pool    |    |   Proxy Pool     |               |  |
|  |  |  (if browser     |    |   Connection     |               |  |
|  |  |   worker)        |    |   Manager        |               |  |
|  |  +------------------+    +------------------+               |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    SHARED RESOURCES                         |  |
|  |  +------------------+    +------------------+               |  |
|  |  |  /dev/shm        |    |  /tmp            |               |  |
|  |  |  (Chrome temp)   |    |  (Temp files)    |               |  |
|  |  +------------------+    +------------------+               |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### 4.2 Resource Pool Management

**Browser Pool Implementation:**

```typescript
interface BrowserPoolState {
  browsers: Map<string, {
    instance: Browser;
    pageCount: number;
    createdAt: Date;
    lastUsedAt: Date;
    memoryUsage: number;
  }>;
  
  config: {
    minInstances: number;        // Minimum warm browsers
    maxInstances: number;        // Maximum concurrent browsers
    maxPagesPerBrowser: number;  // Recycle threshold
    idleTimeoutMs: number;       // Close idle browsers
    healthCheckIntervalMs: number;
  };
}

interface BrowserAcquisition {
  acquire(): Promise<Browser>;
  release(browser: Browser): Promise<void>;
  destroy(browser: Browser): Promise<void>;
  getStats(): PoolStats;
}
```

**Proxy Pool Implementation:**

```typescript
interface ProxyPoolState {
  proxies: Map<string, {
    config: ProxyConfig;
    provider: ProxyProvider;
    tier: 'datacenter' | 'residential' | 'mobile';
    usageCount: number;
    failureCount: number;
    lastUsedAt: Date;
    cooldownUntil: Date | null;
  }>;
  
  config: {
    maxUsagePerSession: number;   // Rotate after N uses
    cooldownOnFailure: number;    // Cooldown period on failure
    maxFailuresBeforeRemoval: number;
    healthCheckIntervalMs: number;
  };
}

interface ProxySelection {
  getProxy(requirements: {
    tier?: ProxyTier;
    country?: string;
    sessionId?: string;
  }): Promise<ProxyConfig>;
  
  recordSuccess(proxyId: string): void;
  recordFailure(proxyId: string, error: Error): void;
}
```

### 4.3 Concurrency Management

```typescript
interface ConcurrencyLimits {
  global: {
    maxConcurrentJobs: number;       // Total across all workers
    maxConcurrentBrowsers: number;   // Total browser instances
    maxConcurrentHttpRequests: number;
  };
  
  perWorker: {
    maxConcurrentJobs: number;       // Per container
    maxBrowserInstances: number;
    maxHttpConnections: number;
  };
  
  perDomain: {
    maxConcurrentRequests: number;   // Per target domain
    requestsPerSecond: number;       // Rate limit per domain
  };
  
  perCustomer: {
    maxConcurrentJobs: number;       // Per API key
    maxQueuedJobs: number;
  };
}
```

---

## 5. Proxy Management Layer

### 5.1 Multi-Provider Architecture

```
+------------------------------------------------------------------+
|                    PROXY MANAGEMENT LAYER                         |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                  PROXY ROUTER                               |  |
|  |                                                             |  |
|  |  +------------------+    +------------------+               |  |
|  |  |  Tier Selector   |    |  Provider        |               |  |
|  |  |  (ML-based)      |    |  Load Balancer   |               |  |
|  |  +--------+---------+    +--------+---------+               |  |
|  |           |                       |                         |  |
|  +-----------|-----------------------|-------------------------+  |
|              |                       |                            |
|              v                       v                            |
|  +------------------------------------------------------------+  |
|  |                  PROVIDER ADAPTERS                          |  |
|  |                                                             |  |
|  |  +------------------+  +------------------+  +------------+ |  |
|  |  |   Bright Data    |  |    Oxylabs      |  | Smartproxy | |  |
|  |  |   Adapter        |  |    Adapter      |  |  Adapter   | |  |
|  |  +--------+---------+  +--------+--------+  +------+-----+ |  |
|  |           |                     |                  |        |  |
|  +-----------|---------------------|------------------|--------+  |
|              |                     |                  |           |
|              v                     v                  v           |
|  +------------------+  +------------------+  +------------------+ |
|  | Datacenter Pool  |  | Residential Pool |  |   Mobile Pool    | |
|  | - Fast           |  | - High trust     |  | - Highest trust  | |
|  | - Cheap          |  | - Medium cost    |  | - Premium cost   | |
|  | - Low trust      |  | - Geo-targeted   |  | - CGNAT benefit  | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
```

### 5.2 Proxy Selection Algorithm

```
FUNCTION selectProxy(request, targetDomain):
    
    // Step 1: Check domain cache for known optimal tier
    cachedTier = domainTierCache.get(targetDomain)
    IF cachedTier EXISTS AND cachedTier.successRate > 0.9:
        RETURN getProxyFromTier(cachedTier.tier, request.geoRequirement)
    
    // Step 2: Analyze target for protection level
    protectionLevel = analyzeProtection(targetDomain)
    
    // Step 3: Select tier based on protection
    SWITCH protectionLevel:
        CASE 'none':
            tier = 'datacenter'
        CASE 'basic':
            tier = 'datacenter'  // Try cheap first
        CASE 'medium':
            tier = 'residential'
        CASE 'high':
            tier = 'mobile'
        CASE 'extreme':
            tier = 'mobile'
    
    // Step 4: Get proxy from selected tier
    proxy = getProxyFromTier(tier, request.geoRequirement)
    
    // Step 5: Validate proxy health
    IF proxy.failureCount > MAX_FAILURES:
        proxy = getAlternateProxy(tier, request.geoRequirement)
    
    RETURN proxy

FUNCTION getProxyFromTier(tier, geoRequirement):
    // Load balance across providers
    providers = getProvidersByTier(tier)
    provider = selectLeastLoadedProvider(providers)
    
    // Get proxy with geo matching
    IF geoRequirement:
        RETURN provider.getProxy(country=geoRequirement.country)
    ELSE:
        RETURN provider.getRandomProxy()
```

### 5.3 Session Management

```typescript
interface SessionState {
  sessionId: string;
  userId: string;
  proxyConfig: ProxyConfig;
  fingerprint: BrowserFingerprint;
  cookies: Cookie[];
  localStorage: Record<string, string>;
  createdAt: Date;
  lastUsedAt: Date;
  requestCount: number;
  expiresAt: Date;
}

interface SessionManager {
  getOrCreate(sessionId: string): Promise<SessionState>;
  update(sessionId: string, updates: Partial<SessionState>): Promise<void>;
  persist(session: SessionState): Promise<void>;
  load(sessionId: string): Promise<SessionState | null>;
  expire(sessionId: string): Promise<void>;
  cleanup(): Promise<number>;  // Returns count of expired sessions
}
```

---

## 6. Data Flow and Storage

### 6.1 Data Storage Architecture

```
+------------------------------------------------------------------+
|                    DATA STORAGE LAYER                             |
|                                                                   |
|  +---------------------------+  +------------------------------+  |
|  |       POSTGRESQL          |  |           REDIS              |  |
|  |                           |  |                              |  |
|  |  Persistent Data:         |  |  Transient Data:             |  |
|  |  - Users                  |  |  - Job queues                |  |
|  |  - API keys               |  |  - Session cache             |  |
|  |  - Subscriptions          |  |  - Rate limit counters       |  |
|  |  - Jobs (metadata)        |  |  - Proxy statistics          |  |
|  |  - Usage logs             |  |  - Domain tier cache         |  |
|  |  - Webhooks               |  |  - Fingerprint cache         |  |
|  |  - Billing                |  |                              |  |
|  +---------------------------+  +------------------------------+  |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  |                      MINIO (S3-Compatible)                   |  |
|  |                                                              |  |
|  |  Object Storage:                                             |  |
|  |  - HTML responses (large)                                    |  |
|  |  - Screenshots                                               |  |
|  |  - Extracted data (JSON)                                     |  |
|  |  - Error snapshots                                           |  |
|  |  - Batch job results                                         |  |
|  +-------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### 6.2 Data Retention Policies

| Data Type | Storage | Retention | Cleanup Method |
|-----------|---------|-----------|----------------|
| Job metadata | PostgreSQL | 30 days | Scheduled deletion |
| Usage logs | PostgreSQL | 90 days | Partition dropping |
| HTML responses | MinIO | 24 hours | Lifecycle policy |
| Screenshots | MinIO | 7 days | Lifecycle policy |
| Extracted data | MinIO | 30 days | Lifecycle policy |
| Session state | Redis | 24 hours | TTL expiration |
| Rate limits | Redis | 1 hour | TTL expiration |

### 6.3 Backup Strategy

| Component | Backup Frequency | Retention | Method |
|-----------|------------------|-----------|--------|
| PostgreSQL | Daily | 30 days | pg_dump to S3 |
| PostgreSQL | Hourly | 24 hours | WAL archiving |
| Redis | Every 15 minutes | 24 hours | RDB snapshots |
| MinIO | Daily | 7 days | Replication |

---

## 7. Infrastructure Topology

### 7.1 Hetzner Server Configuration

**Manager Node:**

| Component | Specification |
|-----------|---------------|
| Server Type | AX41-NVMe |
| CPU | AMD Ryzen 5 3600 (6 cores) |
| Memory | 64 GB DDR4 ECC |
| Storage | 2 x 512 GB NVMe SSD |
| Network | 1 Gbit/s |
| Monthly Cost | Approximately $55 |

**Worker Nodes (Browser):**

| Component | Specification |
|-----------|---------------|
| Server Type | AX41-NVMe |
| CPU | AMD Ryzen 5 3600 (6 cores) |
| Memory | 64 GB DDR4 ECC |
| Storage | 2 x 512 GB NVMe SSD |
| Network | 1 Gbit/s |
| Count | 2-3 nodes |
| Monthly Cost | Approximately $55 each |

**Worker Nodes (HTTP):**

| Component | Specification |
|-----------|---------------|
| Server Type | CPX31 |
| CPU | 4 vCPU (AMD EPYC) |
| Memory | 8 GB |
| Storage | 160 GB SSD |
| Network | Shared |
| Count | 2-4 nodes |
| Monthly Cost | Approximately $15 each |

**Utility Node:**

| Component | Specification |
|-----------|---------------|
| Server Type | CPX21 |
| CPU | 3 vCPU |
| Memory | 4 GB |
| Storage | 80 GB SSD |
| Services | Redis, Prometheus, Grafana |
| Monthly Cost | Approximately $10 |

### 7.2 Network Architecture

```
+------------------------------------------------------------------+
|                         INTERNET                                  |
+-----------------------------+------------------------------------+
                              |
                              v
+-----------------------------+------------------------------------+
|                    HETZNER CLOUD NETWORK                         |
|                                                                   |
|  +------------------+        +------------------+                 |
|  |   Floating IP    |        |   Floating IP    |                 |
|  |   (Primary)      |        |   (Failover)     |                 |
|  +--------+---------+        +--------+---------+                 |
|           |                           |                           |
|           +-----------+---------------+                           |
|                       |                                           |
|                       v                                           |
|  +--------------------+-------------------+                       |
|  |            TRAEFIK CLUSTER            |                       |
|  |  (Manager Node + Standby)             |                       |
|  +--------------------+-------------------+                       |
|                       |                                           |
|  +--------------------+-------------------+                       |
|  |         PRIVATE NETWORK (10.0.0.0/8)  |                       |
|  |                                        |                       |
|  |  +------------+  +------------+  +------------+               |
|  |  | Manager    |  | Worker 1   |  | Worker 2   |               |
|  |  | 10.0.1.1   |  | 10.0.2.1   |  | 10.0.2.2   |               |
|  |  +------------+  +------------+  +------------+               |
|  |                                                               |
|  |  +------------+  +------------+  +------------+               |
|  |  | Worker 3   |  | Worker 4   |  | Utility    |               |
|  |  | 10.0.2.3   |  | 10.0.2.4   |  | 10.0.3.1   |               |
|  |  +------------+  +------------+  +------------+               |
|  +---------------------------------------------------------------+
+------------------------------------------------------------------+
```

### 7.3 Docker Swarm Overlay

```yaml
# Swarm Service Distribution

Manager Node (10.0.1.1):
  Services:
    - traefik (1 replica)
    - api-server (3 replicas, spread constraint)
    - postgresql (1 replica)
    - minio (1 replica)
  
  Constraints:
    - node.role == manager

Browser Worker Nodes (10.0.2.1-3):
  Services:
    - browser-worker (5 replicas per node)
    - stealth-worker (2 replicas per node)
  
  Constraints:
    - node.labels.type == browser-worker
  
  Resources:
    limits:
      cpus: '2'
      memory: 4G

HTTP Worker Nodes (10.0.2.4+):
  Services:
    - http-worker (20 replicas per node)
  
  Constraints:
    - node.labels.type == http-worker
  
  Resources:
    limits:
      cpus: '1'
      memory: 512M

Utility Node (10.0.3.1):
  Services:
    - redis (1 replica)
    - prometheus (1 replica)
    - grafana (1 replica)
  
  Constraints:
    - node.labels.type == utility
```

---

## 8. Scalability Architecture

### 8.1 Horizontal Scaling Triggers

| Metric | Scale Up Trigger | Scale Down Trigger | Cooldown |
|--------|------------------|-------------------|----------|
| Queue Depth | Greater than 1000 pending | Less than 100 for 10 minutes | 5 minutes |
| CPU Usage | Greater than 80% average | Less than 30% for 10 minutes | 5 minutes |
| Memory Usage | Greater than 85% | Less than 40% for 10 minutes | 10 minutes |
| API Latency P95 | Greater than 2 seconds | Less than 500ms for 10 minutes | 5 minutes |
| Worker Utilization | Greater than 90% | Less than 40% for 10 minutes | 5 minutes |

### 8.2 Scaling Limits

| Component | Minimum | Maximum | Scaling Unit |
|-----------|---------|---------|--------------|
| API Servers | 2 | 10 | 1 replica |
| HTTP Workers | 10 | 100 | 10 replicas |
| Browser Workers | 5 | 50 | 5 replicas |
| Stealth Workers | 2 | 10 | 2 replicas |

### 8.3 Database Scaling Strategy

**PostgreSQL:**

- Primary with streaming replication to read replica
- Read replica for analytics and reporting queries
- Connection pooling via PgBouncer
- Horizontal sharding planned for 10M+ jobs/day

**Redis:**

- Single instance sufficient to 100K jobs/day
- Redis Cluster or Dragonfly for higher scale
- Separate instances for cache vs. queue (optional)

---

## 9. Failure Handling

### 9.1 Circuit Breaker Configuration

```typescript
interface CircuitBreakerConfig {
  name: string;
  
  // Failure thresholds
  failureThreshold: number;        // Failures to open circuit
  failureRateThreshold: number;    // Percentage (0-100)
  
  // Timing
  resetTimeout: number;            // Time before half-open
  halfOpenRequests: number;        // Requests to test in half-open
  
  // Monitoring window
  rollingWindowSize: number;       // Window in milliseconds
  rollingWindowBuckets: number;    // Number of buckets
}

// Default configurations
const proxyCircuitBreaker: CircuitBreakerConfig = {
  name: 'proxy-provider',
  failureThreshold: 10,
  failureRateThreshold: 50,
  resetTimeout: 30000,
  halfOpenRequests: 3,
  rollingWindowSize: 60000,
  rollingWindowBuckets: 6
};

const targetSiteCircuitBreaker: CircuitBreakerConfig = {
  name: 'target-site',
  failureThreshold: 5,
  failureRateThreshold: 80,
  resetTimeout: 60000,
  halfOpenRequests: 2,
  rollingWindowSize: 120000,
  rollingWindowBuckets: 12
};
```

### 9.2 Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  
  // Escalation
  escalateAfterAttempts: number;
  escalationStrategy: 'upgrade-proxy' | 'upgrade-engine' | 'both';
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'TIMEOUT',
    'CONNECTION_REFUSED',
    'PROXY_ERROR',
    'BOT_DETECTED',
    'RATE_LIMITED'
  ],
  escalateAfterAttempts: 1,
  escalationStrategy: 'both'
};
```

### 9.3 Graceful Degradation

| Failure Scenario | Degradation Response |
|------------------|----------------------|
| Primary proxy provider down | Automatic failover to secondary provider |
| CAPTCHA service down | Queue CAPTCHA jobs, return partial results |
| Redis down | Fail-open for rate limits, fail-closed for queues |
| PostgreSQL down | Return cached data, queue writes for replay |
| MinIO down | Store results in PostgreSQL temporarily |
| All browser workers down | Process only HTTP-capable jobs |

---

## 10. Technology Stack Summary

### 10.1 Core Technologies

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js | 20 LTS | JavaScript execution |
| Language | TypeScript | 5.x | Type-safe development |
| API Framework | Fastify | 4.x | HTTP server |
| Job Queue | BullMQ | 5.x | Distributed job processing |
| Browser Automation | Playwright | 1.x | JavaScript rendering |
| HTTP Client | impit | Latest | TLS fingerprinting |
| Stealth Browser | Camoufox | Latest | Anti-detection |

### 10.2 Data Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Primary Database | PostgreSQL | 16.x | Relational data |
| Cache/Queue Backend | Redis | 7.x | Caching and queues |
| Object Storage | MinIO | Latest | S3-compatible storage |

### 10.3 Infrastructure Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Containerization | Docker | 24.x | Application packaging |
| Orchestration | Docker Swarm | Built-in | Container orchestration |
| Reverse Proxy | Traefik | 3.x | Load balancing, TLS |
| Monitoring | Prometheus | 2.x | Metrics collection |
| Visualization | Grafana | 10.x | Dashboards |

### 10.4 Supporting Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| Validation | Zod | Runtime type validation |
| Logging | Pino | Structured logging |
| Fingerprinting | fingerprint-suite | Header and fingerprint generation |
| Stealth | puppeteer-extra-plugin-stealth | Anti-detection patches |
| Pooling | generic-pool | Resource pool management |
| Rate Limiting | bottleneck | Concurrency control |
| Retry | async-retry | Retry logic |
| HTML Parsing | Cheerio | jQuery-like parsing |

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| Senior Developer | | | |
| DevOps Engineer | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | | Initial document creation |
