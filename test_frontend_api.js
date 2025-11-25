// Test script to mimic frontend API calls
import pkg from "pg";

const { Pool } = pkg;

async function testFrontendAPI() {
  try {
    // Use the same DATABASE_URL as in the backend
    const DATABASE_URL = 'postgres://postgres:password@localhost:5433/office';
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
    });

    console.log('Testing frontend API calls...\n');

    // Test 1: /api/admin/departments (used by signup)
    console.log('1. Testing /api/admin/departments endpoint:');
    const adminDepts = await pool.query('SELECT id, name FROM departments ORDER BY name');
    console.log('   Result count:', adminDepts.rows.length);
    console.log('   Sample departments:', adminDepts.rows.slice(0, 3).map(r => r.name));

    // Test 2: /api/admin/feature-access/departments (used by admin pages)
    console.log('\n2. Testing /api/admin/feature-access/departments endpoint:');
    const featureDepts = await pool.query(`
      SELECT 
        d.id,
        d.name,
        COUNT(dpa.page_name) as page_count
      FROM departments d
      LEFT JOIN department_page_access dpa ON d.id = dpa.department_id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);
    console.log('   Result count:', featureDepts.rows.length);
    console.log('   Sample departments:', featureDepts.rows.slice(0, 3).map(r => `${r.name} (${r.page_count} pages)`));

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testFrontendAPI();