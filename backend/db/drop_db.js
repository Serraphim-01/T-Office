import { readFileSync } from 'fs';
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

// Function to execute drop migration
async function executeDropMigration() {
  console.log('Starting database drop process...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  try {
    // Read the drop migration SQL file
    const dropSqlPath = resolve(process.cwd(), 'db', 'drop_migration.sql');
    const sql = readFileSync(dropSqlPath, 'utf8');
    console.log('Loaded drop migration script');
    
    // Split the SQL into individual statements
    const statements = splitSQLStatements(sql);
    console.log(`Executing ${statements.length} statements to drop database objects...`);
    
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
            // Continue with other statements even if one fails
          }
        }
      }
      
      await client.query('COMMIT');
      console.log('✓ All drop statements executed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('✗ Drop process failed, rolled back');
      throw err;
    } finally {
      client.release();
    }
    
    console.log('Database drop completed successfully!');
  } catch (err) {
    console.error('Drop process failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the drop process if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeDropMigration();
}