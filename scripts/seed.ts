#!/usr/bin/env tsx
/**
 * Database Seed Script for ScraperX
 * 
 * Seeds the database with initial/demo data for development.
 */

import { Pool } from 'pg';
import { createHash, randomBytes } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://scraperx:scraperx@localhost:5432/scraperx';

// Helper to hash API key
function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

// Helper to generate API key
function generateApiKey(prefix: string = 'sk_test_'): string {
  return `${prefix}${randomBytes(16).toString('hex')}`;
}

interface SeedData {
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    billingEmail: string;
    planId: string;
    creditsBalance: number;
  }>;
  apiKeys: Array<{
    organizationId: string;
    name: string;
    plainKey: string;
  }>;
}

const seedData: SeedData = {
  organizations: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Organization',
      slug: 'demo',
      billingEmail: 'demo@scraperx.dev',
      planId: 'starter',
      creditsBalance: 100000,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Test Enterprise',
      slug: 'test-enterprise',
      billingEmail: 'enterprise@scraperx.dev',
      planId: 'enterprise',
      creditsBalance: 10000000,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Free Tier User',
      slug: 'free-user',
      billingEmail: 'free@scraperx.dev',
      planId: 'free',
      creditsBalance: 1000,
    },
  ],
  apiKeys: [
    {
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Demo API Key',
      plainKey: 'sk_test_demo1234567890abcdef1234567890ab',
    },
    {
      organizationId: '00000000-0000-0000-0000-000000000002',
      name: 'Enterprise API Key',
      plainKey: 'YOUR_STRIPE_LIVE_KEY_HERE',
    },
    {
      organizationId: '00000000-0000-0000-0000-000000000003',
      name: 'Free API Key',
      plainKey: 'sk_test_free1234567890abcdef123456789',
    },
  ],
};

async function clearData(pool: Pool): Promise<void> {
  console.log('🗑️  Clearing existing data...');
  
  await pool.query('DELETE FROM job_results');
  await pool.query('DELETE FROM scrape_jobs');
  await pool.query('DELETE FROM usage_records');
  await pool.query('DELETE FROM api_keys');
  await pool.query('DELETE FROM users');
  await pool.query('DELETE FROM organizations');
  
  console.log('✅ Existing data cleared\n');
}

async function seedOrganizations(pool: Pool): Promise<void> {
  console.log('🏢 Seeding organizations...');
  
  for (const org of seedData.organizations) {
    await pool.query(`
      INSERT INTO organizations (
        id, name, slug, billing_email, plan_id, credits_balance,
        subscription_status, rate_limit_per_second, max_concurrent_jobs
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 
        CASE 
          WHEN $5 = 'free' THEN 1
          WHEN $5 = 'starter' THEN 10
          WHEN $5 = 'growth' THEN 25
          WHEN $5 = 'business' THEN 50
          ELSE 100
        END,
        CASE 
          WHEN $5 = 'free' THEN 5
          WHEN $5 = 'starter' THEN 20
          WHEN $5 = 'growth' THEN 50
          WHEN $5 = 'business' THEN 100
          ELSE 500
        END
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        credits_balance = EXCLUDED.credits_balance
    `, [org.id, org.name, org.slug, org.billingEmail, org.planId, org.creditsBalance]);
    
    console.log(`  ✅ Created organization: ${org.name} (${org.planId})`);
  }
  console.log('');
}

async function seedApiKeys(pool: Pool): Promise<void> {
  console.log('🔑 Seeding API keys...');
  
  for (const key of seedData.apiKeys) {
    const keyPrefix = key.plainKey.slice(0, 12);
    const keyHash = hashApiKey(key.plainKey);
    
    await pool.query(`
      INSERT INTO api_keys (
        organization_id, name, key_prefix, key_hash, 
        scopes, environment, is_active
      ) VALUES ($1, $2, $3, $4, 
        '["scrape:read", "scrape:write", "jobs:read", "jobs:write"]'::jsonb,
        CASE 
          WHEN $3 LIKE 'sk_live_%' THEN 'production'
          ELSE 'development'
        END,
        true
      )
      ON CONFLICT (key_hash) DO UPDATE SET
        name = EXCLUDED.name,
        is_active = true
    `, [key.organizationId, key.name, keyPrefix, keyHash]);
    
    console.log(`  ✅ Created API key: ${keyPrefix}... (${key.name})`);
  }
  console.log('');
}

async function seedSampleJobs(pool: Pool): Promise<void> {
  console.log('📝 Seeding sample scrape jobs...');
  
  const sampleUrls = [
    'https://httpbin.org/html',
    'https://httpbin.org/json',
    'https://example.com',
    'https://httpbin.org/headers',
  ];
  
  const statuses = ['completed', 'completed', 'completed', 'failed'];
  
  for (let i = 0; i < sampleUrls.length; i++) {
    const url = sampleUrls[i];
    const status = statuses[i];
    const urlHash = createHash('sha256').update(url).digest('hex');
    
    await pool.query(`
      INSERT INTO scrape_jobs (
        organization_id, url, url_hash, method, engine, status,
        priority, attempts, max_attempts, credits_estimated,
        created_at, completed_at
      ) VALUES (
        $1, $2, $3, 'GET', 'http', $4,
        5, 1, 3, 1,
        NOW() - INTERVAL '${i + 1} hours',
        ${status === 'completed' ? `NOW() - INTERVAL '${i} hours'` : 'NULL'}
      )
    `, [seedData.organizations[0].id, url, urlHash, status]);
    
    console.log(`  ✅ Created job: ${url} (${status})`);
  }
  console.log('');
}

async function seedUsageRecords(pool: Pool): Promise<void> {
  console.log('📊 Seeding usage records...');
  
  // Create usage records for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - i);
    periodStart.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date(periodStart);
    periodEnd.setHours(23, 59, 59, 999);
    
    const totalRequests = Math.floor(Math.random() * 1000) + 100;
    const successRate = 0.85 + Math.random() * 0.14; // 85-99%
    const successfulRequests = Math.floor(totalRequests * successRate);
    
    await pool.query(`
      INSERT INTO usage_records (
        organization_id, period_start, period_end, granularity,
        total_requests, successful_requests, failed_requests,
        credits_used, http_requests, browser_requests
      ) VALUES (
        $1, $2, $3, 'daily',
        $4, $5, $4 - $5,
        $4 * 2, $4 * 0.7, $4 * 0.3
      )
      ON CONFLICT (organization_id, period_start, granularity) DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        successful_requests = EXCLUDED.successful_requests
    `, [
      seedData.organizations[0].id,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      totalRequests,
      successfulRequests,
    ]);
  }
  
  console.log('  ✅ Created 7 days of usage records\n');
}

async function seed(): Promise<void> {
  console.log('🌱 Starting database seeding...\n');
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');

    const shouldClear = process.argv.includes('--clear') || process.argv.includes('-c');
    
    if (shouldClear) {
      await clearData(pool);
    }

    await seedOrganizations(pool);
    await seedApiKeys(pool);
    await seedSampleJobs(pool);
    await seedUsageRecords(pool);

    console.log('🎉 Seeding completed successfully!\n');
    
    console.log('📋 Test API Keys:');
    for (const key of seedData.apiKeys) {
      console.log(`  ${key.name}: ${key.plainKey}`);
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI
const command = process.argv[2];

if (command === '--help' || command === '-h') {
  console.log(`
Usage: npm run db:seed [options]

Options:
  --clear, -c  Clear existing data before seeding
  --help, -h   Show this help message
  `);
} else {
  seed();
}
