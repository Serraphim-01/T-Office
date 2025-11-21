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

// Function to split SQL into statements while preserving function definitions
function splitSQLStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let i = 0;
  
  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    // Handle dollar-quoted strings (PostgreSQL specific)
    if (char === '$') {
      // Check if this is a dollar quote tag
      let tagEnd = -1;
      for (let j = i + 1; j < sql.length; j++) {
        if (sql[j] === '$') {
          tagEnd = j;
          break;
        }
        // Dollar quote tags can contain letters, digits, and underscores
        if (!/[a-zA-Z0-9_]/.test(sql[j])) {
          break;
        }
      }
      
      if (tagEnd !== -1) {
        const tag = sql.substring(i, tagEnd + 1);
        // Look for the closing tag
        const closingTagIndex = sql.indexOf(tag, tagEnd + 1);
        if (closingTagIndex !== -1) {
          // Include everything from current position to closing tag + tag length
          const quotedContent = sql.substring(i, closingTagIndex + tag.length);
          currentStatement += quotedContent;
          i = closingTagIndex + tag.length;
          continue;
        }
      }
    }
    
    // Handle single quotes
    if (char === "'") {
      currentStatement += char;
      i++;
      // Skip until closing quote, handling escaped quotes
      while (i < sql.length) {
        const ch = sql[i];
        currentStatement += ch;
        i++;
        if (ch === "'") {
          // Check for escaped quote
          if (i < sql.length && sql[i] === "'") {
            currentStatement += sql[i];
            i++;
            continue;
          }
          break;
        }
      }
      continue;
    }
    
    // Handle double quotes
    if (char === '"') {
      currentStatement += char;
      i++;
      // Skip until closing quote
      while (i < sql.length) {
        const ch = sql[i];
        currentStatement += ch;
        i++;
        if (ch === '"') {
          break;
        }
      }
      continue;
    }
    
    // Handle line comments
    if (char === '-' && nextChar === '-') {
      // Add everything until end of line
      while (i < sql.length && sql[i] !== '\n') {
        currentStatement += sql[i];
        i++;
      }
      if (i < sql.length) {
        currentStatement += sql[i]; // Add the newline
        i++;
      }
      continue;
    }
    
    // Handle block comments
    if (char === '/' && nextChar === '*') {
      // Add everything until closing */
      currentStatement += char + nextChar;
      i += 2;
      while (i < sql.length) {
        const ch = sql[i];
        currentStatement += ch;
        i++;
        if (ch === '*' && i < sql.length && sql[i] === '/') {
          currentStatement += sql[i];
          i++;
          break;
        }
      }
      continue;
    }
    
    // Add character to current statement
    currentStatement += char;
    i++;
    
    // Check for statement terminator
    if (char === ';') {
      const trimmedStatement = currentStatement.trim();
      if (trimmedStatement.length > 0) {
        statements.push(trimmedStatement);
      }
      currentStatement = '';
    }
  }
  
  // Add any remaining content as a statement
  const trimmedStatement = currentStatement.trim();
  if (trimmedStatement.length > 0) {
    statements.push(trimmedStatement);
  }
  
  return statements;
}

async function runSQL(filePath) {
  try {
    // Resolve the file path
    const resolvedPath = resolve(filePath);
    console.log(`Reading SQL file: ${resolvedPath}`);
    
    const sql = readFileSync(resolvedPath, 'utf8');
    
    // Split the SQL into individual statements, preserving function definitions
    const statements = splitSQLStatements(sql);
    
    console.log(`Executing ${statements.length} SQL statements from ${filePath}...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length > 0) {
        try {
          await pool.query(statement);
          console.log(`✓ Statement ${i + 1} executed successfully`);
        } catch (stmtErr) {
          console.error(`✗ Error executing statement ${i + 1}:`, stmtErr.message);
          console.error('Statement:', statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
          throw stmtErr;
        }
      }
    }
    
    console.log('All SQL statements executed successfully');
  } catch (err) {
    console.error('Error executing SQL:', err);
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