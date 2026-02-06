/**
 * Support Staff Allocation Checker
 * Checks if support staff allocation has been completed in the database
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkSupportAllocationStatus() {
  let dbClient;
  
  try {
    // Create database client
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office'
    });
    
    await dbClient.connect();
    
    // Count total active users
    const totalUsersResult = await dbClient.query(
      'SELECT COUNT(*) as count FROM users WHERE active = true'
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    
    // Count users with support staff assigned
    const assignedUsersResult = await dbClient.query(`
      SELECT COUNT(*) as count 
      FROM users u
      INNER JOIN user_support_assignments usa ON u.id = usa.user_id
      WHERE u.active = true
    `);
    const assignedUsers = parseInt(assignedUsersResult.rows[0].count);
    
    // Calculate allocation percentage
    const allocationPercentage = totalUsers > 0 ? (assignedUsers / totalUsers) * 100 : 0;
    
    console.log('📊 Support Staff Allocation Status:');
    console.log(`   Total active users: ${totalUsers}`);
    console.log(`   Users with support staff: ${assignedUsers}`);
    console.log(`   Allocation percentage: ${allocationPercentage.toFixed(2)}%`);
    
    // Consider allocation as "completed" if at least 80% of users have support staff
    const isCompleted = allocationPercentage >= 80;
    
    console.log(`   Status: ${isCompleted ? '✅ Completed' : '⏳ Pending'}\n`);
    
    return {
      totalUsers,
      assignedUsers,
      allocationPercentage,
      isCompleted
    };
    
  } catch (error) {
    console.error('❌ Error checking support allocation status:', error.message);
    return {
      totalUsers: 0,
      assignedUsers: 0,
      allocationPercentage: 0,
      isCompleted: false,
      error: error.message
    };
  } finally {
    if (dbClient) {
      await dbClient.end();
    }
  }
}

// Run the check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkSupportAllocationStatus();
}

export { checkSupportAllocationStatus };