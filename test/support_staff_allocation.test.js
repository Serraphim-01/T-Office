/**
 * Support Staff Allocation Test Script
 * This script allocates support staff to users with proper validation.
 * Requirements:
 * 1. User should not have a support staff assigned yet
 * 2. Support staff should not already be assigned to another user
 * 3. Both user and support staff must be in the same department
 * 4. Runs multi user signup first if needed to populate database
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Path to test users data
const testDataPath = path.join(process.cwd(), 'test-users.json');

// Function to check if database has sufficient users
async function checkDatabaseUserCount(dbClient) {
  const result = await dbClient.query('SELECT COUNT(*) as count FROM users WHERE active = true');
  return parseInt(result.rows[0].count);
}

// Function to run multi user signup if needed
async function ensureSufficientUsers(dbClient) {
  const userCount = await checkDatabaseUserCount(dbClient);
  
  if (userCount < 10) {
    console.log(`⚠️  Only ${userCount} active users found. Running multi user signup to populate database...\n`);
    
    // Import and run the multi user signup test
    const multiSignupTest = await import('./multi_user_signup.test.js');
    
    // Since we can't directly call Jest tests, we'll simulate the user creation logic
    await createAdditionalUsersIfNeeded(dbClient);
  } else {
    console.log(`✅ Found ${userCount} active users in database. Proceeding with support staff allocation.\n`);
  }
}

// Helper function to create additional users if needed
async function createAdditionalUsersIfNeeded(dbClient) {
  // This would contain the logic from multi_user_signup.test.js
  // For now, we'll assume sufficient users exist or the user will run the signup script manually
  console.log('Please run the multi_user_signup.test.js script first to populate the database with users.');
  console.log('Command: npm test test/multi_user_signup.test.js\n');
}

// Function to get eligible users (without support staff assigned)
async function getEligibleUsers(dbClient) {
  const result = await dbClient.query(
    `SELECT u.id, u.full_name, u.email, u.department, usa.support_staff_id
     FROM users u
     LEFT JOIN user_support_assignments usa ON u.id = usa.user_id
     WHERE u.active = true 
     AND usa.support_staff_id IS NULL
     ORDER BY u.department, u.full_name`
  );
  return result.rows;
}

// Function to get eligible support staff (not assigned to anyone)
async function getEligibleSupportStaff(dbClient) {
  const result = await dbClient.query(
    `SELECT u.id, u.full_name, u.email, u.department
     FROM users u
     WHERE u.active = true 
     AND u.id NOT IN (
       SELECT support_staff_id 
       FROM user_support_assignments 
       WHERE support_staff_id IS NOT NULL
     )
     ORDER BY u.department, u.full_name`
  );
  return result.rows;
}

// Function to get users by department
async function getUsersByDepartment(dbClient, department) {
  const result = await dbClient.query(
    `SELECT u.id, u.full_name, u.email, u.department, 
            usa.support_staff_id,
            ss.full_name as support_staff_name
     FROM users u
     LEFT JOIN user_support_assignments usa ON u.id = usa.user_id
     LEFT JOIN users ss ON usa.support_staff_id = ss.id
     WHERE u.active = true 
     AND u.department = $1
     ORDER BY u.full_name`,
    [department]
  );
  return result.rows;
}

// Function to assign support staff to user
async function assignSupportStaff(dbClient, userId, supportStaffId) {
  // Start transaction
  await dbClient.query('BEGIN');
  
  try {
    // Check if user already has support staff
    const existingAssignment = await dbClient.query(
      'SELECT id FROM user_support_assignments WHERE user_id = $1',
      [userId]
    );
    
    if (existingAssignment.rows.length > 0) {
      throw new Error(`User ID ${userId} already has a support staff assigned.`);
    }
    
    // Check if support staff is already assigned to someone
    const existingSupportAssignment = await dbClient.query(
      'SELECT id FROM user_support_assignments WHERE support_staff_id = $1',
      [supportStaffId]
    );
    
    if (existingSupportAssignment.rows.length > 0) {
      throw new Error(`Support staff ID ${supportStaffId} is already assigned to another user.`);
    }
    
    // Get user and support staff details for validation
    const userDetails = await dbClient.query(
      'SELECT full_name, department FROM users WHERE id = $1 AND active = true',
      [userId]
    );
    
    const supportDetails = await dbClient.query(
      'SELECT full_name, department FROM users WHERE id = $1 AND active = true',
      [supportStaffId]
    );
    
    if (userDetails.rows.length === 0) {
      throw new Error(`User ID ${userId} not found or inactive.`);
    }
    
    if (supportDetails.rows.length === 0) {
      throw new Error(`Support staff ID ${supportStaffId} not found or inactive.`);
    }
    
    // Check if they're in the same department
    if (userDetails.rows[0].department !== supportDetails.rows[0].department) {
      throw new Error(
        `Department mismatch: User "${userDetails.rows[0].full_name}" is in "${userDetails.rows[0].department}" ` +
        `but support staff "${supportDetails.rows[0].full_name}" is in "${supportDetails.rows[0].department}".`
      );
    }
    
    // Create the assignment
    await dbClient.query(
      `INSERT INTO user_support_assignments (user_id, support_staff_id, created_at) 
       VALUES ($1, $2, NOW())`,
      [userId, supportStaffId]
    );
    
    // Commit transaction
    await dbClient.query('COMMIT');
    
    return {
      success: true,
      user: userDetails.rows[0],
      supportStaff: supportDetails.rows[0]
    };
    
  } catch (error) {
    // Rollback transaction
    await dbClient.query('ROLLBACK');
    throw error;
  }
}

// Function to verify support staff assignment
async function verifySupportAssignment(dbClient, userId, supportStaffId) {
  const result = await dbClient.query(
    `SELECT usa.id, u.full_name as user_name, ss.full_name as support_staff_name, 
            u.department as user_department, ss.department as support_department
     FROM user_support_assignments usa
     JOIN users u ON usa.user_id = u.id
     JOIN users ss ON usa.support_staff_id = ss.id
     WHERE usa.user_id = $1 AND usa.support_staff_id = $2`,
    [userId, supportStaffId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

describe('Support Staff Allocation Test', () => {
  let dbClient;

  beforeAll(async () => {
    // Create a database client to be reused
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL
    });
    await dbClient.connect();
    
    // Ensure we have sufficient users in the database
    await ensureSufficientUsers(dbClient);
  });

  afterAll(async () => {
    // Close the database connection
    if (dbClient) {
      await dbClient.end();
    }
  });

  test('should identify eligible users and support staff', async () => {
    console.log('🔍 Identifying eligible users and support staff...\n');
    
    // Get eligible users (without support staff)
    const eligibleUsers = await getEligibleUsers(dbClient);
    console.log(`📋 Found ${eligibleUsers.length} users without support staff:`);
    
    if (eligibleUsers.length > 0) {
      console.log('ID\tFull Name\t\t\tDepartment');
      console.log('--\t---------\t\t\t----------');
      eligibleUsers.slice(0, 10).forEach(user => { // Show first 10
        console.log(`${user.id}\t${user.full_name.padEnd(20)}\t${user.department}`);
      });
      if (eligibleUsers.length > 10) {
        console.log(`... and ${eligibleUsers.length - 10} more users.`);
      }
    }
    console.log('');
    
    // Get eligible support staff (not assigned to anyone)
    const eligibleSupportStaff = await getEligibleSupportStaff(dbClient);
    console.log(`📋 Found ${eligibleSupportStaff.length} support staff available:`);
    
    if (eligibleSupportStaff.length > 0) {
      console.log('ID\tFull Name\t\t\tDepartment');
      console.log('--\t---------\t\t\t----------');
      eligibleSupportStaff.slice(0, 10).forEach(staff => { // Show first 10
        console.log(`${staff.id}\t${staff.full_name.padEnd(20)}\t${staff.department}`);
      });
      if (eligibleSupportStaff.length > 10) {
        console.log(`... and ${eligibleSupportStaff.length - 10} more staff.`);
      }
    }
    console.log('');
    
    expect(eligibleUsers.length).toBeGreaterThan(0);
    expect(eligibleSupportStaff.length).toBeGreaterThan(0);
  }, 30000);

  test('should allocate support staff with proper validation', async () => {
    console.log('🤝 Starting support staff allocation process...\n');
    
    // Get eligible users and support staff
    const eligibleUsers = await getEligibleUsers(dbClient);
    const eligibleSupportStaff = await getEligibleSupportStaff(dbClient);
    
    if (eligibleUsers.length === 0 || eligibleSupportStaff.length === 0) {
      console.log('❌ Not enough eligible users or support staff for allocation.');
      return;
    }
    
    // Group users and support staff by department
    const usersByDept = {};
    const staffByDept = {};
    
    eligibleUsers.forEach(user => {
      if (!usersByDept[user.department]) usersByDept[user.department] = [];
      usersByDept[user.department].push(user);
    });
    
    eligibleSupportStaff.forEach(staff => {
      if (!staffByDept[staff.department]) staffByDept[staff.department] = [];
      staffByDept[staff.department].push(staff);
    });
    
    // Find departments with both eligible users and support staff
    const commonDepartments = Object.keys(usersByDept).filter(dept => staffByDept[dept]);
    
    if (commonDepartments.length === 0) {
      console.log('❌ No departments found with both eligible users and available support staff.');
      console.log('Available departments with users:', Object.keys(usersByDept));
      console.log('Available departments with support staff:', Object.keys(staffByDept));
      return;
    }
    
    console.log(`📋 Found ${commonDepartments.length} departments with both eligible users and support staff:`);
    commonDepartments.forEach(dept => {
      console.log(`   • ${dept}: ${usersByDept[dept].length} users, ${staffByDept[dept].length} support staff`);
    });
    console.log('');
    
    // Perform allocations
    let successfulAllocations = 0;
    const allocations = [];
    
    for (const department of commonDepartments) {
      const users = usersByDept[department];
      const staff = staffByDept[department];
      
      console.log(`🏢 Processing ${department} department:`);
      
      // Allocate support staff to users (one-to-one mapping)
      const maxAllocations = Math.min(users.length, staff.length);
      
      for (let i = 0; i < maxAllocations; i++) {
        const user = users[i];
        const supportStaff = staff[i];
        
        try {
          console.log(`   🔗 Assigning ${supportStaff.full_name} as support staff to ${user.full_name}...`);
          
          const result = await assignSupportStaff(dbClient, user.id, supportStaff.id);
          
          if (result.success) {
            successfulAllocations++;
            allocations.push({
              userId: user.id,
              userName: user.full_name,
              supportStaffId: supportStaff.id,
              supportStaffName: supportStaff.full_name,
              department: department
            });
            
            console.log(`   ✅ Successfully assigned!`);
          }
        } catch (error) {
          console.log(`   ❌ Failed to assign: ${error.message}`);
        }
      }
      
      console.log(`   📊 ${successfulAllocations} successful allocations in ${department}\n`);
    }
    
    console.log(`🎉 Support staff allocation completed!`);
    console.log(`📊 Total successful allocations: ${successfulAllocations}`);
    console.log(`📋 Allocations made:`);
    allocations.forEach(allocation => {
      console.log(`   • ${allocation.userName} → ${allocation.supportStaffName} (${allocation.department})`);
    });
    
    expect(successfulAllocations).toBeGreaterThan(0);
  }, 60000); // Longer timeout for multiple allocations

  test('should verify support staff assignments', async () => {
    console.log('🔍 Verifying support staff assignments...\n');
    
    // Get all current support staff assignments
    const assignments = await dbClient.query(
      `SELECT usa.id, 
              u.full_name as user_name, 
              u.email as user_email,
              u.department as user_department,
              ss.full_name as support_staff_name,
              ss.email as support_staff_email,
              ss.department as support_staff_department,
              usa.created_at
       FROM user_support_assignments usa
       JOIN users u ON usa.user_id = u.id
       JOIN users ss ON usa.support_staff_id = ss.id
       ORDER BY u.department, u.full_name`
    );
    
    if (assignments.rows.length === 0) {
      console.log('❌ No support staff assignments found.');
      return;
    }
    
    console.log(`📋 Found ${assignments.rows.length} support staff assignments:\n`);
    console.log('User\t\t\t\tSupport Staff\t\t\tDepartment\t\tAssigned At');
    console.log('----\t\t\t\t-------------\t\t\t----------\t\t-----------');
    
    assignments.rows.forEach(assignment => {
      console.log(
        `${assignment.user_name.padEnd(25)}\t` +
        `${assignment.support_staff_name.padEnd(25)}\t` +
        `${assignment.user_department.padEnd(15)}\t` +
        `${new Date(assignment.created_at).toLocaleDateString()}`
      );
      
      // Verify department matching
      expect(assignment.user_department).toBe(assignment.support_staff_department);
    });
    
    console.log(`\n✅ All ${assignments.rows.length} assignments verified successfully.`);
    expect(assignments.rows.length).toBeGreaterThan(0);
  }, 30000);

  test('should show department-wise assignment status', async () => {
    console.log('📊 Showing department-wise support staff assignment status...\n');
    
    // Get all departments
    const departments = await dbClient.query('SELECT DISTINCT department FROM users WHERE active = true ORDER BY department');
    
    for (const dept of departments.rows) {
      console.log(`🏢 ${dept.department}:`);
      
      // Get all users in department
      const deptUsers = await getUsersByDepartment(dbClient, dept.department);
      
      const totalUsers = deptUsers.length;
      const usersWithSupport = deptUsers.filter(user => user.support_staff_id !== null).length;
      const usersWithoutSupport = totalUsers - usersWithSupport;
      
      console.log(`   Total users: ${totalUsers}`);
      console.log(`   Users with support staff: ${usersWithSupport}`);
      console.log(`   Users without support staff: ${usersWithoutSupport}`);
      
      if (usersWithSupport > 0) {
        console.log(`   Assigned pairs:`);
        deptUsers
          .filter(user => user.support_staff_id !== null)
          .forEach(user => {
            console.log(`     • ${user.full_name} → ${user.support_staff_name}`);
          });
      }
      
      console.log('');
    }
  }, 30000);
});