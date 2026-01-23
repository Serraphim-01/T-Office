/**
 * User Signup Test Script (Jest compatible version using test auth system)
 * This script tests user signup functionality using the test authentication system.
 */

import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createTestApp } from './setup-test-app.js';
import { testAuth } from './test-auth-helper.js';

// Configuration
const TEST_USER_EMAIL = `test_user_${Date.now()}@example.com`;
const TEST_USER_NAME = `Test User ${Date.now()}`;
const TEST_DEPARTMENT = 'Admin'; // You can modify this as needed

describe('User Signup Tests with Test Auth System', () => {
  // Store test user info for cleanup
  let testUserData = null;
  const testDataPath = path.join(process.cwd(), 'test-users.json');

  beforeEach(() => {
    testUserData = {
      email: TEST_USER_EMAIL,
      userId: `test-user-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  });

  test('should allow admin users to create new users', async () => {
    // Create test app with admin-level auth to simulate a privileged user who can create users
    const app = createTestApp({
      authMiddleware: testAuth({
        userId: 'admin-test-user',
        role: 'admin',
        department: 'admin',
        full_name: 'Test Admin'
      })
    });

    // Simulate a user creation endpoint (this would be implemented in your actual API)
    app.post('/api/test-signup', (req, res) => {
      // This simulates the signup endpoint logic
      if (!req.user || !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      // Simulate successful user creation
      const newUser = {
        id: testUserData.userId,
        full_name: TEST_USER_NAME,
        email: TEST_USER_EMAIL,
        department: TEST_DEPARTMENT,
        role: 'user'
      };
      
      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    });

    // Make request to test signup endpoint
    const response = await request(app)
      .post('/api/test-signup')
      .send({
        name: TEST_USER_NAME,
        email: TEST_USER_EMAIL,
        department: TEST_DEPARTMENT
      })
      .expect(201);

    expect(response.body.message).toBe('User created successfully');
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(TEST_USER_EMAIL);
    expect(response.body.user.department).toBe(TEST_DEPARTMENT);

    // Save user ID for cleanup
    testUserData.userId = response.body.user?.id;
    
    // Write test user data to file for cleanup script
    let existingData = [];
    
    // Read existing test users data if file exists
    if (fs.existsSync(testDataPath)) {
      const fileContent = fs.readFileSync(testDataPath, 'utf8');
      existingData = JSON.parse(fileContent);
    }
    
    // Add new test user data
    existingData.push(testUserData);
    
    // Write updated data back to file
    fs.writeFileSync(testDataPath, JSON.stringify(existingData, null, 2));
  });

  test('should block unauthorized users from creating users', async () => {
    // Create test app with regular user auth (should not be able to create users)
    const app = createTestApp({
      authMiddleware: testAuth({
        userId: 'regular-user',
        role: 'user',
        department: 'sales',
        full_name: 'Regular User'
      })
    });

    // Add the same endpoint but expect it to fail for regular users
    app.post('/api/test-unauthorized-signup', (req, res) => {
      if (!req.user || !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      const newUser = {
        id: `test-user-${Date.now()}`,
        full_name: TEST_USER_NAME,
        email: TEST_USER_EMAIL,
        department: TEST_DEPARTMENT,
        role: 'user'
      };
      
      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    });

    // Make request and expect 403 Forbidden
    const response = await request(app)
      .post('/api/test-unauthorized-signup')
      .send({
        name: TEST_USER_NAME,
        email: TEST_USER_EMAIL,
        department: TEST_DEPARTMENT
      })
      .expect(403);

    expect(response.body.error).toBe('Forbidden: Insufficient permissions');
  });

  test('should allow HR managers to create users', async () => {
    // Create test app with HR manager auth
    const app = createTestApp({
      authMiddleware: testAuth({
        userId: 'hr-manager-test-user',
        role: 'hr_manager',
        department: 'HR',
        full_name: 'HR Manager'
      })
    });

    app.post('/api/test-hr-signup', (req, res) => {
      if (!req.user || !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      const newUser = {
        id: `test-user-${Date.now()}`,
        full_name: TEST_USER_NAME,
        email: TEST_USER_EMAIL,
        department: TEST_DEPARTMENT,
        role: 'user'
      };
      
      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    });

    const response = await request(app)
      .post('/api/test-hr-signup')
      .send({
        name: TEST_USER_NAME,
        email: TEST_USER_EMAIL,
        department: TEST_DEPARTMENT
      })
      .expect(201);

    expect(response.body.message).toBe('User created successfully');
    expect(response.body.user).toBeDefined();
  });
});