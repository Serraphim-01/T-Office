import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Creates a fake authentication middleware for tests
 * This bypasses the real JWT verification and injects a trusted identity
 */
export function testAuth(userOverrides = {}) {
  return (req, _res, next) => {
    req.user = {
      userId: 'test-user-id',
      department: 'test-department',
      role: 'user',
      full_name: 'Test User',
      ...userOverrides
    };
    next();
  };
}

/**
 * Creates a real JWT token for integration tests
 * Use this sparingly - only for end-to-end tests
 */
export function createTestToken(payload = {}) {
  const defaultPayload = {
    userId: 'test-user-id',
    department: 'test-department',
    role: 'user',
    full_name: 'Test User'
  };

  const tokenPayload = {
    ...defaultPayload,
    ...payload
  };

  return jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET || 'demo-secret',
    { expiresIn: '1h' }
  );
}

/**
 * Mocks the database user lookup that happens in the real auth middleware
 * This ensures the test user has consistent properties with real users
 */
export function mockUserDatabaseLookup(userOverrides = {}) {
  const mockUser = {
    id: 'test-user-id',
    department: 'test-department',
    role: 'user',
    full_name: 'Test User',
    active: true,
    ...userOverrides
  };

  // Mock the pool.query method to return our test user
  return {
    query: jest.fn().mockImplementation(async (text, params) => {
      // Simulate the user lookup query from auth middleware
      if (text.includes('FROM users u LEFT JOIN roles r')) {
        return {
          rows: [{
            department: mockUser.department,
            active: mockUser.active,
            full_name: mockUser.full_name,
            role: mockUser.role || 'default'
          }]
        };
      }
      
      // Default response for other queries
      return { rows: [] };
    })
  };
}

/**
 * Authorization helper functions that can be tested separately
 */
export const authorizationHelpers = {
  /**
   * Check if user can access admin features
   */
  canAccessAdminFeatures: (user) => {
    return user.role === 'admin';
  },

  /**
   * Check if user can access HR features
   */
  canAccessHrFeatures: (user) => {
    return user.role === 'admin' || user.role === 'hr_manager' || user.role === 'manager';
  },

  /**
   * Check if user can access inventory features
   */
  canAccessInventoryFeatures: (user) => {
    return user.role === 'admin' || user.role === 'inventory_manager' || user.department === 'inventory';
  },

  /**
   * Check if user can access their own profile data
   */
  canAccessProfile: (user, targetUserId) => {
    return user.userId === targetUserId || authorizationHelpers.canAccessAdminFeatures(user);
  },

  /**
   * Check if user can manage users in their department
   */
  canManageDepartmentUsers: (user) => {
    return user.role === 'admin' || user.role === 'hr_manager' || user.role === 'manager';
  }
};