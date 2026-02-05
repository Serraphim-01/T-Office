/**
 * Test Authentication Helper
 * Provides authentication utilities for all test scripts
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'superadmin@test.com',
  password: process.env.ADMIN_PASSWORD || 'SuperAdmin123!'
};

/**
 * Get admin authentication token
 * Creates admin user if it doesn't exist, then returns the token
 */
async function getAdminToken() {
  try {
    // Always authenticate fresh to avoid token expiration issues
    console.log('Authenticating as admin user...');
    
    const response = await axios.post(`${API_BASE_URL}/api/login`, {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password
    });
    
    const token = response.data.token;
    
    // Save the credentials for future use
    const adminDataPath = path.join(process.cwd(), 'test-data', 'admin-user.json');
    const adminData = {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      token: token,
      user: response.data.user,
      timestamp: new Date().toISOString()
    };
    
    const testDataDir = path.dirname(adminDataPath);
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    fs.writeFileSync(adminDataPath, JSON.stringify(adminData, null, 2));
    console.log('✓ Admin authentication successful');
    
    return token;
    
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid admin credentials. Run the admin user creation script first.');
    }
    throw new Error(`Authentication failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest(method, endpoint, data = null) {
  const token = await getAdminToken();
  
  const config = {
    method: method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return response;
  } catch (error) {
    throw new Error(`API request failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Get authenticated axios instance
 */
async function getAuthenticatedAxios() {
  const token = await getAdminToken();
  
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return instance;
}

/**
 * Verify admin permissions by testing key endpoints
 */
async function verifyAdminPermissions() {
  try {
    const token = await getAdminToken();
    
    const testEndpoints = [
      '/api/admin/departments',
      '/api/hr/users', 
      '/api/inventory/providers',
      '/api/inventory/products'
    ];
    
    const results = [];
    
    for (const endpoint of testEndpoints) {
      try {
        await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        results.push({ endpoint, success: true });
      } catch (error) {
        results.push({ endpoint, success: false, error: error.response?.status });
      }
    }
    
    return results;
    
  } catch (error) {
    throw new Error(`Permission verification failed: ${error.message}`);
  }
}

export { 
  getAdminToken, 
  makeAuthenticatedRequest, 
  getAuthenticatedAxios,
  verifyAdminPermissions,
  ADMIN_CREDENTIALS 
};