import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/office',
});

async function cleanupExtraTables() {
  try {
    console.log('Checking for extra tables...');
    
    // Query actual tables from database
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const actualTables = result.rows.map(row => row.tablename);
    
    // Read the create migration file to get expected tables
    const fs = await import('fs');
    const createMigration = fs.readFileSync('./create_migration.sql', 'utf8');
    
    // Extract table names from CREATE TABLE statements
    const expectedTables = [];
    const tableMatches = createMigration.match(/CREATE TABLE IF NOT EXISTS (\w+)/g);
    if (tableMatches) {
      tableMatches.forEach(match => {
        const tableName = match.replace('CREATE TABLE IF NOT EXISTS ', '');
        expectedTables.push(tableName);
      });
    }
    
    // Find extra tables
    const extraTables = actualTables.filter(table => !expectedTables.includes(table));
    
    if (extraTables.length > 0) {
      console.log('Found extra tables:', extraTables);
      
      // Drop extra tables
      for (const table of extraTables) {
        console.log(`Dropping table: ${table}`);
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }
      
      console.log('Extra tables cleaned up successfully!');
    } else {
      console.log('No extra tables found. Database is clean!');
    }
    
  } catch (err) {
    console.error('Error cleaning up extra tables:', err);
  } finally {
    await pool.end();
  }
}

cleanupExtraTables();