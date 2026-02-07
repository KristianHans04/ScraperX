# API Endpoints

Complete reference for all ScraperX API endpoints.

## Base URL

```
http://localhost:3000/api/v1
```

Production URL will vary based on deployment.

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/scrape` | Submit scrape job |
| GET | `/scrape/:jobId` | Get job status |
| GET | `/scrape/:jobId/result` | Get job result |
| DELETE | `/scrape/:jobId` | Cancel job |
| GET | `/account` | Get account info |
| GET | `/account/usage` | Get usage statistics |

---

## Health Check

Check if the API is running.

**Request**

```
GET /health
```

No authentication required.

**Response**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-31T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Submit Scrape Job

Create a new scrape job.

**Request**

```
POST /api/v1/scrape
```

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| X-API-Key | Yes | Your API key |
| Content-Type | Yes | application/json |

**Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Target URL to scrape |
| options | object | No | Scrape options |

**Options Object**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| engine | string | "auto" | Engine: auto, http, browser, stealth |
| timeout | number | 30000 | Request timeout (ms) |
| waitFor | string | - | CSS selector to wait for |
| headers | object | - | Custom request headers |
| cookies | array | - | Cookies to send |
| extract | object | - | Data extraction rules |
| proxy | object | - | Proxy settings |
| screenshot | boolean | false | Capture screenshot |

**Example Request**

```bash
curl -X POST http://localhost:3000/api/v1/scrape \
  -H "X-API-Key: sx_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "engine": "browser",
      "waitFor": ".content",
      "timeout": 15000,
      "extract": {
        "title": "h1",
        "paragraphs": "p"
      }
    }
  }'
```

**Response**

```json
{
  "jobId": "job_abc123def456",
  "status": "queued",
  "createdAt": "2024-01-31T12:00:00.000Z"
}
```

---

## Get Job Status

Check the status of a scrape job.

**Request**

```
GET /api/v1/scrape/:jobId
```

**Response (Queued)**

```json
{
  "jobId": "job_abc123def456",
  "status": "queued",
  "createdAt": "2024-01-31T12:00:00.000Z",
  "position": 3
}
```

**Response (Processing)**

```json
{
  "jobId": "job_abc123def456",
  "status": "processing",
  "createdAt": "2024-01-31T12:00:00.000Z",
  "startedAt": "2024-01-31T12:00:05.000Z"
}
```

**Response (Completed)**

```json
{
  "jobId": "job_abc123def456",
  "status": "completed",
  "createdAt": "2024-01-31T12:00:00.000Z",
  "startedAt": "2024-01-31T12:00:05.000Z",
  "completedAt": "2024-01-31T12:00:07.000Z",
  "engine": "browser",
  "creditsUsed": 5
}
```

**Response (Failed)**

```json
{
  "jobId": "job_abc123def456",
  "status": "failed",
  "createdAt": "2024-01-31T12:00:00.000Z",
  "startedAt": "2024-01-31T12:00:05.000Z",
  "completedAt": "2024-01-31T12:00:07.000Z",
  "error": "Connection timeout"
}
```

---

## Get Job Result

Retrieve the result of a completed job.

**Request**

```
GET /api/v1/scrape/:jobId/result
```

**Response**

```json
{
  "jobId": "job_abc123def456",
  "result": {
    "html": "<!DOCTYPE html>...",
    "statusCode": 200,
    "headers": {
      "content-type": "text/html; charset=utf-8"
    },
    "extracted": {
      "title": "Example Domain",
      "paragraphs": ["This domain is for...", "More info..."]
    },
    "timing": {
      "dns": 15,
      "connect": 45,
      "ttfb": 120,
      "download": 85,
      "total": 265
    }
  }
}
```

---

## Cancel Job

Cancel a queued or processing job.

**Request**

```
DELETE /api/v1/scrape/:jobId
```

**Response**

```json
{
  "jobId": "job_abc123def456",
  "status": "cancelled",
  "message": "Job cancelled successfully"
}
```

**Note**: Credits are not refunded for cancelled jobs that have already started processing.

---

## Get Account Info

Retrieve organization account information.

**Request**

```
GET /api/v1/account
```

**Response**

```json
{
  "organization": {
    "id": "org_abc123",
    "name": "My Company",
    "tier": "pro",
    "credits": 9500,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Get Usage Statistics

Retrieve usage statistics for the current billing period.

**Request**

```
GET /api/v1/account/usage
```

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | string | "month" | Period: day, week, month |

**Response**

```json
{
  "period": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.000Z"
  },
  "usage": {
    "totalJobs": 1250,
    "completedJobs": 1200,
    "failedJobs": 50,
    "creditsUsed": 3500,
    "byEngine": {
      "http": { "jobs": 800, "credits": 800 },
      "browser": { "jobs": 350, "credits": 1750 },
      "stealth": { "jobs": 100, "credits": 1000 }
    }
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "statusCode": 400
}
```

### Common Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 402 | Payment Required | Insufficient credits |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting Headers

All responses include rate limiting information:

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests per window |
| X-RateLimit-Remaining | Remaining requests in window |
| X-RateLimit-Reset | Timestamp when window resets |

Example:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706702400
```
