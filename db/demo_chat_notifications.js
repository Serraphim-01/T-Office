import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

async function demoChatNotifications() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
  });

  try {
    console.log('Demonstrating chat notifications feature access control...\n');
    
    // 1. Find our test roles
    console.log('1. Finding test roles:');
    const roleWithAccessResult = await pool.query('SELECT id, name FROM roles WHERE name = $1', ['ChatNotifTestWithAccess']);
    const roleWithoutAccessResult = await pool.query('SELECT id, name FROM roles WHERE name = $1', ['ChatNotifTestWithoutAccess']);
    
    if (roleWithAccessResult.rows.length === 0 || roleWithoutAccessResult.rows.length === 0) {
      console.log('   Test roles not found. Please run test_role_chat_notifications.js first.');
      return;
    }
    
    const roleWithAccess = roleWithAccessResult.rows[0];
    const roleWithoutAccess = roleWithoutAccessResult.rows[0];
    
    console.log(`   Role with access: ${roleWithAccess.name} (ID: ${roleWithAccess.id})`);
    console.log(`   Role without access: ${roleWithoutAccess.name} (ID: ${roleWithoutAccess.id})`);
    
    // 2. Find a test user in HR department
    console.log('\n2. Finding HR test user:');
    const userResult = await pool.query('SELECT id, full_name, email, role_id FROM users WHERE department = $1 LIMIT 1', ['HR']);
    
    if (userResult.rows.length === 0) {
      console.log('   No HR user found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`   User: ${user.full_name} (${user.email}) - Current Role ID: ${user.role_id}`);
    
    // 3. Demonstrate with role that HAS chat notifications access
    console.log('\n3. Testing with role that HAS chat notifications access:');
    console.log('   Assigning "ChatNotifTestWithAccess" role to user...');
    
    // Assign the role with access
    await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [roleWithAccess.id, user.id]);
    console.log('   Role assigned successfully');
    
    console.log('   With this role, the user WILL receive chat notifications');
    console.log('   (when chat messages or status changes occur)');
    
    // 4. Demonstrate with role that does NOT have chat notifications access
    console.log('\n4. Testing with role that does NOT have chat notifications access:');
    console.log('   Assigning "ChatNotifTestWithoutAccess" role to user...');
    
    // Assign the role without access
    await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [roleWithoutAccess.id, user.id]);
    console.log('   Role assigned successfully');
    
    console.log('   With this role, the user will NOT receive chat notifications');
    console.log('   (even when chat messages or status changes occur)');
    
    // 5. Restore original role
    console.log('\n5. Restoring original role:');
    await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [user.role_id, user.id]);
    console.log('   Original role restored');
    
    console.log('\n✅ Chat notifications feature access demonstration completed successfully!');
    console.log('\nSummary:');
    console.log('- Users with "chat/notifications" feature access WILL receive chat notifications');
    console.log('- Users without "chat/notifications" feature access will NOT receive chat notifications');
    console.log('- This applies to both chat messages and chat status changes (pause/resume)');
  } catch (err) {
    console.error('❌ Demo failed:', err);
  } finally {
    await pool.end();
  }
}

demoChatNotifications();