import { initializeDatabase, getPool } from '../src/db/connection.js';
import bcrypt from 'bcrypt';

async function seedAdmin() {
  try {
    console.log('🌱 Initializing database connection...');
    await initializeDatabase();
    
    const pool = getPool();
    
    console.log('🌱 Seeding admin account...');

    // Hash password
    const password = '12345678';
    const passwordHash = await bcrypt.hash(password, 12);
    
    console.log(`Password hash: ${passwordHash}`);
    console.log(`Email: admin@example.com`);

    // Create admin account
    const accountResult = await pool.query(
      `INSERT INTO account (
        name, display_name, slug, billing_email, plan, status, 
        credit_balance, credits_included_monthly, created_at, updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
      RETURNING id`,
      [
        'Scrapifie Admin',
        'Scrapifie Admin',
        'scrapifie-admin-' + Date.now(),
        'admin@example.com',
        'enterprise',
        'active',
        1000000000,
        1000000000,
      ]
    );

    const accountId = accountResult.rows[0].id;
    console.log(`✅ Created account: ${accountId}`);

    // Check if user already exists
    const existingUserResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      ['admin@example.com']
    );

    if (existingUserResult.rows.length > 0) {
      // Update existing user
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, role = 'admin', email_verified = true, updated_at = NOW()
         WHERE email = $2 AND deleted_at IS NULL`,
        [passwordHash, 'admin@example.com']
      );
      console.log(`✅ Updated existing user: admin@example.com`);
    } else {
      // Create new user
      const userResult = await pool.query(
        `INSERT INTO users (
          account_id, email, name, password_hash, role, 
          email_verified, email_verified_at, auth_provider, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), NOW())
        RETURNING id, email`,
        [
          accountId,
          'admin@example.com',
          'Scrapifie Admin',
          passwordHash,
          'admin',
          true,
          'email',
        ]
      );

      const user = userResult.rows[0];
      console.log(`✅ Created user: ${user.email}`);
    }

    console.log(`\n🎉 Admin account seeded successfully!`);
    console.log(`\n📝 Login credentials:`);
    console.log(`   Email: admin@example.com`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  } finally {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  }
}

seedAdmin();
