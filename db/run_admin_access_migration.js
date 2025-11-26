// Script to run the admin access migration
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationPath = join(__dirname, 'ensure_admin_access.sql');

// Run the migration
exec(`psql -f ${migrationPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error running migration: ${error}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  
  console.log(`Migration output: ${stdout}`);
  console.log('Admin access migration completed successfully!');
});