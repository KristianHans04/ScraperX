-- Migration 013: Create credit_pack_purchase table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS credit_pack_purchase (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
    
    -- Paystack Integration
    paystack_payment_reference VARCHAR(255) UNIQUE,
    
    -- Purchase Details
    pack_size BIGINT NOT NULL CHECK (pack_size > 0),
    amount_paid BIGINT NOT NULL CHECK (amount_paid > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    
    -- Dates
    purchased_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    
    -- Payment Details
    payment_method_id UUID REFERENCES payment_method(id) ON DELETE SET NULL,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT credit_pack_valid_status_dates CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_pack_purchase_account_id ON credit_pack_purchase(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_pack_purchase_status ON credit_pack_purchase(status);
CREATE INDEX IF NOT EXISTS idx_credit_pack_purchase_created_at ON credit_pack_purchase(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_pack_purchase_paystack_ref ON credit_pack_purchase(paystack_payment_reference) WHERE paystack_payment_reference IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_credit_pack_purchase_timestamp
    BEFORE UPDATE ON credit_pack_purchase
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE credit_pack_purchase IS 'Records of one-time credit pack purchases (Pro and Enterprise only)';
COMMENT ON COLUMN credit_pack_purchase.pack_size IS 'Number of credits purchased';
COMMENT ON COLUMN credit_pack_purchase.amount_paid IS 'Amount paid in smallest currency unit (cents)';
