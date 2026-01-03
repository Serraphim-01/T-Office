import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Create database pool using DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Function to split SQL properly, taking into account dollar-quoted strings
function splitSQLStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let i = 0;
  
  while (i < sql.length) {
    const char = sql[i];
    
    // Check for dollar quote start ($$ or $tag$)
    if (char === '$' && i + 1 < sql.length) {
      // Look for the end of the dollar quote tag
      let tagEnd = i + 1;
      while (tagEnd < sql.length && sql[tagEnd] !== '$') {
        // Allow alphanumeric characters and underscores in tag names
        if (!/[a-zA-Z0-9_]/.test(sql[tagEnd]) && sql[tagEnd] !== '$') {
          break;
        }
        tagEnd++;
      }
      
      if (tagEnd < sql.length && sql[tagEnd] === '$') {
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

// Function to get all migration files and sort them
function getMigrationFiles() {
  const migrationsDir = resolve(process.cwd(), 'migrations');
  const files = readdirSync(migrationsDir);
  return files
    .filter(file => file.endsWith('.sql'))
    .sort((a, b) => {
      // Extract version numbers from filenames (e.g., 001_xxx.sql)
      const versionA = parseInt(a.split('_')[0]);
      const versionB = parseInt(b.split('_')[0]);
      return versionA - versionB;
    });
}

// Function to get applied migrations from database
async function getAppliedMigrations() {
  try {
    // Check if migration_history table exists
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migration_history'
      );
    `);
    
    if (!result.rows[0].exists) {
      // Create migration_history table if it doesn't exist
      await pool.query(`
        CREATE TABLE migration_history (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      return [];
    }
    
    const result2 = await pool.query('SELECT migration_name FROM migration_history ORDER BY applied_at');
    return result2.rows.map(row => row.migration_name);
  } catch (err) {
    console.error('Error getting applied migrations:', err.message);
    throw err;
  }
}

// Function to record a migration as applied
async function recordMigration(migrationName) {
  try {
    await pool.query(
      'INSERT INTO migration_history (migration_name) VALUES ($1)',
      [migrationName]
    );
  } catch (err) {
    console.error('Error recording migration:', err.message);
    throw err;
  }
}

// Function to run a single migration file
async function runMigrationFile(filePath, migrationName) {
  try {
    const sql = readFileSync(filePath, 'utf8');
    console.log(`Executing migration: ${migrationName}`);
    
    // Split the SQL into individual statements, properly handling dollar-quoted strings
    const statements = splitSQLStatements(sql);
    console.log(`Executing ${statements.length} SQL statements from ${migrationName}...`);
    
    // Execute each statement in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement) {
          try {
            await client.query(statement);
            console.log(`✓ Statement ${i + 1} executed successfully`);
          } catch (err) {
            console.error(`✗ Error executing statement ${i + 1}:`, err.message);
            console.error(`Statement content: ${statement.substring(0, 100)}...`);
            throw err;
          }
        }
      }
      
      await client.query('COMMIT');
      console.log(`✓ Migration ${migrationName} applied successfully`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ Migration ${migrationName} failed, rolled back`);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error executing migration:', err.message);
    throw err;
  }
}

// Main migration function
async function runMigrations() {
  console.log('Starting database migrations...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  try {
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log(`Found ${appliedMigrations.length} previously applied migrations`);
    
    // Get all migration files
    const migrationFiles = getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Filter out already applied migrations
    const pendingMigrations = migrationFiles.filter(file => !appliedMigrations.includes(file));
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      return;
    }
    
    // Apply pending migrations in order
    for (const migrationFile of pendingMigrations) {
      const filePath = resolve(process.cwd(), 'migrations', migrationFile);
      await runMigrationFile(filePath, migrationFile);
      await recordMigration(migrationFile);
    }
    
    console.log('All migrations applied successfully!');
  } catch (err) {
    console.error('Migration process failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;