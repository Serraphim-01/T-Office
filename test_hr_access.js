// Simple test script to check HR access
const { Pool } = require('pg');

// Database connection - adjust as needed for your setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
});

async function testHRAccess() {
  console.log('Testing HR Users Access...\n');
  
  try {
    // Test our new query that combines both department and role access
    console.log('Users with HR Users access (combined department and role access):');
    const result = await pool.query(`
      SELECT DISTINCT u.id, u.full_name, u.department, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_page_access rpa ON r.id = rpa.role_id AND rpa.page_name = 'hr/users'
      LEFT JOIN department_page_access dpa ON r.department_id = dpa.department_id AND dpa.page_name = 'hr/users'
      WHERE rpa.page_name = 'hr/users' OR dpa.page_name = 'hr/users'
      ORDER BY u.department, u.full_name
    `);
    
    if (result.rows.length > 0) {
      result.rows.forEach(user => {
        console.log(`- ${user.full_name} (ID: ${user.id}, Dept: ${user.department}, Role: ${user.role_name})`);
      });
      console.log(`\nTotal users with HR Users access: ${result.rows.length}`);
    } else {
      console.log('No users found with HR Users access');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  testHRAccess();
}