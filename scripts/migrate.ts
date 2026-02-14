#!/usr/bin/env tsx
/**
 * Database Migration Script for Scrapifie
 * 
 * Runs SQL migrations in order from the migrations folder.
 * Tracks executed migrations in a migrations table.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, '../src/db/migrations');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://scrapifie:scrapifie@localhost:5432/scrapifie';

interface MigrationRecord {
  id: number;
  name: string;
  executed_at: Date;
  checksum: string;
}

async function createMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum VARCHAR(64) NOT NULL
    )
  `);
}

async function getExecutedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<MigrationRecord>('SELECT name FROM _migrations ORDER BY id');
  return new Set(result.rows.map(row => row.name));
}

function getMigrationFiles(): string[] {
  try {
    const files = readdirSync(MIGRATIONS_DIR);
    return files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort alphabetically (which works for 001_, 002_, etc.)
  } catch {
    console.error(`Migration directory not found: ${MIGRATIONS_DIR}`);
    return [];
  }
}

function hashContent(content: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function runMigration(pool: Pool, fileName: string): Promise<void> {
  const filePath = join(MIGRATIONS_DIR, fileName);
  const sql = readFileSync(filePath, 'utf-8');
  const checksum = hashContent(sql);

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Execute migration
    await client.query(sql);
    
    // Record migration
    await client.query(
      'INSERT INTO _migrations (name, checksum) VALUES ($1, $2)',
      [fileName, checksum]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Executed: ${fileName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function migrate(): Promise<void> {
  console.log('🚀 Starting database migration...\n');
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Migrations directory: ${MIGRATIONS_DIR}\n`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established\n');

    // Create migrations table
    await createMigrationsTable(pool);
    
    // Get executed migrations
    const executed = await getExecutedMigrations(pool);
    console.log(`📋 Previously executed: ${executed.size} migrations\n`);

    // Get migration files
    const migrationFiles = getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      console.log('⚠️ No migration files found');
      return;
    }

    // Run pending migrations
    let newMigrations = 0;
    for (const fileName of migrationFiles) {
      if (!executed.has(fileName)) {
        await runMigration(pool, fileName);
        newMigrations++;
      }
    }

    if (newMigrations === 0) {
      console.log('\n✅ Database is up to date');
    } else {
      console.log(`\n✅ Executed ${newMigrations} new migration(s)`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function rollback(steps = 1): Promise<void> {
  console.log(`🔄 Rolling back ${steps} migration(s)...\n`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Get last N executed migrations
    const result = await pool.query<MigrationRecord>(
      'SELECT name FROM _migrations ORDER BY id DESC LIMIT $1',
      [steps]
    );

    if (result.rows.length === 0) {
      console.log('⚠️ No migrations to rollback');
      return;
    }

    for (const { name } of result.rows) {
      // Delete migration record (rollback SQL would need to be separate files)
      await pool.query('DELETE FROM _migrations WHERE name = $1', [name]);
      console.log(`🔙 Rolled back: ${name}`);
    }

    console.log(`\n⚠️ Note: Table data was NOT rolled back. Implement down migrations for full rollback.`);

  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function status(): Promise<void> {
  console.log('📊 Migration status\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await createMigrationsTable(pool);
    
    const executed = await getExecutedMigrations(pool);
    const migrationFiles = getMigrationFiles();

    console.log('Executed migrations:');
    for (const name of executed) {
      console.log(`  ✅ ${name}`);
    }

    const pending = migrationFiles.filter(f => !executed.has(f));
    if (pending.length > 0) {
      console.log('\nPending migrations:');
      for (const name of pending) {
        console.log(`  ⏳ ${name}`);
      }
    } else {
      console.log('\n✅ All migrations have been executed');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'up':
  case undefined:
    migrate();
    break;
  case 'down':
    rollback(parseInt(process.argv[3]) || 1);
    break;
  case 'status':
    status();
    break;
  default:
    console.log(`
Usage: npm run db:migrate [command]

Commands:
  up        Run all pending migrations (default)
  down [n]  Rollback last n migrations (default: 1)
  status    Show migration status
    `);
}
