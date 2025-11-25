// Test script to check what the /api/admin/departments endpoint returns
import pkg from "pg";

const { Pool } = pkg;

async function testAdminDepartments() {
  try {
    // Use the same DATABASE_URL as in the backend
    const DATABASE_URL = 'postgres://postgres:password@localhost:5433/office';
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
    });

    // Execute the same query as the /api/admin/departments endpoint
    const result = await pool.query(`
      SELECT id, name 
      FROM departments 
      ORDER BY name
    `);

    console.log('Admin departments query result:');
    result.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.name}`);
    });

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAdminDepartments();