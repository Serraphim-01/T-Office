import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to find and load .env file
function loadEnv() {
  // Try different possible locations for .env file
  const possiblePaths = [
    join(__dirname, '../backend/.env'),  // Standard project structure
    join(__dirname, '.env'),             // Same directory
    join(__dirname, '../.env'),          // Parent directory
    './backend/.env',                    // Relative to current working directory
    '../backend/.env'                    // Relative to current working directory
  ];

  for (const envPath of possiblePaths) {
    try {
      const envContent = readFileSync(envPath, 'utf8');
      const envVars = {};
      
      // Parse the .env file manually
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
          envVars[key.trim()] = value.trim();
        }
      });
      
      console.log(`Loaded environment variables from ${envPath}`);
      return envVars;
    } catch (err) {
      // Continue to next path
      continue;
    }
  }
  
  console.warn('Warning: Could not find .env file, using default database configuration');
  return {
    DATABASE_URL: 'postgres://postgres:password@localhost:5433/office'
  };
}

// Load environment variables
const envVars = loadEnv();
const DATABASE_URL = envVars.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office';

// Create database pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runSQL(sqlFilePath) {
  try {
    // Read the SQL file
    const sql = readFileSync(sqlFilePath, 'utf8');
    console.log(`Reading SQL file: ${sqlFilePath}`);
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    console.log(`Executing ${statements.length} SQL statements from ${sqlFilePath}...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          const result = await pool.query(statement);
          console.log(`✓ Statement ${i + 1} executed successfully`);
          
          // If the statement returns rows, display them
          if (result.rows && result.rows.length > 0) {
            console.log(`  Rows returned: ${result.rows.length}`);
            console.table(result.rows);
          }
        } catch (err) {
          console.error(`✗ Error executing statement ${i + 1}:`, err.message);
          throw err;
        }
      }
    }
    
    console.log('All SQL statements executed successfully');
  } catch (err) {
    console.error('Error executing SQL:', err.message);
    throw err;
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node run_sql.js <sql_file>');
    console.error('Example: node run_sql.js db/create_migration.sql');
    process.exit(1);
  }

  try {
    await runSQL(filePath);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for use in other files
export default runSQL;