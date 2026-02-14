# Rate Limiting

Scrapifie implements rate limiting to ensure fair usage and system stability. This document explains how rate limiting works.

## Overview

Rate limits protect the platform by:

- Preventing abuse and overuse
- Ensuring fair resource distribution
- Maintaining system performance
- Protecting against runaway scripts

## Rate Limit Types

### API Request Rate Limits

Limits on the number of API calls per time window.

| Tier | Requests/Minute | Burst Limit |
|------|-----------------|-------------|
| Free | 20 | 5 |
| Pro | 100 | 20 |
| Enterprise | 1000 | 100 |

### Concurrent Job Limits

Limits on simultaneous active jobs.

| Tier | Max Concurrent Jobs |
|------|---------------------|
| Free | 5 |
| Pro | 25 |
| Enterprise | 100 |

### Per-Domain Limits

To be a good web citizen, Scrapifie limits requests to individual domains:

- Default: 10 requests per minute per domain
- Configurable per organization
- Helps avoid overloading target sites

## How Rate Limiting Works

### Token Bucket Algorithm

Scrapifie uses a token bucket algorithm:

1. Each organization has a bucket of tokens
2. Bucket refills at a steady rate
3. Each request consumes one token
4. Empty bucket = request rejected
5. Bucket has maximum capacity (burst limit)

### Example

With 100 requests/minute and burst of 20:

- Bucket refills at ~1.67 tokens per second
- Bucket holds maximum 20 tokens
- Allows short bursts up to 20 requests
- Sustained rate cannot exceed 100/minute

## Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706702400
```

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests per window |
| X-RateLimit-Remaining | Requests remaining in current window |
| X-RateLimit-Reset | Unix timestamp when window resets |

## Rate Limit Exceeded

When you exceed the rate limit:

**Response**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Retry after 30 seconds.",
  "statusCode": 429,
  "retryAfter": 30
}
```

## Handling Rate Limits

### Best Practices

1. **Monitor headers** - Check remaining requests before making calls
2. **Implement backoff** - Wait when approaching limits
3. **Spread requests** - Don't burst all at once
4. **Queue locally** - Buffer requests in your application
5. **Use webhooks** - Reduce polling for job status

### Exponential Backoff

When rate limited, use exponential backoff:

```
Attempt 1: Wait 1 second
Attempt 2: Wait 2 seconds
Attempt 3: Wait 4 seconds
Attempt 4: Wait 8 seconds
...
Maximum: 60 seconds
```

### Example Implementation

```javascript
async function scrapeWithRetry(url, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch('/api/v1/scrape', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: JSON.stringify({ url })
    });
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 
                         Math.pow(2, attempt);
      await sleep(retryAfter * 1000);
      continue;
    }
    
    return response.json();
  }
  throw new Error('Max retries exceeded');
}
```

## Increasing Limits

### Upgrade Tier

Higher tiers have higher limits. Contact sales for enterprise plans.

### Request Increase

For temporary increases (e.g., large migrations):

1. Contact support in advance
2. Explain use case and expected volume
3. Request temporary limit increase
4. Plan for the expanded window

## Monitoring Usage

### Check Current Usage

Use the account endpoint:

```bash
curl http://localhost:3000/api/v1/account/usage \
  -H "X-API-Key: your-key"
```

### Usage Dashboard

If available, the admin dashboard shows:

- Current rate limit status
- Historical usage patterns
- Peak usage times
- Rate limit violations

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 60000 | Window duration (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |

### Per-Organization Override

Organizations can have custom limits in their settings:

```json
{
  "rateLimits": {
    "requestsPerMinute": 200,
    "burstLimit": 40,
    "concurrentJobs": 50
  }
}
```

## FAQs

**Q: Do failed requests count against rate limits?**
A: Yes, all requests count regardless of outcome.

**Q: Are rate limits shared across API keys?**
A: Yes, rate limits apply per organization, not per key.

**Q: Can I check my limits without making a real request?**
A: Use the `/account` endpoint to check your current status.

**Q: Do webhook callbacks count against limits?**
A: No, outgoing webhooks from Scrapifie don't affect your limits.
