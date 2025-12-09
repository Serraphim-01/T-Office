import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

async function testChatNotifications() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
  });

  try {
    console.log('Testing chat notifications feature access...\n');
    
    // 1. Find the HR department and its default role
    console.log('1. Finding HR department and default role:');
    const deptResult = await pool.query('SELECT id, name FROM departments WHERE name = $1', ['HR']);
    if (deptResult.rows.length === 0) {
      console.log('   HR department not found');
      return;
    }
    
    const hrDept = deptResult.rows[0];
    console.log(`   Department: ${hrDept.name} (ID: ${hrDept.id})`);
    
    // Find the default role for HR
    const roleResult = await pool.query('SELECT id, name FROM roles WHERE department_id = $1 AND is_default = true', [hrDept.id]);
    if (roleResult.rows.length === 0) {
      console.log('   Default role for HR not found');
      return;
    }
    
    const hrRole = roleResult.rows[0];
    console.log(`   Default Role: ${hrRole.name} (ID: ${hrRole.id})`);
    
    // 2. Check current chat feature access for HR role
    console.log('\n2. Current chat feature access for HR role:');
    const currentAccessResult = await pool.query('SELECT page_name FROM role_page_access WHERE role_id = $1 AND page_name LIKE $2', [hrRole.id, 'chat/%']);
    currentAccessResult.rows.forEach(access => {
      console.log(`   Has access to: ${access.page_name}`);
    });
    
    // 3. Add chat/notifications access to HR role
    console.log('\n3. Adding chat/notifications access to HR role...');
    await pool.query('INSERT INTO role_page_access (role_id, page_name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [hrRole.id, 'chat/notifications']);
    console.log('   Added chat/notifications access');
    
    // 4. Verify the addition
    console.log('\n4. Verifying chat/notifications access:');
    const verifyResult = await pool.query('SELECT page_name FROM role_page_access WHERE role_id = $1 AND page_name = $2', [hrRole.id, 'chat/notifications']);
    if (verifyResult.rows.length > 0) {
      console.log('   ✅ Successfully added chat/notifications access to HR role');
    } else {
      console.log('   ❌ Failed to add chat/notifications access to HR role');
    }
    
    // 5. Test removing chat/notifications access
    console.log('\n5. Testing removal of chat/notifications access...');
    await pool.query('DELETE FROM role_page_access WHERE role_id = $1 AND page_name = $2', [hrRole.id, 'chat/notifications']);
    console.log('   Removed chat/notifications access');
    
    // 6. Verify the removal
    console.log('\n6. Verifying chat/notifications access removal:');
    const verifyRemovalResult = await pool.query('SELECT page_name FROM role_page_access WHERE role_id = $1 AND page_name = $2', [hrRole.id, 'chat/notifications']);
    if (verifyRemovalResult.rows.length === 0) {
      console.log('   ✅ Successfully removed chat/notifications access from HR role');
    } else {
      console.log('   ❌ Failed to remove chat/notifications access from HR role');
    }
    
    console.log('\n✅ Chat notifications feature access test completed successfully!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await pool.end();
  }
}

testChatNotifications();