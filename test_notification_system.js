// Test script to check the new notification system functionality
import { Client } from 'pg';
import {
  getUsersWithPageAccess,
  getUsersInSameDepartment,
  getSupportStaffForUser,
  getUsersSupportedByStaff,
  getUsersToNotifyOnOnboarding,
  getUsersToNotifyOnOffboarding,
  getUsersToNotifyOnSupportAssignment,
  getUsersToNotifyOnSupportRemoval
} from './backend/utils/helpers.js';

// Database configuration
const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'password',
  database: 'office'
});

async function testNotificationSystem() {
  try {
    // Connect to database
    await client.connect();
    
    console.log('Testing notification system functions...\n');
    
    // Test getUsersWithPageAccess
    console.log('1. Testing getUsersWithPageAccess for hr/users:');
    const hrUsers = await getUsersWithPageAccess(client, 'hr/users');
    console.log('Users with hr/users access:', hrUsers);
    
    // Test getUsersInSameDepartment
    console.log('\n2. Testing getUsersInSameDepartment for user 1:');
    const sameDeptUsers = await getUsersInSameDepartment(client, 1);
    console.log('Users in same department as user 1:', sameDeptUsers);
    
    // Test getSupportStaffForUser
    console.log('\n3. Testing getSupportStaffForUser for user 1:');
    const supportStaff = await getSupportStaffForUser(client, 1);
    console.log('Support staff for user 1:', supportStaff);
    
    // Test getUsersSupportedByStaff
    console.log('\n4. Testing getUsersSupportedByStaff for user 1:');
    const supportedUsers = await getUsersSupportedByStaff(client, 1);
    console.log('Users supported by user 1:', supportedUsers);
    
    // Test getUsersToNotifyOnOnboarding
    console.log('\n5. Testing getUsersToNotifyOnOnboarding for user 1:');
    const onboardingRecipients = await getUsersToNotifyOnOnboarding(client, 1);
    console.log('Users to notify on onboarding user 1:', onboardingRecipients);
    
    // Test getUsersToNotifyOnOffboarding
    console.log('\n6. Testing getUsersToNotifyOnOffboarding for user 1:');
    const offboardingRecipients = await getUsersToNotifyOnOffboarding(client, 1);
    console.log('Users to notify on offboarding user 1:', offboardingRecipients);
    
    // Test getUsersToNotifyOnSupportAssignment
    console.log('\n7. Testing getUsersToNotifyOnSupportAssignment for user 1 and support staff 2:');
    const supportAssignmentRecipients = await getUsersToNotifyOnSupportAssignment(client, 1, 2);
    console.log('Users to notify on support assignment (user 1, support staff 2):', supportAssignmentRecipients);
    
    // Test getUsersToNotifyOnSupportRemoval
    console.log('\n8. Testing getUsersToNotifyOnSupportRemoval for user 1 and support staff 2:');
    const supportRemovalRecipients = await getUsersToNotifyOnSupportRemoval(client, 1, 2);
    console.log('Users to notify on support removal (user 1, support staff 2):', supportRemovalRecipients);
    
    // Close connection
    await client.end();
    
    console.log('\nAll tests completed successfully!');
  } catch (err) {
    console.error('Error testing notification system:', err);
  }
}

testNotificationSystem();