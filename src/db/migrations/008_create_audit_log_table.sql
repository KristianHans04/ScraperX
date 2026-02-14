-- Migration: Create audit_log table for immutable admin action tracking
-- Phase 10: Admin Dashboard
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  
  -- Actor information
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  admin_email VARCHAR(255) NOT NULL,
  
  -- Action details
  action VARCHAR(100) NOT NULL, -- e.g., 'user.suspend', 'ticket.reply', 'config.update'
  category VARCHAR(50) NOT NULL, -- e.g., 'user_management', 'support', 'financial', 'operations', 'content'
  
  -- Resource information
  resource_type VARCHAR(50) NOT NULL, -- e.g., 'user', 'ticket', 'invoice', 'config'
  resource_id VARCHAR(255), -- ID of the affected resource
  
  -- Context and metadata
  details JSONB NOT NULL DEFAULT '{}', -- Action-specific details
  ip_address INET,
  user_agent TEXT,
  
  -- Immutability
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_admin_id ON audit_log(admin_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_category ON audit_log(category);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Composite index for filtered queries
CREATE INDEX idx_audit_log_admin_category_created ON audit_log(admin_id, category, created_at DESC);

-- Prevent updates and deletes to maintain immutability
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit log records cannot be modified';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit log records cannot be deleted';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutability
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Comments
COMMENT ON TABLE audit_log IS 'Immutable log of all admin actions for compliance and security auditing';
COMMENT ON COLUMN audit_log.action IS 'Specific action performed (e.g., user.suspend, ticket.reply)';
COMMENT ON COLUMN audit_log.category IS 'High-level category for filtering (user_management, support, financial, operations, content)';
COMMENT ON COLUMN audit_log.details IS 'Action-specific metadata (old/new values, reason, affected fields)';
