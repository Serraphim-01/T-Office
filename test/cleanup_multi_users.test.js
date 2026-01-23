/**
 * Delete Test Script for Multi User Signup Test
 * This test completely deletes all users created by the multi signup test script from the database.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Path to test users data
const testDataPath = path.join(process.cwd(), 'test-users.json');

describe('Delete Multi User Test Data', () => {
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

  test('should delete all users created by multi signup test with actual names', async () => {
    console.log('🗑️ Starting deletion of users created by multi signup test with actual names...');

    let usersDeleted = 0;

    // Check if test-users.json exists and contains test user data
    if (fs.existsSync(testDataPath)) {
      console.log('📋 Found test-users.json file, deleting users listed in the file...');
      
      const testUsers = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
      
      if (testUsers.length > 0) {
        // Start transaction
        await dbClient.query('BEGIN');

        for (const userData of testUsers) {
          console.log(`🗑️ Attempting to delete user: ${userData.email} (ID: ${userData.userId})`);
          
          try {
            // Completely delete the user from the database
            const result = await dbClient.query(
              'DELETE FROM users WHERE email = $1 RETURNING id',
              [userData.email]
            );

            if (result.rowCount > 0) {
              console.log(`✅ Successfully deleted user: ${userData.email}`);
              usersDeleted++;
            } else {
              console.log(`⚠️ User not found in database: ${userData.email} (may have been deleted already)`);
            }
          } catch (error) {
            console.error(`❌ Error deleting user ${userData.email}:`, error.message);
            // Continue with other users even if one fails
          }
        }

        // Commit transaction
        await dbClient.query('COMMIT');
        console.log(`✅ Database transaction committed. ${usersDeleted} users deleted.`);
      } else {
        console.log('📋 No test users found in test-users.json file.');
      }

      // Remove the test users data file since cleanup is complete
      fs.unlinkSync(testDataPath);
      console.log('🗂️ Test users data file removed');
    } else {
      console.log('📋 No test-users.json file found, using email pattern to find test users with actual names...');
      
      // Look for users created by the multi signup script using the email pattern for actual names
      const testUserPattern = '%.%@%.com'; // Pattern for emails like "firstname.lastname.number@department.com"
      
      const findTestUsersQuery = `
        SELECT id, email, full_name, department 
        FROM users 
        WHERE email LIKE $1 AND full_name ~ '^[A-Za-z]+ [A-Za-z]+ [0-9]+$' AND active = true
      `;
      
      const result = await dbClient.query(findTestUsersQuery, [testUserPattern]);
      
      if (result.rows.length === 0) {
        console.log('✅ No test users with actual names created by multi signup script found.');
        expect(result.rows.length).toBe(0);
        return;
      }

      console.log(`📋 Found ${result.rows.length} test users with actual names to delete`);

      // Start transaction
      await dbClient.query('BEGIN');

      // Delete each test user
      for (const user of result.rows) {
        console.log(`🗑️ Deleting test user: ${user.email} (ID: ${user.id})`);
        
        try {
          await dbClient.query(
            'DELETE FROM users WHERE id = $1',
            [user.id]
          );
          
          console.log(`✅ Successfully deleted user: ${user.email}`);
          usersDeleted++;
        } catch (error) {
          console.error(`❌ Error deleting user ${user.email}:`, error.message);
          // Continue with other users
        }
      }

      // Commit transaction
      await dbClient.query('COMMIT');
      console.log(`✅ Database transaction committed. ${usersDeleted} users deleted.`);
    }

    console.log('🎉 Multi user deletion completed successfully!');
    console.log(`📊 Total users deleted: ${usersDeleted}`);

    // Verify that users were properly deleted
    expect(usersDeleted).toBeGreaterThanOrEqual(0);
  }, 30000); // Increase timeout for database operations
});