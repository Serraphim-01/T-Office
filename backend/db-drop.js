import { spawn } from 'child_process';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env.local first, then fallback to .env
dotenv.config({ path: resolve('./.env.local') });
dotenv.config({ path: resolve('./.env') }); // This will not override existing variables

// Function to drop the database using the SQL script
async function dropDatabase() {
  console.log('Dropping database with drop_migration.sql...');
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL);

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('✅ Connected to database successfully');
    
    // Read the drop migration SQL file (located in the db directory)
    const sql = readFileSync('./db/drop_migration.sql', 'utf8');
    
    // Split the SQL into individual statements properly handling complex SQL
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
    
    console.log(`Executing ${statements.length} statements from drop_migration.sql...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--')) {
        try {
          await client.query(statement);
          console.log(`✓ Statement ${i + 1} executed successfully`);
          successCount++;
        } catch (err) {
          // Some statements may fail intentionally (like dropping non-existent objects)
          console.log(`⚠ Statement ${i + 1} processed (may have been skipped): ${err.message}`);
          errorCount++;
          // Continue with the next statement
        }
      }
    }
    
    console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} skipped/failed`);
    console.log('✅ drop_migration.sql executed successfully!');
  } catch (err) {
    console.error('❌ Error executing drop_migration.sql:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    if (err.stack) {
      console.error('Stack trace:', err.stack.split('\n').slice(0, 5).join('\n'));
    }
    
    console.error('\n💡 Troubleshooting tips:');
    console.error('- Make sure the database is running');
    console.error('- Check if DATABASE_URL in .env.local is correct');
    console.error('- If running in Docker, ensure proper network connectivity');
    process.exit(1);
  } finally {
    try {
      await client.end();
      console.log('🔒 Database connection closed');
    } catch (e) {
      console.log('⚠ Could not close database connection cleanly:', e.message);
    }
  }
}

dropDatabase();