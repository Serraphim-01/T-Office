import pkg from 'pg';
const { Pool } = pkg;

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
});

async function verifyMigration() {
  try {
    // Check how many records are in role_page_access table
    const client = await pool.connect();
    
    const countResult = await client.query('SELECT COUNT(*) FROM role_page_access');
    console.log(`Total records in role_page_access: ${countResult.rows[0].count}`);
    
    // Check some sample records
    const sampleResult = await client.query('SELECT r.name as role_name, d.name as department_name, rpa.page_name FROM role_page_access rpa JOIN roles r ON rpa.role_id = r.id JOIN departments d ON r.department_id = d.id LIMIT 10');
    console.log('\nSample records:');
    sampleResult.rows.forEach(row => {
      console.log(`  Role: ${row.role_name}, Department: ${row.department_name}, Page: ${row.page_name}`);
    });
    
    client.release();
  } catch (err) {
    console.error('Verification failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyMigration();