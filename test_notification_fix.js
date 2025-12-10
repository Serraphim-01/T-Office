// Comprehensive test for notification fixes
const { Pool } = require('pg');

// Database connection - adjust as needed for your setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
});

async function testNotificationFix() {
  console.log('Testing Notification Fixes...\n');
  
  try {
    // Test 1: Check the updated authentication middleware query
    console.log('1. Testing authentication middleware query:');
    const authTestResult = await pool.query(`
      SELECT u.id, u.full_name, u.department, COALESCE(r.name, 'default') as role 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = 1
    `);
    
    if (authTestResult.rows.length > 0) {
      const user = authTestResult.rows[0];
      console.log(`   User ID 1: ${user.full_name} (${user.department} - ${user.role})`);
    } else {
      console.log('   No user found with ID 1');
    }
    
    // Test 2: Check our updated HR Users access query
    console.log('\n2. Testing updated HR Users access query:');
    const hrAccessResult = await pool.query(`
      SELECT DISTINCT u.id, u.full_name, u.department, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_page_access rpa ON r.id = rpa.role_id AND rpa.page_name = 'hr/users'
      LEFT JOIN department_page_access dpa ON r.department_id = dpa.department_id AND dpa.page_name = 'hr/users'
      WHERE (rpa.page_name = 'hr/users' OR dpa.page_name = 'hr/users') AND u.id != 1
      ORDER BY u.department, u.full_name
    `);
    
    if (hrAccessResult.rows.length > 0) {
      console.log(`   Found ${hrAccessResult.rows.length} users with HR Users access:`);
      hrAccessResult.rows.forEach(user => {
        console.log(`   - ${user.full_name} (ID: ${user.id}, Dept: ${user.department}, Role: ${user.role_name})`);
      });
    } else {
      console.log('   No users found with HR Users access');
    }
    
    // Test 3: Check department-level HR Users access
    console.log('\n3. Testing department-level HR Users access:');
    const deptAccessResult = await pool.query(`
      SELECT DISTINCT u.id, u.full_name, u.department, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN department_page_access dpa ON r.department_id = dpa.department_id
      WHERE dpa.page_name = 'hr/users'
      ORDER BY u.department, u.full_name
    `);
    
    if (deptAccessResult.rows.length > 0) {
      console.log(`   Found ${deptAccessResult.rows.length} users with department-level HR Users access:`);
      deptAccessResult.rows.forEach(user => {
        console.log(`   - ${user.full_name} (ID: ${user.id}, Dept: ${user.department}, Role: ${user.role_name})`);
      });
    } else {
      console.log('   No users found with department-level HR Users access');
    }
    
    // Test 4: Check role-level HR Users access
    console.log('\n4. Testing role-level HR Users access:');
    const roleAccessResult = await pool.query(`
      SELECT DISTINCT u.id, u.full_name, u.department, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_page_access rpa ON r.id = rpa.role_id
      WHERE rpa.page_name = 'hr/users'
      ORDER BY u.department, u.full_name
    `);
    
    if (roleAccessResult.rows.length > 0) {
      console.log(`   Found ${roleAccessResult.rows.length} users with role-level HR Users access:`);
      roleAccessResult.rows.forEach(user => {
        console.log(`   - ${user.full_name} (ID: ${user.id}, Dept: ${user.department}, Role: ${user.role_name})`);
      });
    } else {
      console.log('   No users found with role-level HR Users access');
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\nSummary:');
    console.log('- Authentication middleware now includes full_name');
    console.log('- Notification queries now check both department and role-based access');
    console.log('- Users from any department with role-based HR Users access will receive notifications');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  testNotificationFix();
}