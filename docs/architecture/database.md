# Database Schema

Scrapifie uses PostgreSQL as its primary data store. This document describes the actual tables, their key columns, the relationships between them, and the indexes that support common access patterns. All tables use UUID primary keys and soft deletes (a `deleted_at` timestamp column) unless noted otherwise. A shared trigger function, `update_modified_column()`, keeps `updated_at` current on every update.

The PostgreSQL extensions `uuid-ossp` and `pgcrypto` are enabled. All UUIDs are generated server-side with `gen_random_uuid()`.

---

## Core Entity Model

```
users (one per account at MVP)
  |
  +--- account (billing, plan, credits, status)
  |       |
  |       +--- subscription
  |       +--- invoice -------- invoice_line_item
  |       +--- payment_method
  |       +--- credit_pack_purchase
  |       +--- credit_ledger
  |       +--- abuse_flag
  |
  +--- api_keys (owned by account, used by account)
  |
  +--- scrape_jobs --------- job_results
  |
  +--- user_session
  +--- oauth_connection
  +--- mfa_configuration
  +--- audit_log (admin actions only)
  +--- support_ticket ------ support_ticket_message
```

---

## Tables

### `users`

One record per registered user. At MVP, each user has exactly one account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK → `account` | |
| `email` | VARCHAR(255) | Globally unique (case-insensitive index), excludes soft-deleted rows |
| `email_verified` | BOOLEAN | Set to `true` after email verification token is consumed |
| `password_hash` | VARCHAR(255) | Nullable; absent for pure-OAuth accounts |
| `name` | VARCHAR(100) | Display name |
| `avatar_url` | VARCHAR(500) | |
| `role` | VARCHAR(20) | `user` or `admin` |
| `timezone` | VARCHAR(50) | Default `UTC` |
| `date_format` | VARCHAR(20) | Default `YYYY-MM-DD` |
| `theme` | VARCHAR(10) | `light`, `dark`, or `system` |
| `display_density` | VARCHAR(10) | `comfortable`, `compact`, etc. |
| `login_failed_count` | INTEGER | Incremented on failed login attempts |
| `locked_until` | TIMESTAMPTZ | Account locked after too many failed attempts |
| `terms_accepted_at` | TIMESTAMPTZ | When terms were last accepted |
| `terms_version` | VARCHAR(20) | Which version of the terms was accepted |
| `last_login_at` | TIMESTAMPTZ | |
| `last_login_ip` | INET | |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `account`

Billing and operational container. In MVP, one account maps to one user. Future phases will allow multiple users per account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | VARCHAR(255) | Account/company name |
| `slug` | VARCHAR(100) | Unique URL slug |
| `display_name` | VARCHAR(100) | Shown in the dashboard |
| `billing_email` | VARCHAR(255) | Separate from user email; used for invoices |
| `plan` | VARCHAR(20) | `free`, `pro`, `enterprise` |
| `status` | VARCHAR(20) | `active`, `restricted`, `suspended` |
| `credit_balance` | BIGINT | Current available credits |
| `credit_cycle_usage` | BIGINT | Credits consumed in current billing cycle |
| `paystack_customer_code` | VARCHAR(255) | Paystack customer identifier |
| `paystack_subscription_code` | VARCHAR(255) | Current active Paystack subscription code |
| `billing_cycle_start` | TIMESTAMPTZ | Start of current billing period |
| `billing_cycle_end` | TIMESTAMPTZ | End of current billing period |
| `last_payment_at` | TIMESTAMPTZ | Most recent successful payment |
| `rate_limit_per_second` | INTEGER | Requests allowed per second |
| `max_concurrent_jobs` | INTEGER | Concurrent job ceiling |
| `data_retention_days` | INTEGER | How long job data is retained |
| `features` | JSONB | Feature flag overrides |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `api_keys`

API keys used to authenticate requests to the scraping API.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK → `account` | |
| `created_by_user_id` | UUID FK → `users` | Nullable |
| `key_prefix` | VARCHAR(12) | First 12 characters of the raw key, stored for display |
| `key_hash` | VARCHAR(64) | SHA-256 hash of the full raw key — the only form stored |
| `name` | VARCHAR(100) | Human-readable label |
| `description` | TEXT | |
| `scopes` | JSONB | Array of scope strings |
| `allowed_ips` | INET[] | IP allowlist; empty means unrestricted |
| `allowed_domains` | VARCHAR(255)[] | Domain allowlist |
| `rate_limit_override` | INTEGER | Per-key rate limit override |
| `max_concurrent_override` | INTEGER | Per-key concurrent job override |
| `environment` | VARCHAR(20) | `development`, `staging`, `production` |
| `expires_at` | TIMESTAMPTZ | Optional expiry |
| `last_used_at` | TIMESTAMPTZ | Updated asynchronously on each use |
| `last_used_ip` | INET | |
| `usage_count` | BIGINT | Lifetime request count |
| `is_active` | BOOLEAN | Can be toggled without revoking |
| `revoked_at` | TIMESTAMPTZ | Permanent revocation timestamp |
| `revoked_by_user_id` | UUID FK → `users` | |
| `revoke_reason` | VARCHAR(255) | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

The raw API key is shown exactly once at creation and never stored. Lookups are performed by hashing the presented key and querying on `key_hash`.

### `scrape_jobs`

One record per scrape request, from submission through completion.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK → `account` | |
| `api_key_id` | UUID FK → `api_keys` | Nullable; set when submitted via API key |
| `batch_id` | UUID | Groups jobs from a batch submission |
| `url` | TEXT | Target URL |
| `url_hash` | VARCHAR(64) | SHA-256 of URL for deduplication queries |
| `method` | VARCHAR(10) | HTTP method (`GET`, `POST`, etc.) |
| `headers` | JSONB | Request headers |
| `engine` | VARCHAR(20) | `auto`, `http`, `browser`, `stealth` |
| `options` | JSONB | Render JS, screenshot, PDF, timeout, extract selectors, etc. |
| `proxy_tier` | VARCHAR(20) | `datacenter`, `residential`, `mobile`, `isp` |
| `proxy_country` | VARCHAR(2) | ISO country code for proxy geotargeting |
| `status` | VARCHAR(20) | `pending`, `queued`, `running`, `completed`, `failed`, `canceled`, `timeout` |
| `priority` | INTEGER | 1–10, higher is processed first |
| `attempts` | INTEGER | Completed retry attempts |
| `max_attempts` | INTEGER | Retry ceiling |
| `queued_at` / `started_at` / `completed_at` | TIMESTAMPTZ | Lifecycle timestamps |
| `worker_id` | VARCHAR(100) | Worker that processed the job |
| `credits_estimated` | BIGINT | Reserved before processing |
| `credits_charged` | BIGINT | Actual deduction after completion |
| `credit_breakdown` | JSONB | Itemised breakdown: engine, proxy, features |
| `webhook_url` | TEXT | Callback URL on completion |
| `webhook_secret` | VARCHAR(255) | HMAC signing secret for webhook delivery |
| `error_code` / `error_message` | VARCHAR / TEXT | Set on failure |
| `idempotency_key` | VARCHAR(255) | Client-supplied deduplication key |
| `created_at` | TIMESTAMPTZ | |

### `job_results`

One record per completed job. Linked 1:1 to `scrape_jobs`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `job_id` | UUID FK → `scrape_jobs` (unique) | |
| `status_code` | INTEGER | HTTP response status |
| `content_storage_type` | VARCHAR(20) | `inline` (stored in column), `minio` (external), `none` |
| `content_inline` | TEXT | HTML content for small responses |
| `content_minio_key` | VARCHAR(500) | MinIO object key for large responses |
| `extracted_title` / `extracted_text` | TEXT | Auto-extracted page content |
| `extracted_links` / `extracted_images` | JSONB | Link and image arrays |
| `extracted_data` | JSONB | Custom extraction results |
| `screenshot_minio_key` | VARCHAR(500) | MinIO path of screenshot PNG |
| `pdf_minio_key` | VARCHAR(500) | MinIO path of PDF |
| `dns_time_ms` / `connect_time_ms` / `ttfb_ms` / `total_time_ms` | INTEGER | Performance metrics |
| `detection_score` | DECIMAL(5,4) | Anti-bot detection confidence |
| `captcha_encountered` / `captcha_solved` | BOOLEAN | CAPTCHA tracking |
| `proxy_ip` | INET | Actual outbound IP used |
| `expires_at` | TIMESTAMPTZ | Data retention expiry |
| `created_at` | TIMESTAMPTZ | |

### `user_session`

Session metadata for the "Active Sessions" view in security settings. The session token itself lives in Redis; this table stores descriptive metadata for display.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users` | |
| `session_token_hash` | VARCHAR(64) | SHA-256 of the Redis session token |
| `device_type` | VARCHAR(20) | `desktop`, `mobile`, `tablet` |
| `browser` / `os` | VARCHAR(50) | Parsed from User-Agent |
| `ip_address` | INET | |
| `location_country` / `location_city` | VARCHAR | Geolocation |
| `is_current` | BOOLEAN | True for the session making the current request |
| `last_activity_at` | TIMESTAMPTZ | Updated on every authenticated request |
| `expires_at` | TIMESTAMPTZ | |
| `revoked_at` | TIMESTAMPTZ | Set when the user manually revokes the session |
| `created_at` | TIMESTAMPTZ | |

A database function `revoke_user_sessions(user_id, except_session_id)` revokes all sessions for a user in a single statement, used on password change.

### `oauth_connection`

Links a user to an OAuth provider identity.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users` | |
| `provider` | VARCHAR(20) | `google` or `github` |
| `provider_user_id` | VARCHAR(255) | Unique ID assigned by the OAuth provider |
| `provider_email` | VARCHAR(255) | Email returned by the provider |
| `access_token` / `refresh_token` | VARCHAR(500) | Nullable |
| `token_expires_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `mfa_configuration`

One record per user who has enrolled in TOTP-based multi-factor authentication.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users` (unique) | |
| `secret` | VARCHAR(255) | TOTP shared secret |
| `enabled` | BOOLEAN | False during setup, true after first successful verification |
| `verified_at` | TIMESTAMPTZ | When MFA was first successfully used |
| `backup_codes` | TEXT | Hashed backup codes |
| `backup_codes_remaining` | INTEGER | Count of unused backup codes |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `subscription`

One record per paid subscription associated with an account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK → `account` | |
| `paystack_subscription_code` | VARCHAR(255) | Unique |
| `plan` | VARCHAR(20) | `free`, `pro`, `enterprise` |
| `status` | VARCHAR(20) | `active`, `past_due`, `canceled`, `trialing`, `unpaid`, etc. |
| `current_period_start` / `current_period_end` | TIMESTAMPTZ | Current billing window |
| `cancel_at_period_end` | BOOLEAN | Scheduled cancellation at period end |
| `canceled_at` / `ended_at` | TIMESTAMPTZ | Actual cancellation timestamps |
| `scheduled_plan` / `scheduled_change_date` | VARCHAR / TIMESTAMPTZ | Pending downgrade |
| `metadata` | JSONB | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `invoice`

Financial record for a subscription charge or credit pack purchase.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK → `account` | |
| `subscription_id` | UUID FK → `subscription` | Nullable |
| `invoice_number` | VARCHAR(50) | Human-readable (e.g. `INV-202602-00001`), unique |
| `status` | VARCHAR(20) | `draft`, `open`, `paid`, `void`, `uncollectible` |
| `subtotal` / `tax` / `total` | BIGINT | Amounts in smallest currency unit (cents) |
| `amount_paid` / `amount_due` | BIGINT | |
| `currency` | VARCHAR(3) | Default `USD` |
| `invoice_date` / `due_date` / `paid_at` | TIMESTAMPTZ | |
| `payment_method_id` | UUID FK → `payment_method` | Nullable |
| `billing_name` / `billing_email` | VARCHAR / VARCHAR | Snapshot of billing contact at invoice time |
| `pdf_url` | TEXT | Path to generated PDF |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `invoice_line_item`

One or more line items per invoice. Cannot be added to a finalised invoice.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `invoice_id` | UUID FK → `invoice` | |
| `type` | VARCHAR | `subscription`, `credit_pack`, `proration` |
| `description` | TEXT | Human-readable item label |
| `quantity` | INTEGER | |
| `unit_amount` / `amount` | BIGINT | In cents |
| `period_start` / `period_end` | TIMESTAMPTZ | Billing period covered |
| `created_at` | TIMESTAMPTZ | |

### `payment_method`

Saved payment methods linked to an account.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK → `account` | |
| `paystack_payment_method_id` | VARCHAR(255) | Unique |
| `type` | VARCHAR(20) | `card`, `bank_account`, etc. |
| `is_default` | BOOLEAN | Unique partial index enforces at most one default per account |
| `card_brand` / `card_last4` | VARCHAR | Display fields for cards |
| `card_exp_month` / `card_exp_year` | INTEGER | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `credit_pack_purchase`

One-time credit top-up purchases.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK → `account` | |
| `invoice_id` | UUID FK → `invoice` | Nullable |
| `paystack_payment_reference` | VARCHAR(255) | Unique |
| `pack_size` | BIGINT | Number of credits purchased |
| `amount_paid` | BIGINT | In cents |
| `status` | VARCHAR(20) | `pending`, `processing`, `completed`, `failed`, `refunded` |
| `purchased_at` / `completed_at` / `refunded_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `credit_ledger`

Immutable append-only log of all credit transactions. Every change to an account's credit balance must be recorded here. The constraint `balance_after = balance_before + amount` is enforced at the database level.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `account_id` | UUID FK → `account` | |
| `type` | VARCHAR(30) | `allocation`, `purchase`, `deduction`, `deduction_failure`, `reservation`, `release`, `adjustment`, `refund`, `reset`, `bonus` |
| `amount` | BIGINT | Positive for additions, negative for deductions |
| `balance_before` / `balance_after` | BIGINT | Snapshot of account balance before and after |
| `scrape_job_id` | UUID | Nullable; set for `deduction` entries |
| `credit_pack_purchase_id` | UUID | Nullable; set for `purchase` entries |
| `invoice_id` | UUID FK → `invoice` | Nullable |
| `description` | TEXT | Human-readable explanation |
| `metadata` | JSONB | |
| `created_at` | TIMESTAMPTZ | No `updated_at`; this table is append-only |

### `audit_log`

Immutable log of all admin actions. Database triggers prevent any UPDATE or DELETE on this table.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL PK | Sequential for ordering |
| `admin_id` | UUID FK → `users` | Must reference an admin user |
| `admin_email` | VARCHAR(255) | Snapshot of email at action time |
| `action` | VARCHAR(100) | Dotted action string (e.g. `user.suspend`, `ticket.reply`) |
| `category` | VARCHAR(50) | `user_management`, `support`, `financial`, `operations`, `content` |
| `resource_type` | VARCHAR(50) | Type of entity affected (e.g. `user`, `invoice`) |
| `resource_id` | VARCHAR(255) | ID of the affected entity |
| `details` | JSONB | Action-specific metadata (before/after values, reason) |
| `ip_address` | INET | Admin's IP |
| `user_agent` | TEXT | Admin's browser |
| `created_at` | TIMESTAMPTZ | |

### `abuse_flag`

Automated abuse detection signals queued for admin review.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` / `account_id` | UUID FK | Either or both may be set |
| `signal_type` | ENUM | `high_credit_consumption`, `rapid_api_key_creation`, `failed_request_pattern`, `unusual_traffic_pattern`, `multiple_account_creation` |
| `severity` | ENUM | `low`, `medium`, `high`, `critical` |
| `status` | ENUM | `active`, `investigating`, `resolved`, `false_positive` |
| `threshold_value` / `actual_value` | NUMERIC | What triggered the flag |
| `evidence` | JSONB | Signal-specific supporting data |
| `investigated_by` / `investigated_at` | UUID / TIMESTAMPTZ | Admin who reviewed |
| `action_taken` | VARCHAR(50) | `none`, `warning_sent`, `rate_limited`, `suspended`, `banned` |
| `resolved_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `support_ticket`

User-submitted support requests.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `ticket_number` | VARCHAR(20) | Auto-generated in format `TKT-XXXXXX` via a database trigger and sequence |
| `user_id` / `account_id` | UUID FK | Creator |
| `subject` | VARCHAR(255) | |
| `category` | ENUM | `technical`, `billing`, `account`, `feature_request`, `bug_report`, `abuse_report`, `other` |
| `priority` | ENUM | `low`, `normal`, `high`, `urgent` |
| `status` | ENUM | `open`, `in_progress`, `waiting_on_user`, `resolved`, `closed` |
| `assigned_to` | UUID FK → `users` | Admin assignee |
| `first_response_at` | TIMESTAMPTZ | SLA tracking |
| `resolved_at` / `closed_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `notification_preference`

Per-user per-category notification settings. Defaults are inserted automatically on user creation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users` | |
| `category` | VARCHAR(50) | `support`, `billing`, `security`, `system`, `marketing` |
| `email_enabled` | BOOLEAN | |
| `in_app_enabled` | BOOLEAN | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### Additional Tables

| Table | Purpose |
|---|---|
| `usage_records` | Aggregated usage metrics per account per period (daily, weekly, monthly) |
| `blog_post` | Blog articles for the public content site |
| `status_page` | Service status and incident records |
| `system_configuration` | Key-value store for runtime-configurable platform settings |
| `refund_request` | Refund requests submitted by users or initiated by admins |
| `payment_failure` | Tracks recurring payment failure state and retry attempts |
| `webhook_processed_events` | Idempotency table for Paystack webhook event IDs |
| `token` | Short-lived tokens for email verification and password reset |

---

## Migrations

All schema changes are managed through numbered SQL migration files in `src/db/migrations/`. Files are named with a sequential numeric prefix followed by a descriptive name (for example, `008_create_audit_log_table.sql`). Run all pending migrations with:

```bash
npm run migrate
```

---

## Data Retention

Job records and results are retained for a number of days configured per account in `account.data_retention_days`. A cleanup process uses the `expires_at` column on `job_results` to identify records eligible for deletion. The `audit_log` and `credit_ledger` tables are exempt from data retention policies — they are permanent records.

## Soft Deletes

User and account records are never physically deleted. The `deleted_at` timestamp is set instead. All indexes on these tables include a `WHERE deleted_at IS NULL` predicate to exclude soft-deleted rows from standard lookups.
