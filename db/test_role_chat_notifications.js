import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

async function testRoleChatNotifications() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
  });

  try {
    console.log('Testing role-based chat notifications feature access...\n');
    
    // 1. Find the HR department
    console.log('1. Finding HR department:');
    const deptResult = await pool.query('SELECT id, name FROM departments WHERE name = $1', ['HR']);
    if (deptResult.rows.length === 0) {
      console.log('   HR department not found');
      return;
    }
    
    const hrDept = deptResult.rows[0];
    console.log(`   Department: ${hrDept.name} (ID: ${hrDept.id})`);
    
    // 2. Create a new role for testing with chat notifications access
    console.log('\n2. Creating test role with chat notifications access:');
    const roleNameWithAccess = 'ChatNotifTestWithAccess';
    
    // Check if role already exists
    let roleWithAccessResult = await pool.query('SELECT id FROM roles WHERE department_id = $1 AND name = $2', [hrDept.id, roleNameWithAccess]);
    
    if (roleWithAccessResult.rows.length === 0) {
      // Create the role
      roleWithAccessResult = await pool.query('INSERT INTO roles (department_id, name) VALUES ($1, $2) RETURNING id', [hrDept.id, roleNameWithAccess]);
      console.log(`   Created role: ${roleNameWithAccess} (ID: ${roleWithAccessResult.rows[0].id})`);
    } else {
      console.log(`   Role already exists: ${roleNameWithAccess} (ID: ${roleWithAccessResult.rows[0].id})`);
    }
    
    const roleWithAccessId = roleWithAccessResult.rows[0].id;
    
    // 3. Assign chat notifications access to this role
    console.log('\n3. Assigning chat notifications access to test role:');
    await pool.query('INSERT INTO role_page_access (role_id, page_name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleWithAccessId, 'chat/notifications']);
    console.log('   Assigned chat/notifications access');
    
    // Also assign basic chat access
    await pool.query('INSERT INTO role_page_access (role_id, page_name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleWithAccessId, 'chat']);
    console.log('   Assigned basic chat access');
    
    // 4. Create another role without chat notifications access
    console.log('\n4. Creating test role WITHOUT chat notifications access:');
    const roleNameWithoutAccess = 'ChatNotifTestWithoutAccess';
    
    // Check if role already exists
    let roleWithoutAccessResult = await pool.query('SELECT id FROM roles WHERE department_id = $1 AND name = $2', [hrDept.id, roleNameWithoutAccess]);
    
    if (roleWithoutAccessResult.rows.length === 0) {
      // Create the role
      roleWithoutAccessResult = await pool.query('INSERT INTO roles (department_id, name) VALUES ($1, $2) RETURNING id', [hrDept.id, roleNameWithoutAccess]);
      console.log(`   Created role: ${roleNameWithoutAccess} (ID: ${roleWithoutAccessResult.rows[0].id})`);
    } else {
      console.log(`   Role already exists: ${roleNameWithoutAccess} (ID: ${roleWithoutAccessResult.rows[0].id})`);
    }
    
    const roleWithoutAccessId = roleWithoutAccessResult.rows[0].id;
    
    // Assign basic chat access but NOT chat notifications access
    await pool.query('INSERT INTO role_page_access (role_id, page_name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [roleWithoutAccessId, 'chat']);
    console.log('   Assigned basic chat access (but NOT chat notifications)');
    
    // 5. Verify the roles and their access
    console.log('\n5. Verifying role access:');
    
    // Check access for role with notifications
    const accessWithResult = await pool.query('SELECT page_name FROM role_page_access WHERE role_id = $1 AND page_name = $2', [roleWithAccessId, 'chat/notifications']);
    console.log(`   Role "${roleNameWithAccess}" has chat/notifications access: ${accessWithResult.rows.length > 0 ? 'YES' : 'NO'}`);
    
    // Check access for role without notifications
    const accessWithoutResult = await pool.query('SELECT page_name FROM role_page_access WHERE role_id = $1 AND page_name = $2', [roleWithoutAccessId, 'chat/notifications']);
    console.log(`   Role "${roleNameWithoutAccess}" has chat/notifications access: ${accessWithoutResult.rows.length > 0 ? 'YES' : 'NO'}`);
    
    // 6. Clean up - remove the test roles (optional, for repeated testing)
    console.log('\n6. Cleaning up test roles:');
    // Uncomment these lines if you want to remove the test roles after testing
    // await pool.query('DELETE FROM role_page_access WHERE role_id = $1', [roleWithAccessId]);
    // await pool.query('DELETE FROM role_page_access WHERE role_id = $1', [roleWithoutAccessId]);
    // await pool.query('DELETE FROM roles WHERE id = $1', [roleWithAccessId]);
    // await pool.query('DELETE FROM roles WHERE id = $1', [roleWithoutAccessId]);
    // console.log('   Removed test roles');
    console.log('   Test roles kept for further testing (uncomment cleanup section to remove)');
    
    console.log('\n✅ Role-based chat notifications feature access test completed successfully!');
    console.log('\nTo test with actual users:');
    console.log('1. Assign a user to the "ChatNotifTestWithAccess" role to test notifications ENABLED');
    console.log('2. Assign a user to the "ChatNotifTestWithoutAccess" role to test notifications DISABLED');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await pool.end();
  }
}

testRoleChatNotifications();