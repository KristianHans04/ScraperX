-- Migration: 005_create_email_verification_token_table
-- Description: Create email_verification_token table for email verification

CREATE TABLE IF NOT EXISTS email_verification_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_verification_token_valid_purpose CHECK (
        purpose IN ('registration', 'email_change')
    )
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_token_hash ON email_verification_token(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_token_user_id ON email_verification_token(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_token_expires_at ON email_verification_token(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_token_unused ON email_verification_token(user_id, purpose) WHERE used_at IS NULL;
