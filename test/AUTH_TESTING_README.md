# Authentication Testing Approach

This document explains the authentication testing strategy implemented in this project, following the best practices outlined in the original query.

## Core Concept

Instead of logging in users in every test, we use a "fake auth middleware" approach that:
- Bypasses authentication
- Injects a trusted identity
- Allows testing of authorization behavior

## Files Created

1. **[test-auth-helper.js](file:///Users/serraphim/Desktop/T-Office/test/test-auth-helper.js)** - Contains helper functions for creating test auth middleware and authorization logic
2. **[setup-test-app.js](file:///Users/serraphim/Desktop/T-Office/test/setup-test-app.js)** - Creates test app instances with swappable authentication
3. **[authenticated-action.test.js](file:///Users/serraphim/Desktop/T-Office/test/authenticated-action.test.js)** - Comprehensive tests demonstrating the approach

## Key Components

### 1. Fake Authentication Middleware
```javascript
export function testAuth(userOverrides = {}) {
  return (req, _res, next) => {
    req.user = {
      userId: 'test-user-id',
      department: 'test-department',
      role: 'user',
      full_name: 'Test User',
      ...userOverrides
    }
    next()
  }
}
```

### 2. Swappable Authentication
The test app can use either:
- Fake auth middleware for fast unit/integration tests
- Real JWT authentication for end-to-end tests (sparsely used)

### 3. Pure Authorization Functions
Separate authorization logic that can be tested independently:

```javascript
export const authorizationHelpers = {
  canAccessAdminFeatures: (user) => {
    return user.role === 'admin';
  },
  canAccessHrFeatures: (user) => {
    return user.role === 'admin' || user.role === 'hr_manager' || user.role === 'manager';
  },
  // ... other authorization functions
};
```

## Testing Pyramid Applied

- **Unit Tests**: Authorization logic functions (fast, many)
- **Integration Tests**: Fake auth middleware (most tests)  
- **E2E Tests**: Real JWT flow (very few)

## Benefits

1. **Speed**: No crypto operations or token generation overhead
2. **Reliability**: Not affected by token expiration or secret changes
3. **Focus**: Tests business logic rather than token plumbing
4. **Flexibility**: Easy to test different user roles and permissions
5. **Maintainability**: Clear separation between authentication and authorization

## Usage Examples

### Testing Different User Roles
```javascript
test('admin user should have full access', async () => {
  const app = createTestApp({
    authMiddleware: testAuth({
      role: 'admin',
      department: 'admin',
      full_name: 'System Admin'
    })
  });
  
  const response = await request(app)
    .get('/api/protected-endpoint')
    .expect(200);
});
```

### Testing Authorization Logic
```javascript
test('canAccessAdminFeatures works correctly', () => {
  expect(authorizationHelpers.canAccessAdminFeatures({ role: 'admin' })).toBe(true);
  expect(authorizationHelpers.canAccessAdminFeatures({ role: 'user' })).toBe(false);
});
```

## Anti-Patterns Avoided

- ❌ Logging in users in every test
- ❌ Copying real tokens into test files  
- ❌ Testing JWT libraries instead of business logic
- ❌ Controllers calling jwt.verify directly

## Recommended Approach

1. Use fake auth middleware for 95% of tests
2. Test authorization logic separately with pure functions
3. Use real JWT tokens only for 1-2 end-to-end tests
4. Focus on testing business logic, not authentication infrastructure