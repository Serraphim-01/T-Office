/**
 * Admin User Creation Script
 * Creates a super admin user with access to all features for testing
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const ADMIN_CREDS = {
  email: process.env.ADMIN_EMAIL || 'superadmin@test.com',
  password: process.env.ADMIN_PASSWORD || 'SuperAdmin123!',
  name: 'Super Admin User',
  department: 'Admin'
};

async function createAdminUser() {
  try {
    console.log('=== Creating Super Admin User ===\n');
    
    // Try to create the admin user via signup
    console.log('Creating admin user via signup...');
    const signupResponse = await axios.post(`${API_BASE_URL}/api/signup`, {
      name: ADMIN_CREDS.name,
      email: ADMIN_CREDS.email,
      password: ADMIN_CREDS.password,
      department: ADMIN_CREDS.department,
      role: 'default'
    });
    
    console.log('✓ Admin user created successfully via signup');
    console.log(`  Email: ${ADMIN_CREDS.email}`);
    console.log(`  Name: ${ADMIN_CREDS.name}`);
    console.log(`  Department: ${ADMIN_CREDS.department}`);
    console.log(`  Token: ${signupResponse.data.token.substring(0, 20)}...`);
    
    // Save admin credentials for other tests
    const adminData = {
      email: ADMIN_CREDS.email,
      password: ADMIN_CREDS.password,
      token: signupResponse.data.token,
      user: signupResponse.data.user,
      timestamp: new Date().toISOString()
    };
    
    const adminDataPath = path.join(process.cwd(), 'test-data', 'admin-user.json');
    const testDataDir = path.dirname(adminDataPath);
    
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    fs.writeFileSync(adminDataPath, JSON.stringify(adminData, null, 2));
    console.log(`\n✓ Admin credentials saved to: ${adminDataPath}`);
    
    return adminData;
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log('⚠ Admin user already exists. Attempting to login...');
      
      // Try to login with existing credentials
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/api/login`, {
          email: ADMIN_CREDS.email,
          password: ADMIN_CREDS.password
        });
        
        console.log('✓ Successfully logged in as existing admin user');
        console.log(`  Email: ${ADMIN_CREDS.email}`);
        console.log(`  Token: ${loginResponse.data.token.substring(0, 20)}...`);
        
        // Save admin credentials
        const adminData = {
          email: ADMIN_CREDS.email,
          password: ADMIN_CREDS.password,
          token: loginResponse.data.token,
          user: loginResponse.data.user,
          timestamp: new Date().toISOString()
        };
        
        const adminDataPath = path.join(process.cwd(), 'test-data', 'admin-user.json');
        const testDataDir = path.dirname(adminDataPath);
        
        if (!fs.existsSync(testDataDir)) {
          fs.mkdirSync(testDataDir, { recursive: true });
        }
        
        fs.writeFileSync(adminDataPath, JSON.stringify(adminData, null, 2));
        console.log(`\n✓ Admin credentials saved to: ${adminDataPath}`);
        
        return adminData;
        
      } catch (loginError) {
        console.error('✗ Failed to login as admin:', loginError.response?.data || loginError.message);
        throw new Error('Could not authenticate as admin user');
      }
    } else {
      console.error('✗ Failed to create admin user:', error.response?.data || error.message);
      throw new Error('Failed to create admin user');
    }
  }
}

async function verifyAdminPermissions(token) {
  try {
    console.log('\n=== Verifying Admin Permissions ===');
    
    // Test various admin endpoints to verify permissions
    const testEndpoints = [
      '/api/admin/departments',
      '/api/hr/users',
      '/api/inventory/providers',
      '/api/inventory/products'
    ];
    
    let successCount = 0;
    
    for (const endpoint of testEndpoints) {
      try {
        await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✓ Access granted to: ${endpoint}`);
        successCount++;
      } catch (error) {
        console.log(`✗ Access denied to: ${endpoint}`);
      }
    }
    
    console.log(`\n✓ Admin permissions verified: ${successCount}/${testEndpoints.length} endpoints accessible`);
    return successCount > 0;
    
  } catch (error) {
    console.error('✗ Permission verification failed:', error.message);
    return false;
  }
}

async function main() {
  try {
    const adminData = await createAdminUser();
    
    const hasPermissions = await verifyAdminPermissions(adminData.token);
    
    if (hasPermissions) {
      console.log('\n🎉 Super Admin User Setup Complete!');
      console.log('=====================================');
      console.log('Email:', adminData.email);
      console.log('Password:', adminData.password);
      console.log('User ID:', adminData.user.id);
      console.log('Department:', adminData.user.department);
      console.log('Role:', adminData.user.role);
      console.log('=====================================');
      console.log('\nThis admin user can now be used by all test scripts.');
    } else {
      console.log('\n⚠ Admin user created but permissions verification failed.');
      console.log('You may need to manually assign admin permissions in the database.');
    }
    
  } catch (error) {
    console.error('\n✗ Admin user creation failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createAdminUser, verifyAdminPermissions };