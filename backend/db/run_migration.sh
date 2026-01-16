#!/bin/bash

# Database migration script for T-Office
# This script runs the create_migration.sql file and all migration files in the migrations folder

echo "Starting database migration..."

# Load environment variables from .env.local if it exists
ENV_FILE="../.env.local"
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  # Source the environment variables properly
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "Warning: $ENV_FILE not found. Make sure to set DATABASE_URL before running migrations."
fi

# Check if we're in the right directory by looking for key files
if [ ! -f "./create_migration.sql" ] || [ ! -d "./migrations" ]; then
  echo "Error: Required migration files not found!"
  echo "Please run this script from the backend/db directory."
  echo "Current directory: $(pwd)"
  echo "Looking for create_migration.sql and migrations/ directory."
  exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "Error: Node.js command not found!"
  echo "Please ensure Node.js is installed and in your PATH."
  echo "Download Node.js from: https://nodejs.org/"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  echo "Please set DATABASE_URL in your .env file."
  exit 1
fi

echo "Running create_migration.sql with Node.js..."
node -e "
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Function to split SQL properly, taking into account dollar-quoted strings
function splitSQLStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let i = 0;
  
  while (i < sql.length) {
    const char = sql[i];
    
    // Check for dollar quote start (\$\$ or \$tag\$)
    if (char === '\$' && i + 1 < sql.length) {
      // Look for the end of the dollar quote tag
      let tagEnd = i + 1;
      while (tagEnd < sql.length && sql[tagEnd] !== '\$') {
        // Allow alphanumeric characters and underscores in tag names
        if (!/[a-zA-Z0-9_]/.test(sql[tagEnd]) && sql[tagEnd] !== '\$') {
          break;
        }
        tagEnd++;
      }
      
      if (tagEnd < sql.length && sql[tagEnd] === '\$') {
        // Found a dollar quote tag
        const tag = sql.substring(i, tagEnd + 1);
        currentStatement += tag;
        i = tagEnd + 1;
        
        // Now look for the closing tag
        const closingTagIndex = sql.indexOf(tag, i);
        if (closingTagIndex !== -1) {
          // Add everything up to and including the closing tag
          currentStatement += sql.substring(i, closingTagIndex + tag.length);
          i = closingTagIndex + tag.length;
          continue;
        }
      }
    }
    
    // Handle semicolon outside of dollar quotes
    if (char === ';') {
      currentStatement = currentStatement.trim();
      if (currentStatement.length > 0) {
        statements.push(currentStatement);
      }
      currentStatement = '';
    } else {
      currentStatement += char;
    }
    
    i++;
  }
  
  // Add the last statement if it exists
  currentStatement = currentStatement.trim();
  if (currentStatement.length > 0) {
    statements.push(currentStatement);
  }
  
  return statements;
}

async function runCreateMigration() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    const sql = fs.readFileSync('./create_migration.sql', 'utf8');
    
    // Split the SQL into individual statements using our proper parser
    const statements = splitSQLStatements(sql);
    
    console.log(\`Executing \${statements.length} statements from create_migration.sql...\`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await client.query(statement);
          console.log(\`✓ Statement \${i + 1} executed successfully\`);
        } catch (err) {
          // Some statements may fail intentionally (like adding columns that already exist)
          console.log(\`Statement \${i + 1} processed (may have been skipped): \${err.message}\`);
          // Continue with the next statement
        }
      }
    }
    
    // After running create_migration.sql, insert a record to mark initial schema as applied
    // This prevents the migration system from trying to re-run the initial schema
    try {
      await client.query(\`INSERT INTO migration_history (migration_name) VALUES ('001_initial_schema.sql') ON CONFLICT (migration_name) DO NOTHING;\`);
      console.log('Marked initial schema as applied in migration history');
    } catch (err) {
      // If migration_history table doesn't exist yet, create it and insert the record
      try {
        await client.query(\`
          CREATE TABLE IF NOT EXISTS migration_history (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        \`);
        await client.query(\`INSERT INTO migration_history (migration_name) VALUES ('001_initial_schema.sql') ON CONFLICT (migration_name) DO NOTHING;\`);
        console.log('Created migration history table and marked initial schema as applied');
      } catch (innerErr) {
        console.log('Could not update migration history (this is OK for first-time setup)');
      }
    }
    
    console.log('create_migration.sql executed successfully!');
  } catch (err) {
    console.error('Error executing create_migration.sql:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

runCreateMigration();
"

if [ $? -ne 0 ]; then
  echo "Error: Failed to run create_migration.sql"
  exit 1
fi

echo "Running migrations using new migration system..."
node migrate-cli.js up

if [ $? -ne 0 ]; then
  echo "Error: Failed to run migrations"
  exit 1
fi

echo "Database migration completed successfully!"
echo ""
echo "To verify the migration worked correctly:"
echo "1. Make sure your PostgreSQL database is running"
echo "2. Start the backend server with: cd .. && npm run dev"
echo "3. Test the connection with: curl http://localhost:4000/api/db-test"