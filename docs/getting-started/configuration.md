# Configuration

Scrapifie uses environment variables for all configuration. Variables are parsed and validated at startup using Zod schemas. If any variable fails validation, the process exits immediately with a descriptive error rather than starting in an inconsistent state.

## Environment File

Copy the example environment file to create a local configuration:

```bash
cp .env.example .env
```

Edit the resulting `.env` file before starting the server.

---

## Server

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime environment. One of `development`, `staging`, `production`, `test`. |
| `PORT` | No | `3000` | TCP port the HTTP server listens on. |
| `HOST` | No | `0.0.0.0` | Network interface the server binds to. |
| `LOG_LEVEL` | No | `info` | Logging verbosity. One of `trace`, `debug`, `info`, `warn`, `error`, `fatal`. Use `debug` during development. |

---

## API

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_VERSION` | No | `v1` | API version string used in route prefixes (e.g. `/api/v1/scrape`). |
| `API_PREFIX` | No | `/api` | Base path prefix for all API routes. |

---

## Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://scrapifie:scrapifie@localhost:5432/scrapifie` | PostgreSQL connection string. In production, use a strong password and configure SSL. |
| `DATABASE_POOL_SIZE` | No | `20` | Maximum number of connections in the connection pool. |
| `DATABASE_SSL` | No | `false` | Set to `true` to require SSL/TLS for database connections. Should be `true` in production. |

---

## Redis

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL. Used for session storage, rate limiting, and the job queue. |
| `REDIS_PASSWORD` | No | — | Redis authentication password. Leave empty if Redis is not password-protected. |
| `REDIS_DB` | No | `0` | Redis database index (0–15). |

---

## Job Queue

| Variable | Required | Default | Description |
|---|---|---|---|
| `QUEUE_PREFIX` | No | `scrapifie` | Prefix applied to all BullMQ queue names in Redis. Useful when multiple environments share a Redis instance. |
| `QUEUE_CONCURRENCY` | No | `10` | Maximum number of jobs processed in parallel across all workers on a single node. Browser workers run at half this value. |

---

## Rate Limiting

| Variable | Required | Default | Description |
|---|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | No | `1000` | Duration of the rate limit window in milliseconds. The default of 1,000 ms implements per-second limits. |
| `RATE_LIMIT_MAX_REQUESTS` | No | `10` | Maximum requests allowed per window per API key or account. Individual keys can override this with `rateLimitOverride`. |

---

## API Key Settings

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_KEY_PREFIX` | No | `sk_live_` | Prefix applied to all generated API keys. Useful for identifying key type at a glance. |
| `API_KEY_LENGTH` | No | `32` | Length (in bytes) of the random component of generated API keys. |
| `API_KEY_HASH_ROUNDS` | No | `10` | bcrypt rounds used when hashing API keys for storage. |

---

## CSRF Protection

| Variable | Required | Default | Description |
|---|---|---|---|
| `CSRF_SECRET` | Yes (production) | `change-this-in-production` | Secret used to sign CSRF tokens with HMAC-SHA256. Must be a strong random string in production. Changing this value invalidates all existing CSRF tokens. |

---

## Scraping Engine

| Variable | Required | Default | Description |
|---|---|---|---|
| `SCRAPE_TIMEOUT_MS` | No | `30000` | Default per-job timeout in milliseconds. Jobs that exceed this limit transition to `timeout` status. |
| `SCRAPE_MAX_RETRIES` | No | `3` | Maximum automatic retry attempts for failed jobs before marking them as permanently failed. |
| `SCRAPE_RETRY_DELAY_MS` | No | `1000` | Delay between retry attempts in milliseconds. |

### HTTP Engine

| Variable | Required | Default | Description |
|---|---|---|---|
| `HTTP_USER_AGENT` | No | Chrome 120 UA string | Default User-Agent string sent by the HTTP engine. The full default mimics a modern Windows/Chrome browser. |

### Browser Engine

| Variable | Required | Default | Description |
|---|---|---|---|
| `BROWSER_HEADLESS` | No | `true` | Run browser instances in headless mode. Set to `false` for debugging locally. |
| `BROWSER_POOL_MIN` | No | `2` | Minimum number of browser instances kept warm in the pool. |
| `BROWSER_POOL_MAX` | No | `10` | Maximum number of browser instances in the pool. Increase on high-memory nodes. |
| `BROWSER_PAGE_TIMEOUT_MS` | No | `30000` | Page load timeout for browser jobs in milliseconds. |

### Stealth Engine (Camoufox)

| Variable | Required | Default | Description |
|---|---|---|---|
| `CAMOUFOX_SERVICE_URL` | No | `http://localhost:8000` | URL of the running Camoufox service. Must be accessible from the API server process. |
| `CAMOUFOX_ENABLED` | No | `false` | Set to `true` to enable the stealth engine. Requires a running Camoufox service. |

---

## Proxy

| Variable | Required | Default | Description |
|---|---|---|---|
| `PROXY_ENABLED` | No | `false` | Master switch for proxy rotation. When `false`, all requests go direct. |
| `PROXY_DATACENTER_URL` | No | — | Connection URL for the datacenter proxy provider. Required if `PROXY_ENABLED=true` and you intend to use datacenter proxies. |
| `PROXY_RESIDENTIAL_URL` | No | — | Connection URL for the residential proxy provider. Required for residential proxy tier. |
| `PROXY_MOBILE_URL` | No | — | Connection URL for the mobile proxy provider. Required for mobile proxy tier. |

---

## Object Storage (MinIO)

| Variable | Required | Default | Description |
|---|---|---|---|
| `MINIO_ENDPOINT` | No | `localhost` | Hostname or IP address of the MinIO server. |
| `MINIO_PORT` | No | `9000` | Port of the MinIO server. |
| `MINIO_ACCESS_KEY` | Yes (production) | `minioadmin` | MinIO access key. Change from the default in all non-development environments. |
| `MINIO_SECRET_KEY` | Yes (production) | `minioadmin` | MinIO secret key. Change from the default in all non-development environments. |
| `MINIO_BUCKET_CONTENT` | No | `scrapifie-content` | Bucket name for storing scraped HTML content. Created automatically if it does not exist. |
| `MINIO_BUCKET_SCREENSHOTS` | No | `scrapifie-screenshots` | Bucket name for storing job screenshots and PDFs. |
| `MINIO_USE_SSL` | No | `false` | Set to `true` to use TLS for MinIO connections. Recommended in production. |

---

## Email (SMTP)

These variables are not declared in `src/config/index.ts` but are read directly by the email service.

| Variable | Required | Default | Description |
|---|---|---|---|
| `SMTP_HOST` | No | `localhost` | SMTP server hostname. In development, point to MailDev at `localhost`. |
| `SMTP_PORT` | No | `1025` | SMTP server port. MailDev defaults to `1025`. Production SMTP typically uses `465` (SSL) or `587` (STARTTLS). |
| `FROM_EMAIL` | No | `noreply@scrapifie.com` | Sender address shown on all outgoing transactional emails. |
| `FROM_NAME` | No | `Scrapifie` | Sender display name shown on all outgoing transactional emails. |
| `APP_URL` | No | `https://scrapifie.com` | Base URL of the application. Used to construct links in email templates (verification URLs, reset links, ticket URLs). |

---

## Payment (Paystack)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PAYSTACK_SECRET_KEY` | Yes (billing) | — | Paystack secret API key for server-to-server API calls. |
| `PAYSTACK_WEBHOOK_SECRET` | No | Falls back to `PAYSTACK_SECRET_KEY` | Secret used to verify the HMAC-SHA512 signature on incoming Paystack webhook events. It is strongly recommended to set this to a separate webhook-specific secret. |
| `PAYSTACK_PRO_PLAN_CODE` | Yes (billing) | — | Paystack plan code for the Pro subscription tier. |
| `PAYSTACK_ENTERPRISE_PLAN_CODE` | Yes (billing) | — | Paystack plan code for the Enterprise subscription tier. |

---

## CAPTCHA Services

| Variable | Required | Default | Description |
|---|---|---|---|
| `CAPTCHA_SERVICE_ENABLED` | No | `false` | Enable the CAPTCHA solving integration. Requires at least one provider API key to be set. |
| `TWOCAPTCHA_API_KEY` | No | — | API key for the 2captcha service. |
| `ANTICAPTCHA_API_KEY` | No | — | API key for the Anti-Captcha service. |

---

## Metrics

| Variable | Required | Default | Description |
|---|---|---|---|
| `METRICS_ENABLED` | No | `true` | Enable the Prometheus metrics endpoint. |
| `METRICS_PORT` | No | `9090` | Port on which the Prometheus metrics endpoint is served. |

---

## Security Notes

- Never commit a `.env` file to version control. The `.gitignore` file should exclude it.
- In production, inject secrets through your infrastructure's secrets management system rather than a file on disk.
- Use strong, randomly generated values for `CSRF_SECRET`, database passwords, Redis passwords, MinIO credentials, and `PAYSTACK_SECRET_KEY`.
- Set `DATABASE_SSL=true` and `MINIO_USE_SSL=true` in production environments.
- `BROWSER_HEADLESS` should remain `true` in production.

## Related Documentation

- [Quick Start Guide](quick-start.md)
- [Production Deployment](../deployment/production.md)
