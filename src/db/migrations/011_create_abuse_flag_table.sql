-- Migration: Create abuse_flag table for abuse detection and moderation
-- Phase 10: Admin Dashboard
-- Created: 2026-02-10

CREATE TYPE abuse_signal_type AS ENUM (
  'high_credit_consumption',      -- >10,000 credits in 1 hour
  'rapid_api_key_creation',       -- >10 keys in 1 day
  'failed_request_pattern',       -- >50% failure rate over 1000 requests
  'unusual_traffic_pattern',      -- Sudden 10x spike
  'multiple_account_creation'     -- >3 accounts from same IP in 1 day
);

CREATE TYPE abuse_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE abuse_flag_status AS ENUM ('active', 'investigating', 'resolved', 'false_positive');

CREATE TABLE IF NOT EXISTS abuse_flag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flagged entity
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES account(id) ON DELETE CASCADE,
  
  -- Signal details
  signal_type abuse_signal_type NOT NULL,
  severity abuse_severity NOT NULL DEFAULT 'medium',
  status abuse_flag_status NOT NULL DEFAULT 'active',
  
  -- Detection metadata
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  threshold_value NUMERIC, -- The threshold that was exceeded
  actual_value NUMERIC,    -- The actual value detected
  
  -- Evidence
  evidence JSONB NOT NULL DEFAULT '{}', -- Signal-specific evidence data
  
  -- Investigation and resolution
  investigated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  investigated_at TIMESTAMPTZ,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  
  -- Actions taken
  action_taken VARCHAR(50), -- 'none', 'warning_sent', 'rate_limited', 'suspended', 'banned'
  action_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_abuse_flag_user_id ON abuse_flag(user_id);
CREATE INDEX idx_abuse_flag_account_id ON abuse_flag(account_id);
CREATE INDEX idx_abuse_flag_signal_type ON abuse_flag(signal_type);
CREATE INDEX idx_abuse_flag_severity ON abuse_flag(severity);
CREATE INDEX idx_abuse_flag_status ON abuse_flag(status);
CREATE INDEX idx_abuse_flag_detected_at ON abuse_flag(detected_at DESC);

-- Composite index for admin queue
CREATE INDEX idx_abuse_flag_status_severity ON abuse_flag(status, severity DESC, detected_at DESC);

-- Update timestamp trigger
CREATE TRIGGER update_abuse_flag_timestamp
  BEFORE UPDATE ON abuse_flag
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE abuse_flag IS 'Automated abuse detection flags for admin review and enforcement';
COMMENT ON COLUMN abuse_flag.signal_type IS 'Type of abuse signal detected by automated system';
COMMENT ON COLUMN abuse_flag.severity IS 'Calculated severity based on signal type and values';
COMMENT ON COLUMN abuse_flag.evidence IS 'Signal-specific evidence (API logs, patterns, timestamps)';
COMMENT ON COLUMN abuse_flag.action_taken IS 'Enforcement action taken by admin after investigation';
