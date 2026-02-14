-- Migration: 007_create_mfa_configuration_table
-- Description: Create mfa_configuration table for TOTP-based multi-factor authentication

CREATE TABLE IF NOT EXISTS mfa_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    backup_codes TEXT,
    backup_codes_remaining INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mfa_configuration_user_id ON mfa_configuration(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_configuration_enabled ON mfa_configuration(user_id) WHERE enabled = TRUE;

-- Trigger for updated_at
CREATE TRIGGER update_mfa_configuration_timestamp
    BEFORE UPDATE ON mfa_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
