import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
});

async function runMigration() {
  try {
    // Read the migration SQL file
    const migrationSql = fs.readFileSync(path.join(__dirname, 'migrate_department_access_to_roles.sql'), 'utf8');
    
    // Run the migration
    const client = await pool.connect();
    await client.query(migrationSql);
    client.release();
    
    console.log('Migration completed successfully!');
    console.log('Existing department page access has been copied to default roles.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();