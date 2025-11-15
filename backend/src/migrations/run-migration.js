#!/usr/bin/env node

/**
 * Migration Runner for SupDawg Database
 *
 * Usage:
 *   node run-migration.js <migration-file>
 *   node run-migration.js 001_add_question_type.sql
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load database configuration from environment or defaults
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'supdawg',
  user: process.env.DB_USER || 'supdawg_user',
  password: process.env.DB_PASSWORD || 'supdawg_pass_2025',
});

async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Error: Migration file '${migrationFile}' not found`);
    process.exit(1);
  }

  console.log(`Running migration: ${migrationFile}`);
  console.log('-------------------------------------------');

  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    const client = await pool.connect();

    try {
      // Run the migration SQL
      await client.query(sql);
      console.log('✓ Migration completed successfully');
    } catch (error) {
      console.error('✗ Migration failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get migration file from command line arguments
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-migration.js <migration-file>');
  console.error('Example: node run-migration.js 001_add_question_type.sql');
  process.exit(1);
}

runMigration(migrationFile)
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
