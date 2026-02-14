-- Migration 009: Create payment_method table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS payment_method (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    
    -- Paystack Integration
    paystack_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Payment Method Details
    type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'bank_account', 'sepa_debit', 'us_bank_account')),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Card Details (if type = 'card')
    card_brand VARCHAR(20),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER CHECK (card_exp_month BETWEEN 1 AND 12),
    card_exp_year INTEGER CHECK (card_exp_year >= 2020),
    
    -- Bank Details (if type = 'bank_account' or similar)
    bank_name VARCHAR(255),
    bank_last4 VARCHAR(4),
    
    -- Billing Details
    billing_name VARCHAR(255),
    billing_email VARCHAR(255),
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(255),
    billing_state VARCHAR(255),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(2),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_method_account_id ON payment_method(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_paystack_id ON payment_method(paystack_payment_method_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_method_default ON payment_method(account_id) WHERE is_default = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_payment_method_timestamp
    BEFORE UPDATE ON payment_method
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Comments
COMMENT ON TABLE payment_method IS 'Stores payment methods for accounts (Paystack PaymentMethod objects)';
COMMENT ON COLUMN payment_method.is_default IS 'Only one payment method per account can be default';
COMMENT ON INDEX idx_payment_method_default IS 'Ensures only one default payment method per account';
