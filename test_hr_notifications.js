// Test script to verify HR notifications are sent to users with proper access
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
});

async function testHRNotifications() {
  console.log('Testing HR Notifications Implementation...\n');
  
  try {
    // Test 1: Check users with HR Users access (department level)
    console.log('1. Users with HR Users access (department level):');
    const deptAccessResult = await pool.query(`
      SELECT DISTINCT u.id, u.full_name, u.department, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN department_page_access dpa ON r.department_id = dpa.department_id
      WHERE dpa.page_name = 'hr/users'
      ORDER BY u.department, u.full_name
    `);
    
    if (deptAccessResult.rows.length > 0) {
      deptAccessResult.rows.forEach(user => {
        console.log(`   - ${user.full_name} (ID: ${user.id}, Dept: ${user.department}, Role: ${user.role_name})`);
      });
    } else {
      console.log('   No users found with department-level HR Users access');
    }
    
    console.log('\n2. Users with HR Users access (role level):');
    const roleAccessResult = await pool.query(`
      SELECT DISTINCT u.id, u.full_name, u.department, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_page_access rpa ON r.id = rpa.role_id
      WHERE rpa.page_name = 'hr/users'
      ORDER BY u.department, u.full_name
    `);
    
    if (roleAccessResult.rows.length > 0) {
      roleAccessResult.rows.forEach(user => {
        console.log(`   - ${user.full_name} (ID: ${user.id}, Dept: ${user.department}, Role: ${user.role_name})`);
      });
    } else {
      console.log('   No users found with role-level HR Users access');
    }
    
    console.log('\n3. Combined users with HR Users access (both department and role):');
    const combinedResult = await pool.query(`
      SELECT DISTINCT u.id, u.full_name, u.department, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_page_access rpa ON r.id = rpa.role_id AND rpa.page_name = 'hr/users'
      LEFT JOIN department_page_access dpa ON r.department_id = dpa.department_id AND dpa.page_name = 'hr/users'
      WHERE rpa.page_name = 'hr/users' OR dpa.page_name = 'hr/users'
      ORDER BY u.department, u.full_name
    `);
    
    if (combinedResult.rows.length > 0) {
      combinedResult.rows.forEach(user => {
        console.log(`   - ${user.full_name} (ID: ${user.id}, Dept: ${user.department}, Role: ${user.role_name})`);
      });
      console.log(`\n   Total users with HR Users access: ${combinedResult.rows.length}`);
    } else {
      console.log('   No users found with HR Users access');
    }
    
    console.log('\n4. Testing notification query for a specific user (simulating user ID 1):');
    // Simulate sending notification to user ID 1
    const notificationTestResult = await pool.query(`
      SELECT DISTINCT u.id, u.full_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_page_access rpa ON r.id = rpa.role_id AND rpa.page_name = 'hr/users'
      LEFT JOIN department_page_access dpa ON r.department_id = dpa.department_id AND dpa.page_name = 'hr/users'
      WHERE (rpa.page_name = 'hr/users' OR dpa.page_name = 'hr/users') AND u.id != 1
      ORDER BY u.full_name
    `);
    
    if (notificationTestResult.rows.length > 0) {
      console.log(`   Would send notifications to ${notificationTestResult.rows.length} users:`);
      notificationTestResult.rows.forEach(user => {
        console.log(`   - ${user.full_name} (ID: ${user.id})`);
      });
    } else {
      console.log('   No users to notify');
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testHRNotifications();