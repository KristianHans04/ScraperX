-- Migration 014: Create payment_failure table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS payment_failure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscription(id) ON DELETE SET NULL,
    
    -- Failure Details
    failure_code VARCHAR(100),
    failure_message TEXT,
    
    -- Escalation State
    escalation_stage VARCHAR(20) NOT NULL CHECK (escalation_stage IN ('grace', 'retry', 'restricted', 'suspended', 'canceled')),
    
    -- Dates
    first_failed_at TIMESTAMPTZ NOT NULL,
    last_retry_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    grace_period_end TIMESTAMPTZ,
    restricted_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Retry Tracking
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 4,
    
    -- Resolution
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by VARCHAR(20) CHECK (resolved_by IN ('payment_succeeded', 'payment_method_updated', 'manual_resolution', 'subscription_canceled')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT payment_failure_resolved_fields CHECK (
        (is_resolved = TRUE AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL) OR
        (is_resolved = FALSE AND resolved_at IS NULL AND resolved_by IS NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_failure_account_id ON payment_failure(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_failure_escalation_stage ON payment_failure(escalation_stage) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_failure_next_retry ON payment_failure(next_retry_at) WHERE next_retry_at IS NOT NULL AND is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_failure_is_resolved ON payment_failure(is_resolved);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_failure_active_per_account ON payment_failure(account_id) WHERE is_resolved = FALSE;

-- Trigger for updated_at
CREATE TRIGGER update_payment_failure_timestamp
    BEFORE UPDATE ON payment_failure
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE payment_failure IS 'Tracks payment failures and escalation stages';
COMMENT ON COLUMN payment_failure.escalation_stage IS 'Current stage in failed payment escalation ladder';
COMMENT ON COLUMN payment_failure.grace_period_end IS 'End of grace period (days 0-3)';
COMMENT ON INDEX idx_payment_failure_active_per_account IS 'Ensures only one active payment failure per account';
