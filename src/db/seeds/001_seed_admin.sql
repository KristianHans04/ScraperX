-- Seed: Create admin account and user

-- First, check if admin account already exists to prevent duplicates
DO $$
DECLARE
    admin_account_id UUID;
BEGIN
    -- Check if admin account exists
    SELECT id INTO admin_account_id FROM account WHERE display_name = 'Scrapifie Admin' LIMIT 1;
    
    IF admin_account_id IS NULL THEN
        -- Create admin account
        INSERT INTO account (
            id,
            name,
            display_name,
            slug,
            billing_email,
            plan,
            status,
            credit_balance,
            credits_included_monthly,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Scrapifie Admin',
            'Scrapifie Admin',
            'scrapifie-admin-' || to_char(NOW(), 'YYYYMMDDHHmmss'),
            'admin@example.com',
            'enterprise',
            'active',
            1000000000, -- 1 billion credits for testing
            1000000000,
            NOW(),
            NOW()
        ) RETURNING id INTO admin_account_id;
    END IF;

    -- Check if admin user already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com' AND deleted_at IS NULL) THEN
        -- Create admin user with bcrypt hashed password for '12345678'
        -- Using bcrypt with cost 12: $2b$12$BIgCKx31vZHYiJZ.1Y6amu4K/D3NVvV/zDZQ7rPEwKSXfVRRLdvyW
        INSERT INTO users (
            id,
            account_id,
            email,
            name,
            password_hash,
            role,
            email_verified,
            email_verified_at,
            auth_provider,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            admin_account_id,
            'admin@example.com',
            'Scrapifie Admin',
            '$2b$12$BIgCKx31vZHYiJZ.1Y6amu4K/D3NVvV/zDZQ7rPEwKSXfVRRLdvyW', -- bcrypt hash of '12345678'
            'admin',
            TRUE,
            NOW(),
            'email',
            NOW(),
            NOW()
        );
    ELSE
        -- Update existing admin user password
        UPDATE users 
        SET password_hash = '$2b$12$BIgCKx31vZHYiJZ.1Y6amu4K/D3NVvV/zDZQ7rPEwKSXfVRRLdvyW'
        WHERE email = 'admin@example.com' AND deleted_at IS NULL;
    END IF;

END $$;
