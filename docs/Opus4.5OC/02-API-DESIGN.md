# Scrapifie API Design
## RESTful API Specification and Integration Guide

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Classification:** Internal - Technical Documentation

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Authentication](#2-authentication)
3. [Rate Limiting](#3-rate-limiting)
4. [Core Endpoints](#4-core-endpoints)
5. [Request Options](#5-request-options)
6. [Response Format](#6-response-format)
7. [Error Handling](#7-error-handling)
8. [Webhooks](#8-webhooks)
9. [SDKs](#9-sdks)
10. [API Versioning](#10-api-versioning)

---

## 1. API Design Principles

### 1.1 Core Philosophy

The Scrapifie API adheres to the following design principles:

**Simplicity First**

The most common use case should require the least amount of configuration. A basic scrape request requires only a URL.

**Predictability**

Consistent response formats, error structures, and behavior across all endpoints enable developers to build reliable integrations.

**Security by Default**

All endpoints require authentication. Rate limiting and abuse prevention are built into the core design.

**Transparency**

Credit consumption, usage metrics, and error reasons are clearly communicated in every response.

### 1.2 API Base URL

```
Production:  https://api.scrapifie.io/v1
Sandbox:     https://sandbox.scrapifie.io/v1
```

### 1.3 Content Type

All requests and responses use JSON format:

```
Content-Type: application/json
Accept: application/json
```

### 1.4 HTTP Methods

| Method | Usage |
|--------|-------|
| GET | Retrieve resources (jobs, usage, account) |
| POST | Create resources (scrape requests, batches) |
| PUT | Update resources (webhooks, settings) |
| DELETE | Remove resources (webhooks, sessions) |

---

## 2. Authentication

### 2.1 API Key Format

API keys follow a structured format for easy identification:

```
Production Keys:  sk_live_[32 random alphanumeric characters]
Sandbox Keys:     sk_test_[32 random alphanumeric characters]

Example: sk_live_xxxxxREPLACE_WITH_YOUR_KEYxxxxx
```

### 2.2 Authentication Methods

**Bearer Token (Recommended)**

```http
POST /v1/scrape HTTP/1.1
Host: api.scrapifie.io
Authorization: Bearer sk_live_xxxxxREPLACE_WITH_YOUR_KEYxxxxx
Content-Type: application/json

{
  "url": "https://example.com"
}
```

**Query Parameter (Not Recommended)**

For environments where headers cannot be modified:

```http
POST /v1/scrape?api_key=sk_live_xxxxxREPLACE_WITH_YOUR_KEYxxxxx HTTP/1.1
Host: api.scrapifie.io
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### 2.3 API Key Management

**Key Properties:**

| Property | Description |
|----------|-------------|
| id | Unique identifier for the key |
| prefix | First 8 characters for identification (sk_live_a1b2c3d4) |
| created_at | Timestamp of key creation |
| last_used_at | Timestamp of last API call |
| expires_at | Optional expiration date |
| permissions | Array of allowed operations |
| rate_limit | Optional per-key rate limit override |
| ip_whitelist | Optional array of allowed IP addresses |

**Key Rotation:**

Keys should be rotated periodically. The API supports having multiple active keys per account to enable zero-downtime rotation.

---

## 3. Rate Limiting

### 3.1 Rate Limit Tiers

| Subscription Tier | Requests per Second | Concurrent Requests | Burst Allowance |
|-------------------|---------------------|---------------------|-----------------|
| Starter | 10 | 20 | 50 |
| Growth | 25 | 50 | 100 |
| Business | 50 | 100 | 200 |
| Enterprise | Custom | Custom | Custom |

### 3.2 Rate Limit Headers

All responses include rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 25
X-RateLimit-Remaining: 24
X-RateLimit-Reset: 1704067200
X-RateLimit-Window: 1
X-Concurrent-Limit: 50
X-Concurrent-Active: 3
```

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests per window |
| X-RateLimit-Remaining | Remaining requests in current window |
| X-RateLimit-Reset | Unix timestamp when window resets |
| X-RateLimit-Window | Window duration in seconds |
| X-Concurrent-Limit | Maximum concurrent requests |
| X-Concurrent-Active | Currently active requests |

### 3.3 Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 2
X-RateLimit-Limit: 25
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067202

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Please retry after 2 seconds.",
    "retry_after": 2
  }
}
```

---

## 4. Core Endpoints

### 4.1 Scrape URL (Synchronous)

Scrape a single URL and wait for the result.

**Endpoint:** `POST /v1/scrape`

**Request:**

```json
{
  "url": "https://example.com/page",
  "options": {
    "render_js": false,
    "premium_proxy": false,
    "country": "US",
    "wait_for": null,
    "wait_ms": 0,
    "screenshot": false,
    "extract": null,
    "headers": {},
    "cookies": [],
    "session_id": null,
    "timeout": 30000
  }
}
```

**Response (Success):**

```json
{
  "success": true,
  "job_id": "job_7a8b9c0d1e2f3g4h",
  "url": "https://example.com/page",
  "resolved_url": "https://www.example.com/page",
  "status_code": 200,
  "content": "<!DOCTYPE html><html>...</html>",
  "content_type": "text/html; charset=utf-8",
  "content_length": 45678,
  "extracted": null,
  "screenshot_url": null,
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123",
      "domain": ".example.com",
      "path": "/",
      "expires": 1704153600,
      "http_only": true,
      "secure": true
    }
  ],
  "headers": {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "max-age=3600"
  },
  "timing": {
    "queued_ms": 12,
    "processing_ms": 1456,
    "total_ms": 1468
  },
  "credits": {
    "used": 1,
    "breakdown": {
      "base": 1,
      "js_render": 0,
      "premium_proxy": 0,
      "screenshot": 0
    },
    "remaining": 49999
  },
  "metadata": {
    "worker_type": "http",
    "proxy_type": "datacenter",
    "proxy_country": "US",
    "attempts": 1
  }
}
```

**Response (Failure):**

```json
{
  "success": false,
  "job_id": "job_7a8b9c0d1e2f3g4h",
  "url": "https://example.com/page",
  "resolved_url": null,
  "status_code": 403,
  "error": {
    "code": "BLOCKED",
    "message": "Request was blocked by target site protection",
    "details": "Cloudflare challenge page detected",
    "retryable": true,
    "suggestions": [
      "Enable JavaScript rendering with render_js: true",
      "Use premium proxy with premium_proxy: true"
    ]
  },
  "timing": {
    "queued_ms": 15,
    "processing_ms": 2341,
    "total_ms": 2356
  },
  "credits": {
    "used": 0,
    "remaining": 50000
  },
  "metadata": {
    "worker_type": "http",
    "proxy_type": "datacenter",
    "attempts": 3
  }
}
```

### 4.2 Scrape URL (Asynchronous)

Scrape a URL and receive results via webhook.

**Endpoint:** `POST /v1/scrape/async`

**Request:**

```json
{
  "url": "https://example.com/page",
  "options": {
    "render_js": true,
    "wait_for": "#content"
  },
  "webhook_url": "https://yourapp.com/webhooks/scraper",
  "webhook_secret": "your_webhook_secret"
}
```

**Response:**

```json
{
  "success": true,
  "job_id": "job_7a8b9c0d1e2f3g4h",
  "status": "queued",
  "url": "https://example.com/page",
  "webhook_url": "https://yourapp.com/webhooks/scraper",
  "status_url": "https://api.scrapifie.io/v1/jobs/job_7a8b9c0d1e2f3g4h",
  "estimated_completion": "2025-01-15T10:30:15Z"
}
```

### 4.3 Batch Scrape

Scrape multiple URLs in a single request.

**Endpoint:** `POST /v1/batch`

**Request:**

```json
{
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
  ],
  "options": {
    "render_js": true,
    "premium_proxy": false,
    "country": "US",
    "extract": {
      "title": "h1",
      "description": "meta[name=description]@content"
    }
  },
  "concurrency": 5,
  "webhook_url": "https://yourapp.com/webhooks/batch",
  "webhook_events": ["batch.completed", "batch.progress"]
}
```

**Response:**

```json
{
  "success": true,
  "batch_id": "batch_1a2b3c4d5e6f",
  "status": "processing",
  "total_urls": 3,
  "created_at": "2025-01-15T10:25:00Z",
  "estimated_completion": "2025-01-15T10:30:00Z",
  "webhook_url": "https://yourapp.com/webhooks/batch",
  "status_url": "https://api.scrapifie.io/v1/batch/batch_1a2b3c4d5e6f",
  "estimated_credits": 15
}
```

### 4.4 Get Job Status

Retrieve the status and result of a job.

**Endpoint:** `GET /v1/jobs/{job_id}`

**Response (Completed):**

```json
{
  "success": true,
  "job_id": "job_7a8b9c0d1e2f3g4h",
  "status": "completed",
  "url": "https://example.com/page",
  "created_at": "2025-01-15T10:25:00Z",
  "completed_at": "2025-01-15T10:25:03Z",
  "result": {
    "status_code": 200,
    "content_url": "https://storage.scrapifie.io/results/job_7a8b9c0d1e2f3g4h/content.html",
    "extracted": {
      "title": "Example Page"
    }
  },
  "credits_used": 5
}
```

**Response (Processing):**

```json
{
  "success": true,
  "job_id": "job_7a8b9c0d1e2f3g4h",
  "status": "processing",
  "url": "https://example.com/page",
  "created_at": "2025-01-15T10:25:00Z",
  "progress": {
    "stage": "rendering",
    "attempts": 1
  }
}
```

### 4.5 Get Batch Status

Retrieve the status and results of a batch.

**Endpoint:** `GET /v1/batch/{batch_id}`

**Response:**

```json
{
  "success": true,
  "batch_id": "batch_1a2b3c4d5e6f",
  "status": "completed",
  "created_at": "2025-01-15T10:25:00Z",
  "completed_at": "2025-01-15T10:30:00Z",
  "total_urls": 3,
  "progress": {
    "completed": 3,
    "failed": 0,
    "pending": 0
  },
  "results": [
    {
      "url": "https://example.com/page1",
      "job_id": "job_1111111111",
      "status": "completed",
      "result_url": "https://storage.scrapifie.io/results/batch_1a2b3c4d5e6f/0.json"
    },
    {
      "url": "https://example.com/page2",
      "job_id": "job_2222222222",
      "status": "completed",
      "result_url": "https://storage.scrapifie.io/results/batch_1a2b3c4d5e6f/1.json"
    },
    {
      "url": "https://example.com/page3",
      "job_id": "job_3333333333",
      "status": "completed",
      "result_url": "https://storage.scrapifie.io/results/batch_1a2b3c4d5e6f/2.json"
    }
  ],
  "credits_used": 15,
  "download_url": "https://storage.scrapifie.io/results/batch_1a2b3c4d5e6f/all.zip"
}
```

### 4.6 Account Usage

Retrieve current usage statistics.

**Endpoint:** `GET /v1/account/usage`

**Response:**

```json
{
  "success": true,
  "account_id": "acc_1234567890",
  "period": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z",
    "days_remaining": 16
  },
  "plan": {
    "name": "Growth",
    "monthly_credits": 200000,
    "rate_limit": 25,
    "concurrent_limit": 50
  },
  "usage": {
    "credits_used": 45230,
    "credits_remaining": 154770,
    "percentage_used": 22.6,
    "requests": {
      "total": 42000,
      "successful": 41580,
      "failed": 420,
      "success_rate": 99.0
    }
  },
  "breakdown": {
    "by_feature": {
      "basic_http": 35000,
      "js_render": 5000,
      "premium_proxy": 1800,
      "mobile_proxy": 100,
      "captcha_solve": 50,
      "screenshot": 50
    },
    "by_day": [
      {"date": "2025-01-14", "credits": 3200, "requests": 2800},
      {"date": "2025-01-13", "credits": 2900, "requests": 2600}
    ]
  }
}
```

### 4.7 JavaScript Scenarios

Execute complex browser automation scenarios.

**Endpoint:** `POST /v1/scrape`

**Request with Scenario:**

```json
{
  "url": "https://example.com/login",
  "options": {
    "render_js": true,
    "scenario": {
      "steps": [
        {
          "action": "wait_for",
          "selector": "#login-form",
          "timeout": 10000
        },
        {
          "action": "fill",
          "selector": "#email",
          "value": "user@example.com"
        },
        {
          "action": "fill",
          "selector": "#password",
          "value": "password123"
        },
        {
          "action": "click",
          "selector": "#submit-button"
        },
        {
          "action": "wait_for_navigation",
          "timeout": 15000
        },
        {
          "action": "wait_for",
          "selector": ".dashboard",
          "timeout": 10000
        },
        {
          "action": "wait",
          "duration": 2000
        },
        {
          "action": "scroll",
          "y": 500
        },
        {
          "action": "screenshot",
          "full_page": true
        }
      ]
    }
  }
}
```

**Available Scenario Actions:**

| Action | Parameters | Description |
|--------|------------|-------------|
| wait_for | selector, timeout | Wait for element to appear |
| wait | duration | Wait for specified milliseconds |
| wait_for_navigation | timeout | Wait for page navigation |
| click | selector | Click on element |
| fill | selector, value | Fill input field |
| select | selector, value | Select dropdown option |
| scroll | x, y | Scroll by pixels |
| scroll_to | selector | Scroll element into view |
| screenshot | full_page | Capture screenshot |
| evaluate | script | Execute JavaScript |
| hover | selector | Hover over element |
| press | key | Press keyboard key |

---

## 5. Request Options

### 5.1 Complete Options Reference

```typescript
interface ScrapeOptions {
  // Rendering
  render_js?: boolean;           // Enable JavaScript rendering (default: false)
  wait_for?: string;             // CSS selector to wait for
  wait_ms?: number;              // Additional wait time in milliseconds
  
  // Proxy
  premium_proxy?: boolean;       // Use residential proxy (default: false)
  mobile_proxy?: boolean;        // Use mobile proxy (default: false)
  country?: string;              // ISO 3166-1 alpha-2 country code
  
  // Session
  session_id?: string;           // Sticky session identifier
  
  // Output
  screenshot?: boolean;          // Capture screenshot (default: false)
  screenshot_options?: {
    full_page?: boolean;         // Full page or viewport (default: false)
    format?: 'png' | 'jpeg';     // Image format (default: 'png')
    quality?: number;            // JPEG quality 0-100 (default: 80)
  };
  
  // Data Extraction
  extract?: {
    [key: string]: string;       // Field name: CSS/XPath selector
  };
  
  // Custom Headers
  headers?: {
    [key: string]: string;       // Header name: value
  };
  
  // Cookies
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
  }>;
  
  // Timeout
  timeout?: number;              // Request timeout in ms (default: 30000)
  
  // Advanced
  scenario?: {
    steps: ScenarioStep[];       // Browser automation steps
  };
  
  block_resources?: string[];    // Resource types to block
  device?: string;               // Device emulation profile
}
```

### 5.2 Data Extraction Syntax

**CSS Selectors:**

```json
{
  "extract": {
    "title": "h1",
    "description": ".product-description",
    "price": ".price-value",
    "in_stock": ".availability"
  }
}
```

**Attribute Extraction:**

Use `@attribute` syntax to extract specific attributes:

```json
{
  "extract": {
    "image_url": "img.product-image@src",
    "link": "a.product-link@href",
    "meta_description": "meta[name=description]@content"
  }
}
```

**Multiple Values:**

Wrap selector in array to extract all matching elements:

```json
{
  "extract": {
    "images": ["img.gallery@src"],
    "features": [".feature-item"],
    "prices": [".price-option .value"]
  }
}
```

**XPath Selectors:**

Prefix with `xpath:` for XPath expressions:

```json
{
  "extract": {
    "title": "xpath://h1/text()",
    "price": "xpath://div[@class='price']/span/text()",
    "links": ["xpath://a/@href"]
  }
}
```

### 5.3 Device Emulation

Available device profiles:

| Profile | Viewport | User Agent |
|---------|----------|------------|
| desktop_chrome | 1920x1080 | Chrome on Windows |
| desktop_firefox | 1920x1080 | Firefox on Windows |
| desktop_safari | 1920x1080 | Safari on macOS |
| laptop | 1366x768 | Chrome on Windows |
| tablet_ipad | 768x1024 | Safari on iPad |
| tablet_android | 800x1280 | Chrome on Android tablet |
| mobile_iphone | 375x812 | Safari on iPhone |
| mobile_android | 360x740 | Chrome on Android |

### 5.4 Resource Blocking

Block specific resource types to improve performance:

```json
{
  "options": {
    "render_js": true,
    "block_resources": ["image", "stylesheet", "font", "media"]
  }
}
```

Available resource types: `document`, `stylesheet`, `image`, `media`, `font`, `script`, `texttrack`, `xhr`, `fetch`, `eventsource`, `websocket`, `manifest`, `other`

---

## 6. Response Format

### 6.1 Standard Response Structure

All API responses follow a consistent structure:

**Success Response:**

```json
{
  "success": true,
  "data": { },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional context if available",
    "retryable": true,
    "documentation_url": "https://docs.scrapifie.io/errors/ERROR_CODE"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### 6.2 HTTP Status Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Batch or async job created |
| 400 | Bad Request | Invalid URL, malformed options |
| 401 | Unauthorized | Invalid or missing API key |
| 402 | Payment Required | Insufficient credits |
| 403 | Forbidden | IP not whitelisted, suspended account |
| 404 | Not Found | Job or batch not found |
| 408 | Request Timeout | Scrape operation timed out |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Scrapifie system error |
| 502 | Bad Gateway | Target site error |
| 503 | Service Unavailable | Temporary maintenance |

---

## 7. Error Handling

### 7.1 Error Codes Reference

**Authentication Errors (4xx):**

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| INVALID_API_KEY | 401 | API key format is invalid | Check key format |
| EXPIRED_API_KEY | 401 | API key has expired | Generate new key |
| REVOKED_API_KEY | 401 | API key was revoked | Contact support |
| MISSING_API_KEY | 401 | No API key provided | Add Authorization header |
| IP_NOT_ALLOWED | 403 | Request from non-whitelisted IP | Update IP whitelist |
| ACCOUNT_SUSPENDED | 403 | Account has been suspended | Contact support |

**Validation Errors (4xx):**

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| INVALID_URL | 400 | URL format is invalid | Provide valid URL |
| INVALID_OPTIONS | 400 | Request options malformed | Check options schema |
| INVALID_SELECTOR | 400 | CSS/XPath selector invalid | Fix selector syntax |
| URL_NOT_ALLOWED | 400 | URL is blocked (localhost, etc.) | Use public URL |
| BATCH_TOO_LARGE | 400 | Too many URLs in batch | Reduce batch size |

**Resource Errors (4xx):**

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| INSUFFICIENT_CREDITS | 402 | Not enough credits | Add credits or upgrade |
| RATE_LIMITED | 429 | Rate limit exceeded | Wait and retry |
| CONCURRENT_LIMIT | 429 | Too many concurrent requests | Wait for completion |
| JOB_NOT_FOUND | 404 | Job ID does not exist | Check job ID |
| BATCH_NOT_FOUND | 404 | Batch ID does not exist | Check batch ID |

**Scraping Errors (4xx/5xx):**

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| BLOCKED | 403 | Target site blocked request | Enable render_js or premium_proxy |
| CAPTCHA_REQUIRED | 403 | CAPTCHA challenge encountered | Automatic solving attempted |
| CAPTCHA_FAILED | 403 | Could not solve CAPTCHA | Retry or contact support |
| TIMEOUT | 408 | Request exceeded timeout | Increase timeout value |
| TARGET_ERROR | 502 | Target site returned error | Check target availability |
| TARGET_UNAVAILABLE | 502 | Could not connect to target | Verify URL accessibility |

**System Errors (5xx):**

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| INTERNAL_ERROR | 500 | Unexpected system error | Retry; contact if persists |
| WORKER_UNAVAILABLE | 503 | No workers available | Retry after delay |
| SERVICE_MAINTENANCE | 503 | Scheduled maintenance | Check status page |

### 7.2 Retry Guidelines

| Error Code | Retryable | Recommended Delay | Max Retries |
|------------|-----------|-------------------|-------------|
| BLOCKED | Yes | 0s (with upgraded options) | 3 |
| CAPTCHA_FAILED | Yes | 5s | 2 |
| TIMEOUT | Yes | 0s (with increased timeout) | 2 |
| RATE_LIMITED | Yes | As per Retry-After header | 5 |
| TARGET_ERROR | Maybe | 30s | 2 |
| TARGET_UNAVAILABLE | Yes | 60s | 3 |
| INTERNAL_ERROR | Yes | 5s | 3 |
| WORKER_UNAVAILABLE | Yes | 10s | 5 |

### 7.3 Error Response Examples

**Blocked by Protection:**

```json
{
  "success": false,
  "error": {
    "code": "BLOCKED",
    "message": "Request was blocked by target site protection",
    "details": "Cloudflare Bot Management detected the request as automated",
    "retryable": true,
    "suggestions": [
      "Enable JavaScript rendering: set render_js to true",
      "Use residential proxy: set premium_proxy to true",
      "Try mobile proxy for heavily protected sites: set mobile_proxy to true"
    ],
    "documentation_url": "https://docs.scrapifie.io/errors/BLOCKED"
  },
  "credits": {
    "used": 0,
    "remaining": 50000
  }
}
```

**Rate Limited:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Maximum 25 requests per second allowed.",
    "details": "Current rate: 32 requests per second",
    "retryable": true,
    "retry_after": 2,
    "documentation_url": "https://docs.scrapifie.io/errors/RATE_LIMITED"
  }
}
```

---

## 8. Webhooks

### 8.1 Webhook Configuration

**Register Webhook Endpoint:**

```http
POST /v1/webhooks HTTP/1.1
Authorization: Bearer sk_live_xxx

{
  "url": "https://yourapp.com/webhooks/scraper",
  "events": ["job.completed", "job.failed", "batch.completed"],
  "secret": "your_webhook_secret_min_32_chars_long"
}
```

**Response:**

```json
{
  "success": true,
  "webhook": {
    "id": "wh_abc123",
    "url": "https://yourapp.com/webhooks/scraper",
    "events": ["job.completed", "job.failed", "batch.completed"],
    "created_at": "2025-01-15T10:00:00Z",
    "active": true
  }
}
```

### 8.2 Webhook Events

| Event | Description |
|-------|-------------|
| job.completed | Single scrape job completed successfully |
| job.failed | Single scrape job failed |
| job.progress | Job progress update (for long-running jobs) |
| batch.completed | All URLs in batch finished processing |
| batch.progress | Batch progress update (every 10%) |
| batch.failed | Batch encountered critical error |

### 8.3 Webhook Payload Format

**job.completed:**

```json
{
  "event": "job.completed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "job_id": "job_7a8b9c0d1e2f3g4h",
    "batch_id": null,
    "url": "https://example.com/page",
    "status": "completed",
    "result": {
      "status_code": 200,
      "content_url": "https://storage.scrapifie.io/results/job_7a8b9c0d1e2f3g4h/content.html",
      "extracted": {
        "title": "Example Page"
      },
      "screenshot_url": null
    },
    "credits_used": 5,
    "timing": {
      "queued_ms": 15,
      "processing_ms": 2341,
      "total_ms": 2356
    }
  }
}
```

**batch.completed:**

```json
{
  "event": "batch.completed",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "batch_id": "batch_1a2b3c4d5e6f",
    "status": "completed",
    "total_urls": 100,
    "successful": 98,
    "failed": 2,
    "credits_used": 490,
    "duration_ms": 45000,
    "results_url": "https://storage.scrapifie.io/results/batch_1a2b3c4d5e6f/all.zip"
  }
}
```

### 8.4 Webhook Security

**Signature Verification:**

All webhook requests include a signature header for verification:

```http
POST /webhooks/scraper HTTP/1.1
Host: yourapp.com
Content-Type: application/json
X-Scrapifie-Signature: t=1704067200,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
X-Scrapifie-Webhook-Id: wh_abc123
```

**Signature Format:**

```
X-Scrapifie-Signature: t={timestamp},v1={signature}
```

**Verification Algorithm:**

```python
import hmac
import hashlib
import time

def verify_webhook(payload: bytes, signature_header: str, secret: str) -> bool:
    # Parse the signature header
    parts = dict(item.split("=") for item in signature_header.split(","))
    timestamp = int(parts["t"])
    signature = parts["v1"]
    
    # Check timestamp (reject if older than 5 minutes)
    if abs(time.time() - timestamp) > 300:
        return False
    
    # Compute expected signature
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Compare signatures
    return hmac.compare_digest(signature, expected_signature)
```

### 8.5 Webhook Retry Policy

If webhook delivery fails, Scrapifie will retry with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |

After 5 failed attempts, the webhook is marked as failed. Failed webhooks can be retried manually or the endpoint can be checked for issues.

---

## 9. SDKs

### 9.1 Python SDK

**Installation:**

```bash
pip install scrapifie
```

**Basic Usage:**

```python
from scrapifie import Scrapifie

client = Scrapifie(api_key="sk_live_xxx")

# Simple scrape
result = client.scrape("https://example.com")
print(result.content)
print(result.status_code)

# With options
result = client.scrape(
    "https://example.com",
    render_js=True,
    premium_proxy=True,
    country="US",
    extract={
        "title": "h1",
        "price": ".price-value"
    }
)
print(result.extracted["title"])
print(result.extracted["price"])

# Async scrape with callback
def on_complete(result):
    print(f"Completed: {result.url}")
    print(f"Content length: {len(result.content)}")

client.scrape_async(
    "https://example.com",
    render_js=True,
    callback=on_complete
)

# Batch scrape
batch = client.batch_scrape(
    urls=[
        "https://example.com/page1",
        "https://example.com/page2",
        "https://example.com/page3"
    ],
    render_js=True,
    extract={"title": "h1"}
)

# Wait for completion
results = batch.wait_for_completion()
for result in results:
    print(f"{result.url}: {result.extracted['title']}")

# Check usage
usage = client.get_usage()
print(f"Credits remaining: {usage.credits_remaining}")
```

**Async/Await Support:**

```python
import asyncio
from scrapifie import AsyncScrapifie

async def main():
    client = AsyncScrapifie(api_key="sk_live_xxx")
    
    # Concurrent scraping
    urls = ["https://example.com/1", "https://example.com/2"]
    tasks = [client.scrape(url) for url in urls]
    results = await asyncio.gather(*tasks)
    
    for result in results:
        print(result.url, result.status_code)

asyncio.run(main())
```

### 9.2 Node.js SDK

**Installation:**

```bash
npm install @scrapifie/sdk
```

**Basic Usage:**

```javascript
const Scrapifie = require('@scrapifie/sdk');

const client = new Scrapifie({ apiKey: 'sk_live_xxx' });

// Simple scrape
const result = await client.scrape('https://example.com');
console.log(result.content);
console.log(result.statusCode);

// With options
const result = await client.scrape('https://example.com', {
  renderJs: true,
  premiumProxy: true,
  country: 'US',
  extract: {
    title: 'h1',
    price: '.price-value'
  }
});
console.log(result.extracted.title);

// Batch scrape
const batch = await client.batchScrape({
  urls: [
    'https://example.com/page1',
    'https://example.com/page2',
    'https://example.com/page3'
  ],
  options: {
    renderJs: true,
    extract: { title: 'h1' }
  }
});

// Poll for completion
const results = await batch.waitForCompletion();
results.forEach(result => {
  console.log(`${result.url}: ${result.extracted.title}`);
});

// Check usage
const usage = await client.getUsage();
console.log(`Credits remaining: ${usage.creditsRemaining}`);
```

**TypeScript Support:**

```typescript
import Scrapifie, { ScrapeResult, ScrapeOptions } from '@scrapifie/sdk';

const client = new Scrapifie({ apiKey: 'sk_live_xxx' });

const options: ScrapeOptions = {
  renderJs: true,
  extract: {
    title: 'h1',
    prices: ['.price-item']
  }
};

const result: ScrapeResult = await client.scrape('https://example.com', options);
```

### 9.3 Go SDK

**Installation:**

```bash
go get github.com/scrapifie/scrapifie-go
```

**Basic Usage:**

```go
package main

import (
    "fmt"
    "log"
    
    "github.com/scrapifie/scrapifie-go"
)

func main() {
    client := scrapifie.NewClient("sk_live_xxx")
    
    // Simple scrape
    result, err := client.Scrape(&scrapifie.ScrapeRequest{
        URL: "https://example.com",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(result.Content)
    
    // With options
    result, err = client.Scrape(&scrapifie.ScrapeRequest{
        URL: "https://example.com",
        Options: scrapifie.ScrapeOptions{
            RenderJS:     true,
            PremiumProxy: true,
            Country:      "US",
            Extract: map[string]string{
                "title": "h1",
                "price": ".price-value",
            },
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(result.Extracted["title"])
    
    // Check usage
    usage, err := client.GetUsage()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Credits remaining: %d\n", usage.CreditsRemaining)
}
```

---

## 10. API Versioning

### 10.1 Versioning Strategy

**Current Version:** v1

The API version is included in the URL path:

```
https://api.scrapifie.io/v1/scrape
```

### 10.2 Version Lifecycle

| Phase | Duration | Description |
|-------|----------|-------------|
| Current | Ongoing | Active development and support |
| Deprecated | 6 months | Announced end-of-life, migration guidance |
| Sunset | 3 months | Read-only, no new features |
| Retired | - | No longer available |

### 10.3 Breaking Changes Policy

The following are considered breaking changes and require a new API version:

- Removing an endpoint
- Removing a required parameter
- Changing the type of a parameter or response field
- Changing error codes
- Changing authentication mechanisms

The following are NOT breaking changes:

- Adding new endpoints
- Adding optional parameters
- Adding new response fields
- Adding new error codes
- Performance improvements

### 10.4 Version Headers

Request a specific API version or get version information:

```http
GET /v1/scrape HTTP/1.1
X-Scrapifie-Version: 2025-01-15
```

Response includes version information:

```http
HTTP/1.1 200 OK
X-Scrapifie-API-Version: v1
X-Scrapifie-Release: 2025-01-15
```

### 10.5 Beta Features

Beta features are available via opt-in headers:

```http
POST /v1/scrape HTTP/1.1
X-Scrapifie-Beta: ai-extraction
```

Beta features may change without notice and are not covered by the stability guarantee.

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| API Designer | | | |
| Technical Lead | | | |
| Product Owner | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | | Initial document creation |
