-- Migration: Create refund_request table for refund management
-- Phase 10: Admin Dashboard
-- Created: 2026-02-10

CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'denied', 'processing', 'completed', 'failed');
CREATE TYPE refund_type AS ENUM ('full', 'partial', 'credit_adjustment');

CREATE TABLE IF NOT EXISTS refund_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES account(id) ON DELETE RESTRICT,
  invoice_id VARCHAR(100), -- External invoice ID (from payment processor)
  
  -- Refund details
  refund_type refund_type NOT NULL,
  status refund_status NOT NULL DEFAULT 'pending',
  
  -- Amounts (in cents)
  original_amount INTEGER NOT NULL,
  refund_amount INTEGER NOT NULL,
  
  -- Request information
  reason TEXT NOT NULL,
  user_notes TEXT,
  
  -- Admin review
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  
  -- Processing
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- External reference
  payment_processor VARCHAR(50), -- 'stripe', 'paypal', etc.
  processor_refund_id VARCHAR(255), -- External refund ID from processor
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_refund_request_user_id ON refund_request(user_id);
CREATE INDEX idx_refund_request_account_id ON refund_request(account_id);
CREATE INDEX idx_refund_request_status ON refund_request(status);
CREATE INDEX idx_refund_request_invoice_id ON refund_request(invoice_id);
CREATE INDEX idx_refund_request_created_at ON refund_request(created_at DESC);

-- Composite index for admin queue
CREATE INDEX idx_refund_request_status_created ON refund_request(status, created_at DESC);

-- Update timestamp trigger
CREATE TRIGGER update_refund_request_timestamp
  BEFORE UPDATE ON refund_request
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE refund_request IS 'User refund requests for admin review and processing';
COMMENT ON COLUMN refund_request.original_amount IS 'Original transaction amount in cents';
COMMENT ON COLUMN refund_request.refund_amount IS 'Amount to refund in cents (may be partial)';
COMMENT ON COLUMN refund_request.processor_refund_id IS 'External refund ID from payment processor for tracking';
