import pkg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    // Use the same DATABASE_URL as in the backend
    const DATABASE_URL = 'postgres://postgres:password@localhost:5433/office';
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
    });

    // Read and execute the migration file
    const migrationPath = path.join(__dirname, 'db', 'remove_admin_hr_approvals_access.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration:', migrationPath);
    console.log('SQL:', migrationSQL);
    
    const result = await pool.query(migrationSQL);
    console.log('Migration executed successfully');
    console.log('Rows affected:', result.rowCount);

    await pool.end();
  } catch (err) {
    console.error('Error running migration:', err.message);
  }
}

runMigration();