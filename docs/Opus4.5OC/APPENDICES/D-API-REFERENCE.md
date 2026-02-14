# Appendix D: API Reference

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-APP-D |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Engineering Team |
| Status | Draft |
| Classification | Public |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Core Endpoints](#3-core-endpoints)
4. [Batch Operations](#4-batch-operations)
5. [Account Management](#5-account-management)
6. [Webhooks](#6-webhooks)
7. [Error Reference](#7-error-reference)
8. [OpenAPI Specification](#8-openapi-specification)

---

## 1. Overview

### 1.1 Base URL

```
Production: https://api.scrapifie.com/v1
Sandbox:    https://sandbox.scrapifie.com/v1
```

### 1.2 API Conventions

| Convention | Details |
|------------|---------|
| Protocol | HTTPS only |
| Content Type | application/json |
| Character Encoding | UTF-8 |
| Date Format | ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) |
| Pagination | Cursor-based |
| Rate Limits | Per API key, sliding window |

### 1.3 Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <api_key>` |
| `Content-Type` | Yes (POST/PUT) | `application/json` |
| `X-Request-ID` | No | Client-provided request ID for tracing |
| `X-Idempotency-Key` | No | Prevents duplicate operations |

### 1.4 Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-01-31T12:00:00.000Z"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 5 seconds.",
    "details": {
      "limit": 10,
      "remaining": 0,
      "reset_at": "2025-01-31T12:00:05.000Z"
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-01-31T12:00:00.000Z"
  }
}
```

---

## 2. Authentication

### 2.1 API Keys

API keys are passed via the Authorization header:

```bash
curl -X GET "https://api.scrapifie.com/v1/account" \
  -H "Authorization: Bearer sk_live_abc123..."
```

### 2.2 Key Formats

| Environment | Prefix | Example |
|-------------|--------|---------|
| Production | `sk_live_` | `sk_live_abc123def456...` |
| Sandbox | `sk_test_` | `sk_test_abc123def456...` |

### 2.3 Key Scopes

| Scope | Description |
|-------|-------------|
| `scrape:read` | Read scrape jobs and results |
| `scrape:write` | Create and modify scrape jobs |
| `account:read` | Read account information |
| `account:write` | Modify account settings |
| `billing:read` | View billing information |
| `billing:write` | Manage billing settings |
| `webhooks:read` | View webhook configurations |
| `webhooks:write` | Manage webhooks |

---

## 3. Core Endpoints

### 3.1 Create Scrape Job

Creates a new scraping job.

**Endpoint:** `POST /v1/scrape`

**Request Body:**

```json
{
  "url": "https://example.com/page",
  "method": "GET",
  "headers": {
    "Accept-Language": "en-US"
  },
  "options": {
    "render_js": false,
    "wait_for": null,
    "wait_time": 0,
    "timeout": 30000,
    "proxy_type": "datacenter",
    "proxy_country": "US",
    "screenshot": false,
    "pdf": false,
    "extract": {
      "title": "h1",
      "description": "meta[name='description']::attr(content)",
      "links": "a[href]::attr(href)"
    }
  },
  "webhook_url": "https://your-server.com/webhook",
  "client_reference": "my-custom-id-123"
}
```

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | Yes | - | Target URL to scrape |
| `method` | string | No | GET | HTTP method |
| `headers` | object | No | {} | Custom request headers |
| `body` | string | No | null | Request body (for POST/PUT) |
| `options.render_js` | boolean | No | false | Enable JavaScript rendering |
| `options.wait_for` | string | No | null | CSS selector to wait for |
| `options.wait_time` | integer | No | 0 | Additional wait time (ms) |
| `options.timeout` | integer | No | 30000 | Request timeout (ms) |
| `options.proxy_type` | string | No | datacenter | Proxy tier |
| `options.proxy_country` | string | No | null | 2-letter country code |
| `options.proxy_city` | string | No | null | City name |
| `options.session_id` | string | No | null | Session ID for sticky IP |
| `options.screenshot` | boolean | No | false | Capture screenshot |
| `options.pdf` | boolean | No | false | Generate PDF |
| `options.extract` | object | No | null | Data extraction rules |
| `options.stealth` | boolean | No | false | Force stealth mode |
| `webhook_url` | string | No | null | Webhook for async results |
| `client_reference` | string | No | null | Your reference ID |
| `async` | boolean | No | false | Return immediately |

**Response (Synchronous):**

```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123def456",
    "status": "completed",
    "url": "https://example.com/page",
    "created_at": "2025-01-31T12:00:00.000Z",
    "completed_at": "2025-01-31T12:00:02.500Z",
    "credits_charged": 5,
    "result": {
      "status_code": 200,
      "content_type": "text/html",
      "content_length": 45678,
      "html": "<!DOCTYPE html>...",
      "extracted": {
        "title": "Example Page",
        "description": "This is an example page",
        "links": ["https://example.com/link1", "https://example.com/link2"]
      },
      "screenshot_url": null,
      "pdf_url": null,
      "metrics": {
        "total_time_ms": 2500,
        "ttfb_ms": 250,
        "download_time_ms": 150
      }
    }
  },
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2025-01-31T12:00:02.500Z"
  }
}
```

**Response (Asynchronous):**

```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123def456",
    "status": "queued",
    "url": "https://example.com/page",
    "created_at": "2025-01-31T12:00:00.000Z",
    "estimated_completion": "2025-01-31T12:00:05.000Z",
    "credits_estimated": 5
  },
  "meta": {
    "request_id": "req_xyz789",
    "timestamp": "2025-01-31T12:00:00.000Z"
  }
}
```

### 3.2 Get Job Status

Retrieves the status and result of a scrape job.

**Endpoint:** `GET /v1/jobs/{job_id}`

**Response:**

```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123def456",
    "status": "completed",
    "url": "https://example.com/page",
    "engine": "browser",
    "proxy_type": "residential",
    "proxy_country": "US",
    "created_at": "2025-01-31T12:00:00.000Z",
    "started_at": "2025-01-31T12:00:00.500Z",
    "completed_at": "2025-01-31T12:00:02.500Z",
    "attempts": 1,
    "credits_charged": 8,
    "result": {
      "status_code": 200,
      "content_type": "text/html",
      "content_length": 45678,
      "final_url": "https://example.com/page",
      "html": "<!DOCTYPE html>...",
      "extracted": { ... },
      "screenshot_url": "https://storage.scrapifie.com/screenshots/...",
      "metrics": { ... }
    },
    "client_reference": "my-custom-id-123"
  }
}
```

**Job Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Job created, not yet queued |
| `queued` | Job in processing queue |
| `running` | Job being processed |
| `completed` | Job finished successfully |
| `failed` | Job failed after all retries |
| `canceled` | Job was canceled |
| `timeout` | Job exceeded timeout |

### 3.3 Cancel Job

Cancels a pending or running job.

**Endpoint:** `DELETE /v1/jobs/{job_id}`

**Response:**

```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123def456",
    "status": "canceled",
    "canceled_at": "2025-01-31T12:00:00.000Z"
  }
}
```

### 3.4 List Jobs

Retrieves a paginated list of jobs.

**Endpoint:** `GET /v1/jobs`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | all | Filter by status |
| `limit` | integer | 50 | Results per page (max 100) |
| `cursor` | string | null | Pagination cursor |
| `start_date` | string | null | Filter by start date |
| `end_date` | string | null | Filter by end date |
| `client_reference` | string | null | Filter by reference |

**Response:**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "job_id": "job_abc123",
        "status": "completed",
        "url": "https://example.com/page1",
        "credits_charged": 5,
        "created_at": "2025-01-31T12:00:00.000Z",
        "completed_at": "2025-01-31T12:00:02.500Z"
      },
      ...
    ],
    "pagination": {
      "has_more": true,
      "next_cursor": "cursor_xyz789",
      "total_count": 1250
    }
  }
}
```

---

## 4. Batch Operations

### 4.1 Create Batch Job

Submits multiple URLs for scraping in a single request.

**Endpoint:** `POST /v1/batch`

**Request Body:**

```json
{
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
  ],
  "options": {
    "render_js": false,
    "proxy_type": "residential",
    "proxy_country": "US"
  },
  "concurrency": 10,
  "webhook_url": "https://your-server.com/batch-webhook"
}
```

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `urls` | array | Yes | - | Array of URLs (max 10000) |
| `options` | object | No | {} | Shared options for all URLs |
| `concurrency` | integer | No | 10 | Parallel requests |
| `webhook_url` | string | No | null | Webhook for batch completion |
| `webhook_per_job` | boolean | No | false | Webhook per individual job |

**Response:**

```json
{
  "success": true,
  "data": {
    "batch_id": "batch_abc123",
    "status": "processing",
    "total_jobs": 100,
    "created_at": "2025-01-31T12:00:00.000Z",
    "estimated_completion": "2025-01-31T12:05:00.000Z",
    "credits_estimated": 500
  }
}
```

### 4.2 Get Batch Status

**Endpoint:** `GET /v1/batch/{batch_id}`

**Response:**

```json
{
  "success": true,
  "data": {
    "batch_id": "batch_abc123",
    "status": "completed",
    "total_jobs": 100,
    "completed_jobs": 95,
    "failed_jobs": 5,
    "created_at": "2025-01-31T12:00:00.000Z",
    "completed_at": "2025-01-31T12:04:30.000Z",
    "credits_charged": 475,
    "results_url": "https://storage.scrapifie.com/batches/batch_abc123/results.json"
  }
}
```

### 4.3 Get Batch Results

**Endpoint:** `GET /v1/batch/{batch_id}/results`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | all | Filter by job status |
| `limit` | integer | 100 | Results per page |
| `cursor` | string | null | Pagination cursor |

**Response:**

```json
{
  "success": true,
  "data": {
    "batch_id": "batch_abc123",
    "results": [
      {
        "job_id": "job_001",
        "url": "https://example.com/page1",
        "status": "completed",
        "result": { ... }
      },
      {
        "job_id": "job_002",
        "url": "https://example.com/page2",
        "status": "failed",
        "error": {
          "code": "BLOCKED",
          "message": "Request blocked by target"
        }
      }
    ],
    "pagination": {
      "has_more": false,
      "next_cursor": null
    }
  }
}
```

---

## 5. Account Management

### 5.1 Get Account Info

**Endpoint:** `GET /v1/account`

**Response:**

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org_abc123",
      "name": "Acme Corp",
      "plan": "growth",
      "status": "active"
    },
    "usage": {
      "credits_balance": 450000,
      "credits_included": 500000,
      "credits_used_this_period": 50000,
      "period_start": "2025-01-01T00:00:00.000Z",
      "period_end": "2025-02-01T00:00:00.000Z"
    },
    "limits": {
      "rate_limit_per_second": 50,
      "max_concurrent_jobs": 50,
      "max_batch_size": 1000
    },
    "features": {
      "js_rendering": true,
      "residential_proxies": true,
      "mobile_proxies": false,
      "captcha_solving": true,
      "webhooks": true,
      "batch_api": true
    }
  }
}
```

### 5.2 Get Usage Statistics

**Endpoint:** `GET /v1/account/usage`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | string | 30 days ago | Start of period |
| `end_date` | string | now | End of period |
| `granularity` | string | daily | hourly, daily, monthly |

**Response:**

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    },
    "summary": {
      "total_requests": 125000,
      "successful_requests": 118750,
      "failed_requests": 6250,
      "success_rate": 95.0,
      "credits_used": 187500,
      "avg_response_time_ms": 2500
    },
    "by_engine": {
      "http": { "requests": 75000, "credits": 75000 },
      "browser": { "requests": 45000, "credits": 225000 },
      "stealth": { "requests": 5000, "credits": 50000 }
    },
    "by_proxy": {
      "datacenter": { "requests": 80000, "credits": 80000 },
      "residential": { "requests": 40000, "credits": 120000 },
      "mobile": { "requests": 5000, "credits": 50000 }
    },
    "timeline": [
      {
        "date": "2025-01-01",
        "requests": 4500,
        "credits": 6750,
        "success_rate": 94.5
      },
      ...
    ]
  }
}
```

### 5.3 List API Keys

**Endpoint:** `GET /v1/account/api-keys`

**Response:**

```json
{
  "success": true,
  "data": {
    "api_keys": [
      {
        "id": "key_abc123",
        "name": "Production Key",
        "prefix": "sk_live_abc1",
        "environment": "production",
        "scopes": ["scrape:read", "scrape:write"],
        "last_used_at": "2025-01-31T11:55:00.000Z",
        "created_at": "2025-01-01T00:00:00.000Z",
        "expires_at": null,
        "is_active": true
      }
    ]
  }
}
```

### 5.4 Create API Key

**Endpoint:** `POST /v1/account/api-keys`

**Request Body:**

```json
{
  "name": "Development Key",
  "environment": "development",
  "scopes": ["scrape:read", "scrape:write"],
  "expires_at": "2025-12-31T23:59:59.999Z",
  "allowed_ips": ["192.168.1.0/24"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "key_def456",
    "name": "Development Key",
    "key": "sk_test_abc123def456ghi789...",
    "prefix": "sk_test_abc1",
    "environment": "development",
    "scopes": ["scrape:read", "scrape:write"],
    "created_at": "2025-01-31T12:00:00.000Z",
    "expires_at": "2025-12-31T23:59:59.999Z"
  }
}
```

**Note:** The full API key is only returned once at creation time.

### 5.5 Revoke API Key

**Endpoint:** `DELETE /v1/account/api-keys/{key_id}`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "key_def456",
    "revoked_at": "2025-01-31T12:00:00.000Z"
  }
}
```

---

## 6. Webhooks

### 6.1 List Webhooks

**Endpoint:** `GET /v1/webhooks`

**Response:**

```json
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "id": "wh_abc123",
        "name": "Job Notifications",
        "url": "https://your-server.com/webhook",
        "events": ["job.completed", "job.failed"],
        "is_active": true,
        "last_triggered_at": "2025-01-31T11:55:00.000Z",
        "created_at": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 6.2 Create Webhook

**Endpoint:** `POST /v1/webhooks`

**Request Body:**

```json
{
  "name": "Job Notifications",
  "url": "https://your-server.com/webhook",
  "events": ["job.completed", "job.failed", "batch.completed"],
  "secret": "your-webhook-secret"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "wh_abc123",
    "name": "Job Notifications",
    "url": "https://your-server.com/webhook",
    "events": ["job.completed", "job.failed", "batch.completed"],
    "secret": "whsec_abc123...",
    "is_active": true,
    "created_at": "2025-01-31T12:00:00.000Z"
  }
}
```

### 6.3 Webhook Events

| Event | Description | Payload |
|-------|-------------|---------|
| `job.completed` | Job finished successfully | Full job result |
| `job.failed` | Job failed after retries | Job with error |
| `batch.completed` | Batch finished | Batch summary |
| `batch.progress` | Batch progress update | Progress stats |
| `usage.threshold` | Usage threshold reached | Usage summary |
| `credits.low` | Credits running low | Balance info |

### 6.4 Webhook Payload Format

```json
{
  "id": "evt_abc123",
  "type": "job.completed",
  "created_at": "2025-01-31T12:00:00.000Z",
  "data": {
    "job_id": "job_xyz789",
    "status": "completed",
    "url": "https://example.com/page",
    "result": { ... }
  }
}
```

### 6.5 Webhook Signature Verification

Webhooks include a signature header for verification:

```
X-Scrapifie-Signature: sha256=abc123...
X-Scrapifie-Timestamp: 1706702400
```

**Verification (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}
```

---

## 7. Error Reference

### 7.1 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or revoked |
| `EXPIRED_API_KEY` | 401 | API key has expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | API key lacks required scope |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `CREDITS_EXHAUSTED` | 402 | No credits remaining |
| `INVALID_REQUEST` | 400 | Request validation failed |
| `INVALID_URL` | 400 | URL is malformed or blocked |
| `JOB_NOT_FOUND` | 404 | Job ID does not exist |
| `BATCH_NOT_FOUND` | 404 | Batch ID does not exist |
| `TIMEOUT` | 408 | Request timed out |
| `BLOCKED` | 422 | Request blocked by target |
| `CAPTCHA_FAILED` | 422 | CAPTCHA could not be solved |
| `PROXY_ERROR` | 502 | Proxy connection failed |
| `INTERNAL_ERROR` | 500 | Internal server error |

### 7.2 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit of 10 requests per second exceeded",
    "details": {
      "limit": 10,
      "window": "1s",
      "remaining": 0,
      "reset_at": "2025-01-31T12:00:05.000Z",
      "retry_after": 5
    },
    "help_url": "https://docs.scrapifie.com/errors/rate-limit"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-01-31T12:00:00.000Z"
  }
}
```

### 7.3 Retry Strategy

| Error Code | Retryable | Strategy |
|------------|-----------|----------|
| `RATE_LIMIT_EXCEEDED` | Yes | Wait for `retry_after` seconds |
| `CREDITS_EXHAUSTED` | No | Top up credits |
| `TIMEOUT` | Yes | Retry with exponential backoff |
| `BLOCKED` | Maybe | Try higher proxy tier |
| `PROXY_ERROR` | Yes | Retry with different proxy |
| `INTERNAL_ERROR` | Yes | Retry with exponential backoff |

---

## 8. OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: Scrapifie API
  description: |
    Enterprise web scraping API with anti-detection capabilities.
    
    ## Authentication
    All endpoints require a Bearer token in the Authorization header.
    
    ## Rate Limits
    Rate limits vary by plan. Check the X-RateLimit-* headers.
  version: 1.0.0
  contact:
    name: Scrapifie Support
    url: https://scrapifie.com/support
    email: support@scrapifie.com
  license:
    name: Proprietary
    url: https://scrapifie.com/terms

servers:
  - url: https://api.scrapifie.com/v1
    description: Production
  - url: https://sandbox.scrapifie.com/v1
    description: Sandbox

security:
  - BearerAuth: []

tags:
  - name: Scraping
    description: Core scraping operations
  - name: Batch
    description: Batch scraping operations
  - name: Account
    description: Account management
  - name: Webhooks
    description: Webhook configuration

paths:
  /scrape:
    post:
      tags:
        - Scraping
      summary: Create a scrape job
      description: Submit a URL for scraping with optional configuration
      operationId: createScrapeJob
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ScrapeRequest'
      responses:
        '200':
          description: Job completed (sync) or created (async)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ScrapeResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '402':
          $ref: '#/components/responses/PaymentRequired'
        '429':
          $ref: '#/components/responses/RateLimited'

  /jobs/{jobId}:
    get:
      tags:
        - Scraping
      summary: Get job status
      description: Retrieve the status and result of a scrape job
      operationId: getJob
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
            pattern: '^job_[a-zA-Z0-9]+$'
      responses:
        '200':
          description: Job details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobResponse'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      tags:
        - Scraping
      summary: Cancel job
      operationId: cancelJob
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Job canceled
        '404':
          $ref: '#/components/responses/NotFound'

  /jobs:
    get:
      tags:
        - Scraping
      summary: List jobs
      operationId: listJobs
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, queued, running, completed, failed, canceled]
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
        - name: cursor
          in: query
          schema:
            type: string
        - name: start_date
          in: query
          schema:
            type: string
            format: date-time
        - name: end_date
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: List of jobs
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobListResponse'

  /batch:
    post:
      tags:
        - Batch
      summary: Create batch job
      operationId: createBatch
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BatchRequest'
      responses:
        '200':
          description: Batch created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchResponse'

  /batch/{batchId}:
    get:
      tags:
        - Batch
      summary: Get batch status
      operationId: getBatch
      parameters:
        - name: batchId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Batch details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchResponse'

  /batch/{batchId}/results:
    get:
      tags:
        - Batch
      summary: Get batch results
      operationId: getBatchResults
      parameters:
        - name: batchId
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 100
        - name: cursor
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Batch results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchResultsResponse'

  /account:
    get:
      tags:
        - Account
      summary: Get account info
      operationId: getAccount
      responses:
        '200':
          description: Account information
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AccountResponse'

  /account/usage:
    get:
      tags:
        - Account
      summary: Get usage statistics
      operationId: getUsage
      parameters:
        - name: start_date
          in: query
          schema:
            type: string
            format: date
        - name: end_date
          in: query
          schema:
            type: string
            format: date
        - name: granularity
          in: query
          schema:
            type: string
            enum: [hourly, daily, monthly]
            default: daily
      responses:
        '200':
          description: Usage statistics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsageResponse'

  /account/api-keys:
    get:
      tags:
        - Account
      summary: List API keys
      operationId: listApiKeys
      responses:
        '200':
          description: List of API keys
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiKeyListResponse'
    post:
      tags:
        - Account
      summary: Create API key
      operationId: createApiKey
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateApiKeyRequest'
      responses:
        '200':
          description: API key created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiKeyResponse'

  /account/api-keys/{keyId}:
    delete:
      tags:
        - Account
      summary: Revoke API key
      operationId: revokeApiKey
      parameters:
        - name: keyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: API key revoked

  /webhooks:
    get:
      tags:
        - Webhooks
      summary: List webhooks
      operationId: listWebhooks
      responses:
        '200':
          description: List of webhooks
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookListResponse'
    post:
      tags:
        - Webhooks
      summary: Create webhook
      operationId: createWebhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateWebhookRequest'
      responses:
        '200':
          description: Webhook created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookResponse'

  /webhooks/{webhookId}:
    delete:
      tags:
        - Webhooks
      summary: Delete webhook
      operationId: deleteWebhook
      parameters:
        - name: webhookId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Webhook deleted

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key

  schemas:
    ScrapeRequest:
      type: object
      required:
        - url
      properties:
        url:
          type: string
          format: uri
          example: https://example.com/page
        method:
          type: string
          enum: [GET, POST, PUT, PATCH, DELETE, HEAD]
          default: GET
        headers:
          type: object
          additionalProperties:
            type: string
        body:
          type: string
        options:
          $ref: '#/components/schemas/ScrapeOptions'
        webhook_url:
          type: string
          format: uri
        client_reference:
          type: string
          maxLength: 255
        async:
          type: boolean
          default: false

    ScrapeOptions:
      type: object
      properties:
        render_js:
          type: boolean
          default: false
          description: Enable JavaScript rendering
        wait_for:
          type: string
          description: CSS selector to wait for
        wait_time:
          type: integer
          minimum: 0
          maximum: 30000
          default: 0
          description: Additional wait time in milliseconds
        timeout:
          type: integer
          minimum: 1000
          maximum: 120000
          default: 30000
        proxy_type:
          type: string
          enum: [datacenter, residential, mobile]
          default: datacenter
        proxy_country:
          type: string
          pattern: '^[A-Z]{2}$'
          description: ISO 3166-1 alpha-2 country code
        proxy_city:
          type: string
        session_id:
          type: string
          description: Session ID for sticky IP
        screenshot:
          type: boolean
          default: false
        screenshot_options:
          $ref: '#/components/schemas/ScreenshotOptions'
        pdf:
          type: boolean
          default: false
        extract:
          type: object
          additionalProperties:
            type: string
          description: CSS selectors for data extraction
        stealth:
          type: boolean
          default: false
          description: Force stealth mode

    ScreenshotOptions:
      type: object
      properties:
        full_page:
          type: boolean
          default: false
        format:
          type: string
          enum: [png, jpeg, webp]
          default: png
        quality:
          type: integer
          minimum: 0
          maximum: 100
          default: 80

    ScrapeResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          $ref: '#/components/schemas/Job'
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    Job:
      type: object
      properties:
        job_id:
          type: string
        status:
          type: string
          enum: [pending, queued, running, completed, failed, canceled, timeout]
        url:
          type: string
        engine:
          type: string
          enum: [http, browser, stealth]
        proxy_type:
          type: string
        proxy_country:
          type: string
        created_at:
          type: string
          format: date-time
        started_at:
          type: string
          format: date-time
        completed_at:
          type: string
          format: date-time
        attempts:
          type: integer
        credits_charged:
          type: integer
        result:
          $ref: '#/components/schemas/JobResult'
        error:
          $ref: '#/components/schemas/Error'
        client_reference:
          type: string

    JobResult:
      type: object
      properties:
        status_code:
          type: integer
        content_type:
          type: string
        content_length:
          type: integer
        final_url:
          type: string
        html:
          type: string
        extracted:
          type: object
        screenshot_url:
          type: string
        pdf_url:
          type: string
        metrics:
          $ref: '#/components/schemas/Metrics'

    Metrics:
      type: object
      properties:
        total_time_ms:
          type: integer
        ttfb_ms:
          type: integer
        download_time_ms:
          type: integer
        render_time_ms:
          type: integer

    JobResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          $ref: '#/components/schemas/Job'
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    JobListResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            jobs:
              type: array
              items:
                $ref: '#/components/schemas/Job'
            pagination:
              $ref: '#/components/schemas/Pagination'
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    BatchRequest:
      type: object
      required:
        - urls
      properties:
        urls:
          type: array
          items:
            type: string
            format: uri
          minItems: 1
          maxItems: 10000
        options:
          $ref: '#/components/schemas/ScrapeOptions'
        concurrency:
          type: integer
          minimum: 1
          maximum: 100
          default: 10
        webhook_url:
          type: string
          format: uri
        webhook_per_job:
          type: boolean
          default: false

    BatchResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            batch_id:
              type: string
            status:
              type: string
              enum: [processing, completed, failed]
            total_jobs:
              type: integer
            completed_jobs:
              type: integer
            failed_jobs:
              type: integer
            created_at:
              type: string
              format: date-time
            completed_at:
              type: string
              format: date-time
            credits_charged:
              type: integer
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    BatchResultsResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            batch_id:
              type: string
            results:
              type: array
              items:
                type: object
                properties:
                  job_id:
                    type: string
                  url:
                    type: string
                  status:
                    type: string
                  result:
                    $ref: '#/components/schemas/JobResult'
                  error:
                    $ref: '#/components/schemas/Error'
            pagination:
              $ref: '#/components/schemas/Pagination'
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    AccountResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            organization:
              type: object
              properties:
                id:
                  type: string
                name:
                  type: string
                plan:
                  type: string
                status:
                  type: string
            usage:
              type: object
              properties:
                credits_balance:
                  type: integer
                credits_included:
                  type: integer
                credits_used_this_period:
                  type: integer
                period_start:
                  type: string
                  format: date-time
                period_end:
                  type: string
                  format: date-time
            limits:
              type: object
              properties:
                rate_limit_per_second:
                  type: integer
                max_concurrent_jobs:
                  type: integer
                max_batch_size:
                  type: integer
            features:
              type: object
              additionalProperties:
                type: boolean
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    UsageResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            period:
              type: object
              properties:
                start:
                  type: string
                  format: date-time
                end:
                  type: string
                  format: date-time
            summary:
              type: object
              properties:
                total_requests:
                  type: integer
                successful_requests:
                  type: integer
                failed_requests:
                  type: integer
                success_rate:
                  type: number
                credits_used:
                  type: integer
            timeline:
              type: array
              items:
                type: object
                properties:
                  date:
                    type: string
                    format: date
                  requests:
                    type: integer
                  credits:
                    type: integer
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    CreateApiKeyRequest:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          maxLength: 100
        environment:
          type: string
          enum: [development, staging, production]
          default: production
        scopes:
          type: array
          items:
            type: string
        expires_at:
          type: string
          format: date-time
        allowed_ips:
          type: array
          items:
            type: string

    ApiKeyResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            id:
              type: string
            name:
              type: string
            key:
              type: string
              description: Full key (only shown once)
            prefix:
              type: string
            environment:
              type: string
            scopes:
              type: array
              items:
                type: string
            created_at:
              type: string
              format: date-time
            expires_at:
              type: string
              format: date-time
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    ApiKeyListResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            api_keys:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  name:
                    type: string
                  prefix:
                    type: string
                  environment:
                    type: string
                  scopes:
                    type: array
                    items:
                      type: string
                  last_used_at:
                    type: string
                    format: date-time
                  created_at:
                    type: string
                    format: date-time
                  expires_at:
                    type: string
                    format: date-time
                  is_active:
                    type: boolean
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    CreateWebhookRequest:
      type: object
      required:
        - name
        - url
        - events
      properties:
        name:
          type: string
          maxLength: 100
        url:
          type: string
          format: uri
        events:
          type: array
          items:
            type: string
            enum:
              - job.completed
              - job.failed
              - batch.completed
              - batch.progress
              - usage.threshold
              - credits.low
        secret:
          type: string

    WebhookResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            id:
              type: string
            name:
              type: string
            url:
              type: string
            events:
              type: array
              items:
                type: string
            secret:
              type: string
            is_active:
              type: boolean
            created_at:
              type: string
              format: date-time
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    WebhookListResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            webhooks:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  name:
                    type: string
                  url:
                    type: string
                  events:
                    type: array
                    items:
                      type: string
                  is_active:
                    type: boolean
                  last_triggered_at:
                    type: string
                    format: date-time
                  created_at:
                    type: string
                    format: date-time
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    Pagination:
      type: object
      properties:
        has_more:
          type: boolean
        next_cursor:
          type: string
        total_count:
          type: integer

    ResponseMeta:
      type: object
      properties:
        request_id:
          type: string
        timestamp:
          type: string
          format: date-time

    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object
        help_url:
          type: string

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                $ref: '#/components/schemas/Error'
              meta:
                $ref: '#/components/schemas/ResponseMeta'

    Unauthorized:
      description: Authentication failed
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                $ref: '#/components/schemas/Error'

    PaymentRequired:
      description: Credits exhausted
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                $ref: '#/components/schemas/Error'

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                $ref: '#/components/schemas/Error'

    RateLimited:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
        X-RateLimit-Remaining:
          schema:
            type: integer
        X-RateLimit-Reset:
          schema:
            type: integer
        Retry-After:
          schema:
            type: integer
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                $ref: '#/components/schemas/Error'
```

---

## Document Control

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-31 | Engineering Team | Initial document |

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| API Lead | | | |
| Engineering Lead | | | |

### Distribution

| Role | Access Level |
|------|--------------|
| Public | Full |
| Partners | Full |
| Internal | Full |
