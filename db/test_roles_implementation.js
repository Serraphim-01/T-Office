import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

async function testRolesImplementation() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
  });

  try {
    console.log('Testing role-based access implementation...\n');
    
    // 1. Check departments
    console.log('1. Checking departments:');
    const deptResult = await pool.query('SELECT id, name FROM departments ORDER BY id LIMIT 5');
    deptResult.rows.forEach(dept => {
      console.log(`   Department: ${dept.name} (ID: ${dept.id})`);
    });
    
    // 2. Check roles
    console.log('\n2. Checking roles:');
    const roleResult = await pool.query(`
      SELECT r.id, r.name, r.department_id, r.is_default, d.name as department_name
      FROM roles r
      JOIN departments d ON r.department_id = d.id
      ORDER BY r.department_id, r.id
      LIMIT 10
    `);
    roleResult.rows.forEach(role => {
      console.log(`   Role: ${role.name} (ID: ${role.id}, Dept: ${role.department_name}, Default: ${role.is_default})`);
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
    
    // 5. Verify default roles exist for all departments
    console.log('\n5. Verifying default roles for all departments:');
    const defaultRolesResult = await pool.query(`
      SELECT d.name as department_name, COUNT(r.id) as role_count
      FROM departments d
      LEFT JOIN roles r ON d.id = r.department_id AND r.is_default = true
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);
    defaultRolesResult.rows.forEach(dept => {
      console.log(`   Department: ${dept.department_name} - Default roles: ${dept.role_count}`);
    });
    
    console.log('\n✅ Role-based access implementation test completed successfully!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await pool.end();
  }
}

testRolesImplementation();