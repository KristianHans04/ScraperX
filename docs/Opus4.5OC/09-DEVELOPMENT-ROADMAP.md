# ScraperX Development Roadmap

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-DOC-009 |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Engineering Team |
| Status | Draft |
| Classification | Internal |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Roadmap Overview](#2-roadmap-overview)
3. [Phase 1: Foundation](#3-phase-1-foundation-months-1-2)
4. [Phase 2: Anti-Detection](#4-phase-2-anti-detection-months-3-4)
5. [Phase 3: Scale and Reliability](#5-phase-3-scale-and-reliability-months-5-6)
6. [Phase 4: Business Features](#6-phase-4-business-features-months-7-8)
7. [Phase 5: Advanced Capabilities](#7-phase-5-advanced-capabilities-months-9-10)
8. [Phase 6: Hardening and Growth](#8-phase-6-hardening-and-growth-months-11-12)
9. [Resource Planning](#9-resource-planning)
10. [Risk Management](#10-risk-management)
11. [Success Metrics](#11-success-metrics)
12. [Appendix](#12-appendix)

---

## 1. Introduction

### 1.1 Purpose

This document defines the 12-month development roadmap for ScraperX, breaking down the project into six distinct phases with clear deliverables, milestones, and success criteria.

### 1.2 Scope

The roadmap covers:

- All technical development activities
- Infrastructure deployment milestones
- Business feature implementation
- Quality assurance gates
- Resource allocation per phase
- Risk mitigation strategies

### 1.3 Assumptions

| Assumption | Impact if False |
|------------|-----------------|
| Team of 3-4 full-time developers | Timeline extends 50-100% |
| Hetzner infrastructure available | Alternative provider needed |
| Proxy provider APIs stable | Integration rework required |
| No major anti-bot evolution | Additional research sprints |

### 1.4 Success Criteria (Overall Project)

| Metric | Target | Timeline |
|--------|--------|----------|
| Daily Processing Capacity | 1,000,000+ pages | Month 6 |
| Success Rate on Protected Sites | 95%+ | Month 4 |
| API Uptime | 99.9% | Month 6 |
| Paying Customers | 100 | Month 12 |
| Monthly Recurring Revenue | $15,000 | Month 12 |

---

## 2. Roadmap Overview

### 2.1 Phase Timeline

```
Month:     1    2    3    4    5    6    7    8    9   10   11   12
          +----+----+----+----+----+----+----+----+----+----+----+----+
Phase 1:  |████████|                                                   Foundation
Phase 2:            |████████|                                         Anti-Detection
Phase 3:                      |████████|                               Scale
Phase 4:                                |████████|                     Business
Phase 5:                                          |████████|           Advanced
Phase 6:                                                    |████████| Hardening
          +----+----+----+----+----+----+----+----+----+----+----+----+
                    ^         ^         ^         ^              ^
                    |         |         |         |              |
                Alpha     Beta    Public Beta  GA v1.0        v1.1
```

### 2.2 Phase Summary

| Phase | Duration | Focus Area | Key Deliverable |
|-------|----------|------------|-----------------|
| 1. Foundation | Months 1-2 | Core API and basic scraping | Working API with HTTP scraping |
| 2. Anti-Detection | Months 3-4 | Stealth and browser integration | 95% success on protected sites |
| 3. Scale | Months 5-6 | Infrastructure and reliability | 1M pages/day capacity |
| 4. Business | Months 7-8 | Billing and customer experience | Self-service subscriptions |
| 5. Advanced | Months 9-10 | Premium features and SDKs | Complete feature parity |
| 6. Hardening | Months 11-12 | Security and optimization | Production-ready v1.0 |

### 2.3 Milestone Gates

```
+------------------------------------------------------------------+
|                    GO/NO-GO DECISION POINTS                       |
+------------------------------------------------------------------+
|                                                                   |
|  ALPHA (End Month 2)                                              |
|  +--------------------------------------------------------------+ |
|  | Criteria:                                                     | |
|  | - Core API functional with authentication                    | |
|  | - HTTP scraping working with datacenter proxies              | |
|  | - PostgreSQL and Redis operational                           | |
|  | - Docker deployment working                                  | |
|  | - Internal testing complete                                  | |
|  |                                                              | |
|  | Decision: Proceed to anti-detection or fix fundamentals     | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  BETA (End Month 4)                                               |
|  +--------------------------------------------------------------+ |
|  | Criteria:                                                     | |
|  | - Multi-engine browser support functional                    | |
|  | - 90%+ success rate on test sites                           | |
|  | - Fingerprint management working                             | |
|  | - Basic monitoring in place                                  | |
|  | - External beta testers onboarded                            | |
|  |                                                              | |
|  | Decision: Proceed to scale or iterate on anti-detection     | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  PUBLIC BETA (End Month 6)                                        |
|  +--------------------------------------------------------------+ |
|  | Criteria:                                                     | |
|  | - 500K+ pages/day demonstrated                               | |
|  | - Auto-scaling operational                                   | |
|  | - 99% uptime achieved                                        | |
|  | - CAPTCHA solving integrated                                 | |
|  | - Public signups enabled                                     | |
|  |                                                              | |
|  | Decision: Proceed to billing or fix reliability              | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  GENERAL AVAILABILITY v1.0 (End Month 10)                         |
|  +--------------------------------------------------------------+ |
|  | Criteria:                                                     | |
|  | - Stripe billing fully operational                           | |
|  | - All subscription tiers available                           | |
|  | - SDKs released (Python, Node.js)                            | |
|  | - Documentation complete                                     | |
|  | - 50+ paying customers                                       | |
|  |                                                              | |
|  | Decision: Full launch or extended beta                       | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  v1.1 RELEASE (End Month 12)                                      |
|  +--------------------------------------------------------------+ |
|  | Criteria:                                                     | |
|  | - Security audit complete                                    | |
|  | - Performance optimization done                              | |
|  | - 99.9% uptime maintained                                    | |
|  | - 100+ paying customers                                      | |
|  | - $15K+ MRR                                                  | |
|  +--------------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 3. Phase 1: Foundation (Months 1-2)

### 3.1 Phase Objectives

| Objective | Success Criteria |
|-----------|------------------|
| Core API Implementation | All basic endpoints functional |
| HTTP Scraping Engine | Static pages scraped successfully |
| Database Layer | PostgreSQL schema deployed |
| Job Queue System | BullMQ processing jobs |
| Containerization | Docker deployment working |
| Authentication | API key system operational |

### 3.2 Sprint Breakdown

#### Sprint 1.1 (Week 1-2): Project Setup

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Repository initialization with TypeScript | Backend | 2d | None |
| Docker Compose development environment | DevOps | 2d | None |
| PostgreSQL schema design and migration | Backend | 3d | Repository |
| Redis configuration | DevOps | 1d | Docker |
| CI/CD pipeline setup (GitHub Actions) | DevOps | 2d | Repository |
| Logging infrastructure (Pino) | Backend | 1d | Repository |
| Configuration management | Backend | 1d | Repository |

**Sprint 1.1 Deliverables:**
- Working development environment
- Database migrations functional
- CI pipeline running tests

#### Sprint 1.2 (Week 3-4): Core API

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Fastify server setup with plugins | Backend | 2d | Sprint 1.1 |
| Request validation with Zod | Backend | 2d | Server |
| API key generation and storage | Backend | 2d | Database |
| Authentication middleware | Backend | 2d | API keys |
| Rate limiting implementation | Backend | 2d | Redis |
| POST /v1/scrape endpoint | Backend | 2d | Auth |
| GET /v1/jobs/:id endpoint | Backend | 1d | Scrape endpoint |
| Error handling standardization | Backend | 1d | Endpoints |

**Sprint 1.2 Deliverables:**
- API accepting authenticated requests
- Rate limiting functional
- Job status retrieval working

#### Sprint 1.3 (Week 5-6): HTTP Scraping Engine

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| impit HTTP client integration | Backend | 3d | Sprint 1.2 |
| Proxy configuration interface | Backend | 2d | HTTP client |
| Request header generation | Backend | 2d | HTTP client |
| Response handling and storage | Backend | 2d | MinIO setup |
| Cookie and session management | Backend | 2d | HTTP client |
| Redirect following logic | Backend | 1d | HTTP client |
| Basic retry mechanism | Backend | 2d | HTTP client |
| Integration tests | QA | 3d | HTTP engine |

**Sprint 1.3 Deliverables:**
- Static pages fetched successfully
- Proxy rotation working
- Results stored in MinIO

#### Sprint 1.4 (Week 7-8): Queue and Workers

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| BullMQ queue configuration | Backend | 2d | Redis |
| HTTP worker implementation | Backend | 3d | Sprint 1.3 |
| Job state management | Backend | 2d | Queue |
| Worker scaling configuration | DevOps | 2d | Docker |
| Health check endpoints | Backend | 1d | Workers |
| Metrics collection (Prometheus) | DevOps | 2d | Health checks |
| Basic Grafana dashboards | DevOps | 2d | Metrics |
| End-to-end testing | QA | 3d | All components |

**Sprint 1.4 Deliverables:**
- Distributed job processing working
- Multiple HTTP workers scaling
- Basic monitoring operational

### 3.3 Phase 1 Architecture

```
+------------------------------------------------------------------+
|                     PHASE 1 ARCHITECTURE                          |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+     +------------------+                    |
|  |   Fastify API    |---->|   BullMQ Queue   |                    |
|  +------------------+     +--------+---------+                    |
|         |                          |                              |
|         v                          v                              |
|  +------------------+     +------------------+                    |
|  |   PostgreSQL     |     |  HTTP Workers    |                    |
|  |  - Users         |     |  (impit client)  |                    |
|  |  - API Keys      |     +--------+---------+                    |
|  |  - Jobs          |              |                              |
|  +------------------+              v                              |
|         |              +------------------+                       |
|         |              |   Datacenter     |                       |
|         v              |   Proxies        |                       |
|  +------------------+  +------------------+                       |
|  |   Redis          |                                             |
|  |  - Rate limits   |  +------------------+                       |
|  |  - Session cache |  |   MinIO          |                       |
|  +------------------+  |  - HTML storage  |                       |
|                        +------------------+                       |
+------------------------------------------------------------------+
```

### 3.4 Phase 1 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| impit integration issues | Medium | High | Fallback to node-fetch-native |
| PostgreSQL schema changes | High | Medium | Design for extensibility |
| Docker networking issues | Low | Medium | Use proven configurations |
| Queue job loss | Medium | High | Redis persistence configuration |

### 3.5 Phase 1 Resources

| Role | Allocation | Focus Area |
|------|------------|------------|
| Senior Backend Developer | 100% | API, HTTP engine, workers |
| DevOps Engineer | 50% | Docker, CI/CD, infrastructure |
| QA Engineer | 25% | Test framework, integration tests |

### 3.6 Phase 1 Exit Criteria

| Criterion | Measurement |
|-----------|-------------|
| API endpoints functional | All core endpoints return expected responses |
| HTTP scraping working | 100 test URLs scraped successfully |
| Authentication working | Invalid API keys rejected |
| Rate limiting functional | Requests throttled per configuration |
| Queue processing | 1000 jobs processed without loss |
| Monitoring basic | CPU, memory, queue depth visible |

---

## 4. Phase 2: Anti-Detection (Months 3-4)

### 4.1 Phase Objectives

| Objective | Success Criteria |
|-----------|------------------|
| Playwright Integration | JavaScript pages rendered |
| Camoufox Integration | Protected sites accessible |
| Fingerprint Management | Consistent fingerprints applied |
| Proxy Tier System | Automatic tier escalation |
| Session Persistence | Sticky sessions working |
| CAPTCHA Detection | Challenges identified |

### 4.2 Sprint Breakdown

#### Sprint 2.1 (Week 1-2): Playwright Integration

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Playwright setup with Chromium | Backend | 2d | Phase 1 |
| Browser pool management | Backend | 3d | Playwright |
| Page navigation and waiting | Backend | 2d | Browser pool |
| Content extraction from rendered pages | Backend | 2d | Navigation |
| Screenshot capture | Backend | 1d | Navigation |
| Browser worker implementation | Backend | 3d | Pool management |
| Memory management and recycling | Backend | 2d | Workers |

**Sprint 2.1 Deliverables:**
- JavaScript-rendered pages captured
- Browser instances pooled and recycled
- Screenshots functional

#### Sprint 2.2 (Week 3-4): Fingerprint System

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| fingerprint-suite integration | Backend | 3d | Playwright |
| Fingerprint generation logic | Backend | 2d | fingerprint-suite |
| Fingerprint injection into pages | Backend | 3d | Generation |
| Header consistency enforcement | Backend | 2d | Injection |
| Geo-location fingerprint matching | Backend | 2d | Headers |
| Fingerprint storage and caching | Backend | 2d | Redis |
| puppeteer-extra-plugin-stealth | Backend | 2d | Playwright |

**Sprint 2.2 Deliverables:**
- Consistent fingerprints across requests
- Headers match fingerprint profile
- Stealth plugins applied

#### Sprint 2.3 (Week 5-6): Camoufox Integration

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Camoufox Python environment | DevOps | 2d | Docker |
| Node.js to Python bridge | Backend | 3d | Python env |
| Camoufox controller service | Backend | 3d | Bridge |
| Stealth worker implementation | Backend | 3d | Controller |
| Native fingerprint verification | QA | 2d | Workers |
| Escalation from Playwright | Backend | 2d | Stealth workers |
| Performance benchmarking | QA | 2d | All engines |

**Sprint 2.3 Deliverables:**
- Camoufox processing protected sites
- Automatic escalation working
- Native Firefox TLS verified

#### Sprint 2.4 (Week 7-8): Proxy System Enhancement

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Multi-provider adapter layer | Backend | 3d | Phase 1 proxies |
| Bright Data integration | Backend | 2d | Adapter |
| Oxylabs integration | Backend | 2d | Adapter |
| Residential proxy support | Backend | 2d | Providers |
| Mobile proxy support | Backend | 2d | Providers |
| Proxy health monitoring | Backend | 2d | Prometheus |
| Tier selection algorithm | Backend | 3d | Health monitoring |
| Session stickiness | Backend | 2d | Tier selection |

**Sprint 2.4 Deliverables:**
- Multiple proxy providers integrated
- Automatic tier escalation working
- Session persistence functional

### 4.3 Phase 2 Architecture

```
+------------------------------------------------------------------+
|                     PHASE 2 ARCHITECTURE                          |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+     +------------------+                    |
|  |   Fastify API    |---->|   BullMQ Queues  |                    |
|  +------------------+     +------------------+                    |
|                           |scrape:http       |                    |
|                           |scrape:browser    |                    |
|                           |scrape:stealth    |                    |
|                           +--------+---------+                    |
|                                    |                              |
|         +-------------+------------+------------+                 |
|         |             |                         |                 |
|         v             v                         v                 |
|  +-----------+  +-----------+          +---------------+          |
|  |   HTTP    |  | Browser   |          | Stealth       |          |
|  |  Workers  |  | Workers   |          | Workers       |          |
|  |  (impit)  |  |(Playwright|          | (Camoufox)    |          |
|  +-----------+  +-----------+          +-------+-------+          |
|         |             |                        |                  |
|         v             v                        v                  |
|  +--------------------------------------------------+             |
|  |              PROXY MANAGEMENT LAYER               |             |
|  |  +--------------+ +--------------+ +------------+ |             |
|  |  |  Datacenter  | | Residential  | |   Mobile   | |             |
|  |  |   (Default)  | |  (Escalate)  | | (Premium)  | |             |
|  |  +--------------+ +--------------+ +------------+ |             |
|  +--------------------------------------------------+             |
|         |                                                         |
|         v                                                         |
|  +--------------------------------------------------+             |
|  |            FINGERPRINT MANAGEMENT                 |             |
|  |  +----------------+ +----------------+            |             |
|  |  | fingerprint-   | | puppeteer-     |            |             |
|  |  | suite          | | extra-stealth  |            |             |
|  |  +----------------+ +----------------+            |             |
|  +--------------------------------------------------+             |
|                                                                   |
+------------------------------------------------------------------+
```

### 4.4 Phase 2 Testing Strategy

| Test Category | Sites | Success Target |
|---------------|-------|----------------|
| Basic Static | Wikipedia, GitHub | 100% |
| JavaScript Heavy | SPA applications | 99% |
| Cloudflare Standard | Protected blogs | 95% |
| Cloudflare Turnstile | E-commerce sites | 90% |
| Akamai Bot Manager | Financial sites | 85% |
| DataDome | Retail sites | 85% |
| PerimeterX/HUMAN | Ticketing sites | 80% |

### 4.5 Phase 2 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Camoufox Python bridge latency | Medium | Medium | Async processing, batch requests |
| Anti-bot updates during development | High | High | Continuous monitoring, rapid iteration |
| Proxy provider rate limits | Medium | Medium | Multi-provider fallback |
| Browser memory leaks | High | Medium | Aggressive recycling, limits |

### 4.6 Phase 2 Resources

| Role | Allocation | Focus Area |
|------|------------|------------|
| Senior Backend Developer | 100% | Browser engines, fingerprinting |
| Backend Developer | 100% | Proxy system, Camoufox bridge |
| DevOps Engineer | 50% | Python environment, scaling |
| QA Engineer | 50% | Anti-detection testing |

### 4.7 Phase 2 Exit Criteria

| Criterion | Measurement |
|-----------|-------------|
| JavaScript rendering | 100 SPA sites rendered correctly |
| Fingerprint consistency | Zero fingerprint leaks detected |
| Camoufox functional | 50 protected sites accessible |
| Proxy escalation | Automatic tier upgrade on blocks |
| Success rate | 90%+ on test site portfolio |
| Browser stability | 8 hours operation without crash |

---

## 5. Phase 3: Scale and Reliability (Months 5-6)

### 5.1 Phase Objectives

| Objective | Success Criteria |
|-----------|------------------|
| Docker Swarm Deployment | Production cluster operational |
| Auto-Scaling | Workers scale with demand |
| CAPTCHA Integration | Automated solving working |
| Circuit Breakers | Graceful failure handling |
| Monitoring Complete | Full observability stack |
| 1M Pages/Day | Load test passed |

### 5.2 Sprint Breakdown

#### Sprint 3.1 (Week 1-2): Docker Swarm Production

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Hetzner server provisioning | DevOps | 2d | Account setup |
| Docker Swarm cluster initialization | DevOps | 2d | Servers |
| Network overlay configuration | DevOps | 2d | Swarm |
| Traefik reverse proxy setup | DevOps | 2d | Network |
| TLS certificate automation | DevOps | 1d | Traefik |
| Service stack deployment | DevOps | 3d | Traefik |
| Volume and secret management | DevOps | 2d | Stack |

**Sprint 3.1 Deliverables:**
- Production cluster running on Hetzner
- All services deployed to Swarm
- HTTPS with automatic certificates

#### Sprint 3.2 (Week 3-4): Auto-Scaling

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Prometheus metrics enhancement | DevOps | 2d | Sprint 3.1 |
| Queue depth monitoring | Backend | 2d | Prometheus |
| Worker utilization metrics | Backend | 2d | Prometheus |
| Scaling trigger implementation | DevOps | 3d | Metrics |
| Docker service scale automation | DevOps | 2d | Triggers |
| Scale-down logic and cooldowns | DevOps | 2d | Scaling |
| Load testing framework | QA | 2d | Infrastructure |
| 100K pages load test | QA | 2d | Framework |

**Sprint 3.2 Deliverables:**
- Workers scale automatically with queue depth
- Scale-down during low demand
- 100K pages/day validated

#### Sprint 3.3 (Week 5-6): CAPTCHA Integration

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| CAPTCHA detection logic | Backend | 3d | Phase 2 engines |
| 2Captcha API integration | Backend | 2d | Detection |
| Anti-Captcha fallback | Backend | 2d | 2Captcha |
| Cloudflare Turnstile handling | Backend | 3d | CAPTCHA service |
| reCAPTCHA v2/v3 support | Backend | 2d | CAPTCHA service |
| hCaptcha support | Backend | 2d | CAPTCHA service |
| CAPTCHA cost tracking | Backend | 1d | All CAPTCHA |
| End-to-end CAPTCHA tests | QA | 2d | All CAPTCHA |

**Sprint 3.3 Deliverables:**
- Automatic CAPTCHA solving
- Multiple CAPTCHA types supported
- Cost per solve tracked

#### Sprint 3.4 (Week 7-8): Reliability and Observability

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Circuit breaker implementation | Backend | 3d | All workers |
| Retry with exponential backoff | Backend | 2d | Circuit breakers |
| Dead letter queue handling | Backend | 2d | Retry |
| Alertmanager configuration | DevOps | 2d | Prometheus |
| PagerDuty/Slack integration | DevOps | 1d | Alertmanager |
| Grafana dashboard suite | DevOps | 3d | All metrics |
| Runbook documentation | DevOps | 2d | Dashboards |
| Chaos testing | QA | 2d | All systems |
| 1M pages load test | QA | 2d | All systems |

**Sprint 3.4 Deliverables:**
- Circuit breakers prevent cascade failures
- Alerting on critical issues
- Complete dashboard suite
- 1M pages/day validated

### 5.3 Phase 3 Infrastructure

```
+------------------------------------------------------------------+
|                  HETZNER PRODUCTION CLUSTER                       |
+------------------------------------------------------------------+
|                                                                   |
|  MANAGER NODE (AX41-NVMe)                                         |
|  +----------------------------------------------------------+    |
|  |  - Traefik (Load Balancer)                                |    |
|  |  - API Servers (3 replicas)                               |    |
|  |  - PostgreSQL (Primary)                                   |    |
|  |  - MinIO                                                  |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  BROWSER WORKER NODES (AX41-NVMe x3)                              |
|  +----------------------------------------------------------+    |
|  |  - Browser Workers (15-25 per node)                       |    |
|  |  - Stealth Workers (5-10 per node)                        |    |
|  |  - Shared memory for Chrome (/dev/shm)                    |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  HTTP WORKER NODES (CPX31 x3)                                     |
|  +----------------------------------------------------------+    |
|  |  - HTTP Workers (50-100 per node)                         |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  UTILITY NODE (CPX21)                                             |
|  +----------------------------------------------------------+    |
|  |  - Redis Cluster                                          |    |
|  |  - Prometheus                                             |    |
|  |  - Grafana                                                |    |
|  |  - Alertmanager                                           |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  SCALING CAPACITY                                                 |
|  +----------------------------------------------------------+    |
|  |  Minimum: 100,000 pages/day                               |    |
|  |  Target:  1,000,000 pages/day                             |    |
|  |  Maximum: 5,000,000 pages/day (with node additions)       |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 5.4 Phase 3 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Hetzner provisioning delays | Low | High | Order servers early |
| Network latency between nodes | Low | Medium | Use same datacenter |
| CAPTCHA service downtime | Medium | Medium | Multi-provider fallback |
| Unexpected costs at scale | Medium | High | Cost monitoring, alerts |

### 5.5 Phase 3 Resources

| Role | Allocation | Focus Area |
|------|------------|------------|
| DevOps Engineer | 100% | Infrastructure, scaling, monitoring |
| Senior Backend Developer | 75% | CAPTCHA, circuit breakers |
| Backend Developer | 50% | Retry logic, queue handling |
| QA Engineer | 75% | Load testing, chaos testing |

### 5.6 Phase 3 Exit Criteria

| Criterion | Measurement |
|-----------|-------------|
| Production deployment | All services running on Hetzner |
| Auto-scaling functional | Workers scale 2x-5x with load |
| CAPTCHA solving | 95%+ solve rate on supported types |
| Circuit breakers | Failures contained, no cascades |
| 1M pages/day | Sustained load test passed |
| 99% uptime | Measured over final week |

---

## 6. Phase 4: Business Features (Months 7-8)

### 6.1 Phase Objectives

| Objective | Success Criteria |
|-----------|------------------|
| Stripe Integration | Subscriptions processing |
| Usage Metering | Credits tracked accurately |
| Customer Dashboard | Self-service portal live |
| Webhook System | Reliable delivery |
| Data Extraction | CSS/XPath selectors working |
| Batch API | Bulk job submission |

### 6.2 Sprint Breakdown

#### Sprint 4.1 (Week 1-2): Stripe Billing Core

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Stripe account and product setup | Backend | 1d | Account |
| Customer creation flow | Backend | 2d | Stripe SDK |
| Subscription creation | Backend | 2d | Customers |
| Stripe webhook handlers | Backend | 3d | Subscriptions |
| Plan change (upgrade/downgrade) | Backend | 2d | Webhooks |
| Cancellation flow | Backend | 2d | Webhooks |
| Invoice generation | Backend | 1d | Subscriptions |
| Payment failure handling | Backend | 2d | Webhooks |

**Sprint 4.1 Deliverables:**
- Customers can subscribe to plans
- Subscription lifecycle managed
- Payments processed

#### Sprint 4.2 (Week 3-4): Usage Metering

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Credit calculation engine | Backend | 3d | Phase 1 API |
| Usage event streaming (Redis) | Backend | 2d | Credit engine |
| Usage aggregation service | Backend | 3d | Streaming |
| Stripe usage reporting | Backend | 2d | Aggregation |
| Overage calculation | Backend | 2d | Usage data |
| Real-time usage API endpoint | Backend | 2d | Aggregation |
| Usage history storage | Backend | 1d | PostgreSQL |
| Credit multiplier configuration | Backend | 1d | Credit engine |

**Sprint 4.2 Deliverables:**
- Credits consumed per request
- Usage reported to Stripe
- Real-time usage available

#### Sprint 4.3 (Week 5-6): Customer Dashboard

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Frontend framework setup (React) | Frontend | 2d | None |
| Authentication (session-based) | Frontend | 2d | API |
| Dashboard overview page | Frontend | 3d | Auth |
| Usage charts and history | Frontend | 3d | Usage API |
| API key management UI | Frontend | 2d | Dashboard |
| Account settings | Frontend | 2d | Dashboard |
| Billing portal integration | Frontend | 2d | Stripe |
| Responsive design | Frontend | 2d | All pages |

**Sprint 4.3 Deliverables:**
- Self-service customer portal
- Usage visualization
- API key management

#### Sprint 4.4 (Week 7-8): Webhooks and Extraction

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Webhook configuration API | Backend | 2d | Phase 1 API |
| Webhook delivery queue | Backend | 2d | BullMQ |
| Retry with backoff for webhooks | Backend | 2d | Queue |
| Webhook signature verification | Backend | 1d | Delivery |
| CSS selector extraction | Backend | 2d | Cheerio |
| XPath selector support | Backend | 2d | libxmljs |
| JSON output formatting | Backend | 1d | Extraction |
| Batch job endpoint | Backend | 3d | Extraction |
| Batch result aggregation | Backend | 2d | Batch jobs |

**Sprint 4.4 Deliverables:**
- Webhook delivery system
- Data extraction with selectors
- Batch job processing

### 6.3 Phase 4 Architecture

```
+------------------------------------------------------------------+
|                   PHASE 4: BUSINESS LAYER                         |
+------------------------------------------------------------------+
|                                                                   |
|  CUSTOMER DASHBOARD (React SPA)                                   |
|  +----------------------------------------------------------+    |
|  |  +------------+  +------------+  +------------+           |    |
|  |  |  Overview  |  |   Usage    |  |  API Keys  |           |    |
|  |  +------------+  +------------+  +------------+           |    |
|  |  +------------+  +------------+  +------------+           |    |
|  |  |  Billing   |  |  Settings  |  |   Docs     |           |    |
|  |  +------------+  +------------+  +------------+           |    |
|  +----------------------------------------------------------+    |
|                           |                                       |
|                           v                                       |
|  +----------------------------------------------------------+    |
|  |                    FASTIFY API                            |    |
|  |  +------------------+  +------------------+               |    |
|  |  | /v1/account      |  | /v1/usage        |               |    |
|  |  +------------------+  +------------------+               |    |
|  |  +------------------+  +------------------+               |    |
|  |  | /v1/api-keys     |  | /v1/webhooks     |               |    |
|  |  +------------------+  +------------------+               |    |
|  |  +------------------+  +------------------+               |    |
|  |  | /v1/batch        |  | /v1/billing      |               |    |
|  |  +------------------+  +------------------+               |    |
|  +----------------------------------------------------------+    |
|                           |                                       |
|                           v                                       |
|  +----------------------------------------------------------+    |
|  |                 BILLING SYSTEM                            |    |
|  |                                                           |    |
|  |  +------------------+     +------------------+            |    |
|  |  | Credit Engine    |---->| Usage Aggregator |            |    |
|  |  +------------------+     +--------+---------+            |    |
|  |                                    |                      |    |
|  |                                    v                      |    |
|  |                           +--------+---------+            |    |
|  |                           | Stripe Metering  |            |    |
|  |                           +------------------+            |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 6.4 Credit Multiplier Configuration

| Request Type | Base Credits | Notes |
|--------------|-------------|-------|
| HTTP Static | 1 | Minimal resources |
| JavaScript Render | 5 | Browser required |
| Stealth Mode | 10 | Camoufox + premium resources |
| Residential Proxy | +3 | Added to base |
| Mobile Proxy | +10 | Added to base |
| CAPTCHA Solve | +10 | Per solve |
| Screenshot | +2 | Storage overhead |
| Data Extraction | +0 | Included in base |

### 6.5 Phase 4 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Stripe API changes | Low | Medium | Pin SDK version |
| Usage calculation errors | Medium | High | Extensive testing, audit logs |
| Dashboard performance | Medium | Medium | Pagination, caching |
| Webhook delivery failures | Medium | Medium | Retry logic, dead letter |

### 6.6 Phase 4 Resources

| Role | Allocation | Focus Area |
|------|------------|------------|
| Senior Backend Developer | 100% | Stripe, usage metering |
| Backend Developer | 100% | Webhooks, extraction, batch |
| Frontend Developer | 100% | Customer dashboard |
| QA Engineer | 50% | Billing accuracy testing |

### 6.7 Phase 4 Exit Criteria

| Criterion | Measurement |
|-----------|-------------|
| Stripe subscriptions | 10 test subscriptions processed |
| Usage metering | 99.9% accuracy in credit calculation |
| Dashboard functional | All features accessible |
| Webhooks reliable | 99% delivery rate |
| Batch API | 1000 URL batches processed |
| Self-service | Signup to scraping in <5 minutes |

---

## 7. Phase 5: Advanced Capabilities (Months 9-10)

### 7.1 Phase Objectives

| Objective | Success Criteria |
|-----------|------------------|
| SDKs Released | Python and Node.js published |
| Mobile Proxies | Premium proxy tier available |
| AI CAPTCHA | Improved solve rates |
| Geo-Targeting | All countries supported |
| JavaScript Scenarios | Custom browser automation |
| Documentation Complete | All features documented |

### 7.2 Sprint Breakdown

#### Sprint 5.1 (Week 1-2): SDK Development

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| SDK architecture design | Backend | 2d | API stable |
| Python SDK implementation | Backend | 4d | Architecture |
| Python SDK async support | Backend | 2d | Implementation |
| Node.js SDK implementation | Backend | 4d | Architecture |
| SDK documentation | Backend | 2d | Both SDKs |
| SDK examples and tutorials | Backend | 2d | Documentation |

**Sprint 5.1 Deliverables:**
- Python SDK on PyPI
- Node.js SDK on npm
- SDK documentation live

#### Sprint 5.2 (Week 3-4): Premium Proxy Features

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Mobile proxy integration | Backend | 3d | Proxy layer |
| Geo-targeting by country | Backend | 2d | Proxy layer |
| City-level targeting | Backend | 2d | Country targeting |
| ASN targeting | Backend | 2d | Proxy providers |
| Dedicated proxy pools | Backend | 2d | Enterprise tier |
| Proxy usage analytics | Backend | 2d | Metrics |
| Proxy cost optimization | Backend | 2d | Analytics |

**Sprint 5.2 Deliverables:**
- Mobile proxy tier available
- Geo-targeting functional
- Proxy costs optimized

#### Sprint 5.3 (Week 5-6): JavaScript Scenarios

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Scenario DSL design | Backend | 2d | Playwright |
| Action: click, type, scroll | Backend | 3d | DSL |
| Action: wait, screenshot | Backend | 2d | Actions |
| Conditional logic | Backend | 2d | Actions |
| Loop support | Backend | 2d | Conditionals |
| Scenario validation | Backend | 2d | All actions |
| Scenario execution engine | Backend | 3d | Validation |
| Scenario templates library | Backend | 2d | Engine |

**Sprint 5.3 Deliverables:**
- Custom browser automation
- Pre-built scenario templates
- Infinite scroll handling

#### Sprint 5.4 (Week 7-8): Documentation and Polish

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| API reference documentation | Backend | 3d | All endpoints |
| OpenAPI specification | Backend | 2d | API reference |
| Interactive API explorer | Frontend | 3d | OpenAPI |
| Getting started guides | Backend | 2d | Documentation |
| Use case tutorials | Backend | 3d | Guides |
| Error resolution guides | Backend | 2d | All errors |
| Video tutorials | Marketing | 3d | All docs |
| Documentation site deployment | DevOps | 2d | All content |

**Sprint 5.4 Deliverables:**
- Complete API documentation
- Interactive explorer
- Tutorial content

### 7.3 SDK Architecture

```typescript
// Python SDK Usage Example
from scraperx import ScraperX

client = ScraperX(api_key="sk_live_xxx")

# Simple scrape
result = await client.scrape("https://example.com")
print(result.html)

# With options
result = await client.scrape(
    url="https://example.com",
    render_js=True,
    proxy_type="residential",
    country="US",
    extract={
        "title": "h1",
        "prices": ".price::text"
    }
)
print(result.extracted)

# Batch scrape
results = await client.batch_scrape([
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
])
```

```typescript
// Node.js SDK Usage Example
import { ScraperX } from '@scraperx/sdk';

const client = new ScraperX({ apiKey: 'sk_live_xxx' });

// Simple scrape
const result = await client.scrape('https://example.com');
console.log(result.html);

// With options
const result = await client.scrape({
  url: 'https://example.com',
  renderJs: true,
  proxyType: 'residential',
  country: 'US',
  extract: {
    title: 'h1',
    prices: '.price'
  }
});
console.log(result.extracted);

// With scenarios
const result = await client.scrape({
  url: 'https://example.com',
  scenario: [
    { action: 'click', selector: '.load-more' },
    { action: 'wait', duration: 2000 },
    { action: 'scroll', direction: 'bottom' }
  ]
});
```

### 7.4 Phase 5 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SDK compatibility issues | Medium | Medium | Extensive testing on versions |
| Mobile proxy costs | High | Medium | Cost monitoring, usage limits |
| Scenario complexity | Medium | Medium | Limited action set initially |
| Documentation gaps | Low | Medium | Review checklist |

### 7.5 Phase 5 Resources

| Role | Allocation | Focus Area |
|------|------------|------------|
| Senior Backend Developer | 100% | SDKs, scenarios |
| Backend Developer | 75% | Premium proxies, geo-targeting |
| Frontend Developer | 75% | API explorer, docs site |
| Technical Writer | 50% | Documentation |
| QA Engineer | 50% | SDK testing |

### 7.6 Phase 5 Exit Criteria

| Criterion | Measurement |
|-----------|-------------|
| SDKs published | Python on PyPI, Node on npm |
| SDK downloads | 100+ combined downloads |
| Mobile proxies | Functional with tracking |
| Geo-targeting | 50+ countries available |
| Scenarios | 10 action types supported |
| Documentation | 100% feature coverage |

---

## 8. Phase 6: Hardening and Growth (Months 11-12)

### 8.1 Phase Objectives

| Objective | Success Criteria |
|-----------|------------------|
| Security Audit | No critical vulnerabilities |
| Performance Optimization | 2x throughput improvement |
| 99.9% Uptime | SLA achieved |
| 100 Customers | Milestone reached |
| Marketing Ready | Launch materials prepared |
| v1.1 Release | Stable production version |

### 8.2 Sprint Breakdown

#### Sprint 6.1 (Week 1-2): Security Hardening

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Third-party security audit | External | 5d | All systems |
| Penetration testing | External | 3d | Audit |
| Vulnerability remediation | Backend | 5d | Audit findings |
| API key rotation mechanism | Backend | 2d | Remediation |
| Audit logging enhancement | Backend | 2d | Security |
| Rate limiting refinement | Backend | 1d | Security |
| Secrets management (Vault) | DevOps | 2d | Security |
| Compliance review (GDPR) | Legal | 3d | Audit |

**Sprint 6.1 Deliverables:**
- Security audit complete
- All critical issues fixed
- Compliance documentation

#### Sprint 6.2 (Week 3-4): Performance Optimization

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Profiling and bottleneck analysis | Backend | 3d | Production data |
| Database query optimization | Backend | 3d | Profiling |
| Redis caching improvements | Backend | 2d | Profiling |
| Browser pool optimization | Backend | 2d | Profiling |
| Connection pooling tuning | Backend | 2d | Profiling |
| Load test to 2M pages/day | QA | 2d | Optimization |
| Response time optimization | Backend | 2d | Testing |
| CDN for static assets | DevOps | 1d | Dashboard |

**Sprint 6.2 Deliverables:**
- 2x throughput improvement
- P95 latency reduced
- 2M pages/day validated

#### Sprint 6.3 (Week 5-6): Reliability and SLA

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| SLI/SLO definition | DevOps | 2d | Phase 3 metrics |
| Error budget tracking | DevOps | 2d | SLOs |
| Disaster recovery testing | DevOps | 3d | All systems |
| Backup verification | DevOps | 2d | DR testing |
| Failover automation | DevOps | 3d | DR testing |
| Incident response procedures | DevOps | 2d | Runbooks |
| On-call rotation setup | DevOps | 1d | Procedures |
| SLA documentation | Legal | 2d | SLOs |

**Sprint 6.3 Deliverables:**
- 99.9% uptime maintained
- DR procedures tested
- SLA published

#### Sprint 6.4 (Week 7-8): Launch Preparation

| Task | Owner | Estimate | Dependencies |
|------|-------|----------|--------------|
| Marketing website finalization | Marketing | 5d | All content |
| Pricing page | Marketing | 2d | Plans finalized |
| Case studies | Marketing | 3d | Beta customers |
| Blog content | Marketing | 3d | Case studies |
| SEO optimization | Marketing | 2d | All pages |
| Social media presence | Marketing | 2d | Launch |
| Customer success processes | Support | 3d | Launch |
| Launch announcement | Marketing | 2d | All ready |

**Sprint 6.4 Deliverables:**
- Marketing site live
- Launch materials ready
- v1.1 released

### 8.3 Security Audit Checklist

| Category | Items | Priority |
|----------|-------|----------|
| Authentication | API key hashing, rotation, scoping | Critical |
| Authorization | RBAC enforcement, scope validation | Critical |
| Input Validation | SQL injection, XSS, command injection | Critical |
| Rate Limiting | DDoS protection, abuse prevention | High |
| Data Protection | Encryption at rest, in transit | High |
| Secrets Management | No hardcoded secrets, Vault integration | High |
| Logging | Audit trails, no sensitive data logged | Medium |
| Dependencies | No known vulnerabilities (Snyk scan) | Medium |
| Infrastructure | Firewall rules, network segmentation | High |
| Compliance | GDPR data handling, retention | Medium |

### 8.4 SLO Definitions

| Service Level Indicator | Objective | Error Budget |
|------------------------|-----------|--------------|
| API Availability | 99.9% | 43.8 min/month |
| Successful Scrape Rate | 95% | 5% failures |
| API Latency (P95) | <5 seconds | 5% slow requests |
| Job Processing Time (P95) | <30 seconds | 5% slow jobs |
| Webhook Delivery | 99% | 1% missed |

### 8.5 Phase 6 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Security audit delays | Medium | High | Schedule early |
| Critical vulnerabilities found | Medium | High | Budget time for fixes |
| Performance gains insufficient | Low | Medium | Iterative optimization |
| Customer acquisition slow | Medium | High | Early marketing start |

### 8.6 Phase 6 Resources

| Role | Allocation | Focus Area |
|------|------------|------------|
| Senior Backend Developer | 75% | Security fixes, optimization |
| DevOps Engineer | 100% | Security, DR, SLA |
| Backend Developer | 50% | Performance optimization |
| QA Engineer | 75% | Load testing, security testing |
| External Security Firm | Contract | Audit, penetration testing |
| Marketing | 100% | Launch preparation |

### 8.7 Phase 6 Exit Criteria

| Criterion | Measurement |
|-----------|-------------|
| Security audit | No critical/high vulnerabilities |
| Performance | 2M pages/day capacity |
| Uptime | 99.9% over final month |
| Customers | 100+ paying customers |
| Revenue | $15K+ MRR |
| Documentation | Complete and reviewed |
| Launch | Marketing site live |

---

## 9. Resource Planning

### 9.1 Team Composition

| Phase | Backend Sr. | Backend Jr. | DevOps | Frontend | QA | Total FTE |
|-------|-------------|-------------|--------|----------|-----|-----------|
| 1. Foundation | 1.0 | - | 0.5 | - | 0.25 | 1.75 |
| 2. Anti-Detection | 1.0 | 1.0 | 0.5 | - | 0.5 | 3.0 |
| 3. Scale | 0.75 | 0.5 | 1.0 | - | 0.75 | 3.0 |
| 4. Business | 1.0 | 1.0 | 0.25 | 1.0 | 0.5 | 3.75 |
| 5. Advanced | 1.0 | 0.75 | 0.25 | 0.75 | 0.5 | 3.25 |
| 6. Hardening | 0.75 | 0.5 | 1.0 | - | 0.75 | 3.0 |

### 9.2 Monthly Infrastructure Costs

| Phase | Servers | Proxies | CAPTCHA | Other | Total |
|-------|---------|---------|---------|-------|-------|
| 1-2 | $100 | $200 | $50 | $50 | $400 |
| 3-4 | $250 | $1,000 | $200 | $100 | $1,550 |
| 5-6 | $400 | $2,000 | $500 | $200 | $3,100 |
| Production | $500 | $3,000 | $1,000 | $300 | $4,800 |

### 9.3 External Services Budget

| Service | Phase | Cost |
|---------|-------|------|
| Security Audit | 6 | $5,000-15,000 |
| Penetration Testing | 6 | $3,000-8,000 |
| Legal Review (GDPR) | 6 | $2,000-5,000 |
| Design Services | 4-6 | $3,000-8,000 |

### 9.4 Hiring Timeline

| Role | Hire By | Phase Needed |
|------|---------|--------------|
| Backend Developer | Month 2 | Phase 2 |
| DevOps Engineer (Full-time) | Month 4 | Phase 3 |
| Frontend Developer | Month 6 | Phase 4 |
| QA Engineer (Full-time) | Month 4 | Phase 3 |
| Technical Writer | Month 8 | Phase 5 |

---

## 10. Risk Management

### 10.1 Risk Register

| ID | Risk | Probability | Impact | Owner | Status |
|----|------|-------------|--------|-------|--------|
| R1 | Anti-bot evolution faster than development | High | High | Tech Lead | Monitor |
| R2 | Key developer departure | Medium | Critical | Management | Mitigate |
| R3 | Proxy provider rate limits | Medium | Medium | Backend | Mitigate |
| R4 | Infrastructure costs exceed budget | Medium | Medium | DevOps | Monitor |
| R5 | Customer acquisition slower than projected | Medium | High | Marketing | Monitor |
| R6 | Security breach before launch | Low | Critical | DevOps | Prevent |
| R7 | Competitor launches similar product | Medium | Medium | Product | Accept |
| R8 | Legal challenges (TOS violations) | Low | High | Legal | Prevent |

### 10.2 Mitigation Strategies

**R1: Anti-bot Evolution**
- Continuous monitoring of anti-bot research
- Participation in web scraping communities
- Rapid iteration capability on detection evasion
- Budget for emergency research sprints

**R2: Key Developer Departure**
- Comprehensive documentation requirements
- Code review for knowledge sharing
- Competitive compensation packages
- No single points of knowledge

**R3: Proxy Provider Limits**
- Multi-provider integration (Bright Data, Oxylabs, Smartproxy)
- Automatic failover between providers
- Usage monitoring and preemptive scaling
- Negotiated enterprise limits

**R4: Infrastructure Costs**
- Weekly cost monitoring and alerts
- Automatic scaling down during low usage
- Reserved instance pricing where available
- Cost optimization sprints each phase

**R6: Security Breach**
- Security-first development practices
- External audit before launch
- Bug bounty program consideration
- Incident response plan documented

### 10.3 Contingency Plans

| Trigger | Contingency |
|---------|-------------|
| Phase gate not met | Extend phase by 2 weeks, escalate blockers |
| Key dependency fails | Activate backup technology, reallocate resources |
| Budget overrun >20% | Pause non-critical features, seek additional funding |
| Team capacity <80% | Contractor engagement, scope reduction |

---

## 11. Success Metrics

### 11.1 Technical Metrics

| Metric | Month 3 | Month 6 | Month 9 | Month 12 |
|--------|---------|---------|---------|----------|
| Daily Capacity | 100K | 1M | 2M | 5M |
| Success Rate | 85% | 95% | 96% | 97% |
| API Uptime | 99% | 99.5% | 99.9% | 99.9% |
| P95 Latency | 8s | 5s | 4s | 3s |
| Protected Site Success | 70% | 90% | 93% | 95% |

### 11.2 Business Metrics

| Metric | Month 3 | Month 6 | Month 9 | Month 12 |
|--------|---------|---------|---------|----------|
| Beta Users | 10 | 50 | - | - |
| Paying Customers | - | 10 | 50 | 100 |
| MRR | - | $1K | $7K | $15K |
| Churn Rate | - | <10% | <7% | <5% |
| NPS | - | 30 | 40 | 50 |

### 11.3 Operational Metrics

| Metric | Month 3 | Month 6 | Month 9 | Month 12 |
|--------|---------|---------|---------|----------|
| Deploy Frequency | Weekly | Daily | Daily | Multiple/day |
| Deploy Success | 90% | 95% | 98% | 99% |
| MTTR | 4hr | 2hr | 1hr | 30min |
| Test Coverage | 60% | 75% | 85% | 90% |
| Doc Coverage | 40% | 70% | 90% | 100% |

---

## 12. Appendix

### 12.1 Technology Decisions Log

| Decision | Date | Rationale | Alternatives Considered |
|----------|------|-----------|------------------------|
| Fastify over Express | Month 1 | Performance, TypeScript | Express, Hono |
| BullMQ over Agenda | Month 1 | Redis backend, features | Agenda, pg-boss |
| impit over Axios | Month 1 | TLS fingerprinting | got, node-fetch |
| Playwright over Puppeteer | Month 2 | Multi-browser, stability | Puppeteer, CDP |
| Camoufox over undetected-chromedriver | Month 2 | Native Firefox TLS | ucd, Rebrowser |
| Docker Swarm over K8s | Month 3 | Simplicity, Hetzner fit | Kubernetes, Nomad |
| Stripe over Paddle | Month 4 | API flexibility, scale | Paddle, LemonSqueezy |

### 12.2 External Dependencies

| Dependency | Type | Criticality | Fallback |
|------------|------|-------------|----------|
| Bright Data | Proxy Provider | High | Oxylabs |
| Oxylabs | Proxy Provider | Medium | Smartproxy |
| 2Captcha | CAPTCHA Service | High | Anti-Captcha |
| Stripe | Billing | Critical | None (migration) |
| Hetzner | Infrastructure | Critical | OVH, bare metal |
| GitHub | Source Control | High | GitLab |
| npm | Package Registry | High | yarn, pnpm |

### 12.3 Sprint Velocity Assumptions

| Phase | Story Points/Sprint | Sprint Duration | Buffer |
|-------|---------------------|-----------------|--------|
| 1 | 40 | 2 weeks | 10% |
| 2 | 45 | 2 weeks | 15% |
| 3 | 45 | 2 weeks | 15% |
| 4 | 50 | 2 weeks | 10% |
| 5 | 45 | 2 weeks | 15% |
| 6 | 40 | 2 weeks | 20% |

### 12.4 Definition of Done

**Feature Complete:**
- All acceptance criteria met
- Unit tests passing (>80% coverage)
- Integration tests passing
- Code reviewed and approved
- Documentation updated
- No critical bugs

**Sprint Complete:**
- All committed stories done
- Demo conducted
- Retrospective completed
- Next sprint planned

**Phase Complete:**
- All exit criteria met
- Go/no-go decision made
- Lessons learned documented
- Next phase kickoff ready

---

## Document Control

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-31 | Engineering Team | Initial document |

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | |
| Product Manager | | | |
| Executive Sponsor | | | |

### Distribution

| Role | Access Level |
|------|--------------|
| Engineering Team | Full |
| Product Team | Full |
| Executive Team | Summary |
| External Partners | Upon request |
