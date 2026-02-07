-- Migration: 001_initial_schema
-- Description: Create initial database schema for ScraperX

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    billing_email VARCHAR(255) NOT NULL,
    technical_email VARCHAR(255),
    plan_id VARCHAR(50) NOT NULL DEFAULT 'starter',
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trialing',
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    credits_balance BIGINT NOT NULL DEFAULT 0,
    credits_included_monthly BIGINT NOT NULL DEFAULT 100000,
    credits_overage_rate DECIMAL(10,6) DEFAULT 0.000050,
    rate_limit_per_second INTEGER NOT NULL DEFAULT 10,
    max_concurrent_jobs INTEGER NOT NULL DEFAULT 50,
    max_batch_size INTEGER NOT NULL DEFAULT 1000,
    data_retention_days INTEGER NOT NULL DEFAULT 7,
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
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT organizations_valid_plan CHECK (
        plan_id IN ('free', 'starter', 'growth', 'business', 'enterprise')
    ),
    CONSTRAINT organizations_valid_status CHECK (
        subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')
    ),
    CONSTRAINT organizations_positive_credits CHECK (credits_balance >= -1000000),
    CONSTRAINT organizations_positive_rate_limit CHECK (rate_limit_per_second > 0),
    CONSTRAINT organizations_positive_concurrent CHECK (max_concurrent_jobs > 0)
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan_id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_organizations_timestamp
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMPTZ,
    password_hash VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'email',
    auth_provider_id VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT users_valid_role CHECK (role IN ('owner', 'admin', 'member', 'readonly')),
    CONSTRAINT users_unique_email_per_org UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email)) WHERE deleted_at IS NULL;

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    key_prefix VARCHAR(12) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    scopes JSONB NOT NULL DEFAULT '["scrape:read", "scrape:write"]',
    allowed_ips INET[],
    allowed_domains VARCHAR(255)[],
    rate_limit_override INTEGER,
    max_concurrent_override INTEGER,
    credits_limit BIGINT,
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    last_used_user_agent TEXT,
    usage_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_by_user_id UUID REFERENCES users(id),
    revoke_reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT api_keys_valid_environment CHECK (
        environment IN ('development', 'staging', 'production')
    )
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC NULLS LAST);

CREATE TRIGGER update_api_keys_timestamp
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Scrape Jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    batch_id UUID,
    parent_job_id UUID REFERENCES scrape_jobs(id) ON DELETE SET NULL,
    retry_of_job_id UUID REFERENCES scrape_jobs(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    url_hash VARCHAR(64) NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    headers JSONB DEFAULT '{}',
    body TEXT,
    engine VARCHAR(20) NOT NULL DEFAULT 'auto',
    options JSONB NOT NULL DEFAULT '{
        "render_js": false,
        "timeout": 30000,
        "screenshot": false,
        "pdf": false
    }',
    proxy_tier VARCHAR(20) DEFAULT 'datacenter',
    proxy_country VARCHAR(2),
    proxy_city VARCHAR(100),
    proxy_provider VARCHAR(50),
    proxy_session_id VARCHAR(100),
    fingerprint_id UUID,
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 5,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    queued_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    worker_id VARCHAR(100),
    worker_region VARCHAR(20),
    queue_name VARCHAR(50),
    result_id UUID,
    credits_estimated BIGINT DEFAULT 1,
    credits_charged BIGINT DEFAULT 0,
    credit_breakdown JSONB DEFAULT '{}',
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    webhook_sent_at TIMESTAMPTZ,
    webhook_attempts INTEGER DEFAULT 0,
    webhook_last_error TEXT,
    error_code VARCHAR(50),
    error_message TEXT,
    error_details JSONB,
    client_reference VARCHAR(255),
    idempotency_key VARCHAR(255),
    metadata JSONB DEFAULT '{}',
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

CREATE INDEX IF NOT EXISTS idx_jobs_org_status ON scrape_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_org_created ON scrape_jobs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_batch ON scrape_jobs(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_url_hash ON scrape_jobs(url_hash, organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON scrape_jobs(status, priority DESC, created_at) WHERE status IN ('pending', 'queued');
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency ON scrape_jobs(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Job Results table
CREATE TABLE IF NOT EXISTS job_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    status_code INTEGER,
    status_text VARCHAR(100),
    headers JSONB,
    cookies JSONB,
    content_type VARCHAR(255),
    content_length BIGINT,
    content_encoding VARCHAR(50),
    final_url TEXT,
    redirect_count INTEGER DEFAULT 0,
    content_storage_type VARCHAR(20) NOT NULL DEFAULT 'inline',
    content_inline TEXT,
    content_minio_bucket VARCHAR(100),
    content_minio_key VARCHAR(500),
    content_hash VARCHAR(64),
    content_compressed BOOLEAN DEFAULT FALSE,
    extracted_title TEXT,
    extracted_text TEXT,
    extracted_links JSONB,
    extracted_images JSONB,
    extracted_data JSONB,
    screenshot_minio_bucket VARCHAR(100),
    screenshot_minio_key VARCHAR(500),
    screenshot_width INTEGER,
    screenshot_height INTEGER,
    screenshot_format VARCHAR(10) DEFAULT 'png',
    pdf_minio_bucket VARCHAR(100),
    pdf_minio_key VARCHAR(500),
    pdf_page_count INTEGER,
    dns_time_ms INTEGER,
    connect_time_ms INTEGER,
    tls_time_ms INTEGER,
    ttfb_ms INTEGER,
    download_time_ms INTEGER,
    render_time_ms INTEGER,
    total_time_ms INTEGER,
    detection_score DECIMAL(5,4),
    protection_detected VARCHAR(50),
    captcha_encountered BOOLEAN DEFAULT FALSE,
    captcha_type VARCHAR(50),
    captcha_solved BOOLEAN DEFAULT FALSE,
    captcha_solve_time_ms INTEGER,
    proxy_ip INET,
    proxy_country VARCHAR(2),
    proxy_provider VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    CONSTRAINT job_results_valid_storage CHECK (
        content_storage_type IN ('inline', 'minio', 'none')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_results_job ON job_results(job_id);
CREATE INDEX IF NOT EXISTS idx_results_org_created ON job_results(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_content_hash ON job_results(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_results_expires ON job_results(expires_at) WHERE expires_at IS NOT NULL;

-- Usage Records table
CREATE TABLE IF NOT EXISTS usage_records (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    granularity VARCHAR(20) NOT NULL DEFAULT 'daily',
    total_requests BIGINT NOT NULL DEFAULT 0,
    successful_requests BIGINT NOT NULL DEFAULT 0,
    failed_requests BIGINT NOT NULL DEFAULT 0,
    credits_used BIGINT NOT NULL DEFAULT 0,
    http_requests BIGINT DEFAULT 0,
    browser_requests BIGINT DEFAULT 0,
    stealth_requests BIGINT DEFAULT 0,
    datacenter_requests BIGINT DEFAULT 0,
    residential_requests BIGINT DEFAULT 0,
    mobile_requests BIGINT DEFAULT 0,
    captcha_solves BIGINT DEFAULT 0,
    screenshots_taken BIGINT DEFAULT 0,
    bandwidth_in_bytes BIGINT DEFAULT 0,
    bandwidth_out_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT usage_records_unique_org_period UNIQUE (organization_id, period_start, granularity)
);

CREATE INDEX IF NOT EXISTS idx_usage_org_period ON usage_records(organization_id, period_start DESC);

CREATE TRIGGER update_usage_records_timestamp
    BEFORE UPDATE ON usage_records
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
