-- Migration 008: Create subscription table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    
    -- Paystack Integration
    paystack_subscription_code VARCHAR(255) UNIQUE,
    paystack_customer_code VARCHAR(255),
    paystack_plan_code VARCHAR(255),
    
    -- Subscription Details
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
    
    -- Billing Cycle
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Scheduled Changes
    scheduled_plan VARCHAR(20) CHECK (scheduled_plan IN ('free', 'pro', 'enterprise')),
    scheduled_change_date TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT subscription_valid_period CHECK (
        current_period_start IS NULL OR current_period_end IS NULL OR current_period_start < current_period_end
    ),
    CONSTRAINT subscription_valid_scheduled_change CHECK (
        (scheduled_plan IS NULL AND scheduled_change_date IS NULL) OR 
        (scheduled_plan IS NOT NULL AND scheduled_change_date IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_account_id ON subscription(account_id);
CREATE INDEX IF NOT EXISTS idx_subscription_paystack_subscription_code ON subscription(paystack_subscription_code) WHERE paystack_subscription_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);
CREATE INDEX IF NOT EXISTS idx_subscription_period_end ON subscription(current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscription_scheduled_changes ON subscription(scheduled_change_date) WHERE scheduled_plan IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_subscription_timestamp
    BEFORE UPDATE ON subscription
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE subscription IS 'Stores subscription information for accounts';
COMMENT ON COLUMN subscription.cancel_at_period_end IS 'If true, subscription will cancel at end of current period';
COMMENT ON COLUMN subscription.scheduled_plan IS 'Plan to change to at scheduled_change_date (for downgrades)';
