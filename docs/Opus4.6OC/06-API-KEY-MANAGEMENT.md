# ScraperX API Key Management

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-006 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 05-USER-DASHBOARD.md, 18-DATA-MODELS.md, 19-SECURITY-FRAMEWORK.md |

---

## Table of Contents

1. [API Key Architecture](#1-api-key-architecture)
2. [Key Types](#2-key-types)
3. [API Keys List Page](#3-api-keys-list-page)
4. [Create API Key Flow](#4-create-api-key-flow)
5. [Show-Once Key Display](#5-show-once-key-display)
6. [Key Detail and Editing](#6-key-detail-and-editing)
7. [Revoke Key Flow](#7-revoke-key-flow)
8. [IP Whitelisting](#8-ip-whitelisting)
9. [Key Security](#9-key-security)
10. [API Authentication Using Keys](#10-api-authentication-using-keys)
11. [Plan Limits on Keys](#11-plan-limits-on-keys)
12. [Edge Cases](#12-edge-cases)

---

## 1. API Key Architecture

API keys are the primary authentication mechanism for the ScraperX API. They are distinct from web session authentication (which uses cookies). Every API request must include a valid API key.

### Key Format

| Component | Detail |
|-----------|--------|
| Prefix | "sk_live_" for live keys, "sk_test_" for test keys |
| Body | 40 characters of cryptographically random alphanumeric characters |
| Total length | 48 characters (8-character prefix + 40-character body) |
| Example (live) | sk_live_xxxxxREPLACE_WITH_YOUR_KEYxxxxx |
| Example (test) | sk_test_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0 |

### Key Lifecycle

```
Created --> Active --> Revoked
                  |
                  +--> Expired (if expiry date set)
```

| State | Description |
|-------|-------------|
| Active | Key can be used to authenticate API requests |
| Revoked | Key has been manually revoked by the user or admin. Cannot be reactivated. Requests using this key return 401. |
| Expired | Key has passed its optional expiry date. Requests using this key return 401. |

---

## 2. Key Types

### Live Keys

| Attribute | Detail |
|-----------|--------|
| Prefix | "sk_live_" |
| Purpose | Production use. Requests consume real credits and count toward billing. |
| Rate limits | Subject to the account's plan rate limits |
| Credit consumption | Full credit consumption per the credit multiplier table |
| Data retention | Full retention per plan |

### Test Keys

| Attribute | Detail |
|-----------|--------|
| Prefix | "sk_test_" |
| Purpose | Development and testing. Requests are processed but with limitations. |
| Rate limits | Same rate limits as live keys (to simulate production behavior) |
| Credit consumption | Test keys do NOT consume credits |
| Data retention | 24 hours (regardless of plan) |
| Limitations | Test keys can only scrape a predefined list of test URLs (configurable). Requests to other URLs return a 403 with a message explaining the restriction. |

### Test URL Allowlist

| URL Pattern | Description |
|-------------|-------------|
| httpbin.org/* | HTTP testing service |
| example.com/* | IANA example domain |
| quotes.toscrape.com/* | Scraping practice site |
| books.toscrape.com/* | Scraping practice site |

This list is configurable via environment variable or database configuration, allowing admins to add or remove test URLs without code changes.

---

## 3. API Keys List Page

**Route:** `/dashboard/api-keys`

### Page Layout

```
+----------------------------------------------------------------------+
|  API Keys                                          [Create API Key]   |
|                                                                       |
|  You have 2 of 5 API keys.                                           |
|                                                                       |
|  +----------------------------------------------------------------+  |
|  | Name            | Type  | Prefix          | Created     | ...  |  |
|  |-----------------|-------|-----------------|-------------|------|  |
|  | Production Key  | Live  | sk_live_a1b2... | Feb 1, 2026 | ...  |  |
|  | Dev Testing     | Test  | sk_test_x9y8... | Jan 15, 2026| ...  |  |
|  +----------------------------------------------------------------+  |
|                                                                       |
+----------------------------------------------------------------------+
```

### Table Columns

| Column | Content | Sortable |
|--------|---------|----------|
| Name | User-provided key name | Yes |
| Type | "Live" or "Test" badge | Yes |
| Key prefix | First 12 characters of the key (e.g., "sk_live_a1b2"). The rest is never shown after creation. | No |
| IP Whitelist | "All IPs" or "{n} IPs" count | No |
| Created | Date in "MMM D, YYYY" format | Yes |
| Last used | Relative time ("2 hours ago", "Never") | Yes |
| Status | "Active" (green badge), "Revoked" (red badge), "Expired" (gray badge) | Yes |
| Actions | Three-dot menu with: "Edit", "Revoke" (if active), "Delete" (if revoked) | No |

### Filters

| Filter | Options |
|--------|---------|
| Type | All, Live, Test |
| Status | All, Active, Revoked, Expired |

### Key Count Display

The page header shows "{current} of {limit} API keys" where limit depends on the plan:

| Plan | API Key Limit |
|------|--------------|
| Free | 1 |
| Pro | 5 |
| Enterprise | Unlimited |

If the user has reached their limit, the "Create API Key" button is disabled with a tooltip: "You have reached the maximum number of API keys for your plan. Upgrade to create more."

---

## 4. Create API Key Flow

**Route:** `/dashboard/api-keys/new`

### Page Layout

```
+----------------------------------------------------------------------+
|  < Back to API Keys                                                   |
|                                                                       |
|  Create API Key                                                       |
|                                                                       |
|  Key Name:        [_________________________]                         |
|                   Give your key a descriptive name.                    |
|                                                                       |
|  Environment:     ( ) Live    ( ) Test                                |
|                   Live keys consume credits. Test keys are free        |
|                   but limited to test URLs.                            |
|                                                                       |
|  Expiry:          ( ) No expiry    ( ) Set expiry date                |
|                   [Date picker - shown if "Set expiry date" selected]  |
|                                                                       |
|  IP Whitelist:    ( ) Allow all IPs    ( ) Restrict to specific IPs   |
|                   [IP input fields - shown if "Restrict" selected]     |
|                                                                       |
|  [Create Key]                                                         |
|                                                                       |
+----------------------------------------------------------------------+
```

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Key Name | Text input | Yes | 3-50 characters. Alphanumeric, spaces, hyphens, underscores only. Must be unique within the account. |
| Environment | Radio buttons | Yes | "Live" or "Test". Default: "Live". |
| Expiry | Radio buttons + date picker | No | Default: "No expiry". If "Set expiry date" is selected, a date picker appears. Minimum expiry: tomorrow. Maximum: 1 year from today. |
| IP Whitelist | Radio buttons + IP inputs | No | Default: "Allow all IPs". See Section 8 for details. |

### Creation Flow

```
User fills form and clicks "Create Key"
    |
    v
Client-side validation
    |
    +-- Fails --> Show inline errors
    |
    v
Submit to POST /api/keys
    |
    v
Server-side processing:
    |
    1. Validate session and permissions
    2. Check plan key limit
    |   +-- Limit reached --> Return 403: "API key limit reached for your plan"
    |
    3. Validate input
    |   +-- Name not unique --> Return 400: "An API key with this name already exists"
    |
    4. Generate key
    |   - Generate 40 random bytes, encode as alphanumeric
    |   - Prepend prefix: "sk_live_" or "sk_test_"
    |   - Full key: prefix + body (48 characters total)
    |
    5. Hash key for storage
    |   - Compute SHA-256 hash of the full key
    |   - Store ONLY the hash in the database
    |   - Store the prefix separately (for display purposes)
    |
    6. Create database record
    |   - id: new UUID
    |   - account_id: user's account
    |   - name: user-provided name
    |   - key_hash: SHA-256 hash
    |   - key_prefix: first 12 characters
    |   - environment: "live" or "test"
    |   - expires_at: expiry timestamp or null
    |   - ip_whitelist: array of allowed IPs or empty array
    |   - status: "active"
    |   - created_at: now
    |   - last_used_at: null
    |
    7. Log action in audit trail
    |
    8. Return the full key in the response (this is the ONLY time)
    |
    v
Navigate to Show-Once Key Display page
```

---

## 5. Show-Once Key Display

After creating a key, the user sees this page ONCE. If they navigate away, the full key can never be retrieved again.

### Page Layout

```
+----------------------------------------------------------------------+
|  API Key Created                                                      |
|                                                                       |
|  +----------------------------------------------------------------+  |
|  |                                                                 |  |
|  |  Your API key has been created. Copy it now.                    |  |
|  |  You will not be able to see this key again.                    |  |
|  |                                                                 |  |
|  |  +----------------------------------------------------------+  |  |
|  |  | sk_live_xxxxxREPLACE_WITH_YOUR_KEYxxxxx        |  |  |
|  |  +----------------------------------------------------------+  |  |
|  |  [Copy to Clipboard]                                           |  |
|  |                                                                 |  |
|  |  Key Name: Production Key                                      |  |
|  |  Environment: Live                                              |  |
|  |  Expires: Never                                                 |  |
|  |  IP Whitelist: All IPs                                          |  |
|  |                                                                 |  |
|  +----------------------------------------------------------------+  |
|                                                                       |
|  [x] I have copied my API key                                        |
|                                                                       |
|  [Go to API Keys]                                                     |
|                                                                       |
+----------------------------------------------------------------------+
```

### Behavior Details

| Element | Detail |
|---------|--------|
| Key display | Full key shown in a monospace, bordered box. Selectable text. |
| Copy button | Copies the full key to clipboard. Button text changes to "Copied!" for 2 seconds with a checkmark icon. |
| Warning text | "You will not be able to see this key again." displayed in bold or warning color. |
| Confirmation checkbox | "I have copied my API key" checkbox. The "Go to API Keys" button is disabled until this is checked. This prevents accidental navigation before copying. |
| Navigation prevention | If the user tries to navigate away (back button, sidebar click, browser close) without checking the confirmation, show a browser-native confirmation dialog: "Your API key will not be shown again. Are you sure you want to leave?" |
| No caching | This page is not cached. If the user refreshes, they see an error: "This key has already been displayed. If you did not copy it, you will need to create a new key." |

---

## 6. Key Detail and Editing

Clicking "Edit" from the key list opens an edit view or modal.

### Editable Fields

| Field | Editable | Detail |
|-------|----------|--------|
| Key Name | Yes | Same validation as creation. Must remain unique. |
| Environment | No | Cannot be changed after creation. Must create a new key. |
| Key value | No | Cannot be viewed or changed after creation. |
| Expiry | Yes | Can be extended, shortened, or removed. Cannot set expiry in the past. |
| IP Whitelist | Yes | Can add/remove IPs. |
| Status | No (use Revoke action) | Cannot be changed through edit. Revoke is a separate action. |

### Edit Form

```
+----------------------------------------------+
|  Edit API Key                          [X]    |
|                                               |
|  Key Name:  [Production Key_________]         |
|                                               |
|  Environment: Live (cannot be changed)        |
|                                               |
|  Key Prefix: sk_live_a1b2...                  |
|                                               |
|  Expiry:  ( ) No expiry  ( ) Set expiry       |
|           [Date picker]                       |
|                                               |
|  IP Whitelist:                                |
|  ( ) Allow all IPs  ( ) Restrict              |
|  [IP inputs]                                  |
|                                               |
|  [Cancel]            [Save Changes]           |
+----------------------------------------------+
```

### Key Metadata (Read-Only)

The edit view also shows read-only metadata:

| Field | Detail |
|-------|--------|
| Created | Absolute timestamp: "February 1, 2026 at 14:32 UTC" |
| Last used | Relative + absolute: "2 hours ago (February 8, 2026 at 12:15 UTC)" or "Never" |
| Total requests | Number of API requests made with this key |
| Status | "Active", "Revoked", or "Expired" with appropriate badge color |

---

## 7. Revoke Key Flow

### Revocation Process

```
User clicks "Revoke" from key list or key detail
    |
    v
Confirmation modal:
    +----------------------------------------------+
    |  Revoke API Key?                       [X]    |
    |                                               |
    |  You are about to revoke the key              |
    |  "Production Key" (sk_live_a1b2...).          |
    |                                               |
    |  Any applications using this key will         |
    |  immediately lose API access.                 |
    |                                               |
    |  This action cannot be undone.                |
    |                                               |
    |  [Cancel]              [Revoke Key]           |
    +----------------------------------------------+
    |
    v
User clicks "Revoke Key"
    |
    v
Server-side processing:
    1. Validate session and ownership
    2. Set key status = "revoked"
    3. Set revoked_at = now
    4. Log action in audit trail
    |
    v
Close modal, show success toast: "API key revoked."
Key row in table updates to show "Revoked" badge.
```

### Post-Revocation

| Behavior | Detail |
|----------|--------|
| API requests | Requests using a revoked key immediately receive 401: "API key has been revoked." |
| Data preservation | The key record is NOT deleted. It is soft-deleted (status = "revoked"). Historical data (usage, jobs) associated with the key is preserved. |
| Re-creation | A new key must be created. Revoked keys cannot be reactivated. |
| Name reuse | The name of a revoked key can be reused for a new key. |

---

## 8. IP Whitelisting

### Configuration

Users can restrict an API key to only accept requests from specific IP addresses.

| Element | Detail |
|---------|--------|
| Default | "Allow all IPs" — no restriction |
| Format | IPv4 addresses. CIDR notation supported (e.g., 203.0.113.0/24). |
| Limit | Maximum 20 IP entries per key |
| Validation | Each entry must be a valid IPv4 address or CIDR range |

### IP Input Interface

```
IP Whitelist:
( ) Allow all IPs    (*) Restrict to specific IPs

+----------------------------------------------+
| IP Address / CIDR          |  [Remove]        |
|----------------------------|------------------|
| 203.0.113.1                |  [X]             |
| 10.0.0.0/8                 |  [X]             |
+----------------------------------------------+
| [+ Add IP Address]                            |
```

| Element | Detail |
|---------|--------|
| Add button | Adds a new empty row for IP input |
| Remove button | Removes the IP from the list. At least one IP must remain if restriction is enabled. |
| Validation | Real-time validation as user types. Invalid IPs show an error below the input. |
| Current IP hint | Display: "Your current IP: 203.0.113.1 [Add this IP]" as a convenience |

### Enforcement

| Scenario | Behavior |
|----------|----------|
| Request from whitelisted IP | Request proceeds normally |
| Request from non-whitelisted IP | Return 403: "This API key is restricted to specific IP addresses. Your IP ({ip}) is not in the whitelist." |
| No whitelist configured | All IPs allowed |
| IPv6 address with IPv4 whitelist | If the server receives an IPv6-mapped IPv4 address, extract the IPv4 portion for comparison. Pure IPv6 addresses are rejected if only IPv4 entries are whitelisted. |

---

## 9. Key Security

### Storage Security

| Measure | Detail |
|---------|--------|
| Hashing | API keys are stored as SHA-256 hashes. The original key is never stored. |
| Prefix storage | The first 12 characters (prefix) are stored separately for display purposes (e.g., "sk_live_a1b2"). |
| Lookup | When an API request arrives, the provided key is hashed with SHA-256, and the hash is looked up in the database. This is a constant-time operation. |
| No recovery | If a user loses their key, they cannot recover it. They must create a new one. |

### Key in Transit

| Measure | Detail |
|---------|--------|
| HTTPS only | API keys are only accepted over HTTPS. HTTP requests to the API are rejected or redirected. |
| Header transport | Keys are sent in the Authorization header: "Bearer sk_live_..." |
| No URL parameter | Keys must NOT be sent as URL query parameters (they would appear in server logs and browser history). Requests with keys in query params are rejected with a 400 error and a message instructing the user to use the Authorization header. |
| No logging | API keys are NEVER logged — not in application logs, not in access logs, not in error reports. The key prefix may be logged for debugging. |

### Rate Limiting per Key

| Limit Type | Detail |
|------------|--------|
| Per-key rate limit | Each key inherits the account's plan rate limit. If the account allows 20 req/sec, each key can do up to 20 req/sec. However, the total across all keys cannot exceed the account limit. |
| Burst handling | Short bursts above the rate limit (up to 2x for 5 seconds) are allowed before throttling kicks in. |
| 429 response | Rate-limited requests receive 429 with Retry-After header indicating when the next request can be made. |

---

## 10. API Authentication Using Keys

### Request Format

API requests must include the API key in the Authorization header:

```
Authorization: Bearer sk_live_xxxxxREPLACE_WITH_YOUR_KEYxxxxx
```

### Authentication Flow (Server-Side)

```
API request arrives
    |
    v
Extract Authorization header
    |
    +-- Missing --> Return 401: "Missing API key. Include your key in the Authorization header."
    +-- Malformed (not "Bearer <key>") --> Return 401: "Invalid Authorization header format."
    |
    v
Validate key format
    |
    +-- Does not match expected format --> Return 401: "Invalid API key format."
    |
    v
Hash the key (SHA-256)
    |
    v
Look up hash in database
    |
    +-- Not found --> Return 401: "Invalid API key."
    |
    v
Check key status
    |
    +-- Revoked --> Return 401: "This API key has been revoked."
    +-- Expired --> Return 401: "This API key has expired."
    |
    v
Check IP whitelist (if configured)
    |
    +-- IP not in whitelist --> Return 403: "IP address not allowed for this API key."
    |
    v
Load associated account
    |
    +-- Account suspended --> Return 403: "Account suspended. Contact support."
    +-- Account deleted --> Return 401: "Invalid API key."
    |
    v
Check rate limit
    |
    +-- Exceeded --> Return 429 with Retry-After header
    |
    v
Check credit balance (for live keys)
    |
    +-- No credits remaining --> Return 429: "Credit limit reached. Upgrade your plan or purchase credits."
    |
    v
Request authorized. Proceed with processing.
Update key's last_used_at timestamp.
```

### Error Response Format

All API authentication errors return a consistent JSON format:

```
{
    "error": {
        "code": "INVALID_API_KEY",
        "message": "Invalid API key.",
        "status": 401
    }
}
```

See APPENDICES/C-ERROR-CODES.md for the complete error code list.

---

## 11. Plan Limits on Keys

| Plan | Max Keys | Max Live Keys | Max Test Keys |
|------|----------|---------------|---------------|
| Free | 1 | 1 | 1 (shares limit with live) |
| Pro | 5 | 5 | 5 (shares limit with live) |
| Enterprise | Unlimited | Unlimited | Unlimited |

Note: Live and test keys share the same limit. A Pro user can have 5 keys total in any combination of live and test.

### What Happens on Downgrade

| Scenario | Behavior |
|----------|----------|
| User has 5 keys (Pro) and downgrades to Free | Existing keys remain active. The user cannot create new keys until they have fewer than the Free plan limit (1). The user must revoke keys to get below the limit before creating new ones. |
| Revoked keys do not count | Only active keys count toward the limit. Revoked and expired keys are excluded. |

---

## 12. Edge Cases

| Scenario | Handling |
|----------|----------|
| User creates a key and immediately closes the browser | The key is created and stored (hashed). The user cannot retrieve it. They must create a new key. |
| User creates maximum keys and tries to create another | "Create API Key" button is disabled. If they somehow submit the request, server returns 403. |
| Two keys with the same name | Not allowed. Name must be unique within the account. Error: "An API key with this name already exists." |
| Key hash collision (two different keys produce the same SHA-256 hash) | Astronomically unlikely (probability of approximately 1 in 2^128 for a collision). No special handling needed. |
| Concurrent requests with the same key | Each request is processed independently. Rate limiting and credit checks use atomic Redis operations to handle concurrency. |
| Key used after account plan downgrade | Key remains active but is subject to new plan limits (rate limits, features). |
| Admin revokes a user's key | Same revocation process. Logged in audit trail with admin's user ID as actor. |
| User has no keys and makes an API request | They receive the standard "Missing API key" error. No special guidance (the error message already tells them what to do). |
| Key with expiry date that has passed | Key status transitions to "expired" automatically (either via a cron job or lazily on the next lookup). Requests return 401: "This API key has expired." |

---

## Related Documents

- 00-PLATFORM-OVERVIEW.md — API key definition in glossary
- 05-USER-DASHBOARD.md — Dashboard layout, navigation, API key count in sidebar
- 07-JOBS-AND-LOGS.md — Jobs are associated with API keys
- 09-BILLING-AND-CREDITS.md — Credit consumption, plan key limits
- 13-ADMIN-ORGANIZATIONS.md — Admin key management capabilities
- 18-DATA-MODELS.md — API key data model
- 19-SECURITY-FRAMEWORK.md — Key hashing, transport security, rate limiting
- APPENDICES/C-ERROR-CODES.md — API authentication error codes
- ROADMAP/PHASE-07.md — API key management implementation timeline
