// Test script to check what the feature-access/departments endpoint returns
import pkg from "pg";

const { Pool } = pkg;

async function testFeatureDepartments() {
  try {
    // Use the same DATABASE_URL as in the backend
    const DATABASE_URL = 'postgres://postgres:password@localhost:5433/office';
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
    });

    // Execute the same query as the feature-access/departments endpoint
    const result = await pool.query(`
      SELECT 
        d.id,
        d.name,
        COUNT(dpa.page_name) as page_count
      FROM departments d
      LEFT JOIN department_page_access dpa ON d.id = dpa.department_id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);

    console.log('Feature access departments query result:');
    result.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.name} (pages: ${row.page_count})`);
    });

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testFeatureDepartments();