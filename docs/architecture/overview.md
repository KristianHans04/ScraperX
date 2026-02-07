# System Overview

ScraperX is designed as a distributed, scalable web scraping platform. This document explains how the major components work together.

## High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client/API    │────▶│   Job Queue     │────▶│    Workers      │
│    Consumer     │     │   (BullMQ)      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Fastify API   │     │     Redis       │     │  Scrape Engines │
│    Server       │     │                 │     │  HTTP/Browser/  │
│                 │     │                 │     │  Stealth        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        ▼                                               ▼
┌─────────────────┐                             ┌─────────────────┐
│   PostgreSQL    │                             │  Proxy Manager  │
│   Database      │                             │                 │
└─────────────────┘                             └─────────────────┘
```

## Components

### API Server

The Fastify-based API server handles:

- **Authentication** - Validates API keys and manages sessions
- **Request Validation** - Validates incoming scrape requests using Zod schemas
- **Job Submission** - Creates scrape jobs and adds them to the queue
- **Status Queries** - Returns job status and results
- **Rate Limiting** - Enforces per-organization request limits

### Job Queue

BullMQ (backed by Redis) manages job processing:

- **Job Queues** - Separate queues for HTTP, Browser, and Stealth jobs
- **Priority** - Jobs can be prioritized based on subscription tier
- **Retries** - Failed jobs are automatically retried with backoff
- **Concurrency** - Configurable parallel job processing

### Workers

Worker processes consume jobs from queues:

- **Engine Selection** - Chooses appropriate scraping engine
- **Job Execution** - Performs the actual scraping
- **Result Storage** - Saves results to database
- **Credit Deduction** - Updates organization credit balance

### Scrape Engines

Three engines handle different scraping scenarios:

| Engine | Technology | Use Case |
|--------|------------|----------|
| HTTP | undici | Static content, APIs |
| Browser | Playwright | JavaScript-rendered pages |
| Stealth | Camoufox | Anti-bot protected sites |

See [Engines](engines.md) for detailed information.

### Database

PostgreSQL stores persistent data:

- Organizations and their settings
- API keys (encrypted)
- Scrape jobs and their status
- Job results and metadata

See [Database Schema](database.md) for details.

### Redis

Redis serves multiple purposes:

- **Job Queues** - BullMQ job storage
- **Rate Limiting** - Token bucket implementation
- **Caching** - Temporary data storage
- **Session Data** - Short-lived operational data

## Request Flow

1. **Client** sends scrape request to API with API key
2. **API Server** validates request and authenticates
3. **API Server** checks rate limits and credit balance
4. **API Server** creates job record in PostgreSQL
5. **API Server** adds job to appropriate BullMQ queue
6. **API Server** returns job ID to client
7. **Worker** picks up job from queue
8. **Worker** selects appropriate engine (or uses auto-selection)
9. **Engine** performs scrape, possibly with proxy
10. **Worker** stores result in PostgreSQL
11. **Worker** deducts credits from organization
12. **Client** polls status endpoint until complete
13. **Client** retrieves final result

## Scaling Considerations

### Horizontal Scaling

- **API Servers** - Stateless, can run multiple instances behind load balancer
- **Workers** - Can run multiple worker processes or containers
- **Redis** - Can use Redis Cluster for high availability
- **PostgreSQL** - Can use read replicas for status queries

### Vertical Scaling

- **Browser Pool** - Increase `BROWSER_POOL_SIZE` for more concurrent browsers
- **Worker Concurrency** - Increase `QUEUE_CONCURRENCY` for more parallel jobs

## Multi-Tenancy

ScraperX supports multiple organizations:

- Each organization has isolated API keys
- Credit balances are per-organization
- Rate limits apply per-organization
- Job results are organization-scoped

## Security Layers

1. **API Key Authentication** - All requests require valid API key
2. **Rate Limiting** - Prevents abuse and ensures fair usage
3. **Credit System** - Controls resource consumption
4. **Encryption** - Sensitive data encrypted at rest
5. **Input Validation** - All inputs validated with Zod schemas
