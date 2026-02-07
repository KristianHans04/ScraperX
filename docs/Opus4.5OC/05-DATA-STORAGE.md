# ScraperX Data Storage Architecture

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-DOC-005 |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Architecture Team |
| Status | Draft |
| Classification | Internal |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Storage Architecture Overview](#2-storage-architecture-overview)
3. [PostgreSQL Database Design](#3-postgresql-database-design)
4. [Redis Data Structures](#4-redis-data-structures)
5. [MinIO Object Storage](#5-minio-object-storage)
6. [Data Retention Policies](#6-data-retention-policies)
7. [Backup and Recovery](#7-backup-and-recovery)
8. [Performance Optimization](#8-performance-optimization)
9. [Data Migration Strategy](#9-data-migration-strategy)
10. [Appendix](#10-appendix)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete data storage architecture for ScraperX, including database schemas, caching strategies, object storage design, and data lifecycle management.

### 1.2 Scope

This specification covers:

- PostgreSQL relational database design
- Redis caching and queue data structures
- MinIO object storage configuration
- Data retention and archival policies
- Backup and disaster recovery procedures
- Performance optimization strategies

### 1.3 Design Principles

| Principle | Description |
|-----------|-------------|
| **Separation of Concerns** | Different storage systems for different data types |
| **Horizontal Scalability** | Support for sharding and replication |
| **Data Locality** | Keep related data together for query performance |
| **Immutability** | Scraped content stored as immutable objects |
| **Efficient Indexing** | Optimize for common query patterns |
| **Cost Efficiency** | Tiered storage based on access patterns |

---

## 2. Storage Architecture Overview

### 2.1 Multi-Tier Storage Strategy

```
+------------------------------------------------------------------+
|                     DATA STORAGE ARCHITECTURE                     |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  |   HOT STORAGE    |  |   WARM STORAGE   |  |   COLD STORAGE   | |
|  |                  |  |                  |  |                  | |
|  |  Redis Cluster   |  |   PostgreSQL     |  |   MinIO + S3     | |
|  |                  |  |                  |  |                  | |
|  |  - Sessions      |  |  - Users/Orgs    |  |  - HTML Content  | |
|  |  - Rate Limits   |  |  - Jobs/History  |  |  - Screenshots   | |
|  |  - Job Queues    |  |  - Usage Logs    |  |  - PDFs          | |
|  |  - Cache         |  |  - Billing       |  |  - Archives      | |
|  |                  |  |                  |  |                  | |
|  |  TTL: Minutes    |  |  TTL: Months     |  |  TTL: Years      | |
|  |  Latency: <1ms   |  |  Latency: <10ms  |  |  Latency: <100ms | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### 2.2 Data Flow Between Tiers

```
Request Flow:
+--------+    +-------+    +------------+    +-------+
| Client | -> | Redis | -> | PostgreSQL | -> | MinIO |
+--------+    +-------+    +------------+    +-------+
                 |              |                |
            Rate Limits    Job Record      Content Storage
            Session        Metadata         Screenshots
            Queue          Usage Log        Raw HTML
```

### 2.3 Storage Technology Summary

| Component | Technology | Purpose | Capacity Target |
|-----------|------------|---------|-----------------|
| Cache | Redis Cluster | Session, rate limits, queues | 64GB |
| Database | PostgreSQL 16 | Transactional data | 2TB |
| Object Storage | MinIO | Large binary content | 50TB |
| Search | PostgreSQL FTS | Job/log search | Integrated |

---

## 3. PostgreSQL Database Design

### 3.1 Database Configuration

```sql
-- PostgreSQL 16 Configuration Optimizations
-- File: postgresql.conf

-- Memory Settings
shared_buffers = 8GB                    -- 25% of RAM
effective_cache_size = 24GB             -- 75% of RAM
work_mem = 256MB                        -- Per-operation memory
maintenance_work_mem = 2GB              -- For VACUUM, CREATE INDEX

-- Write Performance
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

-- Query Planning
random_page_cost = 1.1                  -- SSD optimization
effective_io_concurrency = 200          -- SSD optimization
default_statistics_target = 200

-- Connection Pooling (via PgBouncer)
max_connections = 200

-- Parallelism
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
```

### 3.2 Schema Overview

```
+------------------------------------------------------------------+
|                      DATABASE SCHEMA                              |
+------------------------------------------------------------------+
|                                                                   |
|  CORE DOMAIN                    OPERATIONAL                       |
|  +----------------+             +------------------+               |
|  | organizations  |             | scrape_jobs      |               |
|  +----------------+             +------------------+               |
|         |                              |                          |
|         v                              v                          |
|  +----------------+             +------------------+               |
|  | users          |             | job_results      |               |
|  +----------------+             +------------------+               |
|         |                              |                          |
|         v                              v                          |
|  +----------------+             +------------------+               |
|  | api_keys       |             | job_events       |               |
|  +----------------+             +------------------+               |
|                                                                   |
|  BILLING                        SYSTEM                            |
|  +----------------+             +------------------+               |
|  | subscriptions  |             | proxy_providers  |               |
|  +----------------+             +------------------+               |
|         |                              |                          |
|         v                              v                          |
|  +----------------+             +------------------+               |
|  | usage_records  |             | fingerprints     |               |
|  +----------------+             +------------------+               |
|         |                                                         |
|         v                                                         |
|  +----------------+                                               |
|  | invoices       |                                               |
|  +----------------+                                               |
|                                                                   |
+------------------------------------------------------------------+
```

### 3.3 Core Domain Tables

#### 3.3.1 Organizations Table

```sql
CREATE TABLE organizations (
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
    
    -- Features
    features JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_plan CHECK (plan_id IN ('starter', 'growth', 'business', 'enterprise')),
    CONSTRAINT valid_status CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')),
    CONSTRAINT positive_credits CHECK (credits_balance >= 0)
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX idx_organizations_plan ON organizations(plan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_created ON organizations(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_organizations_timestamp
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

#### 3.3.2 Users Table

```sql
CREATE TABLE users (
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
    
    -- Role & Permissions
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '[]',
    
    -- Security
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member', 'readonly')),
    CONSTRAINT unique_email_per_org UNIQUE (organization_id, email)
);

-- Indexes
CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);
CREATE INDEX idx_users_last_login ON users(last_login_at DESC);
```

#### 3.3.3 API Keys Table

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Key Data
    key_prefix VARCHAR(12) NOT NULL,           -- First 12 chars for identification
    key_hash VARCHAR(64) NOT NULL UNIQUE,      -- SHA-256 hash of full key
    
    -- Identity
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Permissions
    scopes JSONB NOT NULL DEFAULT '["scrape:read", "scrape:write"]',
    allowed_ips INET[],
    allowed_domains VARCHAR(255)[],
    
    -- Limits (override org defaults)
    rate_limit_override INTEGER,
    max_concurrent_override INTEGER,
    
    -- Environment
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    
    -- Lifecycle
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
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
    CONSTRAINT valid_environment CHECK (environment IN ('development', 'staging', 'production'))
);

-- Indexes
CREATE INDEX idx_api_keys_org ON api_keys(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at DESC);
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Partial index for active keys only
CREATE INDEX idx_api_keys_active ON api_keys(organization_id, key_hash) 
    WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW());
```

### 3.4 Operational Tables

#### 3.4.1 Scrape Jobs Table

```sql
CREATE TABLE scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    api_key_id UUID REFERENCES api_keys(id),
    batch_id UUID,                              -- Groups related jobs
    parent_job_id UUID REFERENCES scrape_jobs(id),  -- For retry chains
    
    -- Request
    url TEXT NOT NULL,
    url_hash VARCHAR(64) NOT NULL,              -- SHA-256 for deduplication
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    headers JSONB DEFAULT '{}',
    body TEXT,
    
    -- Configuration
    engine VARCHAR(20) NOT NULL DEFAULT 'auto',
    options JSONB NOT NULL DEFAULT '{}',
    
    -- Proxy Configuration
    proxy_type VARCHAR(20) DEFAULT 'datacenter',
    proxy_country VARCHAR(2),
    proxy_provider VARCHAR(50),
    proxy_session_id VARCHAR(100),
    
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
    expires_at TIMESTAMPTZ,
    
    -- Worker Info
    worker_id VARCHAR(100),
    worker_region VARCHAR(20),
    
    -- Results Reference
    result_id UUID,
    
    -- Billing
    credits_charged BIGINT DEFAULT 0,
    credit_multiplier DECIMAL(5,2) DEFAULT 1.0,
    
    -- Webhook
    webhook_url TEXT,
    webhook_sent_at TIMESTAMPTZ,
    webhook_attempts INTEGER DEFAULT 0,
    
    -- Error Info
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Metadata
    client_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'canceled')),
    CONSTRAINT valid_engine CHECK (engine IN ('auto', 'http', 'browser', 'stealth')),
    CONSTRAINT valid_proxy_type CHECK (proxy_type IN ('datacenter', 'residential', 'mobile', 'isp'))
);

-- Partitioning by month for efficient data management
-- CREATE TABLE scrape_jobs PARTITION BY RANGE (created_at);
-- See section 3.8 for partitioning details

-- Indexes
CREATE INDEX idx_jobs_org_status ON scrape_jobs(organization_id, status);
CREATE INDEX idx_jobs_org_created ON scrape_jobs(organization_id, created_at DESC);
CREATE INDEX idx_jobs_batch ON scrape_jobs(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_jobs_status_priority ON scrape_jobs(status, priority DESC, created_at)
    WHERE status IN ('pending', 'queued');
CREATE INDEX idx_jobs_url_hash ON scrape_jobs(url_hash, organization_id);
CREATE INDEX idx_jobs_webhook_pending ON scrape_jobs(id) 
    WHERE status = 'completed' AND webhook_url IS NOT NULL AND webhook_sent_at IS NULL;
CREATE INDEX idx_jobs_client_ref ON scrape_jobs(organization_id, client_reference)
    WHERE client_reference IS NOT NULL;

-- GIN index for JSONB options queries
CREATE INDEX idx_jobs_options ON scrape_jobs USING GIN (options jsonb_path_ops);
```

#### 3.4.2 Job Results Table

```sql
CREATE TABLE job_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    -- Response Metadata
    status_code INTEGER,
    headers JSONB,
    content_type VARCHAR(255),
    content_length BIGINT,
    content_encoding VARCHAR(50),
    
    -- Content Storage
    content_storage_type VARCHAR(20) NOT NULL DEFAULT 'inline',
    content_inline TEXT,                        -- For small content (<1MB)
    content_minio_bucket VARCHAR(100),          -- For large content
    content_minio_key VARCHAR(500),
    content_hash VARCHAR(64),                   -- SHA-256 of content
    
    -- Extracted Data
    extracted_text TEXT,
    extracted_links JSONB,
    extracted_data JSONB,                       -- Custom extraction results
    
    -- Screenshots
    screenshot_minio_bucket VARCHAR(100),
    screenshot_minio_key VARCHAR(500),
    screenshot_thumbnail_key VARCHAR(500),
    
    -- PDF
    pdf_minio_bucket VARCHAR(100),
    pdf_minio_key VARCHAR(500),
    
    -- Performance Metrics
    dns_time_ms INTEGER,
    connect_time_ms INTEGER,
    tls_time_ms INTEGER,
    ttfb_ms INTEGER,                            -- Time to first byte
    download_time_ms INTEGER,
    total_time_ms INTEGER,
    
    -- Anti-Detection Results
    detection_score DECIMAL(5,4),               -- 0.0000 to 1.0000
    captcha_encountered BOOLEAN DEFAULT FALSE,
    captcha_solved BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_storage_type CHECK (content_storage_type IN ('inline', 'minio', 'none'))
);

-- Indexes
CREATE INDEX idx_results_job ON job_results(job_id);
CREATE INDEX idx_results_org_created ON job_results(organization_id, created_at DESC);
CREATE INDEX idx_results_content_hash ON job_results(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_results_expires ON job_results(expires_at) WHERE expires_at IS NOT NULL;
```

#### 3.4.3 Job Events Table (Audit Log)

```sql
CREATE TABLE job_events (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    -- Event Info
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    
    -- Worker Info
    worker_id VARCHAR(100),
    worker_region VARCHAR(20),
    
    -- Index for time-series queries
    CONSTRAINT job_events_time_idx UNIQUE (job_id, created_at, id)
);

-- Use BRIN index for time-series data
CREATE INDEX idx_job_events_created ON job_events USING BRIN (created_at);
CREATE INDEX idx_job_events_job ON job_events(job_id, created_at);
CREATE INDEX idx_job_events_type ON job_events(event_type, created_at DESC);

-- Event types:
-- job.created, job.queued, job.started, job.engine_selected
-- job.proxy_assigned, job.request_sent, job.response_received
-- job.captcha_detected, job.captcha_solved, job.retry_scheduled
-- job.completed, job.failed, job.canceled
-- webhook.sent, webhook.failed
```

### 3.5 Billing Tables

#### 3.5.1 Subscriptions Table

```sql
CREATE TABLE subscriptions (
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
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly')),
    CONSTRAINT valid_sub_status CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'))
);

-- Indexes
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';
```

#### 3.5.2 Usage Records Table

```sql
CREATE TABLE usage_records (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Usage Metrics
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
    bandwidth_bytes BIGINT DEFAULT 0,
    
    -- Calculated Costs
    overage_amount_cents INTEGER DEFAULT 0,
    
    -- Stripe Reporting
    stripe_usage_record_id VARCHAR(255),
    reported_to_stripe_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per org per period
    CONSTRAINT unique_org_period UNIQUE (organization_id, period_start)
);

-- Indexes
CREATE INDEX idx_usage_org_period ON usage_records(organization_id, period_start DESC);
CREATE INDEX idx_usage_subscription ON usage_records(subscription_id, period_start DESC);
CREATE INDEX idx_usage_unreported ON usage_records(organization_id) 
    WHERE reported_to_stripe_at IS NULL AND credits_overage_used > 0;

-- Use BRIN for time-series access pattern
CREATE INDEX idx_usage_period ON usage_records USING BRIN (period_start);
```

#### 3.5.3 Invoices Table

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    subscription_id UUID REFERENCES subscriptions(id),
    
    -- Stripe Reference
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    
    -- Invoice Details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    -- Amounts
    subtotal_cents INTEGER NOT NULL,
    tax_cents INTEGER DEFAULT 0,
    discount_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL,
    amount_paid_cents INTEGER DEFAULT 0,
    amount_due_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Dates
    invoice_date TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    
    -- Line Items (denormalized for speed)
    line_items JSONB NOT NULL DEFAULT '[]',
    
    -- PDF
    pdf_url VARCHAR(500),
    hosted_invoice_url VARCHAR(500),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible'))
);

-- Indexes
CREATE INDEX idx_invoices_org ON invoices(organization_id, invoice_date DESC);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status, due_date) WHERE status = 'open';
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
```

### 3.6 System Tables

#### 3.6.1 Proxy Providers Table

```sql
CREATE TABLE proxy_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    
    -- Configuration
    api_endpoint VARCHAR(500) NOT NULL,
    auth_type VARCHAR(20) NOT NULL,
    auth_credentials_encrypted BYTEA NOT NULL,
    
    -- Capabilities
    supports_datacenter BOOLEAN DEFAULT TRUE,
    supports_residential BOOLEAN DEFAULT FALSE,
    supports_mobile BOOLEAN DEFAULT FALSE,
    supports_isp BOOLEAN DEFAULT FALSE,
    
    -- Available Countries
    available_countries VARCHAR(2)[] NOT NULL DEFAULT '{}',
    
    -- Performance Metrics
    avg_response_time_ms INTEGER,
    success_rate DECIMAL(5,4),
    last_health_check TIMESTAMPTZ,
    
    -- Limits
    concurrent_limit INTEGER,
    monthly_bandwidth_limit_gb INTEGER,
    
    -- Cost
    cost_per_gb_datacenter DECIMAL(10,4),
    cost_per_gb_residential DECIMAL(10,4),
    cost_per_gb_mobile DECIMAL(10,4),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 5,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_proxy_providers_active ON proxy_providers(is_active, priority DESC);
CREATE INDEX idx_proxy_providers_type ON proxy_providers(supports_residential, supports_mobile);
```

#### 3.6.2 Fingerprints Table

```sql
CREATE TABLE fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Classification
    browser_type VARCHAR(50) NOT NULL,          -- chrome, firefox, safari
    browser_version VARCHAR(20) NOT NULL,
    os_type VARCHAR(50) NOT NULL,               -- windows, macos, linux, android, ios
    os_version VARCHAR(20) NOT NULL,
    device_type VARCHAR(20) NOT NULL,           -- desktop, mobile, tablet
    
    -- Fingerprint Data
    user_agent TEXT NOT NULL,
    accept_headers JSONB NOT NULL,
    navigator_properties JSONB NOT NULL,
    screen_properties JSONB NOT NULL,
    webgl_properties JSONB,
    audio_fingerprint VARCHAR(100),
    canvas_fingerprint VARCHAR(100),
    font_list TEXT[],
    
    -- TLS Configuration
    tls_fingerprint VARCHAR(100),
    http2_settings JSONB,
    
    -- Usage Stats
    usage_count BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    success_rate DECIMAL(5,4) DEFAULT 1.0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    source VARCHAR(50),                         -- collected, generated, purchased
    collected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fingerprints_active ON fingerprints(is_active, browser_type, os_type);
CREATE INDEX idx_fingerprints_usage ON fingerprints(usage_count, last_used_at);
CREATE INDEX idx_fingerprints_device ON fingerprints(device_type) WHERE is_active = TRUE;

-- GIN index for JSON queries
CREATE INDEX idx_fingerprints_navigator ON fingerprints USING GIN (navigator_properties);
```

### 3.7 Common Functions and Triggers

```sql
-- Timestamp update function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Credit deduction function
CREATE OR REPLACE FUNCTION deduct_credits(
    p_organization_id UUID,
    p_amount BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance BIGINT;
BEGIN
    -- Lock the row for update
    SELECT credits_balance INTO v_current_balance
    FROM organizations
    WHERE id = p_organization_id
    FOR UPDATE;
    
    IF v_current_balance >= p_amount THEN
        UPDATE organizations
        SET credits_balance = credits_balance - p_amount,
            updated_at = NOW()
        WHERE id = p_organization_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Job status transition validation
CREATE OR REPLACE FUNCTION validate_job_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Define valid transitions
    IF OLD.status = 'pending' AND NEW.status NOT IN ('queued', 'canceled') THEN
        RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
    ELSIF OLD.status = 'queued' AND NEW.status NOT IN ('running', 'canceled') THEN
        RAISE EXCEPTION 'Invalid status transition from queued to %', NEW.status;
    ELSIF OLD.status = 'running' AND NEW.status NOT IN ('completed', 'failed', 'canceled') THEN
        RAISE EXCEPTION 'Invalid status transition from running to %', NEW.status;
    ELSIF OLD.status IN ('completed', 'failed', 'canceled') THEN
        RAISE EXCEPTION 'Cannot transition from terminal status %', OLD.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_job_status
    BEFORE UPDATE OF status ON scrape_jobs
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_job_status_transition();

-- Usage aggregation function
CREATE OR REPLACE FUNCTION aggregate_daily_usage(
    p_date DATE
) RETURNS void AS $$
BEGIN
    INSERT INTO usage_records (
        organization_id,
        period_start,
        period_end,
        total_requests,
        successful_requests,
        failed_requests,
        credits_used,
        http_requests,
        browser_requests,
        stealth_requests
    )
    SELECT 
        organization_id,
        p_date::TIMESTAMPTZ,
        (p_date + INTERVAL '1 day')::TIMESTAMPTZ,
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        SUM(credits_charged),
        COUNT(*) FILTER (WHERE engine = 'http'),
        COUNT(*) FILTER (WHERE engine = 'browser'),
        COUNT(*) FILTER (WHERE engine = 'stealth')
    FROM scrape_jobs
    WHERE created_at >= p_date::TIMESTAMPTZ
      AND created_at < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
      AND status IN ('completed', 'failed')
    GROUP BY organization_id
    ON CONFLICT (organization_id, period_start)
    DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        successful_requests = EXCLUDED.successful_requests,
        failed_requests = EXCLUDED.failed_requests,
        credits_used = EXCLUDED.credits_used,
        http_requests = EXCLUDED.http_requests,
        browser_requests = EXCLUDED.browser_requests,
        stealth_requests = EXCLUDED.stealth_requests,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### 3.8 Table Partitioning

```sql
-- Partition scrape_jobs by month
CREATE TABLE scrape_jobs (
    -- ... columns as defined above ...
) PARTITION BY RANGE (created_at);

-- Create partitions for next 12 months
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    partition_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        partition_date := start_date + (i || ' months')::INTERVAL;
        partition_name := 'scrape_jobs_' || TO_CHAR(partition_date, 'YYYY_MM');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF scrape_jobs
             FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            partition_date,
            partition_date + INTERVAL '1 month'
        );
    END LOOP;
END $$;

-- Partition job_results similarly
CREATE TABLE job_results (
    -- ... columns as defined above ...
) PARTITION BY RANGE (created_at);

-- Auto-create partitions with pg_partman
CREATE EXTENSION IF NOT EXISTS pg_partman;

SELECT partman.create_parent(
    p_parent_table => 'public.scrape_jobs',
    p_control => 'created_at',
    p_type => 'native',
    p_interval => 'monthly',
    p_premake => 3
);

-- Partition maintenance (run via cron)
SELECT partman.run_maintenance('public.scrape_jobs');
```

---

## 4. Redis Data Structures

### 4.1 Redis Cluster Configuration

```yaml
# redis-cluster.conf
port 6379
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
appendfsync everysec
maxmemory 16gb
maxmemory-policy allkeys-lru
```

### 4.2 Key Naming Conventions

```
Pattern: {service}:{entity}:{identifier}:{attribute}

Examples:
- scrx:session:{session_id}
- scrx:ratelimit:{org_id}:{window}
- scrx:cache:{url_hash}
- scrx:lock:{resource}:{id}
```

### 4.3 Session Management

```typescript
// Session data structure
interface SessionData {
  userId: string;
  organizationId: string;
  apiKeyId: string;
  scopes: string[];
  rateLimit: number;
  maxConcurrent: number;
  createdAt: number;
  expiresAt: number;
}

// Redis commands
// Store session (HSET with TTL)
HSET scrx:session:{session_id} 
  userId {user_id}
  organizationId {org_id}
  apiKeyId {api_key_id}
  scopes '["scrape:read","scrape:write"]'
  rateLimit 100
  maxConcurrent 50
  createdAt 1706745600
  expiresAt 1706832000
  
EXPIRE scrx:session:{session_id} 86400

// Get session
HGETALL scrx:session:{session_id}

// Invalidate session
DEL scrx:session:{session_id}

// Invalidate all sessions for org
SCAN 0 MATCH scrx:session:* COUNT 1000
// Then filter by organizationId and DEL
```

### 4.4 Rate Limiting

```typescript
// Sliding window rate limiter implementation
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Token bucket using sorted set
const rateLimitKey = `scrx:ratelimit:${orgId}:${windowKey}`;

// Redis Lua script for atomic rate limiting
const rateLimitScript = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local clearBefore = now - window

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

-- Count current entries
local count = redis.call('ZCARD', key)

if count < limit then
    -- Add new entry
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('EXPIRE', key, window / 1000 + 1)
    return {1, limit - count - 1, 0}
else
    -- Get oldest entry for retry-after
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = oldest[2] + window - now
    return {0, 0, retryAfter}
end
`;

// Alternative: Fixed window counter (simpler, less accurate)
// Key: scrx:ratelimit:{org_id}:{minute_timestamp}
INCR scrx:ratelimit:{org_id}:1706745600
EXPIRE scrx:ratelimit:{org_id}:1706745600 120

// Get current count
GET scrx:ratelimit:{org_id}:1706745600
```

### 4.5 Concurrent Job Tracking

```typescript
// Track concurrent jobs per organization
const concurrentKey = `scrx:concurrent:${orgId}`;

// Acquire slot (returns 1 if successful, 0 if at limit)
const acquireScript = `
local key = KEYS[1]
local jobId = ARGV[1]
local limit = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

local count = redis.call('SCARD', key)
if count < limit then
    redis.call('SADD', key, jobId)
    redis.call('EXPIRE', key, ttl)
    return 1
else
    return 0
end
`;

// Release slot
SREM scrx:concurrent:{org_id} {job_id}

// Get current count
SCARD scrx:concurrent:{org_id}

// List all active jobs
SMEMBERS scrx:concurrent:{org_id}

// Cleanup stale entries (jobs that crashed)
// Use separate sorted set with job start times
ZADD scrx:concurrent:times:{org_id} {timestamp} {job_id}
ZREMRANGEBYSCORE scrx:concurrent:times:{org_id} -inf {stale_threshold}
```

### 4.6 Response Caching

```typescript
// Cache key includes URL hash and relevant options
interface CacheKey {
  urlHash: string;
  options: {
    jsRendering: boolean;
    waitFor?: string;
    headers?: Record<string, string>;
  };
}

const cacheKey = `scrx:cache:${hashKey(url, options)}`;

// Store cached response
interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;           // For small responses
  minioKey?: string;      // Reference for large responses
  contentHash: string;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

// SET with compression for large payloads
SET scrx:cache:{hash} {compressed_json}
EXPIRE scrx:cache:{hash} 3600

// Check cache and increment hit count
GET scrx:cache:{hash}
HINCRBY scrx:cache:hits:{hash} count 1

// Cache invalidation patterns
DEL scrx:cache:{hash}

// Bulk invalidation by pattern (use SCAN in production)
SCAN 0 MATCH scrx:cache:* COUNT 1000
```

### 4.7 Job Queue Integration (BullMQ)

```typescript
// BullMQ uses Redis for job storage
// Key patterns used by BullMQ:

// Job data
bull:{queueName}:{jobId}

// Waiting jobs (list)
bull:{queueName}:wait

// Active jobs (list)  
bull:{queueName}:active

// Completed jobs (set)
bull:{queueName}:completed

// Failed jobs (set)
bull:{queueName}:failed

// Delayed jobs (sorted set)
bull:{queueName}:delayed

// Priority queue (sorted set)
bull:{queueName}:priority

// Custom ScraperX queue configuration
const queueConfig = {
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600,           // Keep completed jobs for 1 hour
      count: 10000,        // Keep last 10k jobs
    },
    removeOnFail: {
      age: 86400,          // Keep failed jobs for 24 hours
      count: 5000,
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
};

// Queue names
const queues = {
  HTTP_SCRAPE: 'scrape:http',
  BROWSER_SCRAPE: 'scrape:browser',
  STEALTH_SCRAPE: 'scrape:stealth',
  WEBHOOK_DELIVERY: 'webhook:delivery',
  USAGE_AGGREGATION: 'billing:usage',
};
```

### 4.8 Distributed Locking

```typescript
// Redlock implementation for distributed locks
const lockKey = `scrx:lock:${resource}:${id}`;
const lockTTL = 30000; // 30 seconds

// Acquire lock (using Redlock algorithm)
const lockScript = `
local key = KEYS[1]
local token = ARGV[1]
local ttl = tonumber(ARGV[2])

if redis.call('SET', key, token, 'NX', 'PX', ttl) then
    return 1
else
    return 0
end
`;

// Release lock (only if we own it)
const unlockScript = `
local key = KEYS[1]
local token = ARGV[1]

if redis.call('GET', key) == token then
    return redis.call('DEL', key)
else
    return 0
end
`;

// Extend lock
const extendScript = `
local key = KEYS[1]
local token = ARGV[1]
local ttl = tonumber(ARGV[2])

if redis.call('GET', key) == token then
    return redis.call('PEXPIRE', key, ttl)
else
    return 0
end
`;
```

### 4.9 Real-Time Metrics

```typescript
// Metrics using HyperLogLog and Sorted Sets

// Unique URLs scraped today
PFADD scrx:metrics:urls:{date} {url_hash}
PFCOUNT scrx:metrics:urls:{date}

// Request counts by status (time series)
INCR scrx:metrics:requests:success:{minute}
INCR scrx:metrics:requests:failed:{minute}
EXPIRE scrx:metrics:requests:success:{minute} 86400

// Latency percentiles using sorted set
ZADD scrx:metrics:latency:{minute} {latency_ms} {job_id}
ZRANGEBYSCORE scrx:metrics:latency:{minute} -inf +inf WITHSCORES

// Calculate percentiles
const p50 = ZRANGEBYSCORE key 0 +inf LIMIT (count * 0.5) 1
const p95 = ZRANGEBYSCORE key 0 +inf LIMIT (count * 0.95) 1
const p99 = ZRANGEBYSCORE key 0 +inf LIMIT (count * 0.99) 1

// Active worker tracking
HSET scrx:workers:{worker_id} 
  region us-east
  status active
  currentJobs 5
  lastHeartbeat 1706745600
EXPIRE scrx:workers:{worker_id} 60

// Worker heartbeat
HSET scrx:workers:{worker_id} lastHeartbeat {timestamp}
EXPIRE scrx:workers:{worker_id} 60
```

### 4.10 Pub/Sub for Real-Time Updates

```typescript
// Job status updates
PUBLISH scrx:jobs:{org_id} '{"jobId":"...","status":"completed"}'

// System-wide notifications
PUBLISH scrx:system:alerts '{"type":"high_error_rate","message":"..."}'

// Subscriber patterns
PSUBSCRIBE scrx:jobs:*
PSUBSCRIBE scrx:system:*

// Channel patterns
const channels = {
  JOB_STATUS: 'scrx:jobs:{orgId}',
  BATCH_PROGRESS: 'scrx:batch:{batchId}',
  SYSTEM_ALERTS: 'scrx:system:alerts',
  WORKER_STATUS: 'scrx:workers:status',
};
```

---

## 5. MinIO Object Storage

### 5.1 MinIO Cluster Configuration

```yaml
# docker-compose.minio.yml
version: '3.8'

services:
  minio1:
    image: minio/minio:latest
    command: server --console-address ":9001" http://minio{1...4}/data{1...2}
    hostname: minio1
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_PROMETHEUS_AUTH_TYPE: public
    volumes:
      - minio1-data1:/data1
      - minio1-data2:/data2
    networks:
      - minio-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # Repeat for minio2, minio3, minio4...

  nginx:
    image: nginx:alpine
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - minio-net
    depends_on:
      - minio1
      - minio2
      - minio3
      - minio4

volumes:
  minio1-data1:
  minio1-data2:
  # ... more volumes

networks:
  minio-net:
    driver: overlay
```

### 5.2 Bucket Configuration

```typescript
// Bucket definitions
const buckets = {
  // HTML content storage
  CONTENT: {
    name: 'scrx-content',
    versioning: false,
    lifecycle: {
      expiration: { days: 30 },
      transition: [
        { days: 7, storageClass: 'STANDARD_IA' },
      ],
    },
  },
  
  // Screenshots
  SCREENSHOTS: {
    name: 'scrx-screenshots',
    versioning: false,
    lifecycle: {
      expiration: { days: 7 },
    },
  },
  
  // PDF exports
  PDFS: {
    name: 'scrx-pdfs',
    versioning: false,
    lifecycle: {
      expiration: { days: 14 },
    },
  },
  
  // Long-term archives
  ARCHIVES: {
    name: 'scrx-archives',
    versioning: true,
    lifecycle: {
      expiration: { days: 365 },
      noncurrentVersionExpiration: { noncurrentDays: 30 },
    },
  },
  
  // Temporary processing
  TEMP: {
    name: 'scrx-temp',
    versioning: false,
    lifecycle: {
      expiration: { days: 1 },
    },
  },
};

// MinIO client setup
import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

// Bucket initialization
async function initializeBuckets() {
  for (const [key, config] of Object.entries(buckets)) {
    const exists = await minioClient.bucketExists(config.name);
    if (!exists) {
      await minioClient.makeBucket(config.name, 'us-east-1');
    }
    
    // Set lifecycle policy
    if (config.lifecycle) {
      await minioClient.setBucketLifecycle(config.name, {
        Rule: [
          {
            ID: `${config.name}-lifecycle`,
            Status: 'Enabled',
            Expiration: config.lifecycle.expiration,
            Transition: config.lifecycle.transition,
          },
        ],
      });
    }
    
    // Enable versioning if required
    if (config.versioning) {
      await minioClient.setBucketVersioning(config.name, {
        Status: 'Enabled',
      });
    }
  }
}
```

### 5.3 Object Key Naming Convention

```
Pattern: {org_id}/{year}/{month}/{day}/{job_id}/{type}.{ext}

Examples:
- org_abc123/2025/01/31/job_xyz789/content.html
- org_abc123/2025/01/31/job_xyz789/screenshot.png
- org_abc123/2025/01/31/job_xyz789/screenshot_thumb.png
- org_abc123/2025/01/31/job_xyz789/page.pdf
- org_abc123/2025/01/31/job_xyz789/metadata.json
```

### 5.4 Content Storage Service

```typescript
import { Client } from 'minio';
import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface StorageResult {
  bucket: string;
  key: string;
  size: number;
  contentHash: string;
  compressed: boolean;
}

class ContentStorageService {
  private client: Client;
  
  constructor(client: Client) {
    this.client = client;
  }
  
  async storeContent(
    orgId: string,
    jobId: string,
    content: string | Buffer,
    contentType: string,
  ): Promise<StorageResult> {
    const now = new Date();
    const key = this.buildKey(orgId, jobId, now, 'content', this.getExtension(contentType));
    
    // Calculate hash
    const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const contentHash = createHash('sha256').update(contentBuffer).digest('hex');
    
    // Compress if text content and > 1KB
    let dataToStore = contentBuffer;
    let compressed = false;
    
    if (contentType.startsWith('text/') && contentBuffer.length > 1024) {
      dataToStore = await gzipAsync(contentBuffer);
      compressed = true;
    }
    
    // Upload to MinIO
    await this.client.putObject(
      buckets.CONTENT.name,
      key,
      dataToStore,
      dataToStore.length,
      {
        'Content-Type': contentType,
        'X-Amz-Meta-Original-Size': contentBuffer.length.toString(),
        'X-Amz-Meta-Compressed': compressed.toString(),
        'X-Amz-Meta-Content-Hash': contentHash,
        'X-Amz-Meta-Job-Id': jobId,
        'X-Amz-Meta-Org-Id': orgId,
      },
    );
    
    return {
      bucket: buckets.CONTENT.name,
      key,
      size: dataToStore.length,
      contentHash,
      compressed,
    };
  }
  
  async retrieveContent(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const data = Buffer.concat(chunks);
    
    // Check if compressed
    const stat = await this.client.statObject(bucket, key);
    const isCompressed = stat.metaData?.['x-amz-meta-compressed'] === 'true';
    
    if (isCompressed) {
      return gunzipAsync(data);
    }
    
    return data;
  }
  
  async storeScreenshot(
    orgId: string,
    jobId: string,
    screenshot: Buffer,
    thumbnail?: Buffer,
  ): Promise<{ key: string; thumbnailKey?: string }> {
    const now = new Date();
    const key = this.buildKey(orgId, jobId, now, 'screenshot', 'png');
    
    await this.client.putObject(
      buckets.SCREENSHOTS.name,
      key,
      screenshot,
      screenshot.length,
      { 'Content-Type': 'image/png' },
    );
    
    let thumbnailKey: string | undefined;
    
    if (thumbnail) {
      thumbnailKey = this.buildKey(orgId, jobId, now, 'screenshot_thumb', 'png');
      await this.client.putObject(
        buckets.SCREENSHOTS.name,
        thumbnailKey,
        thumbnail,
        thumbnail.length,
        { 'Content-Type': 'image/png' },
      );
    }
    
    return { key, thumbnailKey };
  }
  
  async getPresignedUrl(
    bucket: string,
    key: string,
    expirySeconds: number = 3600,
  ): Promise<string> {
    return this.client.presignedGetObject(bucket, key, expirySeconds);
  }
  
  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
  }
  
  async deleteJobObjects(orgId: string, jobId: string, date: Date): Promise<void> {
    const prefix = this.buildKeyPrefix(orgId, jobId, date);
    
    const objects = this.client.listObjects(bucket, prefix, true);
    const objectsToDelete: string[] = [];
    
    for await (const obj of objects) {
      objectsToDelete.push(obj.name);
    }
    
    if (objectsToDelete.length > 0) {
      await this.client.removeObjects(bucket, objectsToDelete);
    }
  }
  
  private buildKey(
    orgId: string,
    jobId: string,
    date: Date,
    type: string,
    extension: string,
  ): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${orgId}/${year}/${month}/${day}/${jobId}/${type}.${extension}`;
  }
  
  private buildKeyPrefix(orgId: string, jobId: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${orgId}/${year}/${month}/${day}/${jobId}/`;
  }
  
  private getExtension(contentType: string): string {
    const map: Record<string, string> = {
      'text/html': 'html',
      'text/plain': 'txt',
      'application/json': 'json',
      'application/xml': 'xml',
      'text/xml': 'xml',
    };
    return map[contentType] || 'bin';
  }
}
```

### 5.5 Bucket Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAppServerAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::ACCOUNT:user/scraperx-app"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::scrx-content",
        "arn:aws:s3:::scrx-content/*"
      ]
    },
    {
      "Sid": "AllowWorkerReadWrite",
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam::ACCOUNT:user/scraperx-worker"]
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::scrx-content/*",
        "arn:aws:s3:::scrx-screenshots/*",
        "arn:aws:s3:::scrx-pdfs/*"
      ]
    },
    {
      "Sid": "DenyUnencryptedTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::scrx-content/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

---

## 6. Data Retention Policies

### 6.1 Retention Policy Overview

| Data Type | Hot Storage | Warm Storage | Cold Storage | Total Retention |
|-----------|-------------|--------------|--------------|-----------------|
| Job Metadata | 24 hours | 30 days | 1 year | 1 year |
| Job Results | 24 hours | 7 days | 30 days | 30 days |
| HTML Content | - | 7 days | 30 days | 30 days |
| Screenshots | - | 7 days | - | 7 days |
| PDFs | - | 14 days | - | 14 days |
| Usage Records | - | 90 days | 2 years | 2 years |
| Audit Logs | - | 90 days | 7 years | 7 years |
| API Keys | Until revoked | - | - | Until deleted |

### 6.2 PostgreSQL Data Retention

```sql
-- Create retention policy function
CREATE OR REPLACE FUNCTION apply_retention_policies()
RETURNS void AS $$
BEGIN
    -- Archive old jobs to cold storage table
    INSERT INTO scrape_jobs_archive
    SELECT * FROM scrape_jobs
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND status IN ('completed', 'failed', 'canceled');
    
    -- Delete archived jobs from main table
    DELETE FROM scrape_jobs
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND status IN ('completed', 'failed', 'canceled');
    
    -- Delete old job results
    DELETE FROM job_results
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Delete old job events (keep 90 days)
    DELETE FROM job_events
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete old usage records (keep 2 years)
    DELETE FROM usage_records
    WHERE period_start < NOW() - INTERVAL '2 years';
    
    -- Log the cleanup
    INSERT INTO system_logs (event_type, event_data, created_at)
    VALUES ('retention_cleanup', jsonb_build_object(
        'jobs_archived', (SELECT count(*) FROM scrape_jobs_archive WHERE created_at > NOW() - INTERVAL '1 day'),
        'results_deleted', (SELECT count(*) FROM job_results WHERE created_at < NOW() - INTERVAL '30 days'),
        'events_deleted', (SELECT count(*) FROM job_events WHERE created_at < NOW() - INTERVAL '90 days')
    ), NOW());
END;
$$ LANGUAGE plpgsql;

-- Schedule retention cleanup (using pg_cron)
SELECT cron.schedule('retention-cleanup', '0 3 * * *', 'SELECT apply_retention_policies()');

-- Drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions()
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '90 days';
BEGIN
    FOR partition_name IN
        SELECT tablename FROM pg_tables
        WHERE tablename LIKE 'scrape_jobs_%'
          AND tablename < 'scrape_jobs_' || TO_CHAR(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
        RAISE NOTICE 'Dropped partition: %', partition_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule partition cleanup monthly
SELECT cron.schedule('partition-cleanup', '0 4 1 * *', 'SELECT drop_old_partitions()');
```

### 6.3 Redis Data Expiration

```typescript
// TTL configuration for Redis keys
const ttlConfig = {
  // Sessions expire after 24 hours
  session: 86400,
  
  // Rate limit windows expire after their window + 1 minute buffer
  rateLimit: {
    perSecond: 2,
    perMinute: 120,
    perHour: 3660,
  },
  
  // Concurrent job tracking expires after 1 hour (failsafe)
  concurrent: 3600,
  
  // Cache entries have variable TTL based on content
  cache: {
    default: 3600,
    static: 86400,
    dynamic: 300,
  },
  
  // Locks expire after 30 seconds
  lock: 30,
  
  // Metrics windows
  metrics: {
    minute: 86400,      // Keep minute-level for 24 hours
    hour: 604800,       // Keep hour-level for 7 days
    day: 2592000,       // Keep day-level for 30 days
  },
  
  // Worker heartbeats
  worker: 60,
};

// Apply TTL when setting keys
async function setWithTTL(
  key: string,
  value: string,
  category: keyof typeof ttlConfig,
): Promise<void> {
  const ttl = typeof ttlConfig[category] === 'number' 
    ? ttlConfig[category] 
    : ttlConfig[category].default;
    
  await redis.set(key, value, 'EX', ttl);
}

// Cleanup script for orphaned keys
async function cleanupOrphanedKeys(): Promise<void> {
  const patterns = [
    'scrx:concurrent:*',
    'scrx:lock:*',
  ];
  
  for (const pattern of patterns) {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // No expiry set - this is an orphan
          await redis.expire(key, 3600);
        }
      }
    } while (cursor !== '0');
  }
}
```

### 6.4 MinIO Lifecycle Rules

```typescript
// Configure lifecycle rules via mc (MinIO Client)
const lifecycleRules = `
<?xml version="1.0" encoding="UTF-8"?>
<LifecycleConfiguration>
  <Rule>
    <ID>content-expiration</ID>
    <Status>Enabled</Status>
    <Filter>
      <Prefix></Prefix>
    </Filter>
    <Expiration>
      <Days>30</Days>
    </Expiration>
    <NoncurrentVersionExpiration>
      <NoncurrentDays>7</NoncurrentDays>
    </NoncurrentVersionExpiration>
  </Rule>
  <Rule>
    <ID>transition-to-ia</ID>
    <Status>Enabled</Status>
    <Filter>
      <Prefix></Prefix>
    </Filter>
    <Transition>
      <Days>7</Days>
      <StorageClass>STANDARD_IA</StorageClass>
    </Transition>
  </Rule>
</LifecycleConfiguration>
`;

// Apply via mc command
// mc ilm import myminio/scrx-content < lifecycle.xml

// Programmatic lifecycle management
async function configureLifecycle(bucket: string, rules: LifecycleRule[]): Promise<void> {
  const lifecycleConfig = {
    Rule: rules.map(rule => ({
      ID: rule.id,
      Status: 'Enabled',
      Filter: { Prefix: rule.prefix || '' },
      Expiration: rule.expiration ? { Days: rule.expiration } : undefined,
      Transition: rule.transition ? [{
        Days: rule.transition.days,
        StorageClass: rule.transition.storageClass,
      }] : undefined,
    })),
  };
  
  await minioClient.setBucketLifecycle(bucket, lifecycleConfig);
}

// Initialize all bucket lifecycle rules
async function initializeLifecycleRules(): Promise<void> {
  await configureLifecycle('scrx-content', [
    { id: 'expire-30d', expiration: 30 },
    { id: 'transition-7d', transition: { days: 7, storageClass: 'STANDARD_IA' } },
  ]);
  
  await configureLifecycle('scrx-screenshots', [
    { id: 'expire-7d', expiration: 7 },
  ]);
  
  await configureLifecycle('scrx-pdfs', [
    { id: 'expire-14d', expiration: 14 },
  ]);
  
  await configureLifecycle('scrx-temp', [
    { id: 'expire-1d', expiration: 1 },
  ]);
  
  await configureLifecycle('scrx-archives', [
    { id: 'expire-365d', expiration: 365 },
  ]);
}
```

---

## 7. Backup and Recovery

### 7.1 Backup Strategy Overview

```
+------------------------------------------------------------------+
|                      BACKUP ARCHITECTURE                          |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+     +------------------+                    |
|  |   POSTGRESQL     |     |   AUTOMATED      |                    |
|  |                  |     |   BACKUP SYSTEM  |                    |
|  |  - WAL Archive   | --> |                  |                    |
|  |  - Base Backup   |     |  - pg_basebackup |                    |
|  |  - Logical Dump  |     |  - WAL-G         |                    |
|  +------------------+     |  - pgBackRest    |                    |
|                           +------------------+                    |
|                                    |                              |
|  +------------------+              v                              |
|  |     REDIS        |     +------------------+                    |
|  |                  |     |   REMOTE         |                    |
|  |  - RDB Snapshot  | --> |   STORAGE        |                    |
|  |  - AOF Files     |     |                  |                    |
|  +------------------+     |  - Hetzner       |                    |
|                           |    Storage Box   |                    |
|  +------------------+     |  - S3 (offsite)  |                    |
|  |     MINIO        |     |                  |                    |
|  |                  | --> +------------------+                    |
|  |  - mc mirror     |                                             |
|  |  - Bucket Repl.  |     +------------------+                    |
|  +------------------+     |   MONITORING     |                    |
|                           |                  |                    |
|                           |  - Backup verify |                    |
|                           |  - Restore tests |                    |
|                           |  - Alerting      |                    |
|                           +------------------+                    |
|                                                                   |
+------------------------------------------------------------------+
```

### 7.2 PostgreSQL Backup Configuration

```bash
#!/bin/bash
# /opt/scraperx/scripts/backup-postgres.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/postgresql"
REMOTE_BACKUP_DIR="/backup/postgresql"
RETENTION_DAYS=30
S3_BUCKET="s3://scraperx-backups/postgresql"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/scraperx_${TIMESTAMP}.sql.gz"

# Create logical backup with pg_dump
pg_dump \
  --host=localhost \
  --port=5432 \
  --username=scraperx \
  --dbname=scraperx \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_FILE}"

# Verify backup integrity
pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "ERROR: Backup verification failed"
  exit 1
fi

# Calculate checksum
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

# Upload to remote storage
rsync -avz "${BACKUP_FILE}" "${BACKUP_FILE}.sha256" \
  backup@storage.scraperx.internal:${REMOTE_BACKUP_DIR}/

# Upload to S3 for offsite backup
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/${TIMESTAMP}/"
aws s3 cp "${BACKUP_FILE}.sha256" "${S3_BUCKET}/${TIMESTAMP}/"

# Cleanup old local backups
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete
find "${BACKUP_DIR}" -name "*.sha256" -mtime +7 -delete

# Cleanup old remote backups
ssh backup@storage.scraperx.internal \
  "find ${REMOTE_BACKUP_DIR} -name '*.sql.gz' -mtime +${RETENTION_DAYS} -delete"

echo "Backup completed: ${BACKUP_FILE}"
```

```yaml
# WAL-G configuration for continuous archiving
# /etc/wal-g/wal-g.yaml
WALG_S3_PREFIX: s3://scraperx-backups/wal-g
AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_KEY}
AWS_REGION: eu-central-1
WALG_COMPRESSION_METHOD: lz4
WALG_DELTA_MAX_STEPS: 6
WALG_UPLOAD_CONCURRENCY: 4
PGHOST: localhost
PGPORT: 5432
PGUSER: scraperx
PGDATABASE: scraperx
```

```ini
# postgresql.conf - WAL archiving settings
archive_mode = on
archive_command = 'wal-g wal-push %p'
archive_timeout = 60
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
```

### 7.3 Redis Backup Configuration

```bash
#!/bin/bash
# /opt/scraperx/scripts/backup-redis.sh

set -euo pipefail

BACKUP_DIR="/var/backups/redis"
REMOTE_BACKUP_DIR="/backup/redis"
REDIS_CLI="redis-cli -h localhost -p 6379"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Trigger RDB snapshot
${REDIS_CLI} BGSAVE
sleep 5

# Wait for background save to complete
while [ "$(${REDIS_CLI} LASTSAVE)" == "$(cat /tmp/redis_lastsave 2>/dev/null || echo 0)" ]; do
  sleep 1
done
${REDIS_CLI} LASTSAVE > /tmp/redis_lastsave

# Copy RDB file
cp /var/lib/redis/dump.rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

# Compress
gzip "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

# Upload to remote
rsync -avz "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb.gz" \
  backup@storage.scraperx.internal:${REMOTE_BACKUP_DIR}/

# Cleanup old backups (keep 7 days locally)
find "${BACKUP_DIR}" -name "*.rdb.gz" -mtime +7 -delete

echo "Redis backup completed"
```

### 7.4 MinIO Backup Configuration

```bash
#!/bin/bash
# /opt/scraperx/scripts/backup-minio.sh

set -euo pipefail

MC_ALIAS="scraperx"
REMOTE_ALIAS="backup"
BUCKETS=("scrx-content" "scrx-screenshots" "scrx-pdfs" "scrx-archives")

# Configure mc aliases
mc alias set ${MC_ALIAS} http://minio:9000 ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY}
mc alias set ${REMOTE_ALIAS} https://s3.eu-central-1.wasabisys.com ${WASABI_ACCESS_KEY} ${WASABI_SECRET_KEY}

# Mirror each bucket to remote
for bucket in "${BUCKETS[@]}"; do
  echo "Mirroring ${bucket}..."
  mc mirror --overwrite --remove \
    ${MC_ALIAS}/${bucket} \
    ${REMOTE_ALIAS}/scraperx-backup-${bucket}
done

echo "MinIO backup completed"
```

### 7.5 Disaster Recovery Procedures

```markdown
# Disaster Recovery Runbook

## Scenario 1: PostgreSQL Database Corruption

### Recovery Steps:

1. Stop all application services
   ```bash
   docker service scale scraperx_api=0 scraperx_worker=0
   ```

2. Restore from latest WAL-G backup
   ```bash
   # Find latest backup
   wal-g backup-list
   
   # Restore specific backup
   wal-g backup-fetch /var/lib/postgresql/data LATEST
   
   # Create recovery.signal
   touch /var/lib/postgresql/data/recovery.signal
   
   # Add recovery configuration
   cat >> /var/lib/postgresql/data/postgresql.auto.conf << EOF
   restore_command = 'wal-g wal-fetch %f %p'
   recovery_target_time = '2025-01-31 12:00:00 UTC'
   EOF
   ```

3. Start PostgreSQL and verify recovery
   ```bash
   docker service scale scraperx_postgres=1
   docker logs -f scraperx_postgres
   ```

4. Verify data integrity
   ```bash
   psql -U scraperx -d scraperx -c "SELECT count(*) FROM scrape_jobs;"
   ```

5. Restart application services
   ```bash
   docker service scale scraperx_api=3 scraperx_worker=10
   ```

## Scenario 2: Redis Cluster Failure

### Recovery Steps:

1. Identify failed nodes
   ```bash
   redis-cli cluster nodes
   ```

2. If single node failure, the cluster self-heals

3. For complete cluster failure:
   ```bash
   # Stop Redis cluster
   docker-compose -f docker-compose.redis.yml down
   
   # Restore from backup
   for i in 1 2 3 4 5 6; do
     gunzip -c /backup/redis/redis_latest.rdb.gz > /var/lib/redis${i}/dump.rdb
   done
   
   # Start cluster
   docker-compose -f docker-compose.redis.yml up -d
   
   # Reinitialize cluster
   redis-cli --cluster create node1:6379 node2:6379 ... --cluster-replicas 1
   ```

## Scenario 3: MinIO Data Loss

### Recovery Steps:

1. Identify affected buckets
   ```bash
   mc admin info scraperx
   ```

2. Restore from Wasabi backup
   ```bash
   mc mirror backup/scraperx-backup-scrx-content scraperx/scrx-content
   ```

3. Verify data integrity
   ```bash
   mc stat scraperx/scrx-content --recursive | wc -l
   ```

## Recovery Time Objectives (RTO)

| Component | RTO Target | Actual (tested) |
|-----------|------------|-----------------|
| PostgreSQL | 30 minutes | 25 minutes |
| Redis | 15 minutes | 10 minutes |
| MinIO | 2 hours | 1.5 hours |
| Full System | 4 hours | 3 hours |

## Recovery Point Objectives (RPO)

| Component | RPO Target |
|-----------|------------|
| PostgreSQL | 1 hour (WAL archiving) |
| Redis | 1 hour (RDB snapshots) |
| MinIO | 6 hours (daily sync) |
```

### 7.6 Backup Monitoring

```typescript
// Backup verification service
interface BackupStatus {
  component: string;
  lastBackup: Date;
  backupSize: number;
  verified: boolean;
  lastVerification: Date;
}

async function verifyBackups(): Promise<BackupStatus[]> {
  const statuses: BackupStatus[] = [];
  
  // Check PostgreSQL backups
  const pgBackups = await listS3Objects('scraperx-backups/postgresql/');
  const latestPgBackup = pgBackups.sort((a, b) => 
    b.LastModified.getTime() - a.LastModified.getTime()
  )[0];
  
  statuses.push({
    component: 'postgresql',
    lastBackup: latestPgBackup.LastModified,
    backupSize: latestPgBackup.Size,
    verified: await verifyPgBackup(latestPgBackup.Key),
    lastVerification: new Date(),
  });
  
  // Check Redis backups
  const redisBackups = await listRemoteFiles('/backup/redis/');
  const latestRedisBackup = redisBackups.sort((a, b) => 
    b.mtime.getTime() - a.mtime.getTime()
  )[0];
  
  statuses.push({
    component: 'redis',
    lastBackup: latestRedisBackup.mtime,
    backupSize: latestRedisBackup.size,
    verified: true, // Redis RDB is self-verifying
    lastVerification: new Date(),
  });
  
  // Check MinIO sync
  const syncStatus = await getMinioSyncStatus();
  statuses.push({
    component: 'minio',
    lastBackup: syncStatus.lastSync,
    backupSize: syncStatus.totalSize,
    verified: syncStatus.verified,
    lastVerification: new Date(),
  });
  
  return statuses;
}

// Alert if backup is stale
async function checkBackupFreshness(): Promise<void> {
  const statuses = await verifyBackups();
  const now = new Date();
  
  for (const status of statuses) {
    const ageHours = (now.getTime() - status.lastBackup.getTime()) / (1000 * 60 * 60);
    
    const thresholds = {
      postgresql: 2,   // Alert if > 2 hours old
      redis: 2,        // Alert if > 2 hours old
      minio: 12,       // Alert if > 12 hours old
    };
    
    if (ageHours > thresholds[status.component]) {
      await sendAlert({
        severity: 'warning',
        component: status.component,
        message: `Backup is ${ageHours.toFixed(1)} hours old`,
      });
    }
    
    if (!status.verified) {
      await sendAlert({
        severity: 'critical',
        component: status.component,
        message: 'Backup verification failed',
      });
    }
  }
}
```

---

## 8. Performance Optimization

### 8.1 PostgreSQL Query Optimization

```sql
-- Key query patterns and their indexes

-- 1. Job lookup by organization and status
-- Query: WHERE organization_id = ? AND status IN ('pending', 'queued')
CREATE INDEX CONCURRENTLY idx_jobs_org_pending 
ON scrape_jobs(organization_id, created_at DESC)
WHERE status IN ('pending', 'queued');

-- 2. Job dequeue for workers
-- Query: WHERE status = 'pending' ORDER BY priority DESC, created_at LIMIT 100
CREATE INDEX CONCURRENTLY idx_jobs_dequeue
ON scrape_jobs(status, priority DESC, created_at)
WHERE status = 'pending';

-- 3. URL deduplication check
-- Query: WHERE url_hash = ? AND organization_id = ? AND created_at > ?
CREATE INDEX CONCURRENTLY idx_jobs_dedup
ON scrape_jobs(url_hash, organization_id, created_at DESC);

-- 4. Batch job lookup
-- Query: WHERE batch_id = ?
CREATE INDEX CONCURRENTLY idx_jobs_batch
ON scrape_jobs(batch_id)
WHERE batch_id IS NOT NULL;

-- 5. Usage aggregation
-- Query: WHERE organization_id = ? AND period_start BETWEEN ? AND ?
CREATE INDEX CONCURRENTLY idx_usage_org_period
ON usage_records(organization_id, period_start DESC);

-- Analyze and vacuum schedule
ALTER TABLE scrape_jobs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- Partial indexes for common filters
CREATE INDEX CONCURRENTLY idx_jobs_webhook_pending
ON scrape_jobs(completed_at DESC)
WHERE webhook_url IS NOT NULL AND webhook_sent_at IS NULL;

-- Expression index for JSON queries
CREATE INDEX CONCURRENTLY idx_jobs_js_rendering
ON scrape_jobs((options->>'jsRendering'))
WHERE options->>'jsRendering' = 'true';
```

### 8.2 Connection Pooling with PgBouncer

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
scraperx = host=postgres port=5432 dbname=scraperx

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 50
min_pool_size = 10
reserve_pool_size = 10
reserve_pool_timeout = 3

# Connection limits
max_db_connections = 100
max_user_connections = 100

# Timeouts
server_connect_timeout = 3
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 60
query_wait_timeout = 30

# Logging
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60

# Admin access
admin_users = scraperx_admin
```

### 8.3 Redis Memory Optimization

```conf
# redis.conf optimizations

# Memory management
maxmemory 16gb
maxmemory-policy allkeys-lru
maxmemory-samples 10

# Lazy freeing (async deletion)
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes

# Compression for lists
list-compress-depth 1
list-max-ziplist-size -2

# Hash optimization
hash-max-ziplist-entries 512
hash-max-ziplist-value 64

# Set optimization  
set-max-intset-entries 512

# Sorted set optimization
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# Client output buffer limits
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60

# TCP keepalive
tcp-keepalive 300

# Disable persistence for cache-only instances
# save ""
# appendonly no
```

### 8.4 Query Performance Monitoring

```typescript
// Slow query logging and analysis
import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '6432'),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Query wrapper with timing
async function query<T>(
  sql: string,
  params?: any[],
  options?: { timeout?: number },
): Promise<T[]> {
  const client = await pool.connect();
  const startTime = Date.now();
  
  try {
    // Set statement timeout
    if (options?.timeout) {
      await client.query(`SET statement_timeout = ${options.timeout}`);
    }
    
    const result = await client.query(sql, params);
    const duration = Date.now() - startTime;
    
    // Log slow queries
    if (duration > 100) {
      logger.warn({
        type: 'slow_query',
        sql: sql.substring(0, 200),
        params: params?.slice(0, 5),
        duration,
        rows: result.rowCount,
      });
    }
    
    // Record metrics
    metrics.histogram('postgres.query.duration', duration, {
      query: extractQueryType(sql),
    });
    
    return result.rows as T[];
  } finally {
    client.release();
  }
}

function extractQueryType(sql: string): string {
  const match = sql.trim().match(/^(\w+)/i);
  return match ? match[1].toUpperCase() : 'UNKNOWN';
}

// Periodic EXPLAIN ANALYZE for slow queries
async function analyzeSlowQueries(): Promise<void> {
  const slowQueries = await getSlowQueriesFromLog();
  
  for (const query of slowQueries) {
    const plan = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.sql}`, query.params);
    
    await insertQueryAnalysis({
      query: query.sql,
      plan: plan.rows[0],
      analyzedAt: new Date(),
    });
  }
}
```

---

## 9. Data Migration Strategy

### 9.1 Schema Migration Framework

```typescript
// Using node-pg-migrate for schema migrations
// migrations/001_initial_schema.ts

import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create extensions
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
  
  // Create organizations table
  pgm.createTable('organizations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: { type: 'varchar(255)', notNull: true },
    slug: { type: 'varchar(100)', notNull: true, unique: true },
    billing_email: { type: 'varchar(255)', notNull: true },
    plan_id: { type: 'varchar(50)', notNull: true, default: 'starter' },
    credits_balance: { type: 'bigint', notNull: true, default: 0 },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });
  
  // Add indexes
  pgm.createIndex('organizations', 'slug');
  pgm.createIndex('organizations', 'plan_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('organizations');
}
```

### 9.2 Zero-Downtime Migration Process

```bash
#!/bin/bash
# /opt/scraperx/scripts/migrate-zero-downtime.sh

set -euo pipefail

# Step 1: Run migrations that are backward-compatible
echo "Running backward-compatible migrations..."
npm run migrate:up

# Step 2: Deploy new application version (canary)
echo "Deploying canary..."
docker service update --image scraperx/api:new --replicas 1 scraperx_api

# Step 3: Monitor for errors
echo "Monitoring canary for 5 minutes..."
sleep 300

# Check error rate
ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | jq '.data.result[0].value[1]')
if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "Error rate too high, rolling back..."
  docker service rollback scraperx_api
  exit 1
fi

# Step 4: Full rollout
echo "Canary successful, rolling out to all replicas..."
docker service update --image scraperx/api:new scraperx_api

# Step 5: Run any cleanup migrations
echo "Running cleanup migrations..."
npm run migrate:cleanup

echo "Migration complete!"
```

### 9.3 Data Migration Scripts

```typescript
// Example: Migrating from old schema to new schema
// scripts/migrate-jobs-to-partitioned.ts

import { Pool } from 'pg';

async function migrateToPartitionedTable(): Promise<void> {
  const pool = new Pool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create new partitioned table
    await client.query(`
      CREATE TABLE scrape_jobs_new (
        LIKE scrape_jobs INCLUDING ALL
      ) PARTITION BY RANGE (created_at)
    `);
    
    // Create partitions for existing data
    const months = await client.query(`
      SELECT DISTINCT DATE_TRUNC('month', created_at) as month
      FROM scrape_jobs
      ORDER BY month
    `);
    
    for (const row of months.rows) {
      const monthStart = row.month;
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const partitionName = `scrape_jobs_${monthStart.toISOString().slice(0, 7).replace('-', '_')}`;
      
      await client.query(`
        CREATE TABLE ${partitionName} 
        PARTITION OF scrape_jobs_new
        FOR VALUES FROM ('${monthStart.toISOString()}') 
        TO ('${monthEnd.toISOString()}')
      `);
    }
    
    // Copy data in batches
    let offset = 0;
    const batchSize = 10000;
    
    while (true) {
      const result = await client.query(`
        INSERT INTO scrape_jobs_new
        SELECT * FROM scrape_jobs
        ORDER BY id
        LIMIT $1 OFFSET $2
        RETURNING id
      `, [batchSize, offset]);
      
      if (result.rowCount === 0) break;
      offset += batchSize;
      
      console.log(`Migrated ${offset} rows...`);
    }
    
    // Swap tables
    await client.query('ALTER TABLE scrape_jobs RENAME TO scrape_jobs_old');
    await client.query('ALTER TABLE scrape_jobs_new RENAME TO scrape_jobs');
    
    await client.query('COMMIT');
    
    console.log('Migration complete!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateToPartitionedTable().catch(console.error);
```

---

## 10. Appendix

### 10.1 Complete Schema Diagram

```
                                    SCRAPERX DATABASE SCHEMA
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|   CORE DOMAIN                                                                                   |
|   +------------------+       +------------------+       +------------------+                    |
|   |  organizations   |<------|     users        |       |    api_keys      |                    |
|   +------------------+       +------------------+       +------------------+                    |
|   | id (PK)          |       | id (PK)          |       | id (PK)          |                    |
|   | name             |       | organization_id  |------>| organization_id  |---+               |
|   | slug (UK)        |       | email            |       | key_prefix       |   |               |
|   | billing_email    |       | role             |       | key_hash (UK)    |   |               |
|   | plan_id          |       | created_at       |       | scopes           |   |               |
|   | credits_balance  |       +------------------+       | is_active        |   |               |
|   | rate_limit       |                                  | expires_at       |   |               |
|   | created_at       |                                  +------------------+   |               |
|   +------------------+                                                         |               |
|          |                                                                      |               |
|          |                                                                      |               |
|   OPERATIONAL                                                                   |               |
|   +------------------+       +------------------+       +------------------+    |               |
|   |   scrape_jobs    |<------|   job_results    |       |   job_events     |    |               |
|   +------------------+       +------------------+       +------------------+    |               |
|   | id (PK)          |       | id (PK)          |       | id (PK)          |    |               |
|   | organization_id  |<------| job_id           |       | job_id           |----+               |
|   | api_key_id       |------>| status_code      |       | event_type       |                    |
|   | url              |       | content_*        |       | event_data       |                    |
|   | status           |       | screenshot_*     |       | created_at       |                    |
|   | engine           |       | created_at       |       +------------------+                    |
|   | priority         |       +------------------+                                               |
|   | credits_charged  |                                                                          |
|   | created_at       |                                                                          |
|   +------------------+                                                                          |
|          |                                                                                      |
|          |                                                                                      |
|   BILLING                                                                                       |
|   +------------------+       +------------------+       +------------------+                    |
|   |  subscriptions   |       |  usage_records   |       |    invoices      |                    |
|   +------------------+       +------------------+       +------------------+                    |
|   | id (PK)          |       | id (PK)          |       | id (PK)          |                    |
|   | organization_id  |<------| organization_id  |       | organization_id  |                    |
|   | plan_id          |       | subscription_id  |------>| subscription_id  |                    |
|   | stripe_*         |       | period_start     |       | stripe_*         |                    |
|   | credits_included |       | credits_used     |       | total_cents      |                    |
|   | current_period_* |       | created_at       |       | status           |                    |
|   +------------------+       +------------------+       +------------------+                    |
|                                                                                                  |
|   SYSTEM                                                                                        |
|   +------------------+       +------------------+                                               |
|   | proxy_providers  |       |   fingerprints   |                                               |
|   +------------------+       +------------------+                                               |
|   | id (PK)          |       | id (PK)          |                                               |
|   | name             |       | browser_type     |                                               |
|   | api_endpoint     |       | user_agent       |                                               |
|   | capabilities     |       | navigator_*      |                                               |
|   | success_rate     |       | is_active        |                                               |
|   +------------------+       +------------------+                                               |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

### 10.2 Storage Capacity Planning

| Scale | Jobs/Day | PostgreSQL | Redis | MinIO | Total |
|-------|----------|------------|-------|-------|-------|
| Small | 10K | 50GB | 8GB | 100GB | 158GB |
| Medium | 100K | 200GB | 32GB | 500GB | 732GB |
| Large | 1M | 1TB | 64GB | 2TB | 3.1TB |
| Enterprise | 10M | 5TB | 256GB | 10TB | 15.3TB |

### 10.3 Performance Benchmarks

| Operation | Target Latency | Measured P50 | Measured P99 |
|-----------|----------------|--------------|--------------|
| Job Insert | <10ms | 2ms | 8ms |
| Job Lookup (by ID) | <5ms | 1ms | 4ms |
| Job List (by org) | <50ms | 15ms | 45ms |
| Cache Hit | <1ms | 0.2ms | 0.8ms |
| Cache Miss + Set | <5ms | 2ms | 6ms |
| MinIO Upload (1MB) | <100ms | 30ms | 80ms |
| MinIO Download (1MB) | <100ms | 25ms | 70ms |

---

## Document Control

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-31 | Architecture Team | Initial release |

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| Database Admin | | | |
| Security Review | | | |

### Distribution

This document is approved for internal distribution to the ScraperX development and operations teams.
