// Script to run the admin access migration
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('Running admin access migration...');
    
    // Run the SQL file using the existing run_sql.js script
    const { stdout, stderr } = await execPromise('node db/run_sql.js db/ensure_admin_access.sql');
    
    if (stderr) {
      console.error('Error running migration:', stderr);
      process.exit(1);
    }
    
    console.log('Admin access migration completed successfully!');
    console.log(stdout);
  } catch (error) {
    console.error('Failed to run admin access migration:', error);
    process.exit(1);
  }
}

runMigration();