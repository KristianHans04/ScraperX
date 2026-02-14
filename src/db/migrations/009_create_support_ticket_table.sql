-- Migration: Create support_ticket table for user support system
-- Phase 10: Admin Dashboard
-- Created: 2026-02-10

CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE ticket_category AS ENUM (
  'technical',
  'billing',
  'account',
  'feature_request',
  'bug_report',
  'abuse_report',
  'other'
);

CREATE TABLE IF NOT EXISTS support_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL, -- Human-readable: TKT-XXXXXX
  
  -- User information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES account(id) ON DELETE RESTRICT,
  
  -- Ticket details
  subject VARCHAR(255) NOT NULL,
  category ticket_category NOT NULL DEFAULT 'other',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  status ticket_status NOT NULL DEFAULT 'open',
  
  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Metadata
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_ticket_user_id ON support_ticket(user_id);
CREATE INDEX idx_support_ticket_account_id ON support_ticket(account_id);
CREATE INDEX idx_support_ticket_status ON support_ticket(status);
CREATE INDEX idx_support_ticket_priority ON support_ticket(priority);
CREATE INDEX idx_support_ticket_assigned_to ON support_ticket(assigned_to);
CREATE INDEX idx_support_ticket_created_at ON support_ticket(created_at DESC);
CREATE INDEX idx_support_ticket_updated_at ON support_ticket(updated_at DESC);

-- Composite indexes for admin queue filtering
CREATE INDEX idx_support_ticket_status_priority ON support_ticket(status, priority DESC, updated_at DESC);
CREATE INDEX idx_support_ticket_assigned_status ON support_ticket(assigned_to, status, updated_at DESC);

-- Unique constraint on ticket_number
CREATE UNIQUE INDEX idx_support_ticket_number ON support_ticket(ticket_number);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(NEXTVAL('support_ticket_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START 100001;

-- Trigger to auto-generate ticket number
CREATE TRIGGER set_support_ticket_number
  BEFORE INSERT ON support_ticket
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION generate_ticket_number();

-- Update timestamp trigger
CREATE TRIGGER update_support_ticket_timestamp
  BEFORE UPDATE ON support_ticket
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE support_ticket IS 'User support tickets with admin assignment and tracking';
COMMENT ON COLUMN support_ticket.ticket_number IS 'Human-readable ticket identifier (TKT-XXXXXX)';
COMMENT ON COLUMN support_ticket.first_response_at IS 'When admin first replied to ticket';
COMMENT ON COLUMN support_ticket.resolved_at IS 'When ticket status changed to resolved';
COMMENT ON COLUMN support_ticket.closed_at IS 'When ticket status changed to closed';
