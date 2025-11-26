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
    
    // Since we've consolidated all migrations into create_migration.sql,
    // we'll inform the user that this migration is now part of the main migration
    console.log('NOTE: Admin access configurations are now part of the main create_migration.sql file.');
    console.log('To apply these configurations, please run the main migration:');
    console.log('  node db/run_sql.js db/create_migration.sql');
    console.log('');
    console.log('If you only want to update admin access, you can run:');
    console.log('  node db/run_sql.js db/create_migration.sql');
    console.log('');
    console.log('Admin access migration note completed successfully!');
  } catch (error) {
    console.error('Failed to run admin access migration:', error);
    process.exit(1);
  }
}

runMigration();