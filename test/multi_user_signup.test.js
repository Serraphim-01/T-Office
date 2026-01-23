/**
 * User Signup Test Script
 * This script creates a new test user and saves the user ID for cleanup purposes.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const TEST_USER_EMAIL = `test_user_${Date.now()}@example.com`;
const TEST_USER_PASSWORD = 'SecurePassword123!';
const TEST_USER_NAME = `Test User ${Date.now()}`;
const TEST_DEPARTMENT = 'Admin'; // You can modify this as needed

// Store test user info for cleanup
const testUserData = {
  email: TEST_USER_EMAIL,
  userId: null,
  timestamp: new Date().toISOString()
};

console.log('🧪 Starting user signup test...');
console.log('📝 Creating test user:', TEST_USER_EMAIL);

// Function to sign up a new user
async function signUpUser() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/signup`, {
      name: TEST_USER_NAME,
      email: TEST_USER_EMAIL,
      department: TEST_DEPARTMENT,
      password: TEST_USER_PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ User signup successful!');
    console.log('👤 Response:', {
      status: response.status,
      userId: response.data.user?.id,
      email: response.data.user?.email
    });

    // Save user ID for cleanup
    testUserData.userId = response.data.user?.id;
    
    // Write test user data to file for cleanup script
    const testDataPath = path.join(process.cwd(), 'test-users.json');
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
    
    console.log('💾 Test user data saved for cleanup');
    return response.data;
  } catch (error) {
    console.error('❌ Error during signup:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
(async () => {
  try {
    await signUpUser();
    console.log('🎉 User signup test completed successfully!');
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
})();