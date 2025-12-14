// Test script to check the notification helper functions
import { Client } from 'pg';

// Database configuration
const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'password',
  database: 'office'
});

// Helper function to get users with specific page access
async function getUsersWithPageAccess(pool, pageName) {
  try {
    const result = await pool.query(`
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_page_access rpa ON r.id = rpa.role_id AND rpa.page_name = $1
      LEFT JOIN department_page_access dpa ON r.department_id = dpa.department_id AND dpa.page_name = $1
      WHERE (rpa.page_name = $1 OR dpa.page_name = $1) AND u.active = true
    `, [pageName]);
    
    return result.rows.map(row => row.id);
  } catch (err) {
    console.error('Error getting users with page access:', err);
    return [];
  }
}

// Helper function to get users in the same department
async function getUsersInSameDepartment(pool, userId) {
  try {
    // First get the department of the user
    const userResult = await pool.query(
      'SELECT department FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) return [];
    
    const department = userResult.rows[0].department;
    
    // Get all users in the same department (excluding the user themselves)
    const result = await pool.query(
      'SELECT id FROM users WHERE department = $1 AND id != $2 AND active = true',
      [department, userId]
    );
    
    return result.rows.map(row => row.id);
  } catch (err) {
    console.error('Error getting users in same department:', err);
    return [];
  }
}

// Helper function to get support staff assigned to a user
async function getSupportStaffForUser(pool, userId) {
  try {
    const result = await pool.query(
      'SELECT support_staff_id FROM user_support_assignments WHERE user_id = $1',
      [userId]
    );
    
    return result.rows.length > 0 ? result.rows[0].support_staff_id : null;
  } catch (err) {
    console.error('Error getting support staff for user:', err);
    return null;
  }
}

// Helper function to get users supported by a support staff member
async function getUsersSupportedByStaff(pool, supportStaffId) {
  try {
    const result = await pool.query(
      'SELECT user_id FROM user_support_assignments WHERE support_staff_id = $1',
      [supportStaffId]
    );
    
    return result.rows.map(row => row.user_id);
  } catch (err) {
    console.error('Error getting users supported by staff:', err);
    return [];
  }
}

// Helper function to get all users to notify when a user is onboarded
async function getUsersToNotifyOnOnboarding(pool, onboardedUserId) {
  try {
    // Get users with Onboarding access or hr/users access
    const usersWithOnboardingAccess = await getUsersWithPageAccess(pool, 'hr/onboarding');
    const usersWithHRUsersAccess = await getUsersWithPageAccess(pool, 'hr/users');
    
    // Combine and deduplicate
    const usersWithAccess = [...new Set([...usersWithOnboardingAccess, ...usersWithHRUsersAccess])];
    
    // Get users in the same department
    const usersInSameDepartment = await getUsersInSameDepartment(pool, onboardedUserId);
    
    // Combine all users and deduplicate
    const allUsersToNotify = [...new Set([...usersWithAccess, ...usersInSameDepartment])];
    
    // Exclude the onboarded user themselves
    return allUsersToNotify.filter(id => id != onboardedUserId);
  } catch (err) {
    console.error('Error getting users to notify on onboarding:', err);
    return [];
  }
}

// Helper function to get all users to notify when a user is offboarded
async function getUsersToNotifyOnOffboarding(pool, offboardedUserId) {
  try {
    // Get users with hr/onboarding or hr/users access
    const usersWithHROnboardingAccess = await getUsersWithPageAccess(pool, 'hr/onboarding');
    const usersWithHRUsersAccess = await getUsersWithPageAccess(pool, 'hr/users');
    
    // Combine and deduplicate
    const usersWithAccess = [...new Set([...usersWithHROnboardingAccess, ...usersWithHRUsersAccess])];
    
    // Get users in the same department
    const usersInSameDepartment = await getUsersInSameDepartment(pool, offboardedUserId);
    
    // Get the support staff assigned to the offboarded user
    const supportStaffId = await getSupportStaffForUser(pool, offboardedUserId);
    
    // Get users supported by the offboarded user (users they were support staff for)
    const usersSupportedByOffboardedUser = await getUsersSupportedByStaff(pool, offboardedUserId);
    
    // Combine all users and deduplicate
    let allUsersToNotify = [...new Set([
      ...usersWithAccess, 
      ...usersInSameDepartment,
      ...usersSupportedByOffboardedUser
    ])];
    
    // Add support staff if exists
    if (supportStaffId) {
      allUsersToNotify.push(supportStaffId);
    }
    
    // Deduplicate again and exclude the offboarded user themselves
    allUsersToNotify = [...new Set(allUsersToNotify)].filter(id => id != offboardedUserId);
    
    return allUsersToNotify;
  } catch (err) {
    console.error('Error getting users to notify on offboarding:', err);
    return [];
  }
}

// Helper function to get all users to notify when a support staff is assigned
async function getUsersToNotifyOnSupportAssignment(pool, userId, supportStaffId) {
  try {
    // Get users with hr/users access
    const usersWithHRUsersAccess = await getUsersWithPageAccess(pool, 'hr/users');
    
    // Combine all users and deduplicate
    const allUsersToNotify = [...new Set([
      ...usersWithHRUsersAccess,
      supportStaffId,
      userId
    ])].filter(id => id != null); // Filter out any null values
    
    // Deduplicate and exclude duplicates
    return [...new Set(allUsersToNotify)];
  } catch (err) {
    console.error('Error getting users to notify on support assignment:', err);
    return [];
  }
}

// Helper function to get all users to notify when a support staff is removed
async function getUsersToNotifyOnSupportRemoval(pool, userId, supportStaffId) {
  try {
    // Get users with hr/users access
    const usersWithHRUsersAccess = await getUsersWithPageAccess(pool, 'hr/users');
    
    // Combine all users and deduplicate
    const allUsersToNotify = [...new Set([
      ...usersWithHRUsersAccess,
      supportStaffId,
      userId
    ])].filter(id => id != null); // Filter out any null values
    
    // Deduplicate and exclude duplicates
    return [...new Set(allUsersToNotify)];
  } catch (err) {
    console.error('Error getting users to notify on support removal:', err);
    return [];
  }
}

async function testNotificationHelpers() {
  try {
    // Connect to database
    await client.connect();
    
    console.log('Testing notification helper functions...\n');
    
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
    console.error('Error testing notification helpers:', err);
  }
}

testNotificationHelpers();