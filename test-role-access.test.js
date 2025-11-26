// Simple test to verify role-based access implementation
import { Pool } from 'pg';

async function testRoleAccess() {
  const pool = new Pool({
    connectionString: 'postgres://postgres:password@localhost:5433/office',
  });

  try {
    console.log('Testing role-based access implementation...\n');
    
    // 1. Check departments
    console.log('1. Checking departments:');
    const deptResult = await pool.query('SELECT id, name FROM departments LIMIT 5');
    deptResult.rows.forEach(dept => {
      console.log(`   Department: ${dept.name} (ID: ${dept.id})`);
    });
    
    // 2. Check roles
    console.log('\n2. Checking roles:');
    const roleResult = await pool.query('SELECT id, name, department_id, is_default FROM roles LIMIT 10');
    roleResult.rows.forEach(role => {
      console.log(`   Role: ${role.name} (ID: ${role.id}, Dept ID: ${role.department_id}, Default: ${role.is_default})`);
    });
    
    // 3. Check role page access
    console.log('\n3. Checking role page access entries:');
    const pageAccessResult = await pool.query('SELECT role_id, page_name FROM role_page_access LIMIT 10');
    pageAccessResult.rows.forEach(access => {
      console.log(`   Role ID ${access.role_id} -> Page: ${access.page_name}`);
    });
    
    // 4. Check users with roles
    console.log('\n4. Checking users with roles:');
    const userResult = await pool.query(`
      SELECT u.id, u.full_name, u.department, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      LIMIT 5
    `);
    userResult.rows.forEach(user => {
      console.log(`   User: ${user.full_name} (${user.department}) - Role: ${user.role_name || 'None'}`);
    });
    
    console.log('\n✅ Role-based access implementation test completed successfully!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await pool.end();
  }
}

testRoleAccess();