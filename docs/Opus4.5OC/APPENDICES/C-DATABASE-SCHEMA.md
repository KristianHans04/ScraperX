# Appendix C: Database Schema

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-APP-C |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Engineering Team |
| Status | Draft |
| Classification | Internal |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Configuration](#2-database-configuration)
3. [Core Domain Tables](#3-core-domain-tables)
4. [Operational Tables](#4-operational-tables)
5. [Billing Tables](#5-billing-tables)
6. [System Tables](#6-system-tables)
7. [Functions and Triggers](#7-functions-and-triggers)
8. [Partitioning Strategy](#8-partitioning-strategy)
9. [Migration Scripts](#9-migration-scripts)

---

## 1. Overview

### 1.1 Purpose

This appendix contains the complete PostgreSQL Data Definition Language (DDL) for the Scrapifie database, including all tables, indexes, functions, triggers, and partitioning configuration.

### 1.2 Schema Diagram

```
+------------------------------------------------------------------+
|                         DATABASE SCHEMA                           |
+------------------------------------------------------------------+
|                                                                   |
|  organizations (1) ----< users (N)                                |
|       |                    |                                      |
|       |                    +----< api_keys (N)                    |
|       |                                                           |
|       +----< subscriptions (N)                                    |
|       |         |                                                 |
|       |         +----< usage_records (N)                          |
|       |                                                           |
|       +----< invoices (N)                                         |
|       |                                                           |
|       +----< scrape_jobs (N)                                      |
|       |         |                                                 |
|       |         +----< job_results (1)                            |
|       |         |                                                 |
|       |         +----< job_events (N)                             |
|       |                                                           |
|       +----< webhooks (N)                                         |
|                                                                   |
|  proxy_providers (N) ----< proxy_usage_logs (N)                   |
|                                                                   |
|  fingerprints (N)                                                 |
|                                                                   |
|  domain_intelligence (N)                                          |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 2. Database Configuration

### 2.1 Extensions

```sql
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- GIN index support
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query statistics
```

### 2.2 Custom Types

```sql
-- Subscription status enum
CREATE TYPE subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

-- Job status enum
CREATE TYPE job_status AS ENUM (
    'pending',
    'queued',
    'running',
    'completed',
    'failed',
    'canceled',
    'timeout'
);

-- Scraping engine enum
CREATE TYPE scrape_engine AS ENUM (
    'auto',
    'http',
    'browser',
    'stealth'
);

-- Proxy tier enum
CREATE TYPE proxy_tier AS ENUM (
    'datacenter',
    'residential',
    'mobile',
    'isp'
);

-- User role enum
CREATE TYPE user_role AS ENUM (
    'owner',
    'admin',
    'member',
    'readonly'
);

-- Plan ID enum
CREATE TYPE plan_id AS ENUM (
    'free',
    'starter',
    'growth',
    'business',
    'enterprise'
);
```

### 2.3 Utility Functions

```sql
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate API key prefix
CREATE OR REPLACE FUNCTION generate_api_key_prefix()
RETURNS VARCHAR(12) AS $$
BEGIN
    RETURN 'sk_' || encode(gen_random_bytes(4), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate URL hash
CREATE OR REPLACE FUNCTION calculate_url_hash(url TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(digest(url, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_organization_credits(org_id UUID, required_credits BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance BIGINT;
    plan VARCHAR(50);
BEGIN
    SELECT credits_balance, plan_id INTO current_balance, plan
    FROM organizations
    WHERE id = org_id;
    
    -- Enterprise has unlimited credits
    IF plan = 'enterprise' THEN
        RETURN TRUE;
    END IF;
    
    RETURN current_balance >= required_credits;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct credits atomically
CREATE OR REPLACE FUNCTION deduct_credits(org_id UUID, amount BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE organizations
    SET credits_balance = credits_balance - amount,
        updated_at = NOW()
    WHERE id = org_id
    AND credits_balance >= amount;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    year_month VARCHAR(6);
    sequence_num INTEGER;
BEGIN
    year_month := to_char(NOW(), 'YYYYMM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year_month || '-%';
    
    RETURN 'INV-' || year_month || '-' || LPAD(sequence_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Core Domain Tables

### 3.1 Organizations Table

```sql
CREATE TABLE organizations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- Contact
    billing_email VARCHAR(255) NOT NULL,
    technical_email VARCHAR(255),
    
    -- Subscription
    plan_id VARCHAR(50) NOT NULL DEFAULT 'starter',
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trialing',
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    
    -- Credits
    credits_balance BIGINT NOT NULL DEFAULT 0,
    credits_included_monthly BIGINT NOT NULL DEFAULT 100000,
    credits_overage_rate DECIMAL(10,6) DEFAULT 0.000050,
    
    -- Limits
    rate_limit_per_second INTEGER NOT NULL DEFAULT 10,
    max_concurrent_jobs INTEGER NOT NULL DEFAULT 50,
    max_batch_size INTEGER NOT NULL DEFAULT 1000,
    data_retention_days INTEGER NOT NULL DEFAULT 7,
    
    -- Features
    features JSONB NOT NULL DEFAULT '{
        "js_rendering": true,
        "residential_proxies": false,
        "mobile_proxies": false,
        "captcha_solving": false,
        "webhooks": true,
        "batch_api": true,
        "priority_queue": false,
        "dedicated_support": false
    }',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT organizations_valid_plan CHECK (
        plan_id IN ('free', 'starter', 'growth', 'business', 'enterprise')
    ),
    CONSTRAINT organizations_valid_status CHECK (
        subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')
    ),
    CONSTRAINT organizations_positive_credits CHECK (credits_balance >= 0),
    CONSTRAINT organizations_positive_rate_limit CHECK (rate_limit_per_second > 0),
    CONSTRAINT organizations_positive_concurrent CHECK (max_concurrent_jobs > 0)
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id) 
    WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_organizations_plan ON organizations(plan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_created ON organizations(created_at);
CREATE INDEX idx_organizations_status ON organizations(subscription_status) 
    WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_organizations_timestamp
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE organizations IS 'Customer organizations/tenants';
COMMENT ON COLUMN organizations.slug IS 'URL-safe unique identifier';
COMMENT ON COLUMN organizations.credits_balance IS 'Current credit balance (can go negative with overage)';
COMMENT ON COLUMN organizations.features IS 'Feature flags as JSON object';
```

### 3.2 Users Table

```sql
CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identity
    email VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMPTZ,
    
    -- Authentication
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'email',
    auth_provider_id VARCHAR(255),
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en-US',
    
    -- Role & Permissions
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '[]',
    
    -- Security
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    mfa_backup_codes TEXT[],
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    
    -- Session Management
    session_version INTEGER DEFAULT 1,
    
    -- Preferences
    preferences JSONB DEFAULT '{
        "email_notifications": true,
        "usage_alerts": true,
        "marketing_emails": false
    }',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT users_valid_role CHECK (role IN ('owner', 'admin', 'member', 'readonly')),
    CONSTRAINT users_valid_auth_provider CHECK (
        auth_provider IN ('email', 'google', 'github', 'saml')
    ),
    CONSTRAINT users_unique_email_per_org UNIQUE (organization_id, email)
);

-- Indexes
CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id) 
    WHERE auth_provider_id IS NOT NULL;
CREATE INDEX idx_users_last_login ON users(last_login_at DESC NULLS LAST);

-- Trigger for updated_at
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE users IS 'User accounts within organizations';
COMMENT ON COLUMN users.session_version IS 'Increment to invalidate all sessions';
COMMENT ON COLUMN users.mfa_backup_codes IS 'One-time use backup codes for MFA';
```

### 3.3 API Keys Table

```sql
CREATE TABLE api_keys (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Key Data
    key_prefix VARCHAR(12) NOT NULL DEFAULT generate_api_key_prefix(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    
    -- Identity
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Permissions
    scopes JSONB NOT NULL DEFAULT '["scrape:read", "scrape:write"]',
    allowed_ips INET[],
    allowed_domains VARCHAR(255)[],
    
    -- Limits (override org defaults if set)
    rate_limit_override INTEGER,
    max_concurrent_override INTEGER,
    credits_limit BIGINT,
    
    -- Environment
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    
    -- Lifecycle
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    last_used_user_agent TEXT,
    usage_count BIGINT DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES users(id),
    revoke_reason VARCHAR(255),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT api_keys_valid_environment CHECK (
        environment IN ('development', 'staging', 'production')
    ),
    CONSTRAINT api_keys_valid_scopes CHECK (jsonb_typeof(scopes) = 'array')
);

-- Indexes
CREATE INDEX idx_api_keys_org ON api_keys(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at DESC NULLS LAST);
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) 
    WHERE expires_at IS NOT NULL AND is_active = TRUE;

-- Partial index for quick auth lookups
CREATE INDEX idx_api_keys_auth_lookup ON api_keys(key_hash, organization_id) 
    WHERE is_active = TRUE 
    AND revoked_at IS NULL 
    AND (expires_at IS NULL OR expires_at > NOW());

-- Trigger for updated_at
CREATE TRIGGER update_api_keys_timestamp
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE api_keys IS 'API keys for authentication';
COMMENT ON COLUMN api_keys.key_prefix IS 'Visible prefix for key identification (sk_xxxx)';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the full API key';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permission scopes';
```

---

## 4. Operational Tables

### 4.1 Scrape Jobs Table

```sql
CREATE TABLE scrape_jobs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    
    -- Batch/Chain
    batch_id UUID,
    parent_job_id UUID REFERENCES scrape_jobs(id) ON DELETE SET NULL,
    retry_of_job_id UUID REFERENCES scrape_jobs(id) ON DELETE SET NULL,
    
    -- Request
    url TEXT NOT NULL,
    url_hash VARCHAR(64) NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    headers JSONB DEFAULT '{}',
    body TEXT,
    
    -- Configuration
    engine VARCHAR(20) NOT NULL DEFAULT 'auto',
    options JSONB NOT NULL DEFAULT '{
        "render_js": false,
        "wait_for": null,
        "wait_time": 0,
        "timeout": 30000,
        "screenshot": false,
        "pdf": false,
        "extract": null
    }',
    
    -- Proxy Configuration
    proxy_tier VARCHAR(20) DEFAULT 'datacenter',
    proxy_country VARCHAR(2),
    proxy_city VARCHAR(100),
    proxy_provider VARCHAR(50),
    proxy_session_id VARCHAR(100),
    
    -- Fingerprint
    fingerprint_id UUID,
    user_agent TEXT,
    
    -- Execution State
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 5,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    queued_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    
    -- Worker Info
    worker_id VARCHAR(100),
    worker_region VARCHAR(20),
    queue_name VARCHAR(50),
    
    -- Results Reference
    result_id UUID,
    
    -- Billing
    credits_estimated BIGINT DEFAULT 1,
    credits_charged BIGINT DEFAULT 0,
    credit_breakdown JSONB DEFAULT '{}',
    
    -- Webhook
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    webhook_sent_at TIMESTAMPTZ,
    webhook_attempts INTEGER DEFAULT 0,
    webhook_last_error TEXT,
    
    -- Error Info
    error_code VARCHAR(50),
    error_message TEXT,
    error_details JSONB,
    
    -- Client Reference
    client_reference VARCHAR(255),
    idempotency_key VARCHAR(255),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT scrape_jobs_valid_status CHECK (
        status IN ('pending', 'queued', 'running', 'completed', 'failed', 'canceled', 'timeout')
    ),
    CONSTRAINT scrape_jobs_valid_engine CHECK (
        engine IN ('auto', 'http', 'browser', 'stealth')
    ),
    CONSTRAINT scrape_jobs_valid_proxy_tier CHECK (
        proxy_tier IN ('datacenter', 'residential', 'mobile', 'isp')
    ),
    CONSTRAINT scrape_jobs_valid_method CHECK (
        method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')
    ),
    CONSTRAINT scrape_jobs_valid_priority CHECK (priority BETWEEN 1 AND 10)
);

-- Indexes for common queries
CREATE INDEX idx_jobs_org_status ON scrape_jobs(organization_id, status);
CREATE INDEX idx_jobs_org_created ON scrape_jobs(organization_id, created_at DESC);
CREATE INDEX idx_jobs_batch ON scrape_jobs(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_jobs_url_hash ON scrape_jobs(url_hash, organization_id);
CREATE INDEX idx_jobs_client_ref ON scrape_jobs(organization_id, client_reference)
    WHERE client_reference IS NOT NULL;
CREATE INDEX idx_jobs_idempotency ON scrape_jobs(organization_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Index for queue processing
CREATE INDEX idx_jobs_queue ON scrape_jobs(status, priority DESC, created_at)
    WHERE status IN ('pending', 'queued');

-- Index for webhook delivery
CREATE INDEX idx_jobs_webhook_pending ON scrape_jobs(id) 
    WHERE status = 'completed' 
    AND webhook_url IS NOT NULL 
    AND webhook_sent_at IS NULL;

-- Index for timeout detection
CREATE INDEX idx_jobs_timeout ON scrape_jobs(timeout_at)
    WHERE status = 'running' AND timeout_at IS NOT NULL;

-- GIN index for JSONB options queries
CREATE INDEX idx_jobs_options ON scrape_jobs USING GIN (options jsonb_path_ops);

-- Trigger for url_hash
CREATE OR REPLACE FUNCTION set_url_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.url_hash = calculate_url_hash(NEW.url);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scrape_jobs_set_url_hash
    BEFORE INSERT OR UPDATE OF url ON scrape_jobs
    FOR EACH ROW
    EXECUTE FUNCTION set_url_hash();

-- Comments
COMMENT ON TABLE scrape_jobs IS 'Scraping job requests and their state';
COMMENT ON COLUMN scrape_jobs.url_hash IS 'SHA-256 hash for deduplication';
COMMENT ON COLUMN scrape_jobs.priority IS 'Queue priority 1-10 (10 highest)';
COMMENT ON COLUMN scrape_jobs.credit_breakdown IS 'JSON showing credit calculation';
```

### 4.2 Job Results Table

```sql
CREATE TABLE job_results (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    -- Response Metadata
    status_code INTEGER,
    status_text VARCHAR(100),
    headers JSONB,
    cookies JSONB,
    content_type VARCHAR(255),
    content_length BIGINT,
    content_encoding VARCHAR(50),
    final_url TEXT,
    redirect_count INTEGER DEFAULT 0,
    
    -- Content Storage
    content_storage_type VARCHAR(20) NOT NULL DEFAULT 'inline',
    content_inline TEXT,
    content_minio_bucket VARCHAR(100),
    content_minio_key VARCHAR(500),
    content_hash VARCHAR(64),
    content_compressed BOOLEAN DEFAULT FALSE,
    
    -- Extracted Data
    extracted_title TEXT,
    extracted_text TEXT,
    extracted_links JSONB,
    extracted_images JSONB,
    extracted_data JSONB,
    
    -- Screenshots
    screenshot_minio_bucket VARCHAR(100),
    screenshot_minio_key VARCHAR(500),
    screenshot_thumbnail_key VARCHAR(500),
    screenshot_width INTEGER,
    screenshot_height INTEGER,
    screenshot_format VARCHAR(10) DEFAULT 'png',
    
    -- PDF
    pdf_minio_bucket VARCHAR(100),
    pdf_minio_key VARCHAR(500),
    pdf_page_count INTEGER,
    
    -- Performance Metrics
    dns_time_ms INTEGER,
    connect_time_ms INTEGER,
    tls_time_ms INTEGER,
    ttfb_ms INTEGER,
    download_time_ms INTEGER,
    render_time_ms INTEGER,
    total_time_ms INTEGER,
    
    -- Anti-Detection Results
    detection_score DECIMAL(5,4),
    protection_detected VARCHAR(50),
    captcha_encountered BOOLEAN DEFAULT FALSE,
    captcha_type VARCHAR(50),
    captcha_solved BOOLEAN DEFAULT FALSE,
    captcha_solve_time_ms INTEGER,
    
    -- Proxy Used
    proxy_ip INET,
    proxy_country VARCHAR(2),
    proxy_provider VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT job_results_valid_storage CHECK (
        content_storage_type IN ('inline', 'minio', 'none')
    )
);

-- Indexes
CREATE UNIQUE INDEX idx_results_job ON job_results(job_id);
CREATE INDEX idx_results_org_created ON job_results(organization_id, created_at DESC);
CREATE INDEX idx_results_content_hash ON job_results(content_hash) 
    WHERE content_hash IS NOT NULL;
CREATE INDEX idx_results_expires ON job_results(expires_at) 
    WHERE expires_at IS NOT NULL;

-- Trigger to set expires_at based on org retention
CREATE OR REPLACE FUNCTION set_result_expiry()
RETURNS TRIGGER AS $$
DECLARE
    retention_days INTEGER;
BEGIN
    SELECT data_retention_days INTO retention_days
    FROM organizations
    WHERE id = NEW.organization_id;
    
    NEW.expires_at = NOW() + (COALESCE(retention_days, 7) || ' days')::INTERVAL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_results_set_expiry
    BEFORE INSERT ON job_results
    FOR EACH ROW
    EXECUTE FUNCTION set_result_expiry();

-- Comments
COMMENT ON TABLE job_results IS 'Scraping job results and captured content';
COMMENT ON COLUMN job_results.content_storage_type IS 'Where content is stored: inline (<1MB) or minio';
COMMENT ON COLUMN job_results.detection_score IS 'Bot detection score 0-1 (lower is better)';
```

### 4.3 Job Events Table

```sql
CREATE TABLE job_events (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    -- Event Info
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    
    -- Context
    worker_id VARCHAR(100),
    worker_region VARCHAR(20),
    
    -- Constraints
    CONSTRAINT job_events_valid_type CHECK (
        event_type IN (
            'job.created', 'job.queued', 'job.started', 'job.engine_selected',
            'job.proxy_assigned', 'job.fingerprint_applied', 'job.request_sent',
            'job.response_received', 'job.content_extracted', 'job.screenshot_taken',
            'job.captcha_detected', 'job.captcha_solving', 'job.captcha_solved',
            'job.captcha_failed', 'job.retry_scheduled', 'job.escalated',
            'job.completed', 'job.failed', 'job.timeout', 'job.canceled',
            'webhook.queued', 'webhook.sent', 'webhook.failed'
        )
    )
) PARTITION BY RANGE (created_at);

-- Create partitions for each month
CREATE TABLE job_events_2025_01 PARTITION OF job_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE job_events_2025_02 PARTITION OF job_events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE job_events_2025_03 PARTITION OF job_events
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
-- Continue for future months...

-- Default partition for future data
CREATE TABLE job_events_default PARTITION OF job_events DEFAULT;

-- Indexes (created on partitioned table, applied to all partitions)
CREATE INDEX idx_job_events_job_time ON job_events(job_id, created_at);
CREATE INDEX idx_job_events_type ON job_events(event_type, created_at DESC);

-- Use BRIN index for time-series data
CREATE INDEX idx_job_events_created_brin ON job_events USING BRIN (created_at);

-- Comments
COMMENT ON TABLE job_events IS 'Audit log of job lifecycle events';
```

### 4.4 Webhooks Configuration Table

```sql
CREATE TABLE webhooks (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Configuration
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL,
    
    -- Events
    events JSONB NOT NULL DEFAULT '["job.completed", "job.failed"]',
    
    -- Filters
    api_key_ids UUID[],
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    timeout_ms INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 3,
    
    -- Status
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT webhooks_valid_timeout CHECK (timeout_ms BETWEEN 1000 AND 120000),
    CONSTRAINT webhooks_valid_retry CHECK (retry_count BETWEEN 0 AND 10)
);

-- Indexes
CREATE INDEX idx_webhooks_org ON webhooks(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_webhooks_failures ON webhooks(consecutive_failures DESC)
    WHERE is_active = TRUE AND consecutive_failures > 0;

-- Trigger for updated_at
CREATE TRIGGER update_webhooks_timestamp
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE webhooks IS 'Webhook endpoint configurations';
```

---

## 5. Billing Tables

### 5.1 Subscriptions Table

```sql
CREATE TABLE subscriptions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Plan Details
    plan_id VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    
    -- Stripe References
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    stripe_product_id VARCHAR(255),
    
    -- Billing Cycle
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    billing_anchor_day INTEGER,
    
    -- Amounts
    base_price_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Credits
    credits_included BIGINT NOT NULL,
    credits_overage_rate DECIMAL(10,6),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Dates
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    ended_at TIMESTAMPTZ,
    
    -- Payment Method
    default_payment_method_id VARCHAR(255),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT subscriptions_valid_cycle CHECK (billing_cycle IN ('monthly', 'yearly')),
    CONSTRAINT subscriptions_valid_status CHECK (
        status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')
    ),
    CONSTRAINT subscriptions_valid_anchor CHECK (billing_anchor_day BETWEEN 1 AND 28)
);

-- Indexes
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE UNIQUE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_timestamp
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE subscriptions IS 'Customer subscription records';
```

### 5.2 Usage Records Table

```sql
CREATE TABLE usage_records (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    granularity VARCHAR(20) NOT NULL DEFAULT 'daily',
    
    -- Request Counts
    total_requests BIGINT NOT NULL DEFAULT 0,
    successful_requests BIGINT NOT NULL DEFAULT 0,
    failed_requests BIGINT NOT NULL DEFAULT 0,
    
    -- Credits
    credits_used BIGINT NOT NULL DEFAULT 0,
    credits_included_used BIGINT NOT NULL DEFAULT 0,
    credits_overage_used BIGINT NOT NULL DEFAULT 0,
    
    -- Breakdown by Engine
    http_requests BIGINT DEFAULT 0,
    browser_requests BIGINT DEFAULT 0,
    stealth_requests BIGINT DEFAULT 0,
    
    -- Breakdown by Proxy Type
    datacenter_requests BIGINT DEFAULT 0,
    residential_requests BIGINT DEFAULT 0,
    mobile_requests BIGINT DEFAULT 0,
    
    -- Features Used
    captcha_solves BIGINT DEFAULT 0,
    screenshots_taken BIGINT DEFAULT 0,
    pdfs_generated BIGINT DEFAULT 0,
    
    -- Bandwidth
    bandwidth_in_bytes BIGINT DEFAULT 0,
    bandwidth_out_bytes BIGINT DEFAULT 0,
    
    -- Cost Tracking
    proxy_cost_cents INTEGER DEFAULT 0,
    captcha_cost_cents INTEGER DEFAULT 0,
    overage_amount_cents INTEGER DEFAULT 0,
    
    -- Stripe Reporting
    stripe_usage_record_id VARCHAR(255),
    reported_to_stripe_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique records per org per period
    CONSTRAINT usage_records_unique_org_period UNIQUE (organization_id, period_start, granularity)
);

-- Indexes
CREATE INDEX idx_usage_org_period ON usage_records(organization_id, period_start DESC);
CREATE INDEX idx_usage_subscription ON usage_records(subscription_id, period_start DESC);
CREATE INDEX idx_usage_unreported ON usage_records(organization_id) 
    WHERE reported_to_stripe_at IS NULL AND credits_overage_used > 0;

-- BRIN index for time-series queries
CREATE INDEX idx_usage_period_brin ON usage_records USING BRIN (period_start);

-- Trigger for updated_at
CREATE TRIGGER update_usage_records_timestamp
    BEFORE UPDATE ON usage_records
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE usage_records IS 'Aggregated usage metrics by time period';
COMMENT ON COLUMN usage_records.granularity IS 'Time granularity: hourly, daily, monthly';
```

### 5.3 Invoices Table

```sql
CREATE TABLE invoices (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Stripe Reference
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    -- Invoice Details
    invoice_number VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_invoice_number(),
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    -- Amounts
    subtotal_cents INTEGER NOT NULL,
    tax_cents INTEGER DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    discount_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL,
    amount_paid_cents INTEGER DEFAULT 0,
    amount_due_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Line Items
    line_items JSONB NOT NULL DEFAULT '[]',
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Dates
    issued_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    
    -- Billing Details
    billing_name VARCHAR(255),
    billing_email VARCHAR(255),
    billing_address JSONB,
    tax_id VARCHAR(100),
    
    -- PDF
    pdf_minio_bucket VARCHAR(100),
    pdf_minio_key VARCHAR(500),
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT invoices_valid_status CHECK (
        status IN ('draft', 'open', 'paid', 'void', 'uncollectible')
    )
);

-- Indexes
CREATE INDEX idx_invoices_org ON invoices(organization_id, created_at DESC);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id) 
    WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX idx_invoices_status ON invoices(status, due_at)
    WHERE status IN ('open', 'draft');
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Trigger for updated_at
CREATE TRIGGER update_invoices_timestamp
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE invoices IS 'Customer invoices and billing records';
```

---

## 6. System Tables

### 6.1 Proxy Providers Table

```sql
CREATE TABLE proxy_providers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    
    -- Configuration
    api_base_url TEXT,
    auth_type VARCHAR(50) DEFAULT 'basic',
    credentials JSONB NOT NULL,  -- Encrypted at rest
    
    -- Endpoints
    datacenter_endpoint TEXT,
    residential_endpoint TEXT,
    mobile_endpoint TEXT,
    
    -- Pricing (per GB in cents)
    datacenter_price_cents INTEGER,
    residential_price_cents INTEGER,
    mobile_price_cents INTEGER,
    
    -- Capabilities
    countries JSONB DEFAULT '[]',
    supports_sessions BOOLEAN DEFAULT TRUE,
    supports_city_targeting BOOLEAN DEFAULT FALSE,
    supports_asn_targeting BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_healthy BOOLEAN DEFAULT TRUE,
    last_health_check_at TIMESTAMPTZ,
    health_check_error TEXT,
    
    -- Usage Limits
    daily_bandwidth_limit_gb DECIMAL(10,2),
    monthly_bandwidth_limit_gb DECIMAL(10,2),
    concurrent_connection_limit INTEGER,
    
    -- Current Usage
    bandwidth_used_today_gb DECIMAL(10,4) DEFAULT 0,
    bandwidth_used_month_gb DECIMAL(10,4) DEFAULT 0,
    
    -- Priority
    priority INTEGER DEFAULT 5,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_proxy_providers_active ON proxy_providers(is_active, is_healthy, priority DESC);

-- Trigger for updated_at
CREATE TRIGGER update_proxy_providers_timestamp
    BEFORE UPDATE ON proxy_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE proxy_providers IS 'Proxy provider configurations';
COMMENT ON COLUMN proxy_providers.credentials IS 'Encrypted API credentials';
```

### 6.2 Fingerprints Table

```sql
CREATE TABLE fingerprints (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Fingerprint Data
    fingerprint_hash VARCHAR(64) NOT NULL UNIQUE,
    fingerprint_data JSONB NOT NULL,
    
    -- Browser Info
    browser_type VARCHAR(50) NOT NULL,
    browser_version VARCHAR(20),
    os_type VARCHAR(50) NOT NULL,
    os_version VARCHAR(20),
    device_type VARCHAR(20) DEFAULT 'desktop',
    
    -- Screen
    screen_width INTEGER,
    screen_height INTEGER,
    device_pixel_ratio DECIMAL(3,2),
    
    -- Locale
    locale VARCHAR(10),
    timezone VARCHAR(50),
    
    -- Headers
    user_agent TEXT NOT NULL,
    accept_language TEXT,
    
    -- Validation
    is_valid BOOLEAN DEFAULT TRUE,
    validation_errors JSONB,
    
    -- Usage Tracking
    usage_count BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    success_rate DECIMAL(5,4),
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'generated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_fingerprints_browser ON fingerprints(browser_type, os_type)
    WHERE is_valid = TRUE;
CREATE INDEX idx_fingerprints_locale ON fingerprints(locale)
    WHERE is_valid = TRUE;
CREATE INDEX idx_fingerprints_usage ON fingerprints(usage_count, success_rate DESC)
    WHERE is_valid = TRUE;

-- Comments
COMMENT ON TABLE fingerprints IS 'Browser fingerprint configurations for anti-detection';
```

### 6.3 Domain Intelligence Table

```sql
CREATE TABLE domain_intelligence (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Domain
    domain VARCHAR(255) NOT NULL UNIQUE,
    
    -- Protection Detection
    protection_type VARCHAR(50),
    protection_level VARCHAR(20) DEFAULT 'unknown',
    cloudflare_detected BOOLEAN DEFAULT FALSE,
    akamai_detected BOOLEAN DEFAULT FALSE,
    datadome_detected BOOLEAN DEFAULT FALSE,
    perimeterx_detected BOOLEAN DEFAULT FALSE,
    
    -- Recommended Settings
    recommended_engine VARCHAR(20) DEFAULT 'auto',
    recommended_proxy_tier VARCHAR(20) DEFAULT 'datacenter',
    requires_js_rendering BOOLEAN DEFAULT FALSE,
    requires_captcha_solving BOOLEAN DEFAULT FALSE,
    
    -- Performance Metrics
    avg_response_time_ms INTEGER,
    success_rate DECIMAL(5,4),
    total_requests BIGINT DEFAULT 0,
    successful_requests BIGINT DEFAULT 0,
    
    -- Rate Limiting
    detected_rate_limit INTEGER,
    recommended_delay_ms INTEGER DEFAULT 1000,
    
    -- Robots.txt
    robots_txt_crawl_delay INTEGER,
    robots_txt_cached_at TIMESTAMPTZ,
    
    -- Metadata
    last_analyzed_at TIMESTAMPTZ,
    analysis_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_domain_intel_protection ON domain_intelligence(protection_type);
CREATE INDEX idx_domain_intel_updated ON domain_intelligence(last_analyzed_at);

-- Trigger for updated_at
CREATE TRIGGER update_domain_intelligence_timestamp
    BEFORE UPDATE ON domain_intelligence
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE domain_intelligence IS 'Cached intelligence about target domains';
COMMENT ON COLUMN domain_intelligence.protection_level IS 'none, basic, medium, high, extreme';
```

---

## 7. Functions and Triggers

### 7.1 Credit Management Functions

```sql
-- Function to calculate credits for a job
CREATE OR REPLACE FUNCTION calculate_job_credits(job scrape_jobs)
RETURNS BIGINT AS $$
DECLARE
    credits BIGINT := 1;
    options JSONB;
BEGIN
    options := job.options;
    
    -- Base credits by engine
    CASE job.engine
        WHEN 'http' THEN credits := 1;
        WHEN 'browser' THEN credits := 5;
        WHEN 'stealth' THEN credits := 10;
        WHEN 'auto' THEN credits := 1;  -- Will be adjusted
        ELSE credits := 1;
    END CASE;
    
    -- Proxy tier multiplier
    CASE job.proxy_tier
        WHEN 'datacenter' THEN NULL;  -- No additional cost
        WHEN 'residential' THEN credits := credits + 3;
        WHEN 'mobile' THEN credits := credits + 10;
        WHEN 'isp' THEN credits := credits + 5;
        ELSE NULL;
    END CASE;
    
    -- Feature credits
    IF (options->>'screenshot')::BOOLEAN = TRUE THEN
        credits := credits + 2;
    END IF;
    
    IF (options->>'pdf')::BOOLEAN = TRUE THEN
        credits := credits + 3;
    END IF;
    
    RETURN credits;
END;
$$ LANGUAGE plpgsql;

-- Function to add credits atomically
CREATE OR REPLACE FUNCTION add_credits(org_id UUID, amount BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE organizations
    SET credits_balance = credits_balance + amount,
        updated_at = NOW()
    WHERE id = org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS VOID AS $$
BEGIN
    UPDATE organizations o
    SET credits_balance = s.credits_included,
        updated_at = NOW()
    FROM subscriptions s
    WHERE o.id = s.organization_id
    AND s.status = 'active'
    AND s.current_period_start <= NOW()
    AND s.current_period_end > NOW();
END;
$$ LANGUAGE plpgsql;
```

### 7.2 Statistics Functions

```sql
-- Function to get organization usage summary
CREATE OR REPLACE FUNCTION get_usage_summary(
    org_id UUID,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    credits_used BIGINT,
    avg_response_time_ms NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_requests,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_requests,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_requests,
        COALESCE(SUM(credits_charged), 0)::BIGINT as credits_used,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::NUMERIC as avg_response_time_ms,
        (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
         NULLIF(COUNT(*)::NUMERIC, 0) * 100)::NUMERIC as success_rate
    FROM scrape_jobs
    WHERE organization_id = org_id
    AND created_at >= start_date
    AND created_at < end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get job queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS TABLE (
    queue_name TEXT,
    pending_count BIGINT,
    running_count BIGINT,
    avg_wait_time_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(sj.queue_name, 'default') as queue_name,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE status = 'running')::BIGINT as running_count,
        AVG(
            CASE WHEN status = 'running' AND queued_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (started_at - queued_at)) * 1000
            END
        )::NUMERIC as avg_wait_time_ms
    FROM scrape_jobs sj
    WHERE status IN ('pending', 'queued', 'running')
    GROUP BY COALESCE(sj.queue_name, 'default');
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Cleanup Functions

```sql
-- Function to cleanup expired job results
CREATE OR REPLACE FUNCTION cleanup_expired_results()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired results
    DELETE FROM job_results
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup
    INSERT INTO job_events (job_id, organization_id, event_type, event_data, created_at)
    SELECT 
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000'::UUID,
        'system.cleanup',
        jsonb_build_object('deleted_results', deleted_count),
        NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM scrape_jobs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND status IN ('completed', 'failed', 'canceled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. Partitioning Strategy

### 8.1 Jobs Table Partitioning

```sql
-- Create partitioned scrape_jobs table for high-volume scenarios
-- Note: This is an alternative to the non-partitioned version

CREATE TABLE scrape_jobs_partitioned (
    -- Same structure as scrape_jobs
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- ... other columns ...
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE scrape_jobs_2025_01 PARTITION OF scrape_jobs_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE scrape_jobs_2025_02 PARTITION OF scrape_jobs_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for future months...

-- Function to automatically create new partitions
CREATE OR REPLACE FUNCTION create_jobs_partition()
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := date_trunc('month', NOW() + INTERVAL '1 month');
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'scrape_jobs_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF scrape_jobs_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;
```

### 8.2 Usage Records Partitioning

```sql
-- Partition usage_records by month for efficient querying and retention
ALTER TABLE usage_records 
    DROP CONSTRAINT usage_records_unique_org_period;

CREATE TABLE usage_records_partitioned (
    LIKE usage_records INCLUDING ALL
) PARTITION BY RANGE (period_start);

-- Create partitions for each month
CREATE TABLE usage_records_2025_01 PARTITION OF usage_records_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- Continue for future months...
```

---

## 9. Migration Scripts

### 9.1 Initial Schema Migration

```sql
-- Migration: 001_initial_schema
-- Description: Create initial database schema
-- Created: 2025-01-31

BEGIN;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create all tables in order (respecting foreign keys)
-- Execute all CREATE TABLE statements from sections above

-- Create all indexes
-- Execute all CREATE INDEX statements

-- Create all functions and triggers
-- Execute all function/trigger definitions

-- Record migration
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');

COMMIT;
```

### 9.2 Sample Data Migration

```sql
-- Migration: 002_seed_initial_data
-- Description: Seed initial required data

BEGIN;

-- Insert default proxy providers
INSERT INTO proxy_providers (name, display_name, credentials, is_active) VALUES
('brightdata', 'Bright Data', '{}', TRUE),
('oxylabs', 'Oxylabs', '{}', TRUE),
('smartproxy', 'Smartproxy', '{}', TRUE);

-- Insert sample fingerprints
INSERT INTO fingerprints (
    fingerprint_hash,
    fingerprint_data,
    browser_type,
    browser_version,
    os_type,
    user_agent,
    locale
) VALUES (
    encode(digest('chrome-120-windows', 'sha256'), 'hex'),
    '{"browser": "chrome", "version": 120}',
    'chrome',
    '120',
    'windows',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'en-US'
);

INSERT INTO schema_migrations (version) VALUES ('002_seed_initial_data');

COMMIT;
```

---

## Document Control

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-31 | Engineering Team | Initial document |

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Database Lead | | | |
| Engineering Lead | | | |

### Distribution

| Role | Access Level |
|------|--------------|
| Engineering Team | Full |
| Operations Team | Full |
| Security Team | Full |
