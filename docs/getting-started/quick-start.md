# Quick Start

This guide will help you make your first scrape request with ScraperX in under 5 minutes.

## Prerequisites

- ScraperX is [installed and running](installation.md)
- You have an API key (created during seeding or via admin)

## Step 1: Get Your API Key

If you ran the seed script, a test organization and API key were created. The default test key is displayed in the seed output.

For production, API keys are created through the admin interface or database.

## Step 2: Make a Health Check

Verify the API is responding:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

## Step 3: Submit a Scrape Job

Make your first scrape request:

```bash
curl -X POST http://localhost:3000/api/v1/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "url": "https://example.com",
    "options": {
      "engine": "auto"
    }
  }'
```

Response:
```json
{
  "jobId": "job_abc123",
  "status": "queued",
  "createdAt": "2024-01-31T12:00:00.000Z"
}
```

## Step 4: Check Job Status

Poll the job status endpoint:

```bash
curl http://localhost:3000/api/v1/scrape/job_abc123 \
  -H "X-API-Key: your-api-key-here"
```

Response when complete:
```json
{
  "jobId": "job_abc123",
  "status": "completed",
  "result": {
    "html": "<!DOCTYPE html>...",
    "statusCode": 200,
    "headers": {...},
    "timing": {
      "total": 234
    }
  }
}
```

## Understanding Engine Selection

When you set `engine: "auto"`, ScraperX automatically selects the best approach:

| Engine | Used When | Credit Cost |
|--------|-----------|-------------|
| HTTP | Simple pages, APIs, static content | 1 credit |
| Browser | JavaScript-rendered content, SPAs | 5 credits |
| Stealth | Anti-bot protected sites | 10 credits |

The auto-selector starts with HTTP and escalates only if needed.

## Specifying an Engine

You can force a specific engine:

```json
{
  "url": "https://example.com",
  "options": {
    "engine": "browser"
  }
}
```

Valid engine values: `auto`, `http`, `browser`, `stealth`

## Extracting Data

Request specific data extraction:

```json
{
  "url": "https://example.com",
  "options": {
    "engine": "auto",
    "extract": {
      "title": "h1",
      "links": "a[href]"
    }
  }
}
```

Response includes extracted data:
```json
{
  "result": {
    "extracted": {
      "title": "Example Domain",
      "links": ["https://www.iana.org/domains/example"]
    }
  }
}
```

## Waiting for JavaScript

For JavaScript-heavy pages:

```json
{
  "url": "https://spa-example.com",
  "options": {
    "engine": "browser",
    "waitFor": ".content-loaded",
    "timeout": 10000
  }
}
```

## Next Steps

- [API Endpoints Reference](../api/endpoints.md) - Complete API documentation
- [Understanding Engines](../architecture/engines.md) - Deep dive into scraping engines
- [Credit System](../api/credits.md) - Managing usage and costs
