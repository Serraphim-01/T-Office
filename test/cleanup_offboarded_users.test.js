/**
 * Cleanup Offboarded Users Test Script
 * This script finds and permanently deletes offboarded (inactive) users from the database.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Function to find offboarded users
async function findOffboardedUsers(dbClient) {
  const result = await dbClient.query(
    `SELECT id, full_name, email, department, created_at, updated_at 
     FROM users 
     WHERE active = false 
     ORDER BY department, full_name`
  );
  return result.rows;
}

// Function to delete offboarded users permanently
async function deleteOffboardedUsers(dbClient, userIds) {
  let deletedCount = 0;
  
  for (const userId of userIds) {
    try {
      // Start a new transaction for each user to isolate failures
      await dbClient.query('BEGIN');
      
      // Get user info for logging
      const userResult = await dbClient.query(
        'SELECT full_name, email, department FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        console.log(`🗑️  Deleting offboarded user: ${user.full_name} (${user.email}) from ${user.department}`);
        
        // Delete related support staff assignments first (both directions)
        await dbClient.query(
          'DELETE FROM user_support_assignments WHERE user_id = $1 OR support_staff_id = $1',
          [userId]
        );
        
        // Delete related provider assignments
        await dbClient.query(
          'DELETE FROM provider_user_assignments WHERE user_id = $1',
          [userId]
        );
        
        // Finally delete the user
        await dbClient.query(
          'DELETE FROM users WHERE id = $1',
          [userId]
        );
        
        console.log(`✅ Successfully deleted user: ${user.full_name} (ID: ${userId})`);
        deletedCount++;
        
        // Commit transaction for this user
        await dbClient.query('COMMIT');
      } else {
        console.log(`⚠️  User ID ${userId} not found in database.`);
        // Still commit the transaction even if user not found
        await dbClient.query('COMMIT');
      }
    } catch (error) {
      console.error(`❌ Error deleting user ID ${userId}:`, error.message);
      // Rollback this specific transaction
      try {
        await dbClient.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(`❌ Error during rollback for user ID ${userId}:`, rollbackError.message);
      }
      // Continue with next user - don't let one failure stop the whole process
    }
  }
  
  return deletedCount;
}

// Function to get summary statistics
async function getDatabaseSummary(dbClient) {
  const totalUsers = await dbClient.query('SELECT COUNT(*) as count FROM users');
  const activeUsers = await dbClient.query('SELECT COUNT(*) as count FROM users WHERE active = true');
  const inactiveUsers = await dbClient.query('SELECT COUNT(*) as count FROM users WHERE active = false');
  
  return {
    total: parseInt(totalUsers.rows[0].count),
    active: parseInt(activeUsers.rows[0].count),
    inactive: parseInt(inactiveUsers.rows[0].count)
  };
}

describe('Cleanup Offboarded Users', () => {
  let dbClient;

  beforeAll(async () => {
    // Create a database client to be reused
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL
    });
    await dbClient.connect();
  });

  afterAll(async () => {
    // Close the database connection
    if (dbClient) {
      await dbClient.end();
    }
  });

  test('should find and display offboarded users', async () => {
    console.log('🔍 Searching for offboarded users in the database...\n');
    
    // Get database summary
    const summary = await getDatabaseSummary(dbClient);
    console.log('📊 Database Summary:');
    console.log(`   Total users: ${summary.total}`);
    console.log(`   Active users: ${summary.active}`);
    console.log(`   Inactive (offboarded) users: ${summary.inactive}\n`);
    
    // Find offboarded users
    const offboardedUsers = await findOffboardedUsers(dbClient);
    
    if (offboardedUsers.length === 0) {
      console.log('✅ No offboarded users found in the database.');
      expect(offboardedUsers.length).toBe(0);
      return;
    }
    
    console.log(`📋 Found ${offboardedUsers.length} offboarded users:\n`);
    console.log('ID\tFull Name\t\t\tEmail\t\t\t\t\tDepartment\t\tCreated At');
    console.log('--\t---------\t\t\t-----\t\t\t\t\t----------\t\t-----------');
    
    offboardedUsers.forEach(user => {
      console.log(`${user.id}\t${user.full_name.padEnd(20)}\t${user.email.padEnd(35)}\t${user.department.padEnd(15)}\t${new Date(user.created_at).toLocaleDateString()}`);
    });
    
    console.log('');
    expect(offboardedUsers.length).toBeGreaterThan(0);
  }, 30000);

  test('should delete offboarded users permanently', async () => {
    console.log('🗑️  Starting permanent deletion of offboarded users...\n');
    
    // Find offboarded users
    const offboardedUsers = await findOffboardedUsers(dbClient);
    
    if (offboardedUsers.length === 0) {
      console.log('✅ No offboarded users to delete.');
      return;
    }
    
    // Extract user IDs for deletion
    const userIdsToDelete = offboardedUsers.map(user => user.id);
    
    console.log(`📋 Preparing to delete ${userIdsToDelete.length} offboarded users:`);
    userIdsToDelete.forEach((id, index) => {
      const user = offboardedUsers[index];
      console.log(`   ${index + 1}. ${user.full_name} (ID: ${id}) - ${user.email}`);
    });
    
    console.log('');
    
    // Delete the offboarded users
    const deletedCount = await deleteOffboardedUsers(dbClient, userIdsToDelete);
    
    console.log(`\n🎉 Deletion completed successfully!`);
    console.log(`📊 Total users permanently deleted: ${deletedCount}`);
    console.log(`📋 Total users processed: ${userIdsToDelete.length}`);
    
    // Verify deletion
    const remainingOffboarded = await findOffboardedUsers(dbClient);
    expect(remainingOffboarded.length).toBe(0);
    
    // Get final database summary
    const finalSummary = await getDatabaseSummary(dbClient);
    console.log('\n📊 Final Database Summary:');
    console.log(`   Total users: ${finalSummary.total}`);
    console.log(`   Active users: ${finalSummary.active}`);
    console.log(`   Inactive (offboarded) users: ${finalSummary.inactive}`);
    
    expect(deletedCount).toBe(userIdsToDelete.length);
  }, 30000);

  test('should verify clean database state', async () => {
    // Get final database summary
    const summary = await getDatabaseSummary(dbClient);
    
    console.log('🔍 Verifying database state after cleanup...\n');
    console.log(`📊 Database Status:`);
    console.log(`   Total users: ${summary.total}`);
    console.log(`   Active users: ${summary.active}`);
    console.log(`   Inactive users: ${summary.inactive}`);
    
    // Verify no inactive users remain
    expect(summary.inactive).toBe(0);
    
    // Verify all users are active
    const allUsers = await dbClient.query('SELECT id, active FROM users');
    allUsers.rows.forEach(user => {
      expect(user.active).toBe(true);
    });
    
    console.log('✅ Database verification passed - all users are active.');
  }, 30000);
});