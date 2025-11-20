import { readFileSync } from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/office',
});

async function verifySchema() {
  try {
    // Read the create migration file
    const createMigration = readFileSync('./create_migration.sql', 'utf8');
    
    // Extract table names from CREATE TABLE statements
    const tableNames = [];
    const tableMatches = createMigration.match(/CREATE TABLE IF NOT EXISTS (\w+)/g);
    if (tableMatches) {
      tableMatches.forEach(match => {
        const tableName = match.replace('CREATE TABLE IF NOT EXISTS ', '');
        tableNames.push(tableName);
      });
    }
    
    console.log('Expected tables from migration file:');
    console.log(tableNames.sort());
    
    // Query actual tables from database
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const actualTables = result.rows.map(row => row.tablename);
    console.log('\nActual tables in database:');
    console.log(actualTables);
    
    // Check for missing tables
    const missingTables = tableNames.filter(table => !actualTables.includes(table));
    const extraTables = actualTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:');
      console.log(missingTables);
    } else {
      console.log('\n✅ All expected tables are present');
    }
    
    if (extraTables.length > 0) {
      console.log('\n⚠️ Extra tables in database:');
      console.log(extraTables);
    }
    
    // Check a few key tables for structure
    console.log('\n--- Checking key table structures ---');
    
    // Check users table
    try {
      const usersColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      console.log('\nUsers table columns:');
      usersColumns.rows.forEach(row => {
        console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (err) {
      console.log('Error checking users table:', err.message);
    }
    
    // Check products table
    try {
      const productsColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'products'
        ORDER BY ordinal_position
      `);
      console.log('\nProducts table columns:');
      productsColumns.rows.forEach(row => {
        console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (err) {
      console.log('Error checking products table:', err.message);
    }
    
  } catch (err) {
    console.error('Error verifying schema:', err);
  } finally {
    await pool.end();
  }
}

verifySchema();