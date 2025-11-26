// Script to run the inventory features migration
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('Running inventory features migration...');
    
    // Since we've consolidated all migrations into create_migration.sql,
    // we'll inform the user that this migration is now part of the main migration
    console.log('NOTE: Inventory features configurations are now part of the main create_migration.sql file.');
    console.log('To apply these configurations, please run the main migration:');
    console.log('  node db/run_sql.js db/create_migration.sql');
    console.log('');
    console.log('If you only want to update inventory features, you can run:');
    console.log('  node db/run_sql.js db/create_migration.sql');
    console.log('');
    console.log('Inventory features migration note completed successfully!');
  } catch (error) {
    console.error('Failed to run inventory features migration:', error);
    process.exit(1);
  }
}

runMigration();