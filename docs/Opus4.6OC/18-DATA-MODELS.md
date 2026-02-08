# ScraperX Data Models

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-PLATFORM-018 |
| Version | 1.0.0 |
| Last Updated | 2026-02-08 |
| Status | Planning |
| Related Documents | 00-PLATFORM-OVERVIEW.md, 03-AUTHENTICATION.md, 04-ROLES-AND-PERMISSIONS.md, 06-API-KEY-MANAGEMENT.md, 07-JOBS-AND-LOGS.md, 09-BILLING-AND-CREDITS.md, 10-TEAM-MANAGEMENT.md |

---

## Table of Contents

1. [Data Model Overview](#1-data-model-overview)
2. [Conventions and Standards](#2-conventions-and-standards)
3. [Account](#3-account)
4. [User](#4-user)
5. [Session](#5-session)
6. [OAuth Connection](#6-oauth-connection)
7. [Email Verification Token](#7-email-verification-token)
8. [Password Reset Token](#8-password-reset-token)
9. [MFA Configuration](#9-mfa-configuration)
10. [API Key](#10-api-key)
11. [Job](#11-job)
12. [Job Log](#12-job-log)
13. [Job Result](#13-job-result)
14. [Subscription](#14-subscription)
15. [Invoice](#15-invoice)
16. [Credit Ledger](#16-credit-ledger)
17. [Credit Pack Purchase](#17-credit-pack-purchase)
18. [Payment Method](#18-payment-method)
19. [Payment Failure](#19-payment-failure)
20. [Refund](#20-refund)
21. [Support Ticket](#21-support-ticket)
22. [Ticket Message](#22-ticket-message)
23. [Notification](#23-notification)
24. [Audit Log](#24-audit-log)
25. [Abuse Flag](#25-abuse-flag)
26. [Blog Post](#26-blog-post)
27. [Status Incident](#27-status-incident)
28. [Maintenance Window](#28-maintenance-window)
29. [Platform Configuration](#29-platform-configuration)
30. [Rate Limit Override](#30-rate-limit-override)
31. [Future: Organization](#31-future-organization)
32. [Future: Organization Member](#32-future-organization-member)
33. [Future: Organization Invitation](#33-future-organization-invitation)
34. [Entity Relationship Summary](#34-entity-relationship-summary)
35. [Related Documents](#35-related-documents)

---

## 1. Data Model Overview

This document defines every data entity in the ScraperX platform. Each entity is described with its fields, relationships, constraints, and behavioral notes. The entities described here correspond to database tables in PostgreSQL.

**Important:** This document describes the data model for the FULL platform (existing backend + new frontend features). Some entities already exist in the current database schema (jobs, API keys, etc.) and will be extended. Others are entirely new (subscriptions, invoices, support tickets, etc.).

### Entity Categories

| Category | Entities |
|----------|----------|
| Identity and Access | Account, User, Session, OAuth Connection, Email Verification Token, Password Reset Token, MFA Configuration |
| API | API Key |
| Jobs | Job, Job Log, Job Result |
| Billing | Subscription, Invoice, Credit Ledger, Credit Pack Purchase, Payment Method, Payment Failure, Refund |
| Support | Support Ticket, Ticket Message |
| Platform | Notification, Audit Log, Abuse Flag, Blog Post, Status Incident, Maintenance Window, Platform Configuration, Rate Limit Override |
| Future (Teams) | Organization, Organization Member, Organization Invitation |

---

## 2. Conventions and Standards

All entities follow these conventions, derived from docs/development/standards.md:

| Convention | Rule |
|------------|------|
| Primary keys | UUID v4, never auto-incrementing integers. Column name: `id` |
| Timestamps | All entities have `created_at` and `updated_at` columns (UTC, stored as timestamptz) |
| Soft deletes | Entities that support deletion use a `deleted_at` nullable timestamp. Rows with a non-null `deleted_at` are excluded from normal queries |
| Foreign keys | Named as `[referenced_entity]_id`, e.g., `account_id`, `user_id` |
| Enums | Stored as string columns with application-level validation. Not database-level enums (for migration flexibility) |
| Indexes | Primary key index is automatic. Additional indexes are noted per entity for fields used in queries and filters |
| Text fields | Have maximum length constraints defined at the application level |
| Boolean fields | Default to `false` unless otherwise specified |
| Money fields | Stored as integers in the smallest currency unit (cents for USD). Displayed by dividing by 100 |
| Nullable fields | Explicitly marked. All other fields are NOT NULL |

### Common Fields

Every entity includes these fields unless explicitly stated otherwise:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, generated server-side |
| created_at | Timestamp (UTC) | Row creation time, set automatically |
| updated_at | Timestamp (UTC) | Last modification time, updated automatically |

---

## 3. Account

The Account is the top-level ownership entity. All resources (API keys, jobs, subscriptions, credits) belong to an Account, not directly to a User. In MVP, there is a one-to-one relationship between User and Account. In the future Teams phase, an Account becomes an Organization and multiple Users can belong to one Account.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| display_name | String (100) | No | -- | Account display name (set from user's name at creation) |
| plan | String (20) | No | "free" | Current plan: "free", "pro", "enterprise" |
| credit_balance | Integer | No | 0 | Current available credits |
| credit_cycle_usage | Integer | No | 0 | Credits consumed in the current billing cycle |
| status | String (20) | No | "active" | Account status: "active", "restricted", "suspended" |
| created_at | Timestamp | No | Now | Account creation time |
| updated_at | Timestamp | No | Now | Last update time |
| deleted_at | Timestamp | Yes | null | Soft delete timestamp |

**Indexes:** status, plan, created_at

**Relationships:**
- Has one User (MVP)
- Has many API Keys
- Has many Jobs
- Has one Subscription
- Has many Invoices
- Has many Credit Ledger entries
- Has many Credit Pack Purchases
- Has one Payment Method
- Has many Support Tickets
- Has many Notifications

**Behavioral Notes:**
- Credit balance is updated atomically using database-level atomic operations (INCREMENT/DECREMENT) to prevent race conditions
- When plan changes, credit_balance is reset to the new plan's included credits at the start of the next billing cycle
- The `status` field is separate from the subscription status. An account can be "suspended" by an admin even if the subscription is active

---

## 4. User

The User represents an individual person who can authenticate and interact with the platform.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| email | String (255) | No | -- | Unique email address, stored lowercase |
| email_verified | Boolean | No | false | Whether the email has been verified |
| password_hash | String (255) | Yes | null | Bcrypt hash of the password. Null for OAuth-only users |
| name | String (100) | No | -- | Full display name |
| avatar_url | String (500) | Yes | null | URL to avatar image (stored in object storage) |
| role | String (20) | No | "user" | Platform role: "user", "admin" |
| timezone | String (50) | No | "UTC" | User's preferred timezone (IANA timezone identifier) |
| date_format | String (20) | No | "YYYY-MM-DD" | Preferred date display format |
| theme | String (10) | No | "system" | UI theme preference: "light", "dark", "system" |
| display_density | String (10) | No | "comfortable" | UI density: "comfortable", "compact" |
| last_login_at | Timestamp | Yes | null | Timestamp of most recent successful login |
| last_login_ip | String (45) | Yes | null | IP address of most recent login (supports IPv6) |
| login_failed_count | Integer | No | 0 | Consecutive failed login attempts |
| locked_until | Timestamp | Yes | null | If set, account is locked until this time |
| terms_accepted_at | Timestamp | Yes | null | When the user accepted the Terms of Service |
| terms_version | String (20) | Yes | null | Version of ToS the user accepted |
| created_at | Timestamp | No | Now | Registration time |
| updated_at | Timestamp | No | Now | Last update time |
| deleted_at | Timestamp | Yes | null | Soft delete timestamp |

**Indexes:** email (unique, partial: where deleted_at IS NULL), account_id, role, created_at

**Relationships:**
- Belongs to one Account
- Has many Sessions
- Has many OAuth Connections
- Has zero or one MFA Configuration
- Has many Audit Log entries (as actor)

**Behavioral Notes:**
- Email uniqueness is enforced via a partial unique index that excludes soft-deleted rows, allowing email reuse after account deletion
- The `password_hash` field is nullable to support OAuth-only users. If a user registers via OAuth and later wants to set a password, they use the "Set Password" flow (similar to password reset)
- `login_failed_count` is reset to 0 on successful login
- `locked_until` is set based on the lockout escalation rules in 03-AUTHENTICATION.md

---

## 5. Session

Active user sessions, stored in Redis for fast access. This entity is documented here for completeness but is NOT a PostgreSQL table -- it is a Redis data structure.

| Field | Type | Description |
|-------|------|-------------|
| session_id | String | Redis key, cryptographically random 64-character hex string |
| user_id | UUID | References User.id |
| account_id | UUID | References Account.id (denormalized for fast access) |
| role | String | User's role at time of session creation (denormalized) |
| ip_address | String | IP address at session creation |
| user_agent | String | Browser user agent string |
| created_at | Timestamp | Session creation time |
| last_activity_at | Timestamp | Last request timestamp |
| expires_at | Timestamp | Absolute session expiry |
| csrf_token | String | CSRF token bound to this session |

**Storage:** Redis hash, keyed by `session:{session_id}`. TTL set to absolute session timeout.

**Additional Redis Structures:**
- `user_sessions:{user_id}` -- a Redis set containing all session_ids for a user (for listing active sessions and revoking all)
- Session lookup: the session cookie contains only the session_id. On each request, the server looks up the session in Redis

**Behavioral Notes:**
- Sessions are invalidated (deleted from Redis) on logout, password change, password reset, admin force-logout, and account suspension
- `last_activity_at` is updated on each authenticated request (but throttled to once per minute to reduce Redis writes)
- If `last_activity_at` is older than the idle timeout (default 30 minutes), the session is considered expired

---

## 6. OAuth Connection

Stores OAuth provider connections for a user. A user can have multiple OAuth connections (e.g., both Google and GitHub).

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| user_id | UUID (FK) | No | -- | References User.id |
| provider | String (20) | No | -- | OAuth provider: "google", "github" |
| provider_user_id | String (255) | No | -- | User's ID at the OAuth provider |
| provider_email | String (255) | No | -- | Email from the OAuth provider |
| access_token | String (500) | Yes | null | Encrypted OAuth access token (if stored for API access) |
| refresh_token | String (500) | Yes | null | Encrypted OAuth refresh token (if applicable) |
| token_expires_at | Timestamp | Yes | null | When the access token expires |
| created_at | Timestamp | No | Now | Connection creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** user_id, (provider, provider_user_id) unique composite

**Relationships:**
- Belongs to one User

**Behavioral Notes:**
- The composite unique index on (provider, provider_user_id) prevents the same OAuth identity from being linked to multiple ScraperX accounts
- OAuth tokens are encrypted at rest using application-level encryption (see 19-SECURITY-FRAMEWORK.md)
- If a user has only an OAuth connection (no password), they cannot disconnect it without first setting a password

---

## 7. Email Verification Token

Stores tokens for email verification (registration and email change).

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| user_id | UUID (FK) | No | -- | References User.id |
| token_hash | String (64) | No | -- | SHA-256 hash of the verification token |
| email | String (255) | No | -- | The email address being verified |
| purpose | String (20) | No | -- | "registration" or "email_change" |
| expires_at | Timestamp | No | -- | Token expiry time (24 hours after creation) |
| used_at | Timestamp | Yes | null | When the token was used |
| created_at | Timestamp | No | Now | Token creation time |

**Indexes:** token_hash (unique), user_id, expires_at

**Behavioral Notes:**
- Tokens are single-use. Once `used_at` is set, the token cannot be used again
- Expired and used tokens are cleaned up by a scheduled job (see 16-ADMIN-OPERATIONS.md)
- When a new verification token is created, any existing unused tokens for the same user and purpose are invalidated (deleted)
- The raw token is sent via email. Only the hash is stored in the database

---

## 8. Password Reset Token

Stores tokens for password reset requests.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| user_id | UUID (FK) | No | -- | References User.id |
| token_hash | String (64) | No | -- | SHA-256 hash of the reset token |
| expires_at | Timestamp | No | -- | Token expiry time (1 hour after creation) |
| used_at | Timestamp | Yes | null | When the token was used |
| ip_address | String (45) | No | -- | IP address of the requester |
| created_at | Timestamp | No | Now | Token creation time |

**Indexes:** token_hash (unique), user_id, expires_at

**Behavioral Notes:**
- Same single-use and cleanup rules as Email Verification Token
- Creating a new reset token invalidates all existing unused reset tokens for the same user
- The `ip_address` is logged for security auditing

---

## 9. MFA Configuration

Stores TOTP-based multi-factor authentication configuration for a user.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| user_id | UUID (FK) | No | -- | References User.id (unique -- one MFA config per user) |
| secret | String (255) | No | -- | Encrypted TOTP secret |
| enabled | Boolean | No | false | Whether MFA is currently active |
| verified_at | Timestamp | Yes | null | When the user first verified a TOTP code (confirming setup) |
| backup_codes | Text | Yes | null | Encrypted JSON array of hashed backup codes |
| backup_codes_remaining | Integer | No | 10 | Count of unused backup codes |
| created_at | Timestamp | No | Now | Setup initiation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** user_id (unique)

**Behavioral Notes:**
- MFA is not `enabled` until the user successfully verifies a TOTP code during setup (see 03-AUTHENTICATION.md)
- `secret` is encrypted at rest using application-level encryption
- `backup_codes` contains an array of SHA-256 hashed backup codes. When a backup code is used, its hash is removed from the array and `backup_codes_remaining` is decremented
- If `backup_codes_remaining` reaches 0, the user is warned to regenerate backup codes

---

## 10. API Key

Represents an API key that authenticates requests to the ScraperX API.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| name | String (100) | No | -- | User-assigned key name |
| key_prefix | String (12) | No | -- | First 12 characters of the key (e.g., "sk_live_abc1") for identification |
| key_hash | String (64) | No | -- | SHA-256 hash of the full API key |
| environment | String (10) | No | -- | "live" or "test" |
| status | String (20) | No | "active" | "active" or "revoked" |
| expires_at | Timestamp | Yes | null | Optional expiry date |
| last_used_at | Timestamp | Yes | null | Timestamp of most recent API request using this key |
| total_requests | Integer | No | 0 | Lifetime request count |
| ip_whitelist | Text | Yes | null | JSON array of allowed IP addresses/CIDR ranges. Null means no IP restriction |
| revoked_at | Timestamp | Yes | null | When the key was revoked |
| revoked_by | String (20) | Yes | null | "user" or "admin" or "system" (for auto-revocation on account deletion) |
| created_at | Timestamp | No | Now | Key creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** key_hash (unique), account_id, environment, status, created_at

**Relationships:**
- Belongs to one Account
- Has many Jobs (referenced by the job's api_key_id)

**Behavioral Notes:**
- The full API key is shown to the user exactly once at creation time. Only the hash and prefix are stored
- Authentication flow: extract key from request header, compute SHA-256 hash, look up by key_hash
- `total_requests` is incremented on each authenticated request
- `last_used_at` is updated on each authenticated request (throttled to once per minute to reduce write load)
- When a key is revoked, all in-progress jobs submitted with that key continue to completion. The key simply cannot be used for new requests

---

## 11. Job

Represents a scraping job submitted via the API. This entity already exists in the current backend and is extended here with additional fields for the platform.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| api_key_id | UUID (FK) | No | -- | References API Key.id (which key was used to submit the job) |
| url | String (2048) | No | -- | Target URL |
| engine | String (10) | No | "http" | "http", "browser", or "stealth" |
| status | String (20) | No | "queued" | "queued", "processing", "completed", "failed", "cancelled", "expired" |
| method | String (10) | No | "GET" | HTTP method |
| request_headers | Text | Yes | null | JSON object of custom request headers |
| request_cookies | Text | Yes | null | JSON array of cookies to inject |
| proxy_config | Text | Yes | null | JSON object of proxy preferences (country, sticky) |
| wait_for | String (500) | Yes | null | CSS selector to wait for (Browser/Stealth) |
| wait_timeout | Integer | No | 30000 | Wait condition timeout in ms |
| screenshot_requested | Boolean | No | false | Whether a screenshot was requested |
| screenshot_full_page | Boolean | No | false | Full page vs viewport screenshot |
| javascript | Text | Yes | null | JavaScript to execute on page |
| webhook_url | String (2048) | Yes | null | Webhook notification URL |
| webhook_secret | String (255) | Yes | null | Encrypted webhook signing secret |
| webhook_delivered | Boolean | No | false | Whether webhook was successfully delivered |
| webhook_attempts | Integer | No | 0 | Number of webhook delivery attempts |
| idempotency_key | String (64) | Yes | null | Client-provided idempotency key |
| metadata | Text | Yes | null | JSON object of user-defined metadata |
| credits_charged | Integer | No | 0 | Credits charged for this job |
| duration_ms | Integer | Yes | null | Execution duration in milliseconds |
| attempts | Integer | No | 0 | Number of execution attempts (including retries) |
| max_attempts | Integer | No | 3 | Maximum attempts before moving to DLQ |
| error_type | String (50) | Yes | null | Error classification if failed |
| error_message | Text | Yes | null | Error details if failed |
| parent_job_id | UUID (FK) | Yes | null | References Job.id if this is a retry of a previous job |
| started_at | Timestamp | Yes | null | When processing began |
| completed_at | Timestamp | Yes | null | When processing finished (success or failure) |
| expires_at | Timestamp | Yes | null | When the job will auto-expire if still queued |
| created_at | Timestamp | No | Now | Job submission time |
| updated_at | Timestamp | No | Now | Last status update time |

**Indexes:** account_id, api_key_id, status, engine, created_at, idempotency_key (unique where not null, partial), parent_job_id

**Relationships:**
- Belongs to one Account
- Belongs to one API Key
- Has many Job Logs
- Has zero or one Job Result
- May reference a parent Job (for retries)

**Behavioral Notes:**
- Credits are reserved (pre-authorized) when the job moves from "queued" to "processing". If the job fails, credits are still charged. If the job is cancelled before processing starts, no credits are charged
- `idempotency_key` uniqueness is scoped to the account and is valid for 24 hours. After 24 hours, the key can be reused
- `expires_at` is set to 1 hour after creation for queued jobs. If the job is still queued when expires_at passes, it transitions to "expired"
- Job results and screenshots have separate retention policies (see 07-JOBS-AND-LOGS.md). The job metadata row itself is retained indefinitely

---

## 12. Job Log

Individual log entries for a job's execution, providing a timeline of events during processing.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| job_id | UUID (FK) | No | -- | References Job.id |
| level | String (10) | No | -- | "info", "warn", "error", "debug" |
| message | String (1000) | No | -- | Log message text |
| details | Text | Yes | null | JSON object with additional structured data |
| timestamp | Timestamp | No | Now | When this log entry was created |

**Indexes:** job_id, timestamp, level

**Relationships:**
- Belongs to one Job

**Behavioral Notes:**
- Job logs are append-only. They are never updated or deleted during normal operation
- Retention: 90 days from job completion. Cleaned up by a scheduled job
- Debug-level logs are only stored if the account has debug logging enabled (future feature) or if the job failed

---

## 13. Job Result

Stores the scraped content from a completed job. Separated from the Job entity because results can be large and have different retention policies.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| job_id | UUID (FK) | No | -- | References Job.id (unique -- one result per job) |
| content_type | String (50) | No | -- | MIME type of the result: "text/html", "application/json", "text/plain", "text/markdown" |
| content | Text | Yes | null | The scraped content (stored as text). Null if content was too large and was stored externally |
| content_size_bytes | Integer | No | 0 | Size of the content in bytes |
| content_external_ref | String (500) | Yes | null | Reference to externally stored content (object storage key) if content exceeds inline storage threshold |
| screenshot_url | String (500) | Yes | null | URL to the screenshot image in object storage |
| screenshot_size_bytes | Integer | Yes | null | Screenshot file size |
| response_status_code | Integer | Yes | null | HTTP status code from the target website |
| response_headers | Text | Yes | null | JSON object of response headers from the target |
| expires_at | Timestamp | No | -- | When this result will be cleaned up (30 days after job completion) |
| created_at | Timestamp | No | Now | Result storage time |

**Indexes:** job_id (unique), expires_at

**Relationships:**
- Belongs to one Job

**Behavioral Notes:**
- Content up to 5MB is stored inline in the `content` column. Content exceeding 5MB is stored in object storage and referenced via `content_external_ref`
- Screenshots are always stored in object storage, never inline
- The `expires_at` field is used by the cleanup job to remove old results. Screenshots expire after 14 days; content after 30 days
- When a result is cleaned up, the Job metadata row remains with `content_type` and `content_size_bytes` for historical reference

---

## 14. Subscription

Represents a user's subscription to a paid plan.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id (unique -- one subscription per account) |
| plan | String (20) | No | -- | "pro" or "enterprise" |
| status | String (20) | No | "active" | "active", "past_due", "suspended", "cancelled" |
| billing_frequency | String (10) | No | "monthly" | "monthly" or "annual" |
| amount | Integer | No | -- | Charge amount in cents per billing period |
| currency | String (3) | No | "usd" | ISO 4217 currency code |
| provider_subscription_id | String (255) | Yes | null | Subscription ID at the payment provider |
| current_period_start | Timestamp | No | -- | Start of current billing cycle |
| current_period_end | Timestamp | No | -- | End of current billing cycle |
| cancel_at_period_end | Boolean | No | false | Whether the subscription will cancel at period end (user-initiated downgrade) |
| cancelled_at | Timestamp | Yes | null | When cancellation was requested |
| cancellation_reason | String (500) | Yes | null | User-provided cancellation reason |
| pending_plan_change | String (20) | Yes | null | If a downgrade is scheduled, the target plan |
| trial_end | Timestamp | Yes | null | Reserved for future trial period support |
| created_at | Timestamp | No | Now | Subscription creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** account_id (unique), status, current_period_end, provider_subscription_id

**Behavioral Notes:**
- Free plan users do not have a Subscription row. The Account.plan field is the source of truth for the current plan. The Subscription entity only exists for paid plans
- `current_period_end` is the billing cycle anchor. When a cycle renews, `current_period_start` becomes the old `current_period_end`, and a new `current_period_end` is calculated
- When `cancel_at_period_end` is true, the subscription continues until `current_period_end`, then transitions to "cancelled" and the Account.plan is set to "free"

---

## 15. Invoice

Represents a financial transaction record.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| invoice_number | String (20) | No | -- | Human-readable invoice number: INV-XXXXXXXX (8 random alphanumeric characters) |
| type | String (20) | No | -- | "subscription", "credit_pack", "refund" |
| status | String (20) | No | "pending" | "pending", "paid", "failed", "refunded", "partially_refunded", "voided" |
| amount | Integer | No | -- | Total amount in cents |
| currency | String (3) | No | "usd" | ISO 4217 currency code |
| description | String (255) | No | -- | Human-readable description: "Pro Plan - Monthly", "Credit Pack - Medium", etc. |
| line_items | Text | No | -- | JSON array of line item objects, each with: description, quantity, unit_price, total |
| proration_credit | Integer | No | 0 | Proration credit amount in cents (for plan changes mid-cycle) |
| provider_payment_id | String (255) | Yes | null | Payment transaction ID at the payment provider |
| provider_invoice_id | String (255) | Yes | null | Invoice ID at the payment provider |
| payment_method_snapshot | Text | Yes | null | JSON snapshot of the payment method used (brand, last4, expiry) at time of charge |
| paid_at | Timestamp | Yes | null | When payment was collected |
| refunded_amount | Integer | No | 0 | Total refunded amount in cents |
| admin_notes | Text | Yes | null | Internal admin notes (JSON array of note objects with text, admin_id, timestamp) |
| pdf_url | String (500) | Yes | null | URL to the generated PDF invoice |
| due_date | Timestamp | Yes | null | Payment due date (for pending invoices) |
| created_at | Timestamp | No | Now | Invoice creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** account_id, invoice_number (unique), status, type, created_at, paid_at

**Behavioral Notes:**
- Invoice numbers are unique across the platform and use 8 random alphanumeric characters (not sequential) to prevent enumeration
- `payment_method_snapshot` captures the payment method at the time of the transaction, so invoice records remain accurate even if the user later changes their payment method
- PDF invoices are generated on demand (first request) and cached. The `pdf_url` points to object storage
- Line items are stored as a JSON array for flexibility (avoids a separate line items table for MVP)

---

## 16. Credit Ledger

An append-only ledger of all credit operations. Every credit addition or deduction creates a ledger entry, providing a complete audit trail of credit movements.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| operation | String (30) | No | -- | "plan_reset", "job_charge", "admin_add", "admin_deduct", "pack_purchase", "refund_restoration", "expiry_reset" |
| amount | Integer | No | -- | Positive for additions, negative for deductions |
| balance_after | Integer | No | -- | Account credit balance after this operation |
| reference_type | String (20) | Yes | null | Type of referenced entity: "job", "pack", "invoice", "admin" |
| reference_id | UUID | Yes | null | ID of the referenced entity |
| description | String (500) | No | -- | Human-readable description of the operation |
| actor_type | String (10) | No | "system" | "system", "user", "admin" |
| actor_id | UUID | Yes | null | User or admin ID who triggered the operation. Null for system operations |
| created_at | Timestamp | No | Now | Operation timestamp |

**Indexes:** account_id, operation, created_at, reference_type + reference_id

**Behavioral Notes:**
- This is an append-only table. Rows are NEVER updated or deleted
- The `balance_after` field allows reconstructing the balance at any point in time without summing all prior entries
- The sum of all `amount` values for an account should equal the current `Account.credit_balance`. If they diverge, it indicates a bug
- `reference_type` and `reference_id` provide traceability: for a "job_charge", reference_id points to the Job; for a "pack_purchase", it points to the Credit Pack Purchase

---

## 17. Credit Pack Purchase

Records individual credit pack purchases.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| invoice_id | UUID (FK) | No | -- | References Invoice.id |
| pack_name | String (20) | No | -- | "small", "medium", "large" |
| credits | Integer | No | -- | Number of credits in the pack (10000, 25000, 50000) |
| amount | Integer | No | -- | Price paid in cents |
| currency | String (3) | No | "usd" | ISO 4217 currency code |
| expires_at | Timestamp | No | -- | When the pack credits expire (end of current billing cycle) |
| created_at | Timestamp | No | Now | Purchase time |

**Indexes:** account_id, created_at, expires_at

**Behavioral Notes:**
- Credit packs are non-refundable (see 09-BILLING-AND-CREDITS.md)
- Pack credits do NOT roll over. They expire at the end of the billing cycle (matched to `Subscription.current_period_end`)
- Maximum 5 pack purchases per billing cycle per account
- Pack credits are added to `Account.credit_balance` immediately upon successful payment. There is no separate "pack balance" -- all credits are fungible

---

## 18. Payment Method

Stores tokenized payment method information. No raw card numbers are ever stored.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id (unique for MVP -- one method per account) |
| provider_method_id | String (255) | No | -- | Payment method token/ID at the payment provider |
| type | String (20) | No | -- | "card" (future: "bank_transfer", "mobile_money") |
| brand | String (20) | Yes | null | Card brand: "visa", "mastercard", "amex", etc. |
| last_four | String (4) | No | -- | Last 4 digits of the card number |
| expiry_month | Integer | No | -- | Card expiry month (1-12) |
| expiry_year | Integer | No | -- | Card expiry year (4-digit) |
| is_default | Boolean | No | true | Whether this is the default payment method (always true for MVP since only one method) |
| created_at | Timestamp | No | Now | When the payment method was added |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** account_id (unique for MVP), provider_method_id

**Behavioral Notes:**
- The platform NEVER stores raw card numbers, CVVs, or full card details. All card processing is handled by the payment provider
- `provider_method_id` is the token used to initiate charges through the payment provider's API
- When a user updates their payment method, the old Payment Method row is replaced (soft delete the old, create the new)
- If the card is approaching expiry (within 30 days), the system sends a notification prompting the user to update their payment method

---

## 19. Payment Failure

Tracks failed payment attempts and the escalation process described in 09-BILLING-AND-CREDITS.md.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| subscription_id | UUID (FK) | No | -- | References Subscription.id |
| invoice_id | UUID (FK) | No | -- | References Invoice.id (the failed invoice) |
| amount | Integer | No | -- | Failed charge amount in cents |
| escalation_stage | String (20) | No | "grace" | "grace", "retry_1", "retry_2", "restricted", "suspended", "cancelled" |
| recovery_status | String (20) | No | "in_recovery" | "in_recovery", "recovered", "abandoned" |
| first_failure_at | Timestamp | No | -- | Timestamp of initial payment failure |
| last_retry_at | Timestamp | Yes | null | Timestamp of most recent retry attempt |
| next_retry_at | Timestamp | Yes | null | Scheduled next retry timestamp |
| retry_count | Integer | No | 0 | Number of retry attempts |
| last_error_code | String (50) | Yes | null | Error code from payment provider |
| last_error_message | String (500) | Yes | null | Error message from payment provider |
| recovered_at | Timestamp | Yes | null | When payment was successfully recovered |
| payment_method_updated | Boolean | No | false | Whether the user updated their payment method during the failure period |
| admin_notes | Text | Yes | null | JSON array of admin notes |
| created_at | Timestamp | No | Now | Record creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** account_id, escalation_stage, recovery_status, next_retry_at, first_failure_at

**Behavioral Notes:**
- Only one active (in_recovery) Payment Failure record per account at a time
- Escalation stages advance automatically based on the timeline defined in 09-BILLING-AND-CREDITS.md
- When `recovery_status` changes to "recovered", the associated Subscription and Account statuses are restored to active
- `payment_method_updated` is set to true when the user adds or updates their payment method during the failure period, which may trigger an immediate retry

---

## 20. Refund

Tracks refund requests and their processing.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| invoice_id | UUID (FK) | No | -- | References Invoice.id (the invoice being refunded) |
| ticket_id | UUID (FK) | Yes | null | References Support Ticket.id if the refund came from a ticket |
| amount | Integer | No | -- | Refund amount in cents |
| type | String (10) | No | -- | "full" or "partial" |
| status | String (20) | No | "pending_review" | "pending_review", "approved", "denied", "processing", "processed", "failed" |
| reason | String (500) | No | -- | User-provided reason for the refund |
| denial_reason | String (50) | Yes | null | If denied: "outside_policy", "non_refundable", "policy_violation", "insufficient_justification", "other" |
| denial_note | String (500) | Yes | null | Admin note explaining the denial |
| provider_refund_id | String (255) | Yes | null | Refund transaction ID at the payment provider |
| processed_by | UUID (FK) | Yes | null | References User.id (admin who processed the refund) |
| processed_at | Timestamp | Yes | null | When the refund was processed |
| credits_deducted | Integer | No | 0 | Credits removed from the user's balance as a result of the refund (for credit pack refunds) |
| created_at | Timestamp | No | Now | Refund request time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** account_id, invoice_id, status, created_at, processed_by

**Behavioral Notes:**
- A single invoice can have multiple partial refunds, but the total refunded amount cannot exceed the invoice amount
- When a refund is processed, the Invoice.refunded_amount is updated and Invoice.status changes to "refunded" or "partially_refunded"
- `credits_deducted` only applies to credit pack refunds. For subscription refunds, no credits are clawed back from the current cycle

---

## 21. Support Ticket

Represents a user support request.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| user_id | UUID (FK) | No | -- | References User.id (the user who created the ticket) |
| ticket_number | String (12) | No | -- | Human-readable ticket number: TKT-XXXXXXXX |
| subject | String (200) | No | -- | Ticket subject line |
| category | String (30) | No | -- | "billing", "technical", "account", "feature_request", "bug_report", "other" |
| priority | String (10) | No | "normal" | "low", "normal", "high" |
| status | String (20) | No | "open" | "open", "in_progress", "waiting_on_user", "waiting_on_response", "resolved", "closed" |
| assigned_to | UUID (FK) | Yes | null | References User.id (admin assigned to this ticket) |
| related_job_id | UUID (FK) | Yes | null | References Job.id if the ticket is about a specific job |
| has_unread_admin | Boolean | No | false | Whether there are unread messages from the admin perspective |
| has_unread_user | Boolean | No | false | Whether there are unread messages from the user perspective |
| resolved_at | Timestamp | Yes | null | When the ticket was marked as resolved |
| closed_at | Timestamp | Yes | null | When the ticket was closed |
| merged_into_id | UUID (FK) | Yes | null | References Support Ticket.id if this ticket was merged into another |
| auto_close_at | Timestamp | Yes | null | Scheduled auto-close date (set when ticket enters resolved or waiting_on_user status) |
| created_at | Timestamp | No | Now | Ticket creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** account_id, user_id, ticket_number (unique), status, priority, assigned_to, category, created_at

**Behavioral Notes:**
- `ticket_number` uses 8 random alphanumeric characters for uniqueness without predictability
- `has_unread_admin` and `has_unread_user` are denormalized flags for efficient badge rendering without querying messages
- Auto-close rules: `auto_close_at` is set to 7 days after resolved, or 14 days after entering waiting_on_user. A scheduled job closes tickets past their `auto_close_at` date
- When a ticket is merged, all messages are logically associated with the target ticket, and the source ticket is closed with `merged_into_id` pointing to the target

---

## 22. Ticket Message

Individual messages within a support ticket conversation.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| ticket_id | UUID (FK) | No | -- | References Support Ticket.id |
| author_id | UUID (FK) | No | -- | References User.id (user or admin who wrote the message) |
| content | Text | No | -- | Message content (Markdown supported, max 10,000 characters) |
| is_internal | Boolean | No | false | If true, this is an internal admin note not visible to the user |
| attachments | Text | Yes | null | JSON array of attachment objects: {filename, url, size_bytes, content_type} |
| created_at | Timestamp | No | Now | Message timestamp |

**Indexes:** ticket_id, author_id, created_at

**Behavioral Notes:**
- Messages are append-only. They cannot be edited or deleted
- `is_internal` messages are only visible to admins. They are styled differently in the admin ticket view (yellow background)
- Attachments are stored in object storage. The `attachments` field contains metadata only
- Max 5 attachments per message, max 10MB per attachment, allowed types: images (jpg, png, gif), PDF, plain text

---

## 23. Notification

In-app notifications delivered to users and admins.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| user_id | UUID (FK) | No | -- | References User.id (recipient) |
| type | String (30) | No | -- | Notification type (see table below) |
| title | String (200) | No | -- | Notification title |
| body | String (500) | No | -- | Notification body text |
| link | String (500) | Yes | null | URL to navigate to when the notification is clicked |
| read | Boolean | No | false | Whether the notification has been read |
| read_at | Timestamp | Yes | null | When the notification was read |
| metadata | Text | Yes | null | JSON object with type-specific data |
| created_at | Timestamp | No | Now | Notification creation time |

**Indexes:** user_id, read, created_at, type

### Notification Types

| Type | Recipient | Description |
|------|-----------|-------------|
| credit_alert_50 | User | Credit balance at 50% |
| credit_alert_75 | User | Credit balance at 75% |
| credit_alert_90 | User | Credit balance at 90% |
| credit_alert_100 | User | Credits exhausted |
| payment_failed | User | Payment attempt failed |
| payment_recovered | User | Payment successfully retried |
| subscription_renewed | User | Subscription cycle renewed |
| subscription_cancelled | User | Subscription cancelled |
| plan_changed | User | Plan upgraded or downgraded |
| ticket_reply | User | Admin replied to support ticket |
| ticket_resolved | User | Support ticket marked as resolved |
| account_suspended | User | Account has been suspended |
| account_unsuspended | User | Account has been restored |
| security_login | User | New login from unrecognized device/location |
| mfa_disabled | User | MFA was disabled on the account |
| admin_new_ticket | Admin | New support ticket submitted |
| admin_urgent_ticket | Admin | High-priority ticket submitted |
| admin_system_alert | Admin | System health/operational alert |
| admin_abuse_flag | Admin | New abuse flag detected |
| admin_payment_failure_spike | Admin | Unusual number of payment failures |

**Behavioral Notes:**
- Notifications are retained for 90 days, then cleaned up
- Unread notification count is displayed as a badge on the bell icon in the top bar
- "Mark all as read" clears the unread count and sets `read = true` for all unread notifications
- Notifications are created by the server when the triggering event occurs. They are not sent via WebSocket in MVP -- the client polls for unread count every 60 seconds

---

## 24. Audit Log

Immutable record of significant actions performed by users and admins.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| actor_id | UUID (FK) | No | -- | References User.id (who performed the action) |
| actor_role | String (20) | No | -- | Role at the time of action: "user", "admin" |
| action | String (50) | No | -- | Action identifier (see table below) |
| category | String (20) | No | -- | Action category: "auth", "account", "billing", "admin", "support", "config" |
| target_type | String (30) | Yes | null | Type of entity affected: "user", "account", "api_key", "subscription", "ticket", "config", etc. |
| target_id | UUID | Yes | null | ID of the affected entity |
| details | Text | Yes | null | JSON object with action-specific details (before/after values, reason, etc.) |
| ip_address | String (45) | No | -- | IP address of the actor |
| user_agent | String (500) | Yes | null | Browser user agent string |
| created_at | Timestamp | No | Now | Action timestamp |

**Indexes:** actor_id, action, category, target_type + target_id, created_at, ip_address

### Audited Actions

| Category | Action | Description |
|----------|--------|-------------|
| auth | user.login | User logged in |
| auth | user.logout | User logged out |
| auth | user.login_failed | Failed login attempt |
| auth | user.password_changed | Password changed |
| auth | user.password_reset | Password reset via email link |
| auth | user.mfa_enabled | MFA enabled |
| auth | user.mfa_disabled | MFA disabled |
| auth | user.email_verified | Email verified |
| auth | user.email_changed | Email address changed |
| account | profile.updated | Profile information updated |
| account | api_key.created | API key created |
| account | api_key.updated | API key settings updated |
| account | api_key.revoked | API key revoked |
| account | account.deleted | Account soft deleted |
| billing | subscription.created | Subscription started |
| billing | subscription.upgraded | Plan upgraded |
| billing | subscription.downgraded | Plan downgraded |
| billing | subscription.cancelled | Subscription cancelled |
| billing | subscription.reactivated | Subscription reactivated |
| billing | payment.succeeded | Payment collected successfully |
| billing | payment.failed | Payment attempt failed |
| billing | credit_pack.purchased | Credit pack purchased |
| billing | refund.requested | Refund requested |
| billing | refund.processed | Refund processed |
| billing | payment_method.added | Payment method added |
| billing | payment_method.updated | Payment method updated |
| billing | payment_method.removed | Payment method removed |
| admin | admin.user_suspended | Admin suspended a user |
| admin | admin.user_unsuspended | Admin unsuspended a user |
| admin | admin.user_restricted | Admin restricted a user |
| admin | admin.credit_adjusted | Admin adjusted user credits |
| admin | admin.plan_changed | Admin changed user plan |
| admin | admin.force_logout | Admin force-logged out a user |
| admin | admin.mfa_disabled | Admin disabled user MFA |
| admin | admin.password_reset | Admin reset user password |
| admin | admin.user_promoted | Admin promoted user to admin |
| admin | admin.user_demoted | Admin demoted admin to user |
| admin | admin.user_deleted | Admin deleted a user account |
| admin | admin.subscription_overridden | Admin overrode subscription status |
| admin | admin.payment_waived | Admin waived a payment |
| admin | admin.refund_approved | Admin approved a refund |
| admin | admin.refund_denied | Admin denied a refund |
| support | ticket.created | Support ticket created |
| support | ticket.replied | Reply added to ticket |
| support | ticket.resolved | Ticket marked as resolved |
| support | ticket.closed | Ticket closed |
| support | ticket.assigned | Ticket assigned to admin |
| support | ticket.merged | Ticket merged into another |
| config | config.updated | Platform configuration changed |
| config | rate_limit.override_created | Rate limit override created |
| config | rate_limit.override_removed | Rate limit override removed |
| config | maintenance.scheduled | Maintenance window scheduled |
| config | maintenance.started | Maintenance started |
| config | maintenance.completed | Maintenance completed |

**Behavioral Notes:**
- Audit log is append-only and immutable. Rows are NEVER updated or deleted
- Retention: 2 years minimum
- The `details` JSON object stores before/after values for update actions (e.g., old plan and new plan for a plan change)
- Audit logs are accessible to admins via the admin dashboard (12-ADMIN-DASHBOARD.md) with filtering and CSV export

---

## 25. Abuse Flag

Tracks accounts flagged for potential abuse.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| flag_type | String (30) | No | -- | "automated" or "manual" |
| reason | String (30) | No | -- | "high_error_rate", "excessive_volume", "blocked_target", "suspicious_urls", "credit_anomaly", "manual_review" |
| severity | String (10) | No | "medium" | "low", "medium", "high" |
| status | String (20) | No | "flagged" | "flagged", "under_investigation", "cleared", "action_taken" |
| details | Text | No | -- | JSON object with detection details (thresholds, values, affected jobs, etc.) |
| flagged_by | UUID (FK) | Yes | null | References User.id (admin) if manual. Null if automated |
| assigned_to | UUID (FK) | Yes | null | References User.id (admin assigned to investigate) |
| investigation_notes | Text | Yes | null | JSON array of timestamped notes from investigating admin |
| resolution | String (500) | Yes | null | Resolution summary |
| resolved_by | UUID (FK) | Yes | null | References User.id (admin who resolved) |
| resolved_at | Timestamp | Yes | null | Resolution timestamp |
| enforcement_action | String (30) | Yes | null | "warning", "rate_limit", "temp_suspend", "permanent_suspend", "none" |
| created_at | Timestamp | No | Now | Flag creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** account_id, status, reason, severity, created_at, assigned_to

**Behavioral Notes:**
- An account can have multiple abuse flags (e.g., flagged for high error rate and suspicious URLs simultaneously)
- Automated flags are created by background monitoring jobs based on thresholds defined in 14-ADMIN-MODERATION.md
- When a flag is resolved with `enforcement_action`, the corresponding action is applied to the account and recorded in the audit log
- Cleared flags are retained for historical reference

---

## 26. Blog Post

Content entity for the blog section of the public website.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| slug | String (200) | No | -- | URL-friendly slug, unique |
| title | String (200) | No | -- | Post title |
| excerpt | String (500) | Yes | null | Short summary for listing pages and SEO |
| content | Text | No | -- | Post content in Markdown |
| cover_image_url | String (500) | Yes | null | URL to cover image in object storage |
| author_id | UUID (FK) | No | -- | References User.id (admin who wrote the post) |
| status | String (20) | No | "draft" | "draft", "published", "archived" |
| published_at | Timestamp | Yes | null | Publication timestamp (null for drafts) |
| tags | Text | Yes | null | JSON array of tag strings |
| meta_title | String (70) | Yes | null | Custom SEO title (falls back to title) |
| meta_description | String (160) | Yes | null | Custom SEO description (falls back to excerpt) |
| word_count | Integer | No | 0 | Computed word count of content |
| view_count | Integer | No | 0 | Page view counter |
| created_at | Timestamp | No | Now | Draft creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** slug (unique), status, published_at, author_id, tags (GIN index on the JSON array for tag filtering)

**Behavioral Notes:**
- Slugs are generated from the title but can be customized. They must be URL-safe (lowercase, hyphens, alphanumeric only)
- Published posts are publicly visible at /blog/[slug]
- `view_count` is incremented on each page view, debounced to prevent inflation from rapid refreshes (one count per IP per 5-minute window)
- The blog editor has auto-save functionality that saves to the `content` field as a draft every 30 seconds while editing

---

## 27. Status Incident

Represents an incident on the public status page.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| title | String (200) | No | -- | Incident title |
| status | String (20) | No | "investigating" | "investigating", "identified", "monitoring", "resolved" |
| severity | String (10) | No | -- | "minor", "major", "critical" |
| services_affected | Text | No | -- | JSON array of affected service names |
| updates | Text | No | -- | JSON array of update objects: {status, message, timestamp, author_id} |
| resolved_at | Timestamp | Yes | null | When the incident was resolved |
| created_by | UUID (FK) | No | -- | References User.id (admin) |
| created_at | Timestamp | No | Now | Incident start time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** status, severity, created_at

**Behavioral Notes:**
- Updates are appended to the `updates` JSON array. Each update records the status transition and a message
- When status changes to "resolved", `resolved_at` is set
- Incidents are displayed on the public status page (01-PUBLIC-WEBSITE.md) in reverse chronological order
- Historical incidents remain visible for 90 days on the status page

---

## 28. Maintenance Window

Represents a scheduled maintenance period.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| title | String (200) | No | -- | Maintenance title |
| description | Text | No | -- | Detailed description (Markdown) |
| status | String (20) | No | "scheduled" | "scheduled", "in_progress", "completed", "cancelled" |
| impact | String (30) | No | -- | "full_outage", "partial_degradation", "no_user_impact" |
| services_affected | Text | No | -- | JSON array of affected service names |
| scheduled_start | Timestamp | No | -- | Planned start time (UTC) |
| scheduled_end | Timestamp | No | -- | Planned end time (UTC) |
| actual_start | Timestamp | Yes | null | Actual start time |
| actual_end | Timestamp | Yes | null | Actual end time |
| notify_users | Boolean | No | true | Whether users were/will be notified |
| notification_sent_at | Timestamp | Yes | null | When the advance notification was sent |
| updates | Text | Yes | null | JSON array of live update objects during maintenance |
| created_by | UUID (FK) | No | -- | References User.id (admin) |
| created_at | Timestamp | No | Now | Record creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** status, scheduled_start, impact

**Behavioral Notes:**
- Upcoming and in-progress maintenance windows are displayed on the public status page and as a banner in the user dashboard
- When a maintenance window starts, the API may return 503 responses depending on the impact level
- Historical maintenance records are retained indefinitely for operational reference

---

## 29. Platform Configuration

Runtime-configurable platform settings stored in the database (as opposed to environment variables which require deployment).

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| key | String (100) | No | -- | Configuration key (unique), using dot notation: "jobs.timeout.http", "auth.session.idle_timeout" |
| value | String (500) | No | -- | Configuration value (stored as string, parsed by application based on expected type) |
| value_type | String (20) | No | -- | Expected type: "integer", "boolean", "string", "float" |
| default_value | String (500) | No | -- | The system default for this setting |
| description | String (500) | No | -- | Human-readable description of the setting |
| category | String (30) | No | -- | Setting category: "jobs", "credits", "auth", "support", "cleanup" |
| min_value | String (50) | Yes | null | Minimum allowed value (for numeric types) |
| max_value | String (50) | Yes | null | Maximum allowed value (for numeric types) |
| last_modified_by | UUID (FK) | Yes | null | References User.id (admin who last changed this) |
| created_at | Timestamp | No | Now | Record creation time |
| updated_at | Timestamp | No | Now | Last modification time |

**Indexes:** key (unique), category

**Behavioral Notes:**
- Configuration values are cached in memory on each server instance and refreshed via Redis pub/sub when changes occur
- The full list of configurable settings is defined in 16-ADMIN-OPERATIONS.md, Section 7
- Value validation (min/max bounds, type checking) is enforced at the application level before saving
- A separate configuration_history table (or audit log entries) tracks all changes for rollback capability

---

## 30. Rate Limit Override

Custom per-user rate limit overrides set by admins.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| account_id | UUID (FK) | No | -- | References Account.id |
| limit_type | String (30) | No | -- | "requests_per_minute", "requests_per_hour", "concurrent_jobs" |
| value | Integer | No | -- | The overridden limit value |
| reason | String (500) | No | -- | Admin-provided reason for the override |
| expires_at | Timestamp | Yes | null | When the override expires (null = permanent) |
| created_by | UUID (FK) | No | -- | References User.id (admin) |
| created_at | Timestamp | No | Now | Override creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Indexes:** account_id, limit_type, expires_at

**Behavioral Notes:**
- Multiple overrides can exist for the same account (one per limit_type)
- A unique constraint on (account_id, limit_type) prevents duplicate overrides for the same limit type
- Expired overrides are cleaned up by a scheduled job but remain queryable for audit purposes until cleanup
- The rate limiter checks for overrides on each request by account_id and limit_type

---

## 31. Future: Organization

This entity is defined for the future Teams phase described in 10-TEAM-MANAGEMENT.md. It is NOT implemented in MVP but is documented here to ensure the data model is forward-compatible.

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key (becomes the Account.id for the org) |
| name | String (100) | No | -- | Organization display name |
| slug | String (50) | No | -- | URL-friendly unique slug |
| owner_id | UUID (FK) | No | -- | References User.id (organization owner) |
| plan | String (20) | No | "free" | Organization plan |
| credit_balance | Integer | No | 0 | Organization credit balance |
| member_limit | Integer | No | 5 | Maximum members based on plan |
| settings | Text | Yes | null | JSON object of org-level settings (timezone, notifications) |
| created_at | Timestamp | No | Now | Creation time |
| updated_at | Timestamp | No | Now | Last update time |
| deleted_at | Timestamp | Yes | null | Soft delete timestamp |

---

## 32. Future: Organization Member

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| organization_id | UUID (FK) | No | -- | References Organization.id |
| user_id | UUID (FK) | No | -- | References User.id |
| role | String (20) | No | "member" | "owner", "org_admin", "member", "viewer", "billing" |
| joined_at | Timestamp | No | Now | When the user joined the organization |
| invited_by | UUID (FK) | Yes | null | References User.id (who invited them) |
| created_at | Timestamp | No | Now | Record creation time |
| updated_at | Timestamp | No | Now | Last update time |

**Unique constraint:** (organization_id, user_id)

---

## 33. Future: Organization Invitation

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | UUID | No | Generated | Primary key |
| organization_id | UUID (FK) | No | -- | References Organization.id |
| email | String (255) | No | -- | Invitee email address |
| role | String (20) | No | "member" | Role to assign upon acceptance |
| status | String (20) | No | "pending" | "pending", "accepted", "declined", "expired", "cancelled" |
| token_hash | String (64) | No | -- | SHA-256 hash of the invitation token |
| invited_by | UUID (FK) | No | -- | References User.id |
| expires_at | Timestamp | No | -- | Invitation expiry (7 days after creation) |
| accepted_at | Timestamp | Yes | null | When the invitation was accepted |
| created_at | Timestamp | No | Now | Invitation creation time |

---

## 34. Entity Relationship Summary

### Core Relationships Diagram

```
Account (1) ---- (1) User [MVP]
   |
   |---- (many) API Key
   |       |
   |       |---- (many) Job
   |                |
   |                |---- (many) Job Log
   |                |---- (0..1) Job Result
   |
   |---- (0..1) Subscription
   |---- (many) Invoice
   |---- (many) Credit Ledger
   |---- (many) Credit Pack Purchase
   |---- (0..1) Payment Method
   |---- (many) Payment Failure
   |---- (many) Refund
   |---- (many) Support Ticket
   |       |
   |       |---- (many) Ticket Message
   |
   |---- (many) Notification [via User]
   |---- (many) Abuse Flag
   |---- (many) Rate Limit Override

User (1) ---- (many) Session [Redis]
   |
   |---- (many) OAuth Connection
   |---- (0..1) MFA Configuration
   |---- (many) Audit Log [as actor]
   |---- (many) Blog Post [as author, admin only]
```

### Key Referential Integrity Rules

| Rule | Description |
|------|-------------|
| Account deletion | Soft delete. All child entities are retained but become inaccessible. API keys are revoked. Sessions are invalidated. Subscription is cancelled |
| User deletion | Same as account deletion in MVP (1:1 relationship) |
| API key revocation | Jobs submitted with the key remain. The key can no longer be used for new requests |
| Job deletion | Jobs are never deleted. Results and logs are cleaned up per retention policy, but the job metadata row persists |
| Subscription cancellation | The Subscription row is retained with status "cancelled". Account.plan is set to "free" |

### Index Strategy Summary

| Priority | Index Type | Purpose |
|----------|-----------|---------|
| Critical | Foreign key indexes | All foreign key columns are indexed for join performance |
| Critical | Unique indexes | email, key_hash, invoice_number, ticket_number, slug |
| High | Status/filter indexes | All status and category columns used in WHERE clauses |
| High | Timestamp indexes | created_at on high-volume tables (jobs, audit_log, credit_ledger) for range queries |
| Medium | Composite indexes | (account_id, status, created_at) on Jobs for the common "my recent jobs" query |
| Low | Full-text indexes | Not needed for MVP (search is limited to exact/prefix matching) |

---

## 35. Related Documents

| Document | Relationship |
|----------|-------------|
| 00-PLATFORM-OVERVIEW.md | Platform context, technology stack |
| 03-AUTHENTICATION.md | Session management, MFA, OAuth flows that inform identity data models |
| 04-ROLES-AND-PERMISSIONS.md | Role definitions, permission model |
| 06-API-KEY-MANAGEMENT.md | API key lifecycle, security requirements |
| 07-JOBS-AND-LOGS.md | Job lifecycle, log events, result retention |
| 09-BILLING-AND-CREDITS.md | Subscription lifecycle, credit operations, payment flows, invoicing |
| 10-TEAM-MANAGEMENT.md | Future organization and team data models |
| 11-SETTINGS-AND-SUPPORT.md | Support ticket lifecycle, notification preferences |
| 12-ADMIN-DASHBOARD.md | Audit log access, admin actions |
| 14-ADMIN-MODERATION.md | Abuse flags, blog posts, status incidents |
| 15-ADMIN-FINANCE.md | Invoice management, credit operations, refund processing |
| 16-ADMIN-OPERATIONS.md | Platform configuration, rate limit overrides, maintenance windows |
| 19-SECURITY-FRAMEWORK.md | Encryption at rest, data protection requirements |
| APPENDICES/A-PERMISSION-MATRIX.md | Which roles can access which entities |
