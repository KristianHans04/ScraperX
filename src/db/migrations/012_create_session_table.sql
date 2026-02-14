-- Migration: 012_create_session_table
-- Description: Create user_session table for "active sessions" view (Phase 9)
-- Note: Auth tokens still stored in Redis; this table tracks session metadata for UI

-- User sessions table (for "active sessions" list in Security settings)
CREATE TABLE IF NOT EXISTS user_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(64) NOT NULL,
    device_type VARCHAR(20),
    device_name VARCHAR(100),
    browser VARCHAR(50),
    os VARCHAR(50),
    ip_address INET,
    location_country VARCHAR(2),
    location_city VARCHAR(100),
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT user_session_valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT user_session_device_type_valid CHECK (
        device_type IS NULL OR device_type IN ('desktop', 'mobile', 'tablet')
    )
);

-- Indexes
CREATE INDEX idx_user_session_user_id ON user_session(user_id, last_activity_at DESC);
CREATE INDEX idx_user_session_token_hash ON user_session(session_token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_session_active ON user_session(user_id) WHERE revoked_at IS NULL AND expires_at > NOW();
CREATE INDEX idx_user_session_expires_at ON user_session(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_session_last_activity ON user_session(last_activity_at DESC);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_session
    WHERE expires_at < NOW() AND revoked_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke all sessions for a user (except optionally current)
CREATE OR REPLACE FUNCTION revoke_user_sessions(
    p_user_id UUID,
    p_except_session_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    revoked_count INTEGER;
BEGIN
    UPDATE user_session
    SET revoked_at = NOW()
    WHERE user_id = p_user_id
      AND revoked_at IS NULL
      AND (p_except_session_id IS NULL OR id != p_except_session_id);
    
    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    RETURN revoked_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE user_session IS 'User session metadata for Security settings "Active Sessions" view';
COMMENT ON COLUMN user_session.session_token_hash IS 'SHA-256 hash of session token (for correlation with Redis)';
COMMENT ON COLUMN user_session.device_type IS 'Device category (desktop, mobile, tablet)';
COMMENT ON COLUMN user_session.device_name IS 'Parsed device name from User-Agent';
COMMENT ON COLUMN user_session.browser IS 'Browser name and version';
COMMENT ON COLUMN user_session.os IS 'Operating system name and version';
COMMENT ON COLUMN user_session.ip_address IS 'IP address of session';
COMMENT ON COLUMN user_session.location_country IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN user_session.location_city IS 'City name (optional)';
COMMENT ON COLUMN user_session.is_current IS 'TRUE if this is the current session making the request';
COMMENT ON COLUMN user_session.last_activity_at IS 'Last request timestamp';
COMMENT ON COLUMN user_session.revoked_at IS 'Timestamp when session was manually revoked';
