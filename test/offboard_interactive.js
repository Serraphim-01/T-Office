#!/usr/bin/env node

/**
 * Interactive Offboard Users by Department and IDs
 * This script allows interactive selection of department and specific user IDs to offboard.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify the question function
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Function to get available departments
async function getDepartments(dbClient) {
  const departmentsResult = await dbClient.query('SELECT id, name FROM departments ORDER BY name');
  return departmentsResult.rows;
}

// Function to get users by department
async function getUsersByDepartment(dbClient, departmentName) {
  const usersResult = await dbClient.query(
    `SELECT id, full_name, email, active 
     FROM users 
     WHERE department = $1 
     ORDER BY full_name`,
    [departmentName]
  );
  return usersResult.rows;
}

// Function to offboard specific users by IDs
async function offboardUsersByIds(dbClient, userIds) {
  // Start transaction
  await dbClient.query('BEGIN');

  let offboardedCount = 0;
  
  for (const userId of userIds) {
    // Get user info for logging
    const userResult = await dbClient.query(
      'SELECT full_name, email FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`🔄 Offboarding user: ${user.full_name} (ID: ${userId})`);
      
      try {
        await dbClient.query(
          'UPDATE users SET active = false WHERE id = $1',
          [userId]
        );
        
        console.log(`✅ Successfully offboarded user: ${user.full_name} (ID: ${userId})`);
        offboardedCount++;
      } catch (error) {
        console.error(`❌ Error offboarding user ${user.full_name} (ID: ${userId}):`, error.message);
      }
    } else {
      console.log(`⚠️  User ID ${userId} not found in database.`);
    }
  }

  // Commit transaction
  await dbClient.query('COMMIT');
  
  return offboardedCount;
}

// Main interactive function
async function interactiveOffboard() {
  let dbClient;
  
  try {
    console.log('🚪 Starting interactive user offboarding process...\n');
    
    // Create database client
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL
    });
    await dbClient.connect();
    
    // Get available departments
    console.log('📋 Available departments:');
    const departments = await getDepartments(dbClient);
    
    if (departments.length === 0) {
      console.log('❌ No departments found in the database.');
      return;
    }
    
    // Display departments with numbers
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.name}`);
    });
    
    // Ask user to select department
    let selectedDeptIndex;
    let selectedDepartment;
    
    while (true) {
      const deptInput = await question('\n🔢 Enter the number of the department to offboard users from (or "quit" to exit): ');
      
      if (deptInput.toLowerCase() === 'quit') {
        console.log('👋 Exiting offboarding process.');
        return;
      }
      
      selectedDeptIndex = parseInt(deptInput);
      
      if (!isNaN(selectedDeptIndex) && selectedDeptIndex >= 1 && selectedDeptIndex <= departments.length) {
        selectedDepartment = departments[selectedDeptIndex - 1];
        break;
      } else {
        console.log('❌ Invalid selection. Please enter a number between 1 and', departments.length);
      }
    }
    
    console.log(`\n🔍 Retrieving users from "${selectedDepartment.name}" department...\n`);
    
    // Get and display users in the selected department
    const users = await getUsersByDepartment(dbClient, selectedDepartment.name);
    
    if (users.length === 0) {
      console.log(`✅ No users found in the "${selectedDepartment.name}" department.`);
      return;
    }
    
    console.log(`📋 Found ${users.length} users in "${selectedDepartment.name}" department:\n`);
    console.log('ID\tFull Name\t\t\tEmail\t\t\t\t\tActive');
    console.log('--\t---------\t\t\t-----\t\t\t\t\t------');
    
    users.forEach(user => {
      const status = user.active ? '✅' : '❌';
      console.log(`${user.id}\t${user.full_name.padEnd(20)}\t${user.email.padEnd(35)}\t${status}`);
    });
    
    // Ask for user IDs to offboard
    while (true) {
      console.log('\n📝 Enter the user IDs to offboard, separated by commas (e.g., 1, 2, 3)');
      console.log('   Or type "back" to select a different department, or "quit" to exit:');
      
      const idsInput = await question('');
      
      if (idsInput.toLowerCase() === 'quit') {
        console.log('👋 Exiting offboarding process.');
        return;
      }
      
      if (idsInput.toLowerCase() === 'back') {
        console.log('\n'); // Add some spacing
        continue; // Go back to department selection
      }
      
      // Parse user IDs
      const userIds = idsInput.split(',')
        .map(id => id.trim())
        .filter(id => id !== '') // Remove empty strings
        .map(id => parseInt(id));
      
      // Validate parsed IDs
      const invalidIds = userIds.filter(id => isNaN(id));
      if (invalidIds.length > 0) {
        console.log('❌ Invalid user ID(s) entered:', invalidIds.join(', '));
        continue;
      }
      
      if (userIds.length === 0) {
        console.log('❌ No valid user IDs entered. Please enter at least one user ID.');
        continue;
      }
      
      // Confirm the selection
      console.log(`\n📋 You have selected to offboard the following user IDs: ${userIds.join(', ')}`);
      
      // Check which users will be affected
      const usersToOffboard = users.filter(user => userIds.includes(user.id));
      const usersNotFound = userIds.filter(id => !users.some(u => u.id === id));
      const inactiveUsers = usersToOffboard.filter(user => !user.active);
      
      if (usersNotFound.length > 0) {
        console.log(`⚠️  Warning: The following user IDs were not found in "${selectedDepartment.name}":`, usersNotFound.join(', '));
      }
      
      if (inactiveUsers.length > 0) {
        console.log(`⚠️  Warning: The following users are already inactive:`, inactiveUsers.map(u => `${u.full_name} (ID: ${u.id})`).join(', '));
      }
      
      const activeUsersToOffboard = usersToOffboard.filter(user => user.active);
      console.log(`📊 Summary: ${activeUsersToOffboard.length} active user(s) will be offboarded, ${inactiveUsers.length} already inactive, ${usersNotFound.length} not found.`);
      
      const confirm = await question('\n✅ Do you want to proceed with offboarding? (yes/no): ');
      
      if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
        if (activeUsersToOffboard.length > 0) {
          const activeUserIds = activeUsersToOffboard.map(user => user.id);
          const offboardedCount = await offboardUsersByIds(dbClient, activeUserIds);
          
          console.log(`\n🎉 Offboarding completed successfully!`);
          console.log(`📊 Total users offboarded: ${offboardedCount}`);
          console.log(`📋 Total users processed: ${activeUserIds.length}`);
        } else {
          console.log(`\nℹ️  No active users to offboard (all selected users were already inactive).`);
        }
        
        // Ask if user wants to continue
        const continueChoice = await question('\nDo you want to offboard more users? (yes/no): ');
        if (continueChoice.toLowerCase() !== 'yes' && continueChoice.toLowerCase() !== 'y') {
          console.log('👋 Exiting offboarding process.');
          return;
        }
      } else {
        console.log('↩️  Offboarding cancelled. Returning to user ID selection...');
      }
    }
  } catch (error) {
    console.error('❌ Error during offboarding process:', error.message);
  } finally {
    // Close database connection
    if (dbClient) {
      await dbClient.end();
    }
    
    // Close readline interface
    rl.close();
  }
}

// Run the interactive offboarding
interactiveOffboard();