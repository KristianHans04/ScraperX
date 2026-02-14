# Queue System

Scrapifie uses BullMQ for reliable, distributed job processing. This document explains how the queue system works.

## Overview

The queue system handles:

- Job submission and scheduling
- Distributed worker processing
- Retry logic for failed jobs
- Priority-based execution
- Rate limiting per organization

## Queue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Redis                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  HTTP Queue │  │Browser Queue│  │Stealth Queue│          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ HTTP Worker │    │Browser Worker│   │Stealth Worker│
└─────────────┘    └─────────────┘    └─────────────┘
```

## Queues

### Dedicated Queues

Each engine type has its own queue:

| Queue | Purpose | Default Concurrency |
|-------|---------|---------------------|
| `scrape:http` | HTTP engine jobs | 50 |
| `scrape:browser` | Browser engine jobs | 10 |
| `scrape:stealth` | Stealth engine jobs | 5 |

### Why Separate Queues?

- **Resource isolation** - Browser jobs don't block HTTP jobs
- **Concurrency control** - Different limits per engine type
- **Priority handling** - Can prioritize specific engine types
- **Monitoring** - Track performance per engine

## Job Lifecycle

### States

| State | Description |
|-------|-------------|
| `waiting` | Job is queued, waiting for worker |
| `active` | Worker is processing the job |
| `completed` | Job finished successfully |
| `failed` | Job failed after all retries |
| `delayed` | Job scheduled for future execution |

### State Transitions

```
              ┌──────────────┐
              │   waiting    │
              └──────┬───────┘
                     │ worker picks up
                     ▼
              ┌──────────────┐
              │    active    │
              └──────┬───────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   ┌──────────────┐     ┌──────────────┐
   │  completed   │     │   delayed    │◀──┐
   └──────────────┘     └──────┬───────┘   │
                               │           │
                               ▼           │ retry
                        ┌──────────────┐   │
                        │    active    │───┘
                        └──────┬───────┘
                               │ max retries
                               ▼
                        ┌──────────────┐
                        │    failed    │
                        └──────────────┘
```

## Job Priority

Jobs can be assigned priority levels:

| Priority | Value | Use Case |
|----------|-------|----------|
| Critical | 1 | Urgent requests |
| High | 2 | Premium tier |
| Normal | 3 | Standard tier |
| Low | 4 | Bulk/batch jobs |

Higher priority jobs are processed first within each queue.

## Retry Logic

Failed jobs are automatically retried:

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_RETRIES` | 3 | Maximum retry attempts |
| `RETRY_BACKOFF` | exponential | Backoff strategy |

### Backoff Strategy

Retry delays increase exponentially:

- Attempt 1: Immediate
- Attempt 2: 30 seconds
- Attempt 3: 2 minutes
- Attempt 4: 8 minutes (if configured)

### Non-Retryable Errors

Some errors skip retries:

- Invalid URL (4xx client errors)
- Authentication failures
- Insufficient credits
- Rate limit exceeded

## Rate Limiting

### Token Bucket Algorithm

Scrapifie uses a Redis-based token bucket for rate limiting:

- Each organization has a bucket
- Bucket refills at configured rate
- Requests consume tokens
- Empty bucket = request rejected

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 60000 | Window duration (1 minute) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Requests per window |

### Per-Engine Limits

Rate limits can vary by engine:

| Engine | Multiplier | Effective Limit |
|--------|------------|-----------------|
| HTTP | 1x | 100/min |
| Browser | 2x | 50/min |
| Stealth | 5x | 20/min |

## Worker Configuration

### Concurrency

Workers process multiple jobs in parallel:

```
QUEUE_CONCURRENCY=10
```

This means each worker process handles 10 jobs simultaneously.

### Scaling Workers

Add more worker processes for higher throughput:

- Docker: Increase `replicas` in docker-compose
- Manual: Run multiple `npm run start:worker` processes
- Kubernetes: Increase deployment replicas

### Worker Distribution

Workers automatically distribute across queues. Each worker can process jobs from all queues, with configurable concurrency per queue type.

## Monitoring

### Queue Metrics

Available via the health endpoint:

- Jobs waiting per queue
- Jobs active per queue
- Jobs completed (last hour)
- Jobs failed (last hour)
- Average processing time

### Recommended Monitoring

- Queue depth (jobs waiting)
- Processing latency
- Error rate
- Worker utilization

## Failure Handling

### Dead Letter Queue

Jobs that fail after all retries are moved to a dead letter queue for investigation:

- Preserved for debugging
- Can be manually retried
- Automatically cleaned after 7 days

### Error Reporting

Failed jobs include:

- Error message and stack trace
- Number of attempts
- Last attempt timestamp
- Original job data
