import pkg from "pg";

const { Pool } = pkg;

async function checkAdminAccess() {
  try {
    // Use the same DATABASE_URL as in the backend
    const DATABASE_URL = 'postgres://postgres:password@localhost:5433/office';
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
    });

    // Check Admin department access
    const result = await pool.query(`
      SELECT d.name AS department, dpa.page_name 
      FROM department_page_access dpa 
      JOIN departments d ON dpa.department_id = d.id 
      WHERE d.name = 'Admin' 
      ORDER BY dpa.page_name
    `);

    console.log('Admin department page access:');
    result.rows.forEach(row => {
      console.log(`  ${row.page_name}`);
    });

    // Check if Admin has access to all required pages
    const requiredPages = [
      'admin/db',
      'admin/departments',
      'admin/features'
    ];

    console.log('\nChecking required Admin pages:');
    for (const page of requiredPages) {
      const hasAccess = result.rows.some(row => row.page_name === page);
      console.log(`  ${page}: ${hasAccess ? '✓' : '✗'}`);
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkAdminAccess();