/**
 * Direct Database User Cleanup Test Script
 * This script removes test users created during testing by connecting directly to the database.
 * This bypasses the API authentication requirement for deletion.
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env') }); // fallback
// Also load from parent directory as fallback
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') }); // fallback

// Path to test users data
const testDataPath = path.join(process.cwd(), 'test-users.json');

// Function to connect to database and clean up test users
async function cleanupTestUsersDirect() {
  console.log('🧹 Starting direct database test user cleanup...');
  
  // Load test users data
  if (!fs.existsSync(testDataPath)) {
    console.log('📋 No test users data file found. Nothing to clean up.');
    return;
  }

  const testUsers = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
  
  if (testUsers.length === 0) {
    console.log('✅ No test users to clean up.');
    return;
  }

  console.log(`📋 Found ${testUsers.length} test users to clean up`);

  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Start transaction
    await client.query('BEGIN');

    // Delete each test user by email (since we have the email from the signup process)
    for (const userData of testUsers) {
      console.log(`🗑️ Attempting to remove user: ${userData.email} (ID: ${userData.userId})`);
      
      try {
        // Soft-delete the user by setting active to false (following the same pattern as the API)
        const result = await client.query(
          'UPDATE users SET active = false WHERE email = $1 RETURNING id',
          [userData.email]
        );

        if (result.rowCount > 0) {
          console.log(`✅ Successfully deactivated user: ${userData.email}`);
        } else {
          console.log(`⚠️ User not found in database: ${userData.email} (may have been deleted already)`);
        }
      } catch (error) {
        console.error(`❌ Error deactivating user ${userData.email}:`, error.message);
        // Continue with other users even if one fails
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database transaction committed');

    // Remove the test users data file since cleanup is complete
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
      console.log('🗂️ Test users data file removed');
    }

    console.log('🎉 Direct database cleanup completed!');
  } catch (error) {
    console.error('❌ Database error during cleanup:', error.message);
    try {
      await client.query('ROLLBACK');
      console.log('❌ Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('❌ Error during rollback:', rollbackError.message);
    }
    throw error;
  } finally {
    await client.end();
    console.log('🔒 Database connection closed');
  }
}

// Alternative function to clean up by email pattern (for test users with timestamp-based emails)
async function cleanupTestUsersByEmailPattern() {
  console.log('🧹 Starting test user cleanup by email pattern...');

  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Find test users by email pattern (emails containing 'test_user_' and timestamp)
    const testUserPattern = '%test_user_%@example.com%';
    
    // Query to find users matching the test pattern
    const findTestUsersQuery = `
      SELECT id, email, full_name 
      FROM users 
      WHERE email LIKE $1 AND active = true
    `;
    
    const result = await client.query(findTestUsersQuery, [testUserPattern]);
    
    if (result.rows.length === 0) {
      console.log('✅ No test users found matching the pattern.');
      return;
    }

    console.log(`📋 Found ${result.rows.length} test users matching pattern to clean up`);

    // Start transaction
    await client.query('BEGIN');

    // Soft-delete each test user
    for (const user of result.rows) {
      console.log(`🗑️ Deactivating test user: ${user.email} (ID: ${user.id})`);
      
      try {
        await client.query(
          'UPDATE users SET active = false WHERE id = $1',
          [user.id]
        );
        
        console.log(`✅ Successfully deactivated user: ${user.email}`);
      } catch (error) {
        console.error(`❌ Error deactivating user ${user.email}:`, error.message);
        // Continue with other users
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database transaction committed');

    console.log('🎉 Pattern-based cleanup completed!');
  } catch (error) {
    console.error('❌ Database error during pattern cleanup:', error.message);
    try {
      await client.query('ROLLBACK');
      console.log('❌ Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('❌ Error during rollback:', rollbackError.message);
    }
    throw error;
  } finally {
    await client.end();
    console.log('🔒 Database connection closed');
  }
}

// Main cleanup function
async function main() {
  try {
    // First try the direct cleanup based on stored test user data
    if (fs.existsSync(testDataPath)) {
      await cleanupTestUsersDirect();
    } else {
      console.log('📋 No test-users.json file found, using email pattern cleanup...');
      await cleanupTestUsersByEmailPattern();
    }
  } catch (error) {
    console.error('💥 Direct cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
main().catch(error => {
  console.error('💥 Error running direct cleanup:', error.message);
  process.exit(1);
});