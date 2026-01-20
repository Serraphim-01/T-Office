# T-Office Test Scripts

This directory contains test scripts for the T-Office application to help with automated testing and data management.

## Available Test Scripts

### 1. User Signup Test (`user_signup.test.js`)
- Creates a new test user with a unique email address
- Stores the user information for later cleanup
- Helps test the user registration flow

### 2. User Cleanup Test (`user_cleanup.test.js`)
- Removes test users created during testing by connecting directly to the database
- Does not require admin credentials or API authentication
- Prevents database pollution with temporary test data

### 3. Combined Cleanup Approach
The `user_cleanup.test.js` script now intelligently combines both approaches:
- First attempts API-based cleanup (requires admin credentials)
- Falls back to direct database cleanup when API authentication fails
- Provides the best of both worlds with graceful degradation

### 3. Test Runner (`run_tests.js`)
- Convenient script to run various test combinations
- Handles dependency installation automatically

### 4. Available Test Commands

1. **Signup Test:**
   ```bash
   node run_tests.js signup
   ```

2. **Direct Database Cleanup Test (no credentials required):**
   ```bash
   node run_tests.js cleanup
   ```

3. **Both Signup and Cleanup:**
   ```bash
   node run_tests.js both
   ```

4. **Complete Test Suite (Recommended):**
   ```bash
   node run_tests.js all
   ```

## How to Run Tests

### Prerequisites
- Ensure the backend server is running on the configured port (default: 4000)
- Have an admin user account available for cleanup operations

### Running Tests

1. **Run signup test only:**
   ```bash
   node test/run_tests.js signup
   ```

2. **Run cleanup test only:**
   ```bash
   node test/run_tests.js cleanup
   ```

3. **Run both tests sequentially:**
   ```bash
   node test/run_tests.js both
   ```

### Environment Variables

The tests use the following environment variables:

- `API_BASE_URL`: The backend API URL (default: http://localhost:4000)
- `ADMIN_EMAIL`: Email of an admin user for cleanup operations (default: admin@example.com)
- `ADMIN_PASSWORD`: Password of the admin user (default: admin_password)

You can set these by creating a `.env` file in the test directory or exporting them in your shell.

## Test Data Management

Test users created by the signup script are stored in `test/test-users.json` with:
- Email address
- User ID
- Creation timestamp

The cleanup script reads this file and removes all test users to keep the database clean.