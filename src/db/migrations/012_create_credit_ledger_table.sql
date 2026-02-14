-- Migration 012: Create credit_ledger table
-- Phase 8: Billing and Credits
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    
    -- Transaction Type
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'allocation',        -- Monthly allocation from plan
        'purchase',          -- Credit pack purchase
        'deduction',         -- Job completion
        'deduction_failure', -- Job failure (partial refund)
        'reservation',       -- Reserved for pending job
        'release',           -- Released from canceled job
        'adjustment',        -- Manual adjustment
        'refund',            -- Refund
        'reset',             -- Cycle reset
        'bonus'              -- Promotional bonus
    )),
    
    -- Amounts
    amount BIGINT NOT NULL,
    balance_before BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    
    -- Related Records
    scrape_job_id UUID,
    credit_pack_purchase_id UUID,
    invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
    
    -- Description
    description TEXT NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT credit_ledger_valid_balance CHECK (
        balance_after = balance_before + amount
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_ledger_account_id ON credit_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON credit_ledger(type);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON credit_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_job_id ON credit_ledger(scrape_job_id) WHERE scrape_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_ledger_purchase_id ON credit_ledger(credit_pack_purchase_id) WHERE credit_pack_purchase_id IS NOT NULL;

-- Comments
COMMENT ON TABLE credit_ledger IS 'Immutable audit log of all credit transactions';
COMMENT ON COLUMN credit_ledger.amount IS 'Amount changed (positive for credits added, negative for deductions)';
COMMENT ON COLUMN credit_ledger.balance_before IS 'Account balance before this transaction';
COMMENT ON COLUMN credit_ledger.balance_after IS 'Account balance after this transaction (must equal balance_before + amount)';
