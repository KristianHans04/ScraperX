-- Migration 016: Add billing fields to account table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

-- Add Paystack integration fields
ALTER TABLE account ADD COLUMN IF NOT EXISTS paystack_customer_code VARCHAR(255) UNIQUE;
ALTER TABLE account ADD COLUMN IF NOT EXISTS paystack_subscription_code VARCHAR(255) UNIQUE;

-- Add billing email (can be different from user email)
ALTER TABLE account ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);

-- Add billing cycle dates
ALTER TABLE account ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ;
ALTER TABLE account ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ;

-- Add last payment date
ALTER TABLE account ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_paystack_customer_code ON account(paystack_customer_code) WHERE paystack_customer_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_paystack_subscription_code ON account(paystack_subscription_code) WHERE paystack_subscription_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_billing_cycle_end ON account(billing_cycle_end) WHERE billing_cycle_end IS NOT NULL AND status = 'active';

-- Comments
COMMENT ON COLUMN account.paystack_customer_code IS 'Paystack Customer Code for billing integration';
COMMENT ON COLUMN account.paystack_subscription_code IS 'Current active Paystack Subscription Code';
COMMENT ON COLUMN account.billing_email IS 'Email for billing notifications (if different from user email)';
COMMENT ON COLUMN account.billing_cycle_start IS 'Start date of current billing cycle';
COMMENT ON COLUMN account.billing_cycle_end IS 'End date of current billing cycle';
COMMENT ON COLUMN account.last_payment_at IS 'Date of last successful payment';
