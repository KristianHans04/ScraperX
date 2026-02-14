-- Migration 015: Create refund table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS refund (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
    credit_pack_purchase_id UUID REFERENCES credit_pack_purchase(id) ON DELETE SET NULL,
    
    -- Paystack Integration
    paystack_refund_id VARCHAR(255) UNIQUE,
    
    -- Refund Details
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
    
    -- Reason
    reason VARCHAR(30) NOT NULL CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
    description TEXT,
    
    -- Dates
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Requested By
    requested_by_user_id UUID,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT refund_valid_status_dates CHECK (
        (status IN ('succeeded', 'failed') AND processed_at IS NOT NULL) OR
        (status IN ('pending', 'canceled') AND processed_at IS NULL)
    ),
    CONSTRAINT refund_valid_target CHECK (
        (invoice_id IS NOT NULL AND credit_pack_purchase_id IS NULL) OR
        (invoice_id IS NULL AND credit_pack_purchase_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refund_account_id ON refund(account_id);
CREATE INDEX IF NOT EXISTS idx_refund_invoice_id ON refund(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refund_purchase_id ON refund(credit_pack_purchase_id) WHERE credit_pack_purchase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refund_status ON refund(status);
CREATE INDEX IF NOT EXISTS idx_refund_paystack_id ON refund(paystack_refund_id) WHERE paystack_refund_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_refund_timestamp
    BEFORE UPDATE ON refund
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE refund IS 'Tracks refund requests and their status';
COMMENT ON CONSTRAINT refund_valid_target IS 'Refund must target either an invoice or credit pack purchase, not both';
