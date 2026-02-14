-- Migration: 013_add_team_preparation_fields
-- Description: Prepare database for future team/organization features (Phase 9)
-- Note: This migration adds fields needed for Phase 10+ but does not build team UI yet

-- Add team-related fields to account table
ALTER TABLE account ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255);
ALTER TABLE account ADD COLUMN IF NOT EXISTS organization_slug VARCHAR(100);
ALTER TABLE account ADD COLUMN IF NOT EXISTS is_team_account BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE account ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE account ADD COLUMN IF NOT EXISTS seat_limit INTEGER NOT NULL DEFAULT 1;

-- Add indexes for team features
CREATE INDEX IF NOT EXISTS idx_account_organization_slug ON account(organization_slug) WHERE organization_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_is_team ON account(is_team_account) WHERE is_team_account = TRUE;

-- Add constraints
ALTER TABLE account ADD CONSTRAINT account_positive_seat_count CHECK (seat_count > 0);
ALTER TABLE account ADD CONSTRAINT account_positive_seat_limit CHECK (seat_limit > 0);
ALTER TABLE account ADD CONSTRAINT account_seats_within_limit CHECK (seat_count <= seat_limit);
ALTER TABLE account ADD CONSTRAINT account_team_has_org_name CHECK (
    (is_team_account = FALSE) OR 
    (is_team_account = TRUE AND organization_name IS NOT NULL)
);

-- Update users table for team features
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_primary_owner BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ;

-- Add indexes for team member queries
CREATE INDEX IF NOT EXISTS idx_users_primary_owner ON users(account_id) WHERE is_primary_owner = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_user_id) WHERE invited_by_user_id IS NOT NULL;

-- Function to set primary owner for existing accounts
DO $$
DECLARE
    account_record RECORD;
    first_user_id UUID;
BEGIN
    FOR account_record IN SELECT id FROM account LOOP
        -- Find the oldest user for this account
        SELECT id INTO first_user_id
        FROM users
        WHERE account_id = account_record.id
          AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Set as primary owner if user exists
        IF first_user_id IS NOT NULL THEN
            UPDATE users
            SET is_primary_owner = TRUE
            WHERE id = first_user_id;
        END IF;
    END LOOP;
END $$;

-- Comments
COMMENT ON COLUMN account.organization_name IS 'Organization/team name (for team accounts)';
COMMENT ON COLUMN account.organization_slug IS 'URL-friendly organization identifier';
COMMENT ON COLUMN account.is_team_account IS 'TRUE if account has multiple team members';
COMMENT ON COLUMN account.seat_count IS 'Current number of active team members';
COMMENT ON COLUMN account.seat_limit IS 'Maximum allowed team members (per plan)';
COMMENT ON COLUMN users.is_primary_owner IS 'TRUE if user is the account owner (cannot be removed)';
COMMENT ON COLUMN users.invited_by_user_id IS 'User who sent the team invitation';
COMMENT ON COLUMN users.invitation_accepted_at IS 'When user accepted team invitation';
