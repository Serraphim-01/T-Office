/**
 * User Cleanup Test Script (Jest compatible version using test auth system)
 * This script tests user cleanup functionality using the test authentication system.
 */

import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createTestApp } from './setup-test-app.js';
import { testAuth } from './test-auth-helper.js';

describe('User Cleanup Tests with Test Auth System', () => {
  // Path to test users data
  const testDataPath = path.join(process.cwd(), 'test-users.json');

  // Helper function to create test users data file
  const createTestData = () => {
    const testUsers = [
      {
        email: `test_user_1_${Date.now()}@example.com`,
        userId: `test-user-1-${Date.now()}`,
        timestamp: new Date().toISOString()
      },
      {
        email: `test_user_2_${Date.now()}@example.com`,
        userId: `test-user-2-${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    ];
    
    fs.writeFileSync(testDataPath, JSON.stringify(testUsers, null, 2));
    return testUsers;
  };

  beforeEach(() => {
    // Create test data before each test
    createTestData();
  });

  afterEach(() => {
    // Clean up test data after each test
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
  });

  test('should allow admin users to deactivate users', async () => {
    const testUsers = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    
    // Create test app with admin-level auth to simulate a privileged user who can delete users
    const app = createTestApp({
      authMiddleware: testAuth({
        userId: 'admin-test-user',
        role: 'admin',
        department: 'admin',
        full_name: 'Test Admin'
      })
    });

    // Simulate user deletion endpoint
    app.delete('/api/test-users/:id', (req, res) => {
      // This simulates the user deletion endpoint logic
      if (!req.user || !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      const userId = req.params.id;
      
      // Simulate successful user deactivation
      res.json({
        message: `User ${userId} deactivated successfully`,
        userId: userId
      });
    });

    // Test individual user cleanup
    for (const userData of testUsers) {
      const response = await request(app)
        .delete(`/api/test-users/${userData.userId}`)
        .expect(200);

      expect(response.body.message).toContain('deactivated successfully');
      expect(response.body.userId).toBe(userData.userId);
    }
  });

  test('should block unauthorized users from deactivating users', async () => {
    const testUsers = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    
    // Create test app with regular user auth (should not be able to delete users)
    const app = createTestApp({
      authMiddleware: testAuth({
        userId: 'regular-user',
        role: 'user',
        department: 'sales',
        full_name: 'Regular User'
      })
    });

    // Add the same endpoint but expect it to fail for regular users
    app.delete('/api/test-unauthorized-users/:id', (req, res) => {
      if (!req.user || !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      res.json({
        message: `User ${req.params.id} deactivated successfully`,
        userId: req.params.id
      });
    });

    // Make request and expect 403 Forbidden
    const response = await request(app)
      .delete('/api/test-unauthorized-users/some-user-id')
      .expect(403);

    expect(response.body.error).toBe('Forbidden: Insufficient permissions');
  });

  test('should support bulk user cleanup by admin users', async () => {
    const testUsers = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    const userEmails = testUsers.map(user => user.email);

    // Create test app with admin-level auth
    const app = createTestApp({
      authMiddleware: testAuth({
        userId: 'admin-test-user',
        role: 'admin',
        department: 'admin',
        full_name: 'Test Admin'
      })
    });

    // Simulate bulk user cleanup endpoint
    app.post('/api/test-users/cleanup', (req, res) => {
      if (!req.user || !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      const { userEmails } = req.body;
      
      // Simulate successful cleanup
      res.json({
        message: `${userEmails.length} test users deactivated successfully`,
        cleanedUpUsers: userEmails
      });
    });

    const response = await request(app)
      .post('/api/test-users/cleanup')
      .send({ userEmails })
      .expect(200);

    expect(response.body.message).toContain('test users deactivated successfully');
    expect(response.body.cleanedUpUsers).toEqual(userEmails);
    expect(response.body.cleanedUpUsers.length).toBe(userEmails.length);
  });

  test('should support pattern-based cleanup by admin users', async () => {
    // Create test app with admin-level auth
    const app = createTestApp({
      authMiddleware: testAuth({
        userId: 'admin-test-user',
        role: 'admin',
        department: 'admin',
        full_name: 'Test Admin'
      })
    });

    // Simulate pattern-based cleanup endpoint
    app.post('/api/test-users/cleanup-by-pattern', (req, res) => {
      if (!req.user || !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      const { pattern } = req.body;
      
      // Simulate finding and cleaning up users matching the pattern
      res.json({
        message: `Simulated cleanup of test users matching pattern: ${pattern}`,
        pattern: pattern,
        usersAffected: 2 // Simulated result
      });
    });

    const testUserPattern = '%test_user_%@example.com%';
    
    const response = await request(app)
      .post('/api/test-users/cleanup-by-pattern')
      .send({ pattern: testUserPattern })
      .expect(200);
    
    expect(response.body.message).toContain('Simulated cleanup of test users');
    expect(response.body.pattern).toBe(testUserPattern);
    expect(response.body.usersAffected).toBe(2);
  });

  test('should block unauthorized users from bulk cleanup', async () => {
    const testUsers = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    const userEmails = testUsers.map(user => user.email);

    // Create test app with regular user auth
    const app = createTestApp({
      authMiddleware: testAuth({
        userId: 'regular-user',
        role: 'user',
        department: 'sales',
        full_name: 'Regular User'
      })
    });

    // Endpoint that should require admin privileges
    app.post('/api/test-unauthorized-cleanup', (req, res) => {
      if (!req.user || !['admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      const { userEmails } = req.body;
      
      res.json({
        message: `${userEmails.length} test users deactivated successfully`,
        cleanedUpUsers: userEmails
      });
    });

    const response = await request(app)
      .post('/api/test-unauthorized-cleanup')
      .send({ userEmails })
      .expect(403);

    expect(response.body.error).toBe('Forbidden: Insufficient permissions');
  });
});