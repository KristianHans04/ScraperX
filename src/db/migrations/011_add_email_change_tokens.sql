-- Migration: 011_add_email_change_tokens
-- Description: Create email change token table for email verification flow (Phase 9)

-- Email change tokens table
CREATE TABLE IF NOT EXISTS email_change_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_email VARCHAR(255) NOT NULL,
    new_email VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    new_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    old_email_notified BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_change_token_valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT email_change_token_different_emails CHECK (LOWER(old_email) != LOWER(new_email)),
    CONSTRAINT email_change_token_used_consistency CHECK (
        (used_at IS NULL AND new_email_verified = FALSE) OR
        (used_at IS NOT NULL AND new_email_verified = TRUE)
    )
);

-- Indexes
CREATE INDEX idx_email_change_token_user_id ON email_change_token(user_id, created_at DESC);
CREATE INDEX idx_email_change_token_token ON email_change_token(token) WHERE used_at IS NULL;
CREATE INDEX idx_email_change_token_expires_at ON email_change_token(expires_at) WHERE used_at IS NULL;
CREATE INDEX idx_email_change_token_new_email ON email_change_token(LOWER(new_email)) WHERE used_at IS NULL;

-- Function to cleanup expired email change tokens
CREATE OR REPLACE FUNCTION cleanup_expired_email_change_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_change_token
    WHERE expires_at < NOW() AND used_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE email_change_token IS 'Tokens for email change verification flow';
COMMENT ON COLUMN email_change_token.old_email IS 'Current email address (for notification)';
COMMENT ON COLUMN email_change_token.new_email IS 'New email address to verify';
COMMENT ON COLUMN email_change_token.token IS 'Cryptographically secure verification token';
COMMENT ON COLUMN email_change_token.new_email_verified IS 'Whether new email has been verified';
COMMENT ON COLUMN email_change_token.old_email_notified IS 'Whether notification was sent to old email';
COMMENT ON COLUMN email_change_token.expires_at IS 'Token expiration (24 hours from creation)';
COMMENT ON COLUMN email_change_token.used_at IS 'Timestamp when email change was completed';
