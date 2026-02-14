# Scrapifie Security Framework

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-019 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 03-AUTHENTICATION.md, 04-ROLES-AND-PERMISSIONS.md, 06-API-KEY-MANAGEMENT.md, 18-DATA-MODELS.md |

---

## Table of Contents

1. [Security Framework Overview](#1-security-framework-overview)
2. [Authentication Security](#2-authentication-security)
3. [Authorization and Access Control](#3-authorization-and-access-control)
4. [API Security](#4-api-security)
5. [Data Protection](#5-data-protection)
6. [Input Validation and Sanitization](#6-input-validation-and-sanitization)
7. [Cross-Site Scripting (XSS) Prevention](#7-cross-site-scripting-xss-prevention)
8. [Cross-Site Request Forgery (CSRF) Prevention](#8-cross-site-request-forgery-csrf-prevention)
9. [SQL Injection Prevention](#9-sql-injection-prevention)
10. [Rate Limiting and DDoS Protection](#10-rate-limiting-and-ddos-protection)
11. [Transport Security](#11-transport-security)
12. [Secrets Management](#12-secrets-management)
13. [Dependency Security](#13-dependency-security)
14. [Security Headers](#14-security-headers)
15. [Logging and Monitoring](#15-logging-and-monitoring)
16. [Incident Response](#16-incident-response)
17. [Security Checklist by Feature](#17-security-checklist-by-feature)
18. [Edge Cases](#18-edge-cases)
19. [Related Documents](#19-related-documents)

---

## 1. Security Framework Overview

Security is not an optional layer added after development -- it is a mandatory requirement for every feature, every endpoint, and every user interaction across the Scrapifie platform. This document defines the security standards, practices, and requirements that apply to all parts of the system.

### Security Principles

| Principle | Description |
|-----------|-------------|
| Defense in depth | Multiple layers of security controls. No single point of failure. If one layer is bypassed, others still protect the system |
| Least privilege | Users, processes, and services have the minimum permissions needed to perform their function |
| Deny by default | All access is denied unless explicitly permitted. Allowlists over blocklists |
| Secure by default | Every new feature ships with security controls enabled. Developers must opt OUT of security, not opt IN |
| Fail securely | When errors occur, the system fails in a secure state (deny access, reveal no information) |
| Zero trust | Do not trust any input, any client, or any network boundary. Validate everything, every time |

### Security Responsibility

| Layer | Responsibility |
|-------|---------------|
| Frontend (React SPA) | Input validation (client-side, for UX only -- not a security boundary), XSS prevention via framework defaults, secure cookie handling, CSRF token management |
| API Layer (Fastify) | Authentication, authorization, input validation (server-side, the actual security boundary), rate limiting, CORS, security headers, request logging |
| Database (PostgreSQL) | Parameterized queries, row-level access enforcement via application queries, encryption at rest (disk-level), connection pool security |
| Infrastructure | TLS everywhere, firewall rules, secrets management, container security, network isolation |

---

## 2. Authentication Security

Detailed authentication flows are defined in 03-AUTHENTICATION.md. This section summarizes the security-critical aspects.

### Password Security

| Requirement | Standard |
|-------------|----------|
| Hashing algorithm | bcrypt with a minimum cost factor of 12 |
| Minimum password length | 8 characters |
| Maximum password length | 128 characters (to prevent bcrypt DoS with extremely long passwords) |
| Password strength | Strength meter shown to user. No strict complexity rules (research shows length is more important). Block the top 10,000 most common passwords |
| Password storage | Only the bcrypt hash is stored. Raw passwords are never logged, cached, or stored anywhere |
| Password transmission | Sent via HTTPS POST body. Never in URL query parameters, headers, or GET requests |
| Password comparison | Constant-time comparison to prevent timing attacks |

### Session Security

| Requirement | Standard |
|-------------|----------|
| Session ID | 64 characters, cryptographically random (crypto.randomBytes or equivalent) |
| Session storage | Redis only, never in the database or filesystem |
| Session cookie | HttpOnly, Secure, SameSite=Lax, Path=/ |
| Session rotation | New session ID issued after login (prevents session fixation) |
| Session invalidation | On logout, password change, password reset, role change, admin force-logout, account suspension |
| Idle timeout | 30 minutes (configurable via Platform Configuration) |
| Absolute timeout | 24 hours (configurable) |
| Concurrent sessions | Allowed. Users can view and revoke individual sessions |

### Account Lockout

| Threshold | Action |
|-----------|--------|
| 5 failed logins (per email) | Lock account for 15 minutes |
| 10 failed logins (per email) | Lock account for 1 hour |
| 20 failed logins (per email) | Lock account for 24 hours. Admin notification sent |
| 10 failed logins (per IP, any account) | Rate limit that IP for 30 minutes |

Lockout counters are stored in Redis with TTL. Successful login resets the counter.

### MFA Security

| Requirement | Standard |
|-------------|----------|
| TOTP algorithm | HMAC-SHA1, 6-digit codes, 30-second period |
| TOTP secret | 160 bits of entropy, encrypted at rest in the database |
| Backup codes | 10 codes, each 8 characters, cryptographically random. Hashed (SHA-256) before storage. Show-once pattern |
| MFA brute force protection | 5 failed MFA attempts locks the MFA challenge for 15 minutes |
| MFA bypass | Only via backup codes or admin intervention (admin can disable MFA for a user) |

---

## 3. Authorization and Access Control

Detailed role and permission definitions are in 04-ROLES-AND-PERMISSIONS.md. This section covers enforcement mechanisms.

### Three-Layer Authorization

```
Request --> Layer 1: Route Middleware --> Layer 2: Resource Ownership --> Layer 3: Frontend Guard
            (role check)                (account_id match)              (UI hiding)
```

**Layer 1: Route Middleware**

Every API route has a middleware declaration that specifies:
- Whether authentication is required (public vs protected)
- What role is required (user, admin, or either)

If the request does not meet the requirements, a 401 (unauthenticated) or 403 (unauthorized) response is returned immediately, before any business logic runs.

**Layer 2: Resource Ownership**

For data-access endpoints (GET /v1/jobs/:id, etc.), the handler verifies that the requested resource belongs to the authenticated user's account. The query always includes `WHERE account_id = :authenticated_account_id`. This prevents horizontal privilege escalation (user A accessing user B's data).

**Layer 3: Frontend Guard**

The React SPA hides UI elements that the user does not have permission to use (admin nav items for non-admins, etc.). This is a UX improvement only and is NOT a security boundary. Server-side enforcement is the actual control.

### Admin Privilege Safeguards

| Safeguard | Description |
|-----------|-------------|
| Self-modification restrictions | Admins cannot suspend, demote, or delete their own account via the admin panel |
| No privilege escalation | Users cannot change their own role. Only existing admins can promote users |
| First admin bootstrap | The first admin is created via a CLI seed script, not through the UI registration flow |
| Admin action audit | Every admin action is logged in the audit trail with the admin's identity and reason |
| No shared admin accounts | Each admin has their own credentials. Shared accounts are prohibited by policy |

---

## 4. API Security

### API Key Security

Full details in 06-API-KEY-MANAGEMENT.md. Security summary:

| Requirement | Standard |
|-------------|----------|
| Key format | 48 characters: "sk_live_" or "sk_test_" prefix + 40 cryptographically random characters |
| Key storage | SHA-256 hash only. Raw key shown once at creation. Prefix stored separately for identification |
| Key transmission | Authorization header only (Bearer token). Never in URL query parameters |
| Key validation | Constant-time hash comparison |
| Key rotation | Users can create new keys and revoke old ones. No automatic rotation in MVP |
| IP whitelisting | Optional. Up to 20 IP addresses/CIDR ranges per key |
| Test vs Live | Test keys cannot consume credits and are restricted to an allowlisted set of test URLs |

### Request Authentication Flow

1. Extract Authorization header
2. Validate Bearer token format (must match `sk_live_` or `sk_test_` + 40 chars)
3. Compute SHA-256 hash of the provided key
4. Look up the hash in the database
5. Verify key status is "active" (not revoked, not expired)
6. Verify account status is "active" (not suspended, not restricted)
7. If IP whitelist is configured, verify the request IP matches
8. Check rate limits for this account
9. Check credit balance (for live keys)
10. Proceed to business logic

Each step that fails returns a generic error message that does not reveal which step failed (to prevent information leakage).

### Idempotency

| Requirement | Standard |
|-------------|----------|
| Header | Idempotency-Key (optional) |
| Format | String, max 64 characters |
| Scope | Per account (not global) |
| Duration | Valid for 24 hours after first use |
| Behavior | If the same idempotency key is used with identical parameters, the original response is returned. If the same key is used with different parameters, a 409 Conflict is returned |
| Storage | Redis hash with 24-hour TTL |

### CORS Configuration

| Setting | Value |
|---------|-------|
| Allowed origins | The SPA domain only (configured via environment variable). No wildcards in production |
| Allowed methods | GET, POST, PUT, PATCH, DELETE, OPTIONS |
| Allowed headers | Content-Type, Authorization, X-Request-ID, Idempotency-Key, X-CSRF-Token |
| Exposed headers | X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset |
| Credentials | true (required for cookie-based session auth on the SPA) |
| Max age | 86400 seconds (24 hours) |

### Request Size Limits

| Limit | Value |
|-------|-------|
| Max request body | 1 MB (Free), 5 MB (Pro), 10 MB (Enterprise) |
| Max URL length | 2,048 characters |
| Max header count | 50 custom headers |
| Max header size | 8 KB total |
| Max cookie count | 50 cookies |

---

## 5. Data Protection

### Encryption at Rest

| Data | Encryption Method |
|------|-------------------|
| Database (PostgreSQL) | Disk-level encryption (transparent data encryption or filesystem encryption). The application does not manage database-level encryption |
| Redis | Not encrypted at rest (contains only session data and caches, which are ephemeral). Redis is not exposed to the public internet |
| Object storage (screenshots, attachments) | Server-side encryption managed by the object storage provider |
| Application-level encryption | Specific sensitive fields are encrypted at the application level before database storage (see table below) |

### Application-Level Encrypted Fields

| Entity | Field | Encryption |
|--------|-------|------------|
| MFA Configuration | secret | AES-256-GCM with application encryption key |
| MFA Configuration | backup_codes | AES-256-GCM with application encryption key |
| OAuth Connection | access_token | AES-256-GCM with application encryption key |
| OAuth Connection | refresh_token | AES-256-GCM with application encryption key |
| Job | webhook_secret | AES-256-GCM with application encryption key |

The application encryption key is stored as an environment variable, never in the database or code.

### Encryption in Transit

| Communication | Encryption |
|---------------|------------|
| Client to API | TLS 1.2+ (HTTPS). HTTP requests are redirected to HTTPS |
| API to Database | TLS connection if the database is on a separate host. If same host, Unix socket |
| API to Redis | TLS connection if Redis is on a separate host. If same host, Unix socket |
| API to external services (payment provider, OAuth providers) | TLS 1.2+ |
| Webhook deliveries | HTTPS only. HTTP webhook URLs are rejected at configuration time |

### Data Retention and Deletion

| Data Type | Retention | Deletion Method |
|-----------|-----------|-----------------|
| User accounts | Until user deletes or admin deletes | Soft delete with anonymization (name, email replaced with "deleted_[uuid]") |
| Job metadata | Indefinite | Never deleted |
| Job results | 30 days after completion | Hard delete (content removed, metadata retained) |
| Job screenshots | 14 days after completion | Hard delete from object storage |
| Job logs | 90 days after completion | Hard delete |
| Audit logs | 2 years minimum | Hard delete after retention period |
| Sessions | Until logout or expiry | Automatic removal from Redis via TTL |
| Email verification tokens | 24 hours | Cleaned up by scheduled job |
| Password reset tokens | 1 hour | Cleaned up by scheduled job |
| Notifications | 90 days | Hard delete |
| Invoices | Indefinite (financial records) | Never deleted |
| Support tickets | Indefinite | Never deleted (may be required for legal/compliance) |

### Personal Data Handling

When a user deletes their account:

1. Account status set to "deleted" (soft delete)
2. User record anonymized: name replaced with "Deleted User", email replaced with "deleted_[uuid]@deleted.scrapifie.com"
3. Avatar deleted from object storage
4. Password hash cleared
5. OAuth connections deleted
6. MFA configuration deleted
7. All sessions invalidated
8. API keys revoked
9. Subscription cancelled (if active)
10. Payment method deleted from payment provider
11. Notifications deleted
12. Job data, invoices, audit logs, and support tickets are retained with the anonymized account reference

---

## 6. Input Validation and Sanitization

### Validation Principles

| Principle | Description |
|-----------|-------------|
| Server-side is the source of truth | Client-side validation exists for UX only. All security-relevant validation happens server-side |
| Validate before processing | Input is validated before any business logic, database queries, or external service calls |
| Reject unknown fields | API endpoints reject request bodies with unexpected fields (strict schema validation) |
| Type coercion disabled | String "true" is not treated as boolean true. Types must match exactly |
| Error messages are generic | Validation errors describe what is wrong but do not reveal internal implementation details |

### Validation Rules by Input Type

| Input Type | Validation |
|------------|------------|
| Email | Must match a standard email regex. Max 255 characters. Converted to lowercase. No special characters in local part beyond standard RFC 5321 |
| Password | Min 8 chars, max 128 chars. Checked against common password list |
| Name | Min 1 char, max 100 chars. Trimmed. No HTML tags |
| URL (scrape target) | Must be valid HTTP or HTTPS URL. Max 2,048 chars. No data:, javascript:, or file: protocols. IP addresses allowed but private/reserved ranges blocked |
| API key name | Max 100 chars. Trimmed. No HTML tags |
| Ticket subject | Min 5 chars, max 200 chars. Trimmed. No HTML tags |
| Ticket message | Min 10 chars, max 10,000 chars. Markdown allowed. HTML stripped |
| Blog content | Markdown allowed. HTML stripped except for allowed tags in admin content |
| JSON metadata | Max 10 keys, max 256 chars per value, max 50 chars per key. Values must be strings |
| IP address/CIDR | Must match IPv4 or IPv4 CIDR notation. Private ranges allowed for whitelisting |
| Date inputs | Must be valid ISO 8601 date or datetime. Cannot be in the distant past (>10 years) or distant future (>5 years) |
| Numeric inputs | Must be within defined min/max bounds. No NaN, Infinity, or negative numbers (unless explicitly allowed) |
| Pagination cursor | Opaque string, max 256 chars. Validated server-side for structure |
| Search queries | Max 200 chars. Special characters escaped before use in database queries |

### Private IP Range Blocking

When users provide a URL to scrape, the system blocks requests to private and reserved IP ranges to prevent Server-Side Request Forgery (SSRF):

| Blocked Range | Description |
|---------------|-------------|
| 10.0.0.0/8 | Private network |
| 172.16.0.0/12 | Private network |
| 192.168.0.0/16 | Private network |
| 127.0.0.0/8 | Loopback |
| 169.254.0.0/16 | Link-local |
| 0.0.0.0/8 | Current network |
| ::1/128 | IPv6 loopback |
| fc00::/7 | IPv6 unique local |
| fe80::/10 | IPv6 link-local |

DNS resolution is also checked: if a domain resolves to a private IP, the request is blocked.

---

## 7. Cross-Site Scripting (XSS) Prevention

### React Framework Protections

React automatically escapes all values embedded in JSX, preventing most XSS attacks by default. The following additional measures are required:

| Measure | Description |
|---------|-------------|
| No dangerouslySetInnerHTML | Never use `dangerouslySetInnerHTML` in the application. If raw HTML rendering is absolutely necessary (e.g., blog content, documentation), use a sanitization library (DOMPurify or equivalent) to strip dangerous tags and attributes |
| Markdown rendering | Use a Markdown library that does NOT pass through raw HTML. Configure it to strip or escape all HTML tags |
| URL sanitization | Any user-provided URL displayed as a link must be validated against allowed protocols (http, https only). No javascript: or data: URLs |
| SVG sanitization | If user-uploaded SVGs are supported (they are not in MVP), they must be sanitized to remove script elements and event handler attributes |

### Content Security Policy

Content-Security-Policy header (see Section 14) restricts the sources from which the browser can load resources, providing a strong defense against XSS even if a vulnerability exists.

### Output Encoding

| Context | Encoding |
|---------|----------|
| HTML body | React's default JSX escaping |
| HTML attributes | React's default attribute escaping |
| JavaScript | Never embed user data in inline scripts. All data is passed via the API, not embedded in HTML |
| URLs | encodeURIComponent for user-provided URL segments |
| CSS | Never embed user data in inline styles dynamically. Use CSS classes and CSS variables only |
| JSON | JSON.stringify with proper escaping when embedding in HTML (avoided in SPA architecture) |

---

## 8. Cross-Site Request Forgery (CSRF) Prevention

### CSRF Token Implementation

Since Scrapifie uses a combination of session cookies (for the SPA) and Bearer tokens (for the API), CSRF protection is needed for cookie-authenticated routes.

| Aspect | Implementation |
|--------|----------------|
| Token generation | A unique CSRF token is generated for each session and stored in the Redis session data |
| Token delivery | The CSRF token is included in the initial authentication response and stored in the SPA's memory (not localStorage, not a cookie) |
| Token submission | The SPA includes the CSRF token in a custom header (X-CSRF-Token) on every state-changing request (POST, PUT, PATCH, DELETE) |
| Token validation | The server compares the X-CSRF-Token header value against the session's CSRF token. Mismatch results in 403 Forbidden |
| Token rotation | The CSRF token is rotated on each session rotation (e.g., after login) |

### API Key Requests

Requests authenticated via API key (Authorization: Bearer sk_live_...) do NOT require CSRF tokens because they are not cookie-based. CSRF is only relevant for browser-based sessions.

### SameSite Cookie

The session cookie uses `SameSite=Lax`, which provides baseline CSRF protection by preventing the cookie from being sent on cross-origin POST requests. The X-CSRF-Token header provides defense in depth.

---

## 9. SQL Injection Prevention

### Parameterized Queries

All database queries use parameterized queries (prepared statements). User input is NEVER concatenated into SQL strings.

| Practice | Status |
|----------|--------|
| Parameterized queries for all user input | Mandatory |
| ORM usage with parameter binding | Used via the application's database layer |
| Raw SQL queries | Allowed only with parameterized placeholders. No string concatenation |
| Dynamic column/table names | Not derived from user input. If dynamic ordering is needed, use an allowlist of valid column names |
| LIKE queries | Use parameterized LIKE with escaped wildcards (% and _ are escaped in user input before use as LIKE patterns) |

### Query Construction Rules

| Rule | Description |
|------|-------------|
| No string interpolation | Never use template literals or string concatenation to build SQL queries with user input |
| Allowlisted sort columns | If the API accepts a sort parameter, it is validated against an allowlist of permitted column names |
| Allowlisted filter values | Enum-type filters (status, engine, plan) are validated against allowlists before use in queries |
| Limit and offset validation | Pagination parameters are validated as positive integers with maximum bounds |

---

## 10. Rate Limiting and DDoS Protection

### Rate Limiting Architecture

Rate limiting is implemented at the application level using Redis-backed sliding window counters.

### Rate Limit Tiers

| Endpoint Category | Free | Pro | Enterprise |
|-------------------|------|-----|------------|
| API requests (per minute) | 10 | 60 | 300 |
| API requests (per hour) | 100 | 1,000 | 10,000 |
| Concurrent jobs | 2 | 10 | 50 |
| Auth endpoints (per IP, per hour) | 20 | 20 | 20 |
| Password reset requests (per email, per hour) | 3 | 3 | 3 |
| Registration (per IP, per hour) | 5 | N/A | N/A |
| Support tickets (per user, per hour) | 5 | 5 | 5 |
| File uploads (per user, per hour) | 20 | 20 | 20 |
| Report generation (per admin, per hour) | 10 | N/A | N/A |
| CSV export (per user, per hour) | 5 | 5 | 5 |

### Rate Limit Response Headers

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests allowed in the current window |
| X-RateLimit-Remaining | Requests remaining in the current window |
| X-RateLimit-Reset | Unix timestamp when the rate limit window resets |
| Retry-After | Seconds until the rate limit resets (included in 429 responses) |

### Rate Limit Response

When rate limited, the API returns:
- HTTP 429 Too Many Requests
- Retry-After header with seconds until reset
- JSON body with error code "rate_limit_exceeded" and a message indicating which limit was hit

### DDoS Mitigation

| Layer | Protection |
|-------|------------|
| Infrastructure | Reverse proxy / CDN with DDoS protection (configured at deployment time) |
| Application | Rate limiting per IP, per API key, per account. Connection limits per IP |
| Slowloris protection | Request timeout at the reverse proxy level (30 seconds to read complete request headers) |
| Large payload protection | Request body size limits enforced before reading the full body |

### Bot Protection (Public Website)

| Endpoint | Protection |
|----------|------------|
| Registration form | Honeypot field (hidden field that bots fill, humans do not). Rate limit per IP. If bot detection libraries are added later, integrate here |
| Contact form | Same as registration |
| Login form | Rate limit per IP + per email. Progressive lockout |
| Password reset form | Rate limit per IP + per email |
| Blog comments | Not supported in MVP (no comment system) |

---

## 11. Transport Security

### TLS Configuration

| Requirement | Standard |
|-------------|----------|
| Minimum TLS version | TLS 1.2 |
| Preferred TLS version | TLS 1.3 |
| Cipher suites | Only strong cipher suites. No RC4, DES, 3DES, MD5, or export-grade ciphers |
| Certificate | Valid certificate from a trusted CA. Auto-renewal configured |
| HSTS | Enabled (via Strict-Transport-Security header, see Section 14) |
| HTTP redirect | All HTTP requests are 301 redirected to HTTPS |
| Certificate Transparency | Certificates should be logged to CT logs |

### Internal Communication

| Communication Path | Security |
|--------------------|----------|
| API to PostgreSQL | TLS if remote. Unix socket if local. No plaintext TCP |
| API to Redis | TLS if remote. Unix socket if local |
| API to Camoufox service | Internal Docker network. No external exposure |
| API to payment provider | HTTPS with certificate verification |
| API to OAuth providers | HTTPS with certificate verification |
| Webhook deliveries to users | HTTPS required. Certificate verification enabled. HTTP URLs rejected |

---

## 12. Secrets Management

### Secret Types and Storage

| Secret | Storage Location | Rotation |
|--------|-----------------|----------|
| Database password | Environment variable | On infrastructure change |
| Redis password | Environment variable | On infrastructure change |
| Session secret (cookie signing) | Environment variable | Rotation invalidates all sessions. Plan for zero-downtime rotation by supporting multiple active signing keys |
| Application encryption key | Environment variable | Key rotation requires re-encrypting all encrypted fields. Document the rotation process |
| OAuth client secrets | Environment variable | Per OAuth provider's rotation policy |
| Payment provider API keys | Environment variable | Per provider's rotation policy |
| SMTP credentials | Environment variable | On password change |
| JWT signing key (if used) | Environment variable | Similar to session secret |

### Secret Handling Rules

| Rule | Description |
|------|-------------|
| Never in code | Secrets are never hardcoded in source code, configuration files committed to version control, or Dockerfiles |
| Never logged | Secrets are never written to application logs, error messages, or stack traces. API keys in request headers are masked in logs (show only prefix) |
| Never in URLs | Secrets are never passed as URL query parameters (they would appear in access logs, browser history, and referer headers) |
| Never in client | No server-side secrets are ever sent to the frontend. The SPA only receives session cookies and CSRF tokens |
| Env file protection | The .env file is in .gitignore. The .env.example file contains placeholder values only |
| Minimal access | Only the application processes that need a secret have access to it. Database credentials are not exposed to worker processes that do not access the database directly |

---

## 13. Dependency Security

### Dependency Management

| Practice | Description |
|----------|-------------|
| Lock files | package-lock.json is committed to version control. All production installations use the exact versions specified in the lock file |
| Audit schedule | npm audit run as part of every CI build. Known vulnerabilities in dependencies block the build at "high" and "critical" severity |
| Update cadence | Dependencies are reviewed and updated at least monthly. Security patches are applied within 48 hours of disclosure for critical vulnerabilities |
| Minimal dependencies | Avoid unnecessary dependencies. Evaluate each new dependency for: maintenance activity, download count, known vulnerabilities, license compatibility |
| Subdependency awareness | Monitor transitive dependencies for vulnerabilities via automated tools |
| License compliance | Only use dependencies with permissive licenses (MIT, Apache 2.0, BSD). No GPL dependencies in the main application |

### Docker Image Security

| Practice | Description |
|----------|-------------|
| Base image | Use official, minimal base images (e.g., node:lts-slim). Pin to a specific version tag, not "latest" |
| Non-root user | Application runs as a non-root user inside the container |
| No unnecessary tools | Production images do not include development tools, compilers, or package managers |
| Image scanning | Container images are scanned for vulnerabilities before deployment |
| Rebuild cadence | Base images are rebuilt regularly to pick up OS-level security patches |

---

## 14. Security Headers

The API server and reverse proxy set the following security headers on all responses.

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Force HTTPS for 1 year, including subdomains |
| Content-Security-Policy | default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.scrapifie.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self' | Restrict resource loading sources |
| X-Content-Type-Options | nosniff | Prevent MIME type sniffing |
| X-Frame-Options | DENY | Prevent clickjacking via iframe embedding |
| X-XSS-Protection | 0 | Disabled (CSP is the modern replacement. This header can cause issues in some browsers) |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer information sent to external sites |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=() | Disable browser features not needed by the application |
| Cache-Control | no-store (for API responses with sensitive data), public, max-age=3600 (for static assets) | Prevent caching of sensitive data |
| X-Request-ID | Unique UUID per request | Request tracing for debugging and support |

### Content-Security-Policy Notes

The CSP is configured for a single-page application architecture:
- `script-src 'self'` -- only scripts from the same origin. No inline scripts, no eval
- `style-src 'self' 'unsafe-inline'` -- `unsafe-inline` is needed for CSS-in-JS solutions and Tailwind's style injection. Consider using nonces if moving away from inline styles
- `img-src 'self' data: https:` -- allows images from the same origin, data URIs (for base64 images), and any HTTPS source (for user avatars, screenshots stored in object storage)
- `connect-src 'self' https://api.scrapifie.com` -- allows fetch/XHR to the same origin and the API domain
- `frame-ancestors 'none'` -- the application cannot be embedded in iframes

---

## 15. Logging and Monitoring

### Security Event Logging

Security-relevant events are logged with structured JSON for automated analysis.

| Event | Log Level | Data Included |
|-------|-----------|---------------|
| Successful login | INFO | user_id, ip, user_agent, auth_method (password/oauth/mfa) |
| Failed login | WARN | email (hashed), ip, user_agent, failure_reason |
| Account lockout | WARN | email (hashed), ip, lockout_duration |
| Password change | INFO | user_id, ip |
| Password reset request | INFO | email (hashed), ip |
| MFA enabled/disabled | INFO | user_id, ip |
| API key created/revoked | INFO | user_id, account_id, key_prefix, ip |
| Admin action | INFO | admin_id, action, target_id, ip |
| Rate limit hit | WARN | ip, api_key_prefix (if applicable), endpoint, limit_type |
| Authorization failure (403) | WARN | user_id, ip, requested_resource, required_role |
| Invalid input (400) | INFO | ip, endpoint, validation_errors (no user data values) |
| Suspicious activity | WARN | user_id/ip, detection_type, details |
| Payment event | INFO | account_id, event_type, amount (no card data) |

### What is NEVER Logged

| Data | Reason |
|------|--------|
| Passwords (raw or hashed) | Credential exposure |
| Full API keys | Credential exposure. Only prefix is logged |
| Payment card numbers | PCI compliance |
| Session IDs | Session hijacking risk |
| Request/response bodies containing PII | Privacy. Log request metadata only |
| TOTP secrets or backup codes | Credential exposure |
| OAuth tokens | Credential exposure |
| Encryption keys | Critical secret exposure |

### Log Retention

| Log Type | Retention |
|----------|-----------|
| Application logs | 30 days |
| Access logs | 90 days |
| Security event logs | 1 year |
| Audit trail (database) | 2 years |

### Monitoring Alerts

Security-specific monitoring alerts (complementing the operational alerts in 16-ADMIN-OPERATIONS.md):

| Alert | Trigger | Action |
|-------|---------|--------|
| Brute force detection | >50 failed logins from a single IP in 1 hour | Block IP, notify admins |
| Credential stuffing | >100 failed logins across different emails from a single IP in 1 hour | Block IP, notify admins |
| Privilege escalation attempt | User attempts to access admin endpoints without admin role | Log, notify admins if frequent |
| Unusual admin activity | Admin performs >50 sensitive actions in 1 hour | Notify other admins |
| API key abuse | Single API key makes requests from >10 different IPs in 1 hour (and IP whitelist is not set) | Flag for review |
| Mass data access | Single account retrieves >1000 job results in 1 hour | Flag for review |
| Webhook delivery failure spike | >50% of webhook deliveries failing | Investigate, may indicate webhook URL abuse |

---

## 16. Incident Response

### Incident Severity Levels

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| Critical (P1) | Active data breach, system compromise, complete service outage | Database exposed, admin account compromised, all services down | Immediate (within 15 minutes) |
| High (P2) | Vulnerability discovered, partial service degradation, credential leak | XSS vulnerability found, API key leak detected, payment system failure | Within 1 hour |
| Medium (P3) | Security misconfiguration, non-critical vulnerability | Missing security header, outdated dependency with known CVE, rate limiting bypass | Within 24 hours |
| Low (P4) | Minor security improvement, hardening opportunity | Minor CSP adjustment, log improvement, documentation update | Within 1 week |

### Incident Response Steps

1. **Detect** -- Identify the incident via monitoring alerts, user reports, or security audit
2. **Contain** -- Immediately limit the impact (e.g., revoke compromised credentials, block malicious IPs, disable affected features)
3. **Assess** -- Determine the scope: what data was affected, how many users, what was the attack vector
4. **Remediate** -- Fix the underlying vulnerability. Deploy patches
5. **Notify** -- Inform affected users if their data was compromised. Update the status page if service was impacted
6. **Review** -- Conduct a post-incident review. Document what happened, what was done, and what will be done to prevent recurrence
7. **Improve** -- Implement the preventive measures identified in the review

### Data Breach Response

If user data is compromised:

1. Immediately revoke all active sessions for affected users
2. Force password reset for affected users
3. Disable compromised API keys
4. Notify affected users via email with: what happened, what data was affected, what they should do, what the platform is doing
5. If required by applicable data protection regulations, notify the relevant authorities within the required timeframe
6. Update the status page with a public incident report

---

## 17. Security Checklist by Feature

This checklist applies to every new feature developed for the platform.

### Before Development

| Check | Description |
|-------|-------------|
| Threat model | Identify potential threats and attack vectors for the feature |
| Data classification | Identify what sensitive data the feature handles and how it should be protected |
| Permission model | Define who can access the feature and what they can do |

### During Development

| Check | Description |
|-------|-------------|
| Input validation | All user inputs validated server-side with strict rules |
| Output encoding | All user-generated content properly escaped before rendering |
| Authentication | Endpoint requires authentication (unless explicitly public) |
| Authorization | Resource access checks verify ownership/role |
| SQL injection | All database queries use parameterized statements |
| CSRF | State-changing operations include CSRF token validation |
| Rate limiting | Endpoint has appropriate rate limits |
| Error handling | Errors do not leak internal implementation details |
| Logging | Security-relevant actions are logged (without sensitive data) |
| Secrets | No hardcoded secrets. All configuration via environment variables |

### Before Deployment

| Check | Description |
|-------|-------------|
| Dependency audit | npm audit reports no high/critical vulnerabilities |
| Security headers | Response includes all required security headers |
| HTTPS | Endpoint is only accessible via HTTPS |
| Test coverage | Security-critical code paths have 100% test coverage |
| Code review | Security-sensitive changes reviewed by a second developer |
| Penetration testing | For major features, conduct targeted security testing |

---

## 18. Edge Cases

| Scenario | Handling |
|----------|----------|
| User sends a request with both session cookie and API key | API key takes precedence. Session cookie is ignored for API-authenticated routes |
| Session cookie is present but expired | Treat as unauthenticated. Redirect to login. Do not auto-renew expired sessions |
| CSRF token is missing from a state-changing request | Return 403 Forbidden with error code "csrf_token_missing" |
| API key is valid but account is suspended | Return 403 Forbidden with error code "account_suspended" and a message indicating the user should contact support |
| Rate limit reached by concurrent requests | All concurrent requests that arrive after the limit is reached receive 429. No "first come first served" race condition -- the counter is atomic |
| Password reset token is used from a different IP than the requester | Allow it. The token itself is the authentication factor for password reset, not the IP. The IP is logged for auditing |
| User attempts to set their email to an email that belongs to a soft-deleted account | Allow it. The partial unique index excludes soft-deleted rows |
| OAuth provider returns a different email than what is on the user's account | If the user's Scrapifie email does not match the OAuth provider email, still authenticate via the provider_user_id. Email mismatch is logged but does not block authentication |
| Webhook URL resolves to a private IP | Block the webhook delivery. Return an error when the webhook URL is first configured: "Webhook URL must resolve to a public IP address" |
| Admin changes platform config while other admins are viewing the same config page | Last-write-wins. Other admins see the old values until they refresh. No real-time sync of config page |
| User submits a scrape URL that redirects to a private IP | The scraping engine must check the final resolved IP (after redirects) against the private IP blocklist, not just the initial URL |
| Application encryption key is rotated | All encrypted fields must be re-encrypted with the new key. A migration script handles this. During the migration, the application supports both the old and new key (key versioning via a version prefix in the encrypted value) |

---

## 19. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Technology stack and architecture context |
| 03-AUTHENTICATION.md | Detailed authentication flows, session management, MFA |
| 04-ROLES-AND-PERMISSIONS.md | Role definitions and permission enforcement |
| 06-API-KEY-MANAGEMENT.md | API key lifecycle and security |
| 09-BILLING-AND-CREDITS.md | Payment security, PCI compliance considerations |
| 16-ADMIN-OPERATIONS.md | Operational monitoring and alerts that complement security monitoring |
| 18-DATA-MODELS.md | Data entities, encryption requirements, retention policies |
| APPENDICES/C-ERROR-CODES.md | Security-related error codes |
| APPENDICES/D-ENVIRONMENT-VARIABLES.md | Secrets and configuration environment variables |
