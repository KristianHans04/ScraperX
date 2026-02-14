-- Migration: 008_create_notification_table
-- Description: Create notification table for in-app notifications (Phase 9)

-- Notification types enum
CREATE TYPE notification_type AS ENUM (
    'support_reply',
    'support_resolved',
    'billing_payment_success',
    'billing_payment_failed',
    'billing_credit_low',
    'billing_plan_changed',
    'security_password_changed',
    'security_email_changed',
    'security_mfa_enabled',
    'security_mfa_disabled',
    'system_maintenance',
    'system_feature',
    'api_key_created',
    'api_key_revoked',
    'job_failed_high_rate'
);

-- Notification priorities
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Notifications table
CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'normal',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    action_text VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT notification_message_not_empty CHECK (LENGTH(TRIM(message)) > 0)
);

-- Indexes for efficient querying
CREATE INDEX idx_notification_user_id ON notification(user_id, created_at DESC);
CREATE INDEX idx_notification_user_unread ON notification(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notification_created_at ON notification(created_at DESC);
CREATE INDEX idx_notification_type ON notification(type);

-- Comments
COMMENT ON TABLE notification IS 'In-app notifications for users';
COMMENT ON COLUMN notification.type IS 'Category of notification for filtering and routing';
COMMENT ON COLUMN notification.priority IS 'Display priority (affects UI presentation)';
COMMENT ON COLUMN notification.action_url IS 'Optional URL for notification action button';
COMMENT ON COLUMN notification.action_text IS 'Optional text for action button';
COMMENT ON COLUMN notification.metadata IS 'Additional context data (ticket_id, invoice_id, etc.)';
COMMENT ON COLUMN notification.read_at IS 'Timestamp when user marked notification as read';
