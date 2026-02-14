# Database Schema

Scrapifie uses PostgreSQL for persistent storage. This document describes the data models and their relationships.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│  organizations  │       │    api_keys     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──────▶│ id (PK)         │
│ name            │       │ organization_id │
│ credits         │       │ key_hash        │
│ tier            │       │ name            │
│ settings        │       │ scopes          │
│ created_at      │       │ last_used_at    │
│ updated_at      │       │ expires_at      │
└─────────────────┘       │ created_at      │
        │                 └─────────────────┘
        │
        │                 ┌─────────────────┐
        │                 │   scrape_jobs   │
        │                 ├─────────────────┤
        └────────────────▶│ id (PK)         │
                          │ organization_id │
                          │ url             │
                          │ engine          │
                          │ status          │
                          │ priority        │
                          │ options         │
                          │ created_at      │
                          │ started_at      │
                          │ completed_at    │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   job_results   │
                          ├─────────────────┤
                          │ id (PK)         │
                          │ job_id (FK)     │
                          │ html            │
                          │ extracted       │
                          │ status_code     │
                          │ headers         │
                          │ timing          │
                          │ error           │
                          │ created_at      │
                          └─────────────────┘
```

## Tables

### organizations

Stores tenant organizations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Organization name |
| `credits` | INTEGER | Available credit balance |
| `tier` | VARCHAR(50) | Subscription tier (free, pro, enterprise) |
| `settings` | JSONB | Organization-specific settings |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### api_keys

Stores API keys for authentication.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Foreign key to organizations |
| `key_hash` | VARCHAR(64) | SHA-256 hash of API key |
| `name` | VARCHAR(255) | Human-readable key name |
| `scopes` | TEXT[] | Allowed operations |
| `last_used_at` | TIMESTAMP | Last usage timestamp |
| `expires_at` | TIMESTAMP | Expiration timestamp (nullable) |
| `created_at` | TIMESTAMP | Creation timestamp |

**Security Note**: Only the hash of the API key is stored. The actual key is shown once at creation and cannot be retrieved.

### scrape_jobs

Stores scrape job records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Foreign key to organizations |
| `url` | TEXT | Target URL to scrape |
| `engine` | VARCHAR(20) | Engine type (auto, http, browser, stealth) |
| `status` | VARCHAR(20) | Job status |
| `priority` | INTEGER | Job priority (1-10) |
| `options` | JSONB | Scrape options |
| `created_at` | TIMESTAMP | Job creation time |
| `started_at` | TIMESTAMP | Processing start time |
| `completed_at` | TIMESTAMP | Completion time |

**Status Values**: `queued`, `processing`, `completed`, `failed`, `cancelled`

### job_results

Stores scrape results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `job_id` | UUID | Foreign key to scrape_jobs |
| `html` | TEXT | Raw HTML content |
| `extracted` | JSONB | Extracted data |
| `status_code` | INTEGER | HTTP status code |
| `headers` | JSONB | Response headers |
| `timing` | JSONB | Performance metrics |
| `error` | TEXT | Error message (if failed) |
| `created_at` | TIMESTAMP | Result creation time |

## Indexes

### Performance Indexes

```sql
-- Fast job lookups by organization
CREATE INDEX idx_scrape_jobs_org_id ON scrape_jobs(organization_id);

-- Fast job lookups by status
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);

-- Combined index for common queries
CREATE INDEX idx_scrape_jobs_org_status ON scrape_jobs(organization_id, status);

-- API key lookup by hash
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Job results by job
CREATE INDEX idx_job_results_job_id ON job_results(job_id);
```

## JSONB Schemas

### organization.settings

```json
{
  "rateLimits": {
    "requestsPerMinute": 100,
    "burstLimit": 20
  },
  "webhooks": {
    "onComplete": "https://example.com/webhook",
    "onFail": "https://example.com/webhook"
  },
  "defaults": {
    "engine": "auto",
    "timeout": 30000
  }
}
```

### scrape_jobs.options

```json
{
  "headers": {
    "User-Agent": "Custom UA"
  },
  "cookies": [],
  "waitFor": ".content",
  "timeout": 30000,
  "extract": {
    "title": "h1",
    "content": ".article-body"
  },
  "proxy": {
    "enabled": true,
    "country": "US"
  }
}
```

### job_results.timing

```json
{
  "dns": 15,
  "connect": 45,
  "ttfb": 120,
  "download": 85,
  "total": 265
}
```

## Migrations

Migrations are managed via the `scripts/migrate.ts` script:

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status
```

Migration files are located in `src/db/migrations/` and follow the naming convention:
`YYYYMMDDHHMMSS_description.sql`

## Data Retention

### Default Policies

| Data Type | Retention | Notes |
|-----------|-----------|-------|
| Job records | 30 days | Configurable per organization |
| Job results | 7 days | Large data, shorter retention |
| API key logs | 90 days | For security auditing |

### Cleanup

Automatic cleanup runs daily to remove expired data. Configure with:

```
DATA_RETENTION_DAYS=30
CLEANUP_SCHEDULE="0 2 * * *"
```
