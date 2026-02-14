-- Migration 011: Create invoice_line_item table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS invoice_line_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
    
    -- Line Item Details
    type VARCHAR(30) NOT NULL CHECK (type IN ('subscription', 'credit_pack', 'proration', 'tax', 'discount', 'refund', 'other')),
    description TEXT NOT NULL,
    
    -- Quantity and Price
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_amount BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    
    -- Currency
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Period Covered (for subscription line items)
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Related Records
    credit_pack_purchase_id UUID,
    subscription_id UUID REFERENCES subscription(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT invoice_line_item_valid_amounts CHECK (
        quantity > 0 AND amount = quantity * unit_amount
    ),
    CONSTRAINT invoice_line_item_valid_period CHECK (
        period_start IS NULL OR period_end IS NULL OR period_start < period_end
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_line_item_invoice_id ON invoice_line_item(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_item_type ON invoice_line_item(type);
CREATE INDEX IF NOT EXISTS idx_invoice_line_item_subscription_id ON invoice_line_item(subscription_id) WHERE subscription_id IS NOT NULL;

-- Comments
COMMENT ON TABLE invoice_line_item IS 'Line items for invoices (charges, credits, adjustments)';
COMMENT ON COLUMN invoice_line_item.amount IS 'Calculated as quantity * unit_amount';
