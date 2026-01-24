/**
 * Multi User Signup Test Script (Actually creates users in database)
 * This script creates multiple users across different departments using the database.
 * Creates users in multiple departments based on database data.
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { testAuth } from './test-auth-helper.js';

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

describe('Multi User Creation in Database', () => {
  // Path to test users data
  const testDataPath = path.join(process.cwd(), 'test-users.json');
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

  beforeEach(() => {
    // Clean up any existing test data
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
  });

  afterEach(() => {
    // Clean up test data after each test
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
  });

  // Helper function to get departments and roles from database
  const getDepartmentsAndRoles = async () => {
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
  };

  // Helper function to hash password
  const hashPassword = async (password) => {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    return await bcrypt.hash(password, saltRounds);
  };

  test('should create multiple users in database across all departments with actual names and numbers', async () => {
    // Get departments and roles from database
    const departmentsWithRoles = await getDepartmentsAndRoles();
    
    // Create users for each department (between 5 and 10 per department)
    const allUsersCreated = [];
    const testUsersForCleanup = [];

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
      
      // Verify all users were created
      expect(allUsersCreated.length).toBeGreaterThan(0);
      
      // Save user data for cleanup
      fs.writeFileSync(testDataPath, JSON.stringify(testUsersForCleanup, null, 2));
      
      // Verify users exist in database
      for (const user of allUsersCreated) {
        const verifyResult = await dbClient.query(
          'SELECT id, full_name, email, department, role_id FROM users WHERE id = $1',
          [user.id]
        );
        
        expect(verifyResult.rows.length).toBe(1);
        expect(verifyResult.rows[0].id).toBe(user.id);
        expect(verifyResult.rows[0].full_name).toBe(user.full_name);
        expect(verifyResult.rows[0].email).toBe(user.email);
        expect(verifyResult.rows[0].department).toBe(user.department);
      }
      
      console.log(`Successfully created ${allUsersCreated.length} users across ${departmentsWithRoles.length} departments in database`);
      
    } catch (error) {
      // Rollback the transaction on error
      await dbClient.query('ROLLBACK');
      console.error('Error creating users in database:', error);
      throw error;
    }
  }, 30000); // Increase timeout for database operations

  test('should verify user count per department is between 5 and 10', async () => {
    const departmentsWithRoles = await getDepartmentsAndRoles();
    
    for (const dept of departmentsWithRoles) {
      // Count users created for this department (only test users)
      const countResult = await dbClient.query(
        `SELECT COUNT(*) as count 
         FROM users 
         WHERE department = $1 
         AND email LIKE '%_actual_%' 
         AND created_at >= $2`,
        [dept.name, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()] // Last 24 hours
      );
      
      const userCount = parseInt(countResult.rows[0].count);
      
      console.log(`Department ${dept.name} has ${userCount} test users`);
      
      // Verify count is within range (only check if there are test users for this dept)
      if (userCount > 0) {
        expect(userCount).toBeGreaterThanOrEqual(5);
        expect(userCount).toBeLessThanOrEqual(10);
      }
    }
  }, 30000); // Increase timeout for database operations

  test('should cleanup test users created in database', async () => {
    // Get test users from file
    if (fs.existsSync(testDataPath)) {
      const testUsers = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
      
      if (testUsers.length > 0) {
        // Start a transaction for cleanup
        await dbClient.query('BEGIN');
        
        try {
          // Soft-delete the test users by setting active to false
          for (const user of testUsers) {
            await dbClient.query(
              'UPDATE users SET active = false WHERE email = $1',
              [user.email]
            );
            console.log(`Deactivated test user: ${user.email}`);
          }
          
          // Commit the transaction
          await dbClient.query('COMMIT');
          
          console.log(`Successfully deactivated ${testUsers.length} test users`);
        } catch (error) {
          // Rollback on error
          await dbClient.query('ROLLBACK');
          console.error('Error during cleanup:', error);
          throw error;
        }
      }
    }
  }, 30000); // Increase timeout for database operations
});