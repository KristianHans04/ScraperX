# API Endpoints

Complete reference for all Scrapifie API endpoints. The server listens on port 3002 by default in development, configurable via the `PORT` environment variable.

---

## Authentication Model

The Scrapifie API uses two distinct authentication mechanisms depending on the route group.

**Session authentication** is used by the dashboard API (all `/api/auth/*`, `/api/dashboard`, `/api/keys`, `/api/jobs`, `/api/usage`, `/api/billing`, `/api/settings`, `/api/support`, `/api/notifications`, and `/api/admin/*` routes). Authentication is established by logging in via `POST /api/auth/login`, which sets an `httpOnly` session cookie. State-mutating requests must also include the CSRF token (the value of the `csrf_token` cookie) in the `x-csrf-token` request header.

**API key authentication** is used by the programmatic scraping API (`/api/v1/*` routes). Pass the key in the `x-api-key` header. Keys are shown once at creation and are not retrievable after that.

---

## Authentication Routes

All auth endpoints are unauthenticated and handle session establishment.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create a new user account. Body: `{ email, password, name }` |
| POST | `/api/auth/login` | Authenticate and receive a session cookie. Body: `{ email, password, rememberMe? }` |
| POST | `/api/auth/logout` | Invalidate the current session |
| GET | `/api/auth/me` | Return the authenticated user's profile (requires session) |
| POST | `/api/auth/verify-email` | Confirm an email address using a verification token. Body: `{ token }` |
| POST | `/api/auth/forgot-password` | Request a password reset email. Body: `{ email }` |
| POST | `/api/auth/reset-password` | Apply a password reset. Body: `{ token, password }` |

### Register — Example Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Smith"
}
```

### Register — Example Response

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "Jane Smith",
    "role": "user"
  }
}
```

### Login — Example Response

Sets `session_id` and `csrf_token` cookies. Body:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "Jane Smith",
    "role": "user",
    "accountId": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Dashboard Routes

Requires session authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Aggregate stats, recent jobs, account info, and credit balance |

### GET /api/dashboard — Example Response

```json
{
  "stats": {
    "totalJobs": 142,
    "activeJobs": 3,
    "completedJobs": 135,
    "failedJobs": 4,
    "successRate": "95.1",
    "creditsUsed": 312,
    "creditsRemaining": 49688,
    "apiKeysCount": 2
  },
  "account": {
    "email": "user@example.com",
    "plan": "pro",
    "status": "active",
    "credits": 49688
  },
  "recentJobs": []
}
```

---

## API Key Routes

Requires session authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/keys` | List all API keys for the authenticated account |
| POST | `/api/keys` | Create a new API key |
| DELETE | `/api/keys/:id` | Revoke an API key |

### POST /api/keys — Request Body

```json
{
  "name": "Production Key",
  "environment": "production",
  "expiresInDays": 365,
  "scopes": ["scrape:read", "scrape:write"]
}
```

### POST /api/keys — Response

The raw key is returned only once in this response and cannot be retrieved again.

```json
{
  "key": "sx_live_abc123...",
  "apiKey": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "Production Key",
    "keyPrefix": "sx_live_abc1",
    "environment": "production",
    "scopes": ["scrape:read", "scrape:write"],
    "isActive": true,
    "createdAt": "2026-02-08T10:00:00.000Z"
  }
}
```

---

## Job Routes

Requires session authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs` | Paginated list of scrape jobs for the account |
| GET | `/api/jobs/recent` | The 10 most recent jobs |
| GET | `/api/jobs/:id` | Detail view of a single job |

### Query Parameters for GET /api/jobs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Results per page (max 100) |

---

## Usage Routes

Requires session authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/usage` | Usage statistics for the account |

### Query Parameters for GET /api/usage

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | string | `30d` | Time window: `24h`, `7d`, `30d`, `90d` |

### Example Response

```json
{
  "period": "30d",
  "totalJobs": 142,
  "completedJobs": 135,
  "failedJobs": 4,
  "totalCredits": 312,
  "byEngine": {
    "http": 90,
    "browser": 40,
    "stealth": 12
  }
}
```

---

## Billing Routes

Requires session authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing` | Current plan, credit balance, and billing email |
| GET | `/api/billing/invoices` | Invoice history |
| POST | `/api/billing/credits/purchase` | Purchase additional credits. Body: `{ amount }` |
| POST | `/api/billing/subscribe` | Subscribe to a plan. Body: `{ plan }` |

---

## Settings Routes

Requires session authentication. All settings routes are mounted at `/api/settings`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/profile` | Retrieve the user's profile |
| PATCH | `/api/settings/profile` | Update name and other profile fields |
| POST | `/api/settings/avatar` | Upload a profile avatar |
| PATCH | `/api/settings/appearance` | Update theme or display preferences |
| POST | `/api/settings/password` | Change password. Body: `{ currentPassword, newPassword }` |
| GET | `/api/settings/sessions` | List active sessions |
| DELETE | `/api/settings/sessions/:id` | Revoke a specific session |
| GET | `/api/settings/notifications` | Retrieve notification preferences |
| PATCH | `/api/settings/notifications` | Update notification preferences |

---

## Support Routes

Requires session authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/support/tickets` | List support tickets for the account |
| POST | `/api/support/tickets` | Submit a new support ticket |
| GET | `/api/support/tickets/:id` | Retrieve a specific ticket and its conversation |

---

## Notification Routes

Requires session authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | Full notification list |
| GET | `/api/notifications/recent` | Recent notifications |
| GET | `/api/notifications/unread` | Unread notifications only |
| GET | `/api/notifications/unread-count` | Count of unread notifications |
| PATCH | `/api/notifications/:id/read` | Mark a single notification as read |
| POST | `/api/notifications/read-all` | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | Delete a notification |

---

## Public Routes

No authentication required.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/blog` | Published blog posts |
| GET | `/api/public/blog/:slug` | Single blog post by slug |
| GET | `/api/public/status` | Current service status |
| POST | `/api/public/contact` | Submit a contact form message |

---

## Webhook Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhooks` | Receive inbound webhook events (Paystack, etc.) |

Webhook signatures are verified server-side. Do not call this endpoint directly; it is the target for external payment provider callbacks.

---

## V1 Scraping API

Authenticated with an API key via the `x-api-key` header. These routes are for programmatic access by customers integrating the scraping API.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/scrape` | Submit a scrape job |
| GET | `/api/v1/jobs/:id` | Get the status and result of a job |
| GET | `/api/v1/account` | Retrieve the account associated with the API key |

### POST /api/v1/scrape — Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Target URL |
| method | string | No | HTTP method: `GET` (default) or `POST` |
| headers | object | No | Custom request headers |
| body | string | No | Request body for POST requests |
| engine | string | No | `http`, `browser`, `stealth`, or `auto` (default) |
| options.renderJs | boolean | No | Force JavaScript rendering |
| options.screenshot | boolean | No | Capture a screenshot |
| options.premiumProxy | boolean | No | Use a residential proxy |
| options.mobileProxy | boolean | No | Use a mobile proxy |
| options.proxyCountry | string | No | ISO 3166-1 alpha-2 country code |
| options.waitFor | string | No | CSS selector to wait for before capturing |
| options.timeout | number | No | Request timeout in milliseconds |
| options.format | string | No | Output format: `html`, `text`, `markdown`, `json` |
| webhookUrl | string | No | URL to POST the result to on completion |
| webhookSecret | string | No | HMAC secret used to sign the webhook payload |
| clientReference | string | No | Caller-supplied reference string stored with the job |
| idempotencyKey | string | No | Deduplicate repeated submissions |

### POST /api/v1/scrape — Example Request

```json
{
  "url": "https://example.com/products/widget",
  "engine": "browser",
  "options": {
    "waitFor": ".product-price",
    "format": "html"
  }
}
```

### POST /api/v1/scrape — Example Response

```json
{
  "success": true,
  "jobId": "880e8400-e29b-41d4-a716-446655440000",
  "url": "https://example.com/products/widget",
  "status": "pending",
  "creditsRequired": 5,
  "engine": "browser"
}
```

### GET /api/v1/jobs/:id — Example Response

```json
{
  "success": true,
  "jobId": "880e8400-e29b-41d4-a716-446655440000",
  "url": "https://example.com/products/widget",
  "status": "completed",
  "engine": "browser",
  "creditsCharged": 5,
  "result": {
    "html": "<!DOCTYPE html>...",
    "statusCode": 200,
    "timing": {
      "total": 1240
    }
  }
}
```

### Job Statuses

| Status | Description |
|--------|-------------|
| `pending` | Job received and accepted, not yet queued |
| `queued` | Job in the BullMQ queue, waiting for a worker |
| `running` | Worker is actively processing the job |
| `completed` | Job finished successfully; result is available |
| `failed` | Job failed after all retries; `errorMessage` is set |

### Credit Costs

| Engine | Base | Residential proxy | Mobile proxy |
|--------|------|-------------------|--------------|
| HTTP | 1 credit | +4 credits | +9 credits |
| Browser | 5 credits | +4 credits | +9 credits |
| Stealth | 10 credits | +4 credits | +9 credits |

Failed requests are not charged.

---

## Admin Routes

Requires session authentication with the admin role. All admin routes are mounted at `/api/admin`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/overview` | Platform KPIs and action-required summary |
| GET | `/api/admin/overview/stats` | Aggregate statistics |
| GET | `/api/admin/overview/activity` | Recent platform activity |
| GET | `/api/admin/users` | Paginated user list with search |
| GET | `/api/admin/users/:id` | User detail including account and activity |
| POST | `/api/admin/users/:id/suspend` | Suspend a user account |
| POST | `/api/admin/users/:id/unsuspend` | Restore a suspended account |
| POST | `/api/admin/users/:id/verify-email` | Manually verify a user's email |
| POST | `/api/admin/users/:id/reset-password` | Force a password reset |
| POST | `/api/admin/users/:id/promote` | Promote a user to admin role |
| POST | `/api/admin/users/:id/demote` | Remove admin role from a user |
| DELETE | `/api/admin/users/:id` | Soft-delete a user |
| GET | `/api/admin/accounts` | List all accounts |
| GET | `/api/admin/audit` | Searchable audit log |
| GET | `/api/admin/finance` | Revenue and subscription overview |
| GET | `/api/admin/operations` | Queue health and system metrics |
| GET | `/api/admin/search` | Cross-entity search |
| GET | `/api/admin/tickets` | All support tickets |
| GET | `/api/admin/tickets/:id` | Ticket detail |
| GET | `/api/admin/content` | CMS content (blog posts, status page config) |
| GET | `/api/admin/moderation` | Flagged accounts and abuse reports |
| POST | `/api/admin/moderation/:id/:action` | Apply a moderation action |

---

## Error Responses

All endpoints return errors in a consistent shape:

```json
{
  "error": "Human-readable error message"
}
```

The v1 API returns a more detailed structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 400 | Invalid request body or parameters |
| 401 | Missing or invalid session / API key |
| 402 | Insufficient credits |
| 403 | Authenticated but not authorized (wrong role or scope) |
| 404 | Resource not found |
| 409 | Conflict (for example, email already registered) |
| 422 | Validation error (v1 API) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
