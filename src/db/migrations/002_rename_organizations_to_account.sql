-- Migration: 002_rename_organizations_to_account
-- Description: Rename organizations table to account and simplify schema for MVP

-- Rename the table
ALTER TABLE organizations RENAME TO account;

-- Rename indexes
ALTER INDEX idx_organizations_slug RENAME TO idx_account_slug;
ALTER INDEX idx_organizations_stripe_customer RENAME TO idx_account_stripe_customer;
ALTER INDEX idx_organizations_plan RENAME TO idx_account_plan;

-- Rename triggers
DROP TRIGGER IF EXISTS update_organizations_timestamp ON account;
CREATE TRIGGER update_account_timestamp
    BEFORE UPDATE ON account
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Rename constraints
ALTER TABLE account RENAME CONSTRAINT organizations_valid_plan TO account_valid_plan;
ALTER TABLE account RENAME CONSTRAINT organizations_valid_status TO account_valid_status;
ALTER TABLE account RENAME CONSTRAINT organizations_positive_credits TO account_positive_credits;
ALTER TABLE account RENAME CONSTRAINT organizations_positive_rate_limit TO account_positive_rate_limit;
ALTER TABLE account RENAME CONSTRAINT organizations_positive_concurrent TO account_positive_concurrent;

-- Add new fields required by Phase 6 Account model
ALTER TABLE account ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE account ADD COLUMN IF NOT EXISTS credit_cycle_usage BIGINT NOT NULL DEFAULT 0;
ALTER TABLE account ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Backfill display_name from name field
UPDATE account SET display_name = name WHERE display_name IS NULL;

-- Make display_name NOT NULL after backfill
ALTER TABLE account ALTER COLUMN display_name SET NOT NULL;

-- Rename plan_id column to plan
ALTER TABLE account RENAME COLUMN plan_id TO plan;

-- Update plan constraint for new plan values (free, pro, enterprise)
ALTER TABLE account DROP CONSTRAINT account_valid_plan;
ALTER TABLE account ADD CONSTRAINT account_valid_plan CHECK (
    plan IN ('free', 'pro', 'enterprise')
);

-- Update status constraint for account status values
ALTER TABLE account ADD CONSTRAINT account_valid_status_new CHECK (
    status IN ('active', 'restricted', 'suspended')
);
ALTER TABLE account DROP CONSTRAINT account_valid_status;
ALTER TABLE account RENAME CONSTRAINT account_valid_status_new TO account_valid_status;

-- Rename credits_balance to credit_balance
ALTER TABLE account RENAME COLUMN credits_balance TO credit_balance;

-- Update index on status
CREATE INDEX IF NOT EXISTS idx_account_status ON account(status) WHERE deleted_at IS NULL;

-- Update usage_records foreign key reference
-- Note: The FK constraint is implicit through the column name, no explicit FK in migration 001

-- Update foreign key columns in dependent tables
-- Rename organization_id to account_id in api_keys table
ALTER TABLE api_keys RENAME COLUMN organization_id TO account_id;

-- Rename organization_id to account_id in scrape_jobs table
ALTER TABLE scrape_jobs RENAME COLUMN organization_id TO account_id;

-- Rename organization_id to account_id in job_results table
ALTER TABLE job_results RENAME COLUMN organization_id TO account_id;

-- Rename organization_id to account_id in usage_records table
ALTER TABLE usage_records RENAME COLUMN organization_id TO account_id;

-- Drop columns not needed in MVP account model (these are for team features in Phase 10+)
-- We keep them for now to avoid data loss, but they can be dropped in Phase 10 migration
-- ALTER TABLE account DROP COLUMN IF EXISTS slug;
-- ALTER TABLE account DROP COLUMN IF EXISTS billing_email;
-- ALTER TABLE account DROP COLUMN IF EXISTS technical_email;
-- ALTER TABLE account DROP COLUMN IF EXISTS subscription_status;
-- ALTER TABLE account DROP COLUMN IF EXISTS stripe_customer_id;
-- ALTER TABLE account DROP COLUMN IF EXISTS stripe_subscription_id;
-- ALTER TABLE account DROP COLUMN IF EXISTS credits_included_monthly;
-- ALTER TABLE account DROP COLUMN IF EXISTS credits_overage_rate;
-- ALTER TABLE account DROP COLUMN IF EXISTS rate_limit_per_second;
-- ALTER TABLE account DROP COLUMN IF EXISTS max_concurrent_jobs;
-- ALTER TABLE account DROP COLUMN IF EXISTS max_batch_size;
-- ALTER TABLE account DROP COLUMN IF EXISTS data_retention_days;
-- ALTER TABLE account DROP COLUMN IF EXISTS features;
-- ALTER TABLE account DROP COLUMN IF EXISTS metadata;
