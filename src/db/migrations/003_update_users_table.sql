-- Migration: 003_update_users_table
-- Description: Update users table to align with Phase 6 User model

-- Rename organization_id to account_id
ALTER TABLE users RENAME COLUMN organization_id TO account_id;

-- Update foreign key reference (first drop old constraint, then create new one)
-- Find the current FK constraint name first
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
    AND contype = 'f'
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'account_id')];
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add new foreign key to account table
ALTER TABLE users ADD CONSTRAINT users_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE;

-- Remove the unique constraint on organization_id + email (no longer needed in MVP)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_unique_email_per_org;

-- Update email to be globally unique (not per-organization)
-- First, ensure email is lowercase
UPDATE users SET email = LOWER(email);

-- Create partial unique index on email (excluding soft-deleted users)
DROP INDEX IF EXISTS idx_users_email;
CREATE UNIQUE INDEX idx_users_email_unique ON users(LOWER(email)) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(LOWER(email)) WHERE deleted_at IS NULL;

-- Add new columns for Phase 6
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'system';
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_density VARCHAR(10) NOT NULL DEFAULT 'comfortable';
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_failed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);

-- Backfill name from first_name and last_name if they exist
UPDATE users 
SET name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
WHERE name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- For users without names, use email prefix
UPDATE users 
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL OR name = '';

-- Make name NOT NULL after backfill
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

-- Update the role constraint to match Phase 6 (user, admin)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_valid_role;
ALTER TABLE users ADD CONSTRAINT users_valid_role CHECK (role IN ('user', 'admin'));

-- Update role column default
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

-- Update existing roles to match Phase 6
UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'admin');
UPDATE users SET role = 'admin' WHERE role IN ('owner', 'admin');

-- Rename auth_provider to just be tracked through oauth_connections table
-- Keep password_hash column (already exists and is nullable)

-- Set email_verified_at to email_verified
UPDATE users SET email_verified = (email_verified_at IS NOT NULL) WHERE email_verified_at IS NOT NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Update trigger is already in place from migration 001
