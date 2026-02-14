-- Migration: Create support_ticket_message table for ticket conversations
-- Phase 10: Admin Dashboard
-- Created: 2026-02-10

CREATE TYPE message_type AS ENUM ('user_message', 'admin_reply', 'internal_note', 'system_message');

CREATE TABLE IF NOT EXISTS support_ticket_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ticket reference
  ticket_id UUID NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,
  
  -- Author information
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('user', 'admin', 'system')),
  
  -- Message details
  message_type message_type NOT NULL,
  content TEXT NOT NULL,
  
  -- Internal notes (visible only to admins)
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  attachments JSONB DEFAULT '[]', -- Array of attachment URLs/metadata
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_ticket_message_ticket_id ON support_ticket_message(ticket_id, created_at ASC);
CREATE INDEX idx_support_ticket_message_author_id ON support_ticket_message(author_id);
CREATE INDEX idx_support_ticket_message_type ON support_ticket_message(message_type);
CREATE INDEX idx_support_ticket_message_is_internal ON support_ticket_message(is_internal);
CREATE INDEX idx_support_ticket_message_created_at ON support_ticket_message(created_at DESC);

-- Update timestamp trigger
CREATE TRIGGER update_support_ticket_message_timestamp
  BEFORE UPDATE ON support_ticket_message
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update ticket's updated_at when message is added
CREATE OR REPLACE FUNCTION update_ticket_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_ticket
  SET updated_at = NEW.created_at,
      first_response_at = CASE
        WHEN first_response_at IS NULL AND NEW.author_type = 'admin' AND NEW.message_type = 'admin_reply'
        THEN NEW.created_at
        ELSE first_response_at
      END
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_on_message
  AFTER INSERT ON support_ticket_message
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_on_new_message();

-- Comments
COMMENT ON TABLE support_ticket_message IS 'Messages within support tickets (user messages, admin replies, internal notes)';
COMMENT ON COLUMN support_ticket_message.is_internal IS 'Internal notes visible only to admins, hidden from users';
COMMENT ON COLUMN support_ticket_message.message_type IS 'Type of message for rendering and notification purposes';
COMMENT ON COLUMN support_ticket_message.attachments IS 'Array of attachment metadata (filename, url, size, type)';
