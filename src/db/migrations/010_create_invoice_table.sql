-- Migration 010: Create invoice table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS invoice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscription(id) ON DELETE SET NULL,
    
    -- Paystack Integration
    paystack_invoice_id VARCHAR(255) UNIQUE,
    
    -- Invoice Details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    
    -- Amounts (in cents/smallest currency unit)
    subtotal BIGINT NOT NULL DEFAULT 0,
    tax BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL DEFAULT 0,
    amount_paid BIGINT NOT NULL DEFAULT 0,
    amount_due BIGINT NOT NULL DEFAULT 0,
    
    -- Currency
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Dates
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    
    -- Period Covered
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Payment Details
    payment_method_id UUID REFERENCES payment_method(id) ON DELETE SET NULL,
    payment_intent_id VARCHAR(255),
    
    -- Billing Details
    billing_name VARCHAR(255),
    billing_email VARCHAR(255),
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(255),
    billing_state VARCHAR(255),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(2),
    
    -- PDF
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    
    -- Metadata
    description TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT invoice_valid_amounts CHECK (
        subtotal >= 0 AND tax >= 0 AND total >= 0 AND 
        amount_paid >= 0 AND amount_due >= 0 AND
        total = subtotal + tax
    ),
    CONSTRAINT invoice_valid_period CHECK (
        period_start IS NULL OR period_end IS NULL OR period_start < period_end
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_account_id ON invoice(account_id);
CREATE INDEX IF NOT EXISTS idx_invoice_subscription_id ON invoice(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_paystack_id ON invoice(paystack_invoice_id) WHERE paystack_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice(status);
CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoice(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_due_date ON invoice(due_date) WHERE status IN ('open', 'uncollectible');

-- Trigger for updated_at
CREATE TRIGGER update_invoice_timestamp
    BEFORE UPDATE ON invoice
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    year_month TEXT;
BEGIN
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number FROM 8) AS INTEGER)
    ), 0) + 1
    INTO next_num
    FROM invoice
    WHERE invoice_number LIKE 'INV-' || year_month || '%';
    
    RETURN 'INV-' || year_month || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE invoice IS 'Stores invoices for subscriptions and one-time charges';
COMMENT ON COLUMN invoice.invoice_number IS 'Human-readable invoice number (e.g., INV-202602-00001)';
COMMENT ON FUNCTION generate_invoice_number IS 'Generates sequential invoice numbers per month';
