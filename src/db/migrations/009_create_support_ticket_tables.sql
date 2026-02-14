-- Migration: 009_create_support_ticket_tables
-- Description: Create support ticket system tables (Phase 9)

-- Ticket status enum
CREATE TYPE ticket_status AS ENUM (
    'open',
    'waiting_user',
    'waiting_staff',
    'resolved',
    'closed'
);

-- Ticket priority enum
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Ticket category enum
CREATE TYPE ticket_category AS ENUM (
    'billing',
    'technical',
    'feature_request',
    'bug_report',
    'account',
    'other'
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    category ticket_category NOT NULL DEFAULT 'other',
    priority ticket_priority NOT NULL DEFAULT 'normal',
    status ticket_status NOT NULL DEFAULT 'open',
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ,
    last_reply_at TIMESTAMPTZ,
    last_reply_by_user BOOLEAN,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_ticket_subject_not_empty CHECK (LENGTH(TRIM(subject)) > 0),
    CONSTRAINT support_ticket_resolved_consistency CHECK (
        (status = 'resolved' AND resolved_at IS NOT NULL) OR 
        (status != 'resolved' AND resolved_at IS NULL)
    ),
    CONSTRAINT support_ticket_closed_consistency CHECK (
        (status = 'closed' AND closed_at IS NOT NULL) OR 
        (status != 'closed' AND closed_at IS NULL)
    )
);

-- Ticket messages table
CREATE TABLE IF NOT EXISTS support_ticket_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT support_ticket_message_not_empty CHECK (LENGTH(TRIM(message)) > 0)
);

-- Indexes for support_ticket
CREATE INDEX idx_support_ticket_user_id ON support_ticket(user_id, created_at DESC);
CREATE INDEX idx_support_ticket_account_id ON support_ticket(account_id, created_at DESC);
CREATE INDEX idx_support_ticket_status ON support_ticket(status, created_at DESC);
CREATE INDEX idx_support_ticket_assigned ON support_ticket(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX idx_support_ticket_number ON support_ticket(ticket_number);
CREATE INDEX idx_support_ticket_category ON support_ticket(category);
CREATE INDEX idx_support_ticket_priority ON support_ticket(priority);
CREATE INDEX idx_support_ticket_last_reply ON support_ticket(last_reply_at DESC) WHERE status NOT IN ('closed', 'resolved');
CREATE INDEX idx_support_ticket_auto_close ON support_ticket(resolved_at) WHERE status = 'resolved' AND resolved_at IS NOT NULL;

-- Indexes for support_ticket_message
CREATE INDEX idx_support_ticket_message_ticket_id ON support_ticket_message(ticket_id, created_at ASC);
CREATE INDEX idx_support_ticket_message_user_id ON support_ticket_message(user_id, created_at DESC);
CREATE INDEX idx_support_ticket_message_is_staff ON support_ticket_message(is_staff);

-- Triggers for updated_at
CREATE TRIGGER update_support_ticket_timestamp
    BEFORE UPDATE ON support_ticket
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_support_ticket_message_timestamp
    BEFORE UPDATE ON support_ticket_message
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Function to generate unique ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate format: SCRX-YYYYMM-XXXXX (e.g., SCRX-202602-00001)
        new_number := 'SCRX-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || 
                      LPAD((EXTRACT(EPOCH FROM NOW()) * 1000 + counter)::TEXT, 5, '0');
        
        -- Check if it exists
        IF NOT EXISTS (SELECT 1 FROM support_ticket WHERE ticket_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
        
        -- Safety check to prevent infinite loop
        IF counter > 10000 THEN
            RAISE EXCEPTION 'Failed to generate unique ticket number';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE support_ticket IS 'Support ticket records for customer support system';
COMMENT ON TABLE support_ticket_message IS 'Message thread for support tickets';
COMMENT ON COLUMN support_ticket.ticket_number IS 'Human-readable unique ticket identifier';
COMMENT ON COLUMN support_ticket.last_reply_by_user IS 'TRUE if last reply was from user, FALSE if from staff';
COMMENT ON COLUMN support_ticket.assigned_to_user_id IS 'Admin/staff user assigned to this ticket';
COMMENT ON COLUMN support_ticket_message.is_staff IS 'TRUE if message is from staff/admin';
COMMENT ON COLUMN support_ticket_message.is_internal IS 'TRUE if internal note (not visible to customer)';
COMMENT ON COLUMN support_ticket_message.attachments IS 'Array of attachment metadata (filename, url, size, type)';
