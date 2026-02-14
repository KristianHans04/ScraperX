-- Migration: 010_add_user_preferences
-- Description: Add user notification and appearance preferences (Phase 9)

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preference (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_preference_unique_user_category UNIQUE (user_id, category),
    CONSTRAINT notification_preference_category_not_empty CHECK (LENGTH(TRIM(category)) > 0)
);

-- Indexes
CREATE INDEX idx_notification_preference_user_id ON notification_preference(user_id);
CREATE INDEX idx_notification_preference_category ON notification_preference(category);

-- Trigger for updated_at
CREATE TRIGGER update_notification_preference_timestamp
    BEFORE UPDATE ON notification_preference
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Function to initialize default notification preferences for a user
CREATE OR REPLACE FUNCTION initialize_notification_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert default preferences for all categories
    INSERT INTO notification_preference (user_id, category, email_enabled, in_app_enabled)
    VALUES
        (p_user_id, 'support', TRUE, TRUE),
        (p_user_id, 'billing', TRUE, TRUE),
        (p_user_id, 'security', TRUE, TRUE),
        (p_user_id, 'system', FALSE, TRUE),
        (p_user_id, 'marketing', FALSE, FALSE)
    ON CONFLICT (user_id, category) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE notification_preference IS 'User notification preferences per category';
COMMENT ON COLUMN notification_preference.category IS 'Notification category (support, billing, security, system, marketing)';
COMMENT ON COLUMN notification_preference.email_enabled IS 'Whether to send email notifications for this category';
COMMENT ON COLUMN notification_preference.in_app_enabled IS 'Whether to show in-app notifications for this category';
