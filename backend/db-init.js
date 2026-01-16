import { spawn } from 'child_process';
import { resolve } from 'path';

// Run the run_migration.sh script to initialize the database
console.log('Initializing database with run_migration.sh...');

// Get the path to the run_migration.sh script
const migrationScriptPath = resolve('./db/run_migration.sh');

// Spawn the shell script
const runMigration = spawn('sh', [migrationScriptPath], {
  cwd: resolve('./db'),
  stdio: 'inherit'
});

runMigration.on('close', (code) => {
  if (code === 0) {
    console.log('Database initialization completed successfully.');
  } else {
    console.error(`Database initialization failed with code: ${code}`);
    process.exit(code);
  }
});

runMigration.on('error', (error) => {
  console.error('Error running database initialization:', error.message);
  process.exit(1);
});