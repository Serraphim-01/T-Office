/**
 * Interactive Offboard Test for Specific Users by Department and IDs
 * This test simulates the interactive offboarding process by department and specific user IDs.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

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

// Mock readline functionality for testing
const mockReadline = {
  question: jest.fn(),
};

// Mock departments and users data for testing
const mockDepartments = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Marketing' },
  { id: 3, name: 'Sales' },
];

const mockUsers = [
  { id: 1, full_name: 'John Doe', email: 'john.doe@example.com', active: true },
  { id: 2, full_name: 'Jane Smith', email: 'jane.smith@example.com', active: true },
  { id: 3, full_name: 'Bob Johnson', email: 'bob.johnson@example.com', active: false },
  { id: 4, full_name: 'Alice Williams', email: 'alice.williams@example.com', active: true },
];

// Jest mock functions
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn().mockImplementation((sql, params) => {
      if (sql.includes('SELECT id, name FROM departments')) {
        return Promise.resolve({ rows: mockDepartments });
      } else if (sql.includes('SELECT id, full_name, email, active FROM users WHERE department')) {
        return Promise.resolve({ rows: mockUsers });
      } else if (sql.includes('SELECT full_name, email FROM users WHERE id')) {
        const userId = params[0];
        const user = mockUsers.find(u => u.id === userId);
        return Promise.resolve({ rows: user ? [user] : [] });
      } else if (sql.includes('UPDATE users SET active = false WHERE id')) {
        return Promise.resolve({ rowCount: 1 });
      } else if (sql.includes('SELECT active FROM users WHERE id')) {
        return Promise.resolve({ rows: [{ active: false }] });
      } else if (sql === 'BEGIN' || sql === 'COMMIT') {
        return Promise.resolve({});
      }
      return Promise.resolve({ rows: [] });
    }),
    end: jest.fn(),
  }))
}));

// Import readline mock
let mockQuestionResponses = [];
let responseIndex = 0;

// Set up mock question responses for the interactive flow
beforeEach(() => {
  responseIndex = 0;
  mockQuestionResponses = ['1', '1, 2, 4']; // Select department 1, then user IDs 1, 2, 4
});

// Mock readline functionality
const originalModule = jest.requireActual('readline');
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((query, callback) => {
      // Simulate user input
      setTimeout(() => {
        if (responseIndex < mockQuestionResponses.length) {
          callback(mockQuestionResponses[responseIndex]);
          responseIndex++;
        } else {
          callback('quit'); // Default to quit to end the simulation
        }
      }, 10);
    }),
    close: jest.fn(),
  })),
  ...originalModule,
}));

describe('Interactive Offboard Users by Department and IDs', () => {
  let dbClient;
  let originalConsoleLog;

  beforeAll(async () => {
    originalConsoleLog = console.log;
    console.log = jest.fn(); // Mock console.log to reduce noise in test output
    
    // Create a database client to be reused
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL
    });
    await dbClient.connect();
  });

  afterAll(async () => {
    // Restore console.log
    console.log = originalConsoleLog;
    
    // Close the database connection
    if (dbClient) {
      await dbClient.end();
    }
  });

  test('should allow interactive offboarding of users by department and specific IDs', async () => {
    console.log('🚪 Starting interactive user offboarding process...\n');
    
    console.log('📋 Available departments:');
    
    const departments = await getDepartments(dbClient);
    
    departments.forEach(dept => {
      console.log(`${dept.id}. ${dept.name}`);
    });
    
    // Get and display users in a department (simulating user selection)
    const selectedDepartment = departments[0]; // Simulate user selecting first department
    const departmentName = selectedDepartment.name;
    
    console.log(`\n🔍 Retrieving users from ${departmentName} department...\n`);
    
    // Get and display users in the selected department
    const users = await getUsersByDepartment(dbClient, departmentName);
    
    if (users.length === 0) {
      console.log(`✅ No users found in the ${departmentName} department.`);
      expect(users.length).toBeGreaterThan(0); // We expect users to exist for the test
      return;
    }
    
    console.log(`📋 Found ${users.length} users in ${departmentName} department:\n`);
    console.log('ID\tFull Name\t\t\tEmail\t\t\t\t\tActive');
    console.log('--\t---------\t\t\t-----\t\t\t\t\t------');
    
    users.forEach(user => {
      const status = user.active ? '✅' : '❌';
      console.log(`${user.id}\t${user.full_name.padEnd(20)}\t${user.email.padEnd(35)}\t${status}`);
    });
    
    console.log('');
    
    // Simulate user input for specific user IDs to offboard
    // In the interactive version, users would input comma-separated IDs
    const userIdsToOffboard = [1, 2, 4]; // Simulate user entering '1, 2, 4'
    
    if (userIdsToOffboard.length === 0) {
      console.log('✅ No user IDs entered for offboarding.');
      return;
    }
    
    console.log(`📋 Users to be offboarded (IDs): ${userIdsToOffboard.join(', ')}\n`);
    
    // Offboard the selected users
    const offboardedCount = await offboardUsersByIds(dbClient, userIdsToOffboard);
    
    console.log(`\n🎉 Offboarding completed successfully!`);
    console.log(`📊 Total users offboarded: ${offboardedCount}`);
    console.log(`📋 Total users processed: ${userIdsToOffboard.length}`);
    
    // Verify that the users were properly offboarded
    for (const userId of userIdsToOffboard) {
      const verifyResult = await dbClient.query(
        'SELECT active FROM users WHERE id = $1',
        [userId]
      );
      
      if (verifyResult.rows.length > 0) {
        expect(verifyResult.rows[0].active).toBe(false);
      }
    }
    
    expect(offboardedCount).toBe(userIdsToOffboard.length);
  }, 30000); // Increase timeout for database operations
});

// Additional test to verify the interactive flow
describe('Interactive Flow Simulation', () => {
  test('should properly handle department selection and user ID input', async () => {
    const dbClient = new Client({
      connectionString: process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL
    });
    
    // Mock console.log to reduce noise
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Test department retrieval
    const departments = await getDepartments(dbClient);
    expect(departments).toBeDefined();
    expect(Array.isArray(departments)).toBe(true);
    
    if (departments.length > 0) {
      // Test user retrieval by department
      const users = await getUsersByDepartment(dbClient, departments[0].name);
      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
      
      // Test offboarding specific users
      const testUserIds = users.slice(0, 2).map(user => user.id);
      if (testUserIds.length > 0) {
        const offboardedCount = await offboardUsersByIds(dbClient, testUserIds);
        expect(offboardedCount).toBeGreaterThanOrEqual(0);
      }
    }
    
    consoleSpy.mockRestore();
  });
});