-- Migration: 004_create_oauth_connection_table
-- Description: Create oauth_connection table for OAuth provider authentication

CREATE TABLE IF NOT EXISTS oauth_connection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255) NOT NULL,
    access_token VARCHAR(500),
    refresh_token VARCHAR(500),
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT oauth_connection_valid_provider CHECK (
        provider IN ('google', 'github')
    ),
    CONSTRAINT oauth_connection_unique_provider_user UNIQUE (provider, provider_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_connection_user_id ON oauth_connection(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_connection_provider ON oauth_connection(provider, provider_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_oauth_connection_timestamp
    BEFORE UPDATE ON oauth_connection
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
