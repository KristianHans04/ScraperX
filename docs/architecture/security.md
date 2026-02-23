# Security Architecture

This document describes how Scrapifie's security model is designed and implemented. It covers the dual authentication system, role-based access control, CSRF protection, rate limiting, input validation, and HTTP security headers. The goal is to give developers and security reviewers a precise, accurate picture of every layer of defence in place.

Related reading: [Authentication API Reference](../api/authentication.md), [Rate Limiting API Reference](../api/rate-limiting.md)

---

## Authentication Model

Scrapifie uses two separate authentication systems that operate independently and protect different parts of the platform.

### API Key Authentication (Scraping API)

Programmatic access to the scraping API is authenticated exclusively by API keys. No session cookie is involved. The flow works as follows:

1. The client sends a request with the key in one of three locations: the `Authorization: Bearer <key>` header, the `X-API-Key: <key>` header, or the `api_key` query parameter. The header forms are preferred; query parameter support exists for convenience but is not recommended for production use.
2. The server extracts the raw key and computes its SHA-256 hash.
3. The hash is looked up in the `api_keys` table. No plaintext key is ever stored in the database.
4. The server validates that the key is active (`is_active = true`), not revoked (`revoked_at IS NULL`), and not expired (`expires_at IS NULL OR expires_at > NOW()`).
5. If the key carries an IP allowlist (`allowed_ips`), the client's IP address is checked against it. CIDR notation is supported. Requests from unlisted IPs receive a 403 response.
6. The associated account is loaded. Accounts with status `suspended`, `restricted`, or a non-null `deleted_at` are rejected.
7. On success, the API key and account are attached to the request context for downstream middleware and route handlers to use.

A final step records the last-used timestamp and caller IP against the key asynchronously, so it does not add latency to the authenticated path.

### Session Authentication (Dashboard and Admin Panel)

Human users interacting with the web dashboard authenticate via HTTP sessions stored in Redis. The flow is:

1. The user submits their credentials to the login endpoint. On success, the server creates a session record in Redis keyed by a cryptographically random session ID.
2. The session ID is written to a `session_id` cookie (HttpOnly, SameSite=Strict, Secure in production).
3. On each subsequent request, the `requireAuth` middleware reads the cookie, looks up the session in Redis, and loads the corresponding user and account records from PostgreSQL.
4. The account status is checked. Accounts that are not `active` are rejected with a 403 response.
5. The session's last-activity timestamp is updated on every authenticated request to implement a rolling session window.
6. The resolved user object, including the user's role, is attached to the request for downstream use.

A companion `optionalAuth` middleware performs the same lookup but continues without error if no session cookie is present, allowing public routes to optionally identify logged-in visitors.

### Session Lifecycle

Sessions are stored as metadata records in both Redis (for active lookup) and the `user_session` PostgreSQL table (for the "Active Sessions" view in the user's Security settings). The PostgreSQL record holds device type, browser, operating system, IP address, and country inferred from the User-Agent and IP, plus an expiry timestamp. Expired sessions are cleaned up by the `cleanup_expired_sessions` database function. The `revoke_user_sessions` function allows all sessions belonging to a user to be invalidated at once, which is used when a password is changed.

---

## Authorization Model

### Roles

Every user record carries a `role` column constrained to `user` or `admin`. There are no intermediate roles in the current platform; future team roles (owner, org admin, member, viewer, billing) are defined in the data model but not yet enforced.

| Role | Zone Access | Capabilities |
|------|-------------|--------------|
| `user` | Dashboard only | Own account, API keys, jobs, billing, support |
| `admin` | Dashboard and Admin Panel | All accounts, moderation, finance, system operations |

The `requireAdmin` middleware wraps `requireAuth` and adds a role check. Any request to an admin route from a non-admin session receives a 403 response.

### API Key Scopes

API keys carry a `scopes` array that gates access to specific API operations. The `requireScope(scope)` middleware factory checks whether the authenticated key includes the required scope or the wildcard scope `*`.

Common scopes and their meaning:

| Scope | Permitted Actions |
|-------|------------------|
| `scrape:read` | Read job status and results |
| `scrape:write` | Submit new scrape jobs |
| `account:read` | Read account information and usage |
| `account:write` | Modify account settings |
| `*` | All scopes |

A key without a required scope receives a 403 response with error code `INSUFFICIENT_SCOPE`.

### Plan-Based Feature Gating

Beyond scopes, certain API features are gated by the account's subscription plan. The `requireFeature(feature)` middleware checks whether the account's plan includes the requested feature.

| Feature Flag | Available on Plans |
|---|---|
| `residentialProxies` | Pro, Enterprise |
| `premiumSupport` | Pro, Enterprise |
| `dedicatedIps` | Enterprise |
| `customConcurrency` | Enterprise |

A request to use a gated feature on an ineligible plan receives a 403 response with error code `FEATURE_NOT_AVAILABLE`.

---

## CSRF Protection

The dashboard and admin panel are protected against Cross-Site Request Forgery using a signed double-submit cookie pattern. This is distinct from the API key flow: API endpoints (`/v1/scrape`, `/v1/jobs`, `/v1/batch`) are exempt from CSRF checks because they authenticate via API keys, not browser sessions.

The mechanism works as follows:

1. When a browser makes a GET request to a protected route, the server generates a cryptographically random 32-byte token and sets it in two cookies.
   - The `csrf-token` cookie is readable by JavaScript (HttpOnly is false). The frontend reads this value and includes it in state-changing requests.
   - The `csrf-token-sig` cookie is HttpOnly and contains an HMAC-SHA256 signature of the token, signed with the `CSRF_SECRET` environment variable. JavaScript cannot read this cookie.
2. On any state-changing request (POST, PUT, PATCH, DELETE), the middleware reads both cookies and also reads the `X-CSRF-Token` request header.
3. The signature cookie is verified against the token cookie using a timing-safe comparison. This confirms the token has not been tampered with and was issued by this server.
4. The header value is compared to the cookie value. A cross-origin attacker cannot read the cookie value, so the values will not match.

If any step fails, the request is rejected with HTTP 403 and an appropriate error code (`CSRF_TOKEN_MISSING`, `CSRF_TOKEN_INVALID`, or `CSRF_TOKEN_MISMATCH`). All rejections are logged with the request ID, IP, and path.

Cookies are set with `SameSite=Strict` and `Secure` in production, and expire after 24 hours.

---

## Rate Limiting Strategy

Rate limiting is implemented in Redis using a sliding window counter. The limit is enforced per API key when one is present, or per account ID otherwise.

### Per-Request Rate Limits

The `rateLimitMiddleware` runs after authentication. For each request, it increments a counter in Redis keyed to either `api:<keyId>` or `account:<accountId>`. The window duration is controlled by `RATE_LIMIT_WINDOW_MS` (default: 1000 ms, implementing per-second limits). The default ceiling is 100 requests per second. API keys can carry a `rateLimitOverride` field that replaces the default for that key.

Every response includes three headers that allow clients to self-throttle:

- `X-RateLimit-Limit`: the ceiling for the current key or account
- `X-RateLimit-Remaining`: remaining capacity in the current window
- `X-RateLimit-Reset`: Unix timestamp at which the window resets

When the limit is exceeded, the server returns HTTP 429 with a `Retry-After` header and error code `RATE_LIMIT_EXCEEDED`.

### Concurrent Job Limits

A separate `concurrentLimitMiddleware` enforces how many jobs a single account may have in flight simultaneously. A token is reserved in Redis when a job starts and released when the response is sent. The default ceiling is 10 concurrent requests; API keys may carry a `maxConcurrentOverride`. Exceeding this limit returns HTTP 429 with error code `CONCURRENT_LIMIT_EXCEEDED`.

### Credit Pre-flight Check

Before a scrape job is accepted, `checkCreditsMiddleware` verifies that the account holds enough credits to cover the estimated cost. Accounts on the Enterprise plan bypass this check. Insufficient credits produce HTTP 402 with error code `INSUFFICIENT_CREDITS` and a body explaining how many credits are required versus available.

---

## Input Validation and Sanitization

All user-supplied input passes through two layers of validation before reaching business logic.

### Schema Validation

Route handlers use Zod schemas to validate and parse request bodies, query parameters, and path parameters against their expected shapes and types. Requests that fail schema validation are rejected with HTTP 400 before reaching any other middleware.

### Injection Prevention Middleware

The `inputValidation` middleware runs after schema validation and applies a second pass of pattern-based scanning over the full request body (serialised to JSON), query string, path parameters, and a set of high-risk headers (`User-Agent`, `Referer`, `X-Forwarded-For`).

**SQL Injection**: The middleware scans for SQL keywords (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `UNION`, `EXEC`, etc.), boolean logic patterns, comment sequences (`--`, `/*`, `*/`), and statement terminators (`;`). Detected patterns result in HTTP 400 with code `INVALID_INPUT`. Database queries use parameterised queries exclusively, providing a second layer of defence.

**Cross-Site Scripting (XSS)**: Script injection patterns are detected, including `<script>` tags, `<iframe>` elements, `javascript:` URIs, inline event handlers (`onclick=`, etc.), and `<object>`/`<embed>` tags.

**Path Traversal**: Path parameters are scanned for `../`, `..\`, and their URL-encoded equivalents to prevent directory traversal.

**SSRF Prevention**: URL fields that accept user-supplied URLs are validated to confirm they use `http:` or `https:` protocol only. Private and loopback addresses are not explicitly blocked by pattern but are constrained by the whitelist URL regex which requires a valid public domain.

**String Sanitisation**: All string values are trimmed, stripped of null bytes, and capped at 10,000 characters to prevent denial-of-service through oversized payloads.

The middleware logs all detected attacks with request ID and client IP but does not include the malicious payload in the log to avoid log injection.

---

## Admin Self-Protection

The `adminSelfProtection` middleware intercepts requests to admin routes that target a specific user or account by ID. If the `id` or `userId` path parameter matches the authenticated admin's own user ID, the request is rejected with HTTP 403 and the message "You cannot perform this action on your own account".

This prevents an admin from accidentally or maliciously suspending, deleting, or modifying their own account, which could lock them out of the platform. All significant admin actions are recorded in the immutable `audit_log` table regardless of whether they are blocked.

---

## Security Headers

All responses from the server include a comprehensive set of HTTP security headers configured through the `createSecurityHeadersMiddleware` factory. The defaults are as follows:

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | Restricts allowed sources for scripts, styles, fonts, images, and connections | Mitigates XSS and data injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS for one year |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy browser XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | Disables geolocation, microphone, camera, USB, and hardware sensors | Reduces attack surface |
| `X-DNS-Prefetch-Control` | `off` | Prevents DNS prefetch leaks |
| `X-Download-Options` | `noopen` | Prevents IE file execution |
| `X-Permitted-Cross-Domain-Policies` | `none` | Blocks Flash cross-domain requests |

The CSP `connect-src` directive explicitly lists the Paystack API domain (`https://api.stripe.com` in the current config — note this should be updated to the Paystack API domain in production). The `frame-ancestors 'none'` directive reinforces `X-Frame-Options`. The `upgrade-insecure-requests` directive is included as an additional instruction to browsers to treat all HTTP subresources as HTTPS.

All options are configurable at initialisation time, allowing individual headers to be disabled or overridden for specific environments or routes.

---

## Audit Logging

Every admin action is written to the `audit_log` table, which is protected at the database level by triggers that prevent any UPDATE or DELETE. Records are insert-only. Each entry captures the admin's user ID and email, the action string (for example `user.suspend`), the category (`user_management`, `support`, `financial`, `operations`, `content`), the affected resource type and ID, action-specific detail as a JSONB object, and the client IP and user agent.

This log provides a complete, tamper-proof record of all privileged operations for compliance and forensic investigation.
