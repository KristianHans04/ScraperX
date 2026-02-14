# Configuration

Scrapifie uses environment variables for configuration. All settings are validated at startup using Zod schemas to catch configuration errors early.

## Environment File

Copy the example environment file to get started:

```
cp .env.example .env
```

## Required Variables

These must be set for Scrapifie to start:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/scrapifie` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT token signing (min 32 chars) | `your-secure-random-string-here` |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data (32 chars) | `your-32-character-encryption-key` |

## Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `HOST` | API server host | `0.0.0.0` |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |

## Queue Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `QUEUE_CONCURRENCY` | Jobs processed in parallel per worker | `10` |
| `JOB_TIMEOUT_MS` | Maximum time for a single job | `60000` |
| `MAX_RETRIES` | Retry attempts for failed jobs | `3` |

## Engine Configuration

### HTTP Engine

| Variable | Description | Default |
|----------|-------------|---------|
| `HTTP_TIMEOUT_MS` | Request timeout | `30000` |
| `HTTP_MAX_REDIRECTS` | Maximum redirect follows | `5` |

### Browser Engine

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSER_POOL_SIZE` | Maximum browser instances | `5` |
| `BROWSER_TIMEOUT_MS` | Page load timeout | `30000` |
| `BROWSER_HEADLESS` | Run browsers in headless mode | `true` |

### Stealth Engine (Camoufox)

| Variable | Description | Default |
|----------|-------------|---------|
| `CAMOUFOX_URL` | Camoufox service URL | `http://localhost:8000` |
| `STEALTH_TIMEOUT_MS` | Stealth request timeout | `60000` |

## Proxy Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PROXY_ENABLED` | Enable proxy rotation | `false` |
| `PROXY_PROVIDERS` | Comma-separated provider list | - |
| `BRIGHTDATA_USERNAME` | Bright Data username | - |
| `BRIGHTDATA_PASSWORD` | Bright Data password | - |
| `BRIGHTDATA_HOST` | Bright Data host | - |

## Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window duration | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Credit System

| Variable | Description | Default |
|----------|-------------|---------|
| `CREDIT_COST_HTTP` | Credits per HTTP request | `1` |
| `CREDIT_COST_BROWSER` | Credits per browser request | `5` |
| `CREDIT_COST_STEALTH` | Credits per stealth request | `10` |

## Security Notes

- Never commit `.env` files to version control
- Use strong, randomly generated values for `JWT_SECRET` and `ENCRYPTION_KEY`
- In production, use environment-specific secrets management
- Rotate secrets regularly

## Validation

Scrapifie validates all configuration at startup. If any required variable is missing or invalid, the application will fail to start with a descriptive error message.

## Next Steps

- [Quick Start Guide](quick-start.md)
- [Production Deployment](../deployment/production.md)
