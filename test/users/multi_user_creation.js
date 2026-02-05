/**
 * Multi User Creation Script
 * Creates multiple users across different departments using the database
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env.local' });

// List of actual first and last names to use
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra',
  'Donald', 'Donna', 'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
  'Kenneth', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah', 'Edward', 'Dorothy'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

// Helper function to generate random names
const generateRandomName = () => {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const randomNumber = Math.floor(Math.random() * 10000); // Add random number to ensure uniqueness
  
  return `${firstName} ${lastName} ${randomNumber}`;
};

// Helper function to generate email from name and department
const generateEmailFromNameAndDepartment = (fullName, department) => {
  // Extract first name and last name, and random number
  const parts = fullName.split(' ');
  const firstName = parts[0].toLowerCase();
  const lastName = parts[1].toLowerCase();
  const number = parts[2] || Date.now(); // Use the random number or timestamp if available
  
  return `${firstName}.${lastName}.${number}@${department.toLowerCase().replace(/\s+/g, '')}.com`;
};

// Helper function to hash password
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
  return await bcrypt.hash(password, saltRounds);
};

async function getDepartmentsAndRoles(dbClient) {
  try {
    // Get all departments
    const departmentsResult = await dbClient.query('SELECT id, name FROM departments ORDER BY name');
    const departments = departmentsResult.rows;
    
    // For each department, get available roles
    const departmentsWithRoles = [];
    
    for (const dept of departments) {
      const rolesResult = await dbClient.query(
        'SELECT id, name FROM roles WHERE department_id = $1 ORDER BY name',
        [dept.id]
      );
      const roles = rolesResult.rows;
      
      departmentsWithRoles.push({
        ...dept,
        roles: roles.length > 0 ? roles : [{ id: null, name: 'default' }] // fallback to default if no roles
      });
    }
    
    return departmentsWithRoles;
  } catch (error) {
    console.error('Error fetching departments and roles:', error);
    // Return some default departments as fallback
    return [
      { id: 1, name: 'Admin', roles: [{ id: 1, name: 'default' }] },
      { id: 2, name: 'HR', roles: [{ id: 2, name: 'default' }] },
      { id: 3, name: 'Sales', roles: [{ id: 3, name: 'default' }] }
    ];
  }
}

async function createUsers(dbClient) {
  console.log('=== Multi User Creation Script ===\n');
  
  try {
    // Get departments and roles from database
    const departmentsWithRoles = await getDepartmentsAndRoles(dbClient);
    
    // Create users for each department (between 5 and 10 per department)
    const allUsersCreated = [];
    const testUsersForCleanup = [];
    
    // Path to test users data
    const testDataPath = path.join(process.cwd(), 'test-users.json');

    // Start a transaction for all user creations
    await dbClient.query('BEGIN');

    try {
      for (const dept of departmentsWithRoles) {
        // Generate random number of users between 5 and 10 for this department
        const numUsers = Math.floor(Math.random() * 6) + 5; // 5 to 10 users
        
        console.log(`Creating ${numUsers} users for department: ${dept.name}`);

        for (let i = 0; i < numUsers; i++) {
          // Select a random role from available roles for this department
          const randomRole = dept.roles[Math.floor(Math.random() * dept.roles.length)];
          
          // Generate actual name with text and numbers
          const userName = generateRandomName();
          const userEmail = generateEmailFromNameAndDepartment(userName, dept.name);
          const userPassword = 'SecurePassword123!';
          
          // Hash the password
          const hashedPassword = await hashPassword(userPassword);
          
          // Get role ID from database
          let roleId = null;
          if (randomRole.id) {
            roleId = randomRole.id;
          } else {
            // If no specific role ID, try to get the default role for the department
            const defaultRoleResult = await dbClient.query(
              'SELECT id FROM roles WHERE department_id = $1 AND is_default = true LIMIT 1',
              [dept.id]
            );
            if (defaultRoleResult.rows.length > 0) {
              roleId = defaultRoleResult.rows[0].id;
            } else {
              // If no default, just pick the first role
              const firstRoleResult = await dbClient.query(
                'SELECT id FROM roles WHERE department_id = $1 LIMIT 1',
                [dept.id]
              );
              if (firstRoleResult.rows.length > 0) {
                roleId = firstRoleResult.rows[0].id;
              }
            }
          }
          
          // Insert user into database
          const insertResult = await dbClient.query(
            `INSERT INTO users (full_name, email, department, role_id, password_hash, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
             RETURNING id, full_name, email, department`,
            [userName, userEmail, dept.name, roleId, hashedPassword]
          );
          
          const createdUser = insertResult.rows[0];
          allUsersCreated.push(createdUser);
          
          // Track for cleanup
          testUsersForCleanup.push({
            email: createdUser.email,
            userId: createdUser.id,
            department: createdUser.department,
            timestamp: new Date().toISOString()
          });
          
          console.log(`Created user: ${createdUser.full_name} (${createdUser.email}) in ${dept.name} with role ${randomRole.name}`);
        }
      }

      // Commit the transaction
      await dbClient.query('COMMIT');
      
      // Save user data for cleanup
      fs.writeFileSync(testDataPath, JSON.stringify(testUsersForCleanup, null, 2));
      
      // Verify users exist in database
      let verifiedUsers = 0;
      for (const user of allUsersCreated) {
        const verifyResult = await dbClient.query(
          'SELECT id, full_name, email, department, role_id FROM users WHERE id = $1',
          [user.id]
        );
        
        if (verifyResult.rows.length === 1) {
          verifiedUsers++;
        }
      }
      
      console.log(`\n✓ Successfully created ${allUsersCreated.length} users across ${departmentsWithRoles.length} departments in database`);
      console.log(`✓ Verified ${verifiedUsers}/${allUsersCreated.length} users exist in database`);
      console.log(`✓ User data saved to: ${testDataPath}`);
      
      return allUsersCreated;
      
    } catch (error) {
      // Rollback the transaction on error
      await dbClient.query('ROLLBACK');
      console.error('Error creating users in database:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('✗ Multi user creation failed:', error.message);
    throw error;
  }
}

async function verifyUserCount(dbClient) {
  const departmentsWithRoles = await getDepartmentsAndRoles(dbClient);
  
  console.log('\n=== User Count Verification ===');
  let totalVerified = 0;
  
  for (const dept of departmentsWithRoles) {
    // Count users created for this department (only test users)
    const countResult = await dbClient.query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE department = $1 
       AND email LIKE '%@%' 
       AND created_at >= $2`,
      [dept.name, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()] // Last 24 hours
    );
    
    const userCount = parseInt(countResult.rows[0].count);
    console.log(`Department ${dept.name} has ${userCount} recent users`);
    totalVerified += userCount;
  }
  
  console.log(`\n✓ Total verified users: ${totalVerified}`);
  return totalVerified;
}

async function main() {
  let dbClient;
  
  try {
    // Create database client
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office'
    });
    
    await dbClient.connect();
    console.log('✓ Connected to database successfully\n');
    
    // Create users
    const createdUsers = await createUsers(dbClient);
    
    // Verify user counts
    await verifyUserCount(dbClient);
    
    console.log('\n🎉 Multi user creation completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Multi user creation failed:', error.message);
    process.exit(1);
  } finally {
    if (dbClient) {
      await dbClient.end();
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createUsers, verifyUserCount, main };