/**
 * Provider User Assignment Test Script
 * This script assigns a user in the sales department to a provider
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin_password';

async function authenticate() {
  try {
    console.log('Authenticating as admin user...');
    const response = await axios.post(`${API_BASE_URL}/api/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    return response.data.token;
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw new Error('Failed to authenticate');
  }
}

async function getProviders(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/providers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching providers:', error.response?.data || error.message);
    return [];
  }
}

async function getUsers(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/hr/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error.response?.data || error.message);
    return [];
  }
}

async function assignUserToProvider(providerId, userId, token) {
  try {
    console.log(`Assigning user to provider...`);
    const response = await axios.post(
      `${API_BASE_URL}/api/inventory/providers/${providerId}/assign-user`,
      {
        userId: userId,
        assignmentType: 'attached_staff'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ User assigned to provider successfully');
    return response.data;
  } catch (error) {
    console.error('✗ Failed to assign user to provider:', error.response?.data || error.message);
    return null;
  }
}

async function getProviderUserAssignments(providerId, token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/inventory/providers/${providerId}/assigned-users`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching provider assignments:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('=== Provider User Assignment Test Script ===\n');
  
  try {
    // Authenticate
    const token = await authenticate();
    console.log('✓ Authentication successful\n');
    
    // Get providers
    console.log('Fetching providers...');
    const providers = await getProviders(token);
    
    if (providers.length === 0) {
      console.log('⚠ No providers found. Please run the provider creation test first.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${providers.length} providers\n`);
    
    // Get users
    console.log('Fetching users...');
    const users = await getUsers(token);
    
    if (users.length === 0) {
      console.log('⚠ No users found.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${users.length} users\n`);
    
    // Find a user in the sales department
    const salesUsers = users.filter(user => 
      user.department && user.department.toLowerCase().includes('sales')
    );
    
    if (salesUsers.length === 0) {
      console.log('⚠ No users found in sales department. Looking for users in any department...');
      // If no sales users, use the first available user
      const firstUser = users[0];
      console.log(`Using user: ${firstUser.full_name} (Department: ${firstUser.department || 'N/A'})`);
      console.log('Note: This user may not be in the sales department as requested.');
    } else {
      console.log(`✓ Found ${salesUsers.length} users in sales department`);
    }
    
    // Select user to assign (prefer sales user, fallback to first user)
    const userToAssign = salesUsers.length > 0 ? salesUsers[0] : users[0];
    console.log(`Selected user for assignment: ${userToAssign.full_name} (ID: ${userToAssign.id})\n`);
    
    // Select a provider to assign the user to
    const providerToAssign = providers[0]; // Use the first provider
    console.log(`Selected provider for assignment: ${providerToAssign.name} (ID: ${providerToAssign.id})\n`);
    
    // Check existing assignments
    console.log('Checking existing assignments...');
    const existingAssignments = await getProviderUserAssignments(providerToAssign.id, token);
    console.log(`Existing assignments for ${providerToAssign.name}: ${existingAssignments.length}\n`);
    
    // Assign user to provider
    console.log('Creating assignment...');
    const assignment = await assignUserToProvider(providerToAssign.id, userToAssign.id, token);
    
    if (!assignment) {
      console.log('✗ Assignment failed. Exiting.');
      process.exit(1);
    }
    
    // Verify the assignment
    console.log('\nVerifying assignment...');
    const updatedAssignments = await getProviderUserAssignments(providerToAssign.id, token);
    const assignedUser = updatedAssignments.find(assignment => assignment.user_id == userToAssign.id);
    
    if (assignedUser) {
      console.log('✓ Assignment verified successfully');
      console.log(`  User: ${assignedUser.user_full_name}`);
      console.log(`  Provider: ${providerToAssign.name}`);
      console.log(`  Assignment Type: ${assignedUser.assignment_type}`);
    } else {
      console.log('✗ Assignment verification failed');
    }
    
    // Save assignment data for later use
    const assignmentDataPath = path.join(process.cwd(), 'test-data', 'provider-assignments.json');
    const testDataDir = path.dirname(assignmentDataPath);
    
    // Create test-data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const testData = {
      assignment: {
        provider_id: providerToAssign.id,
        provider_name: providerToAssign.name,
        user_id: userToAssign.id,
        user_name: userToAssign.full_name,
        user_department: userToAssign.department,
        assignment_type: 'attached_staff',
        assignment_id: assignment?.id
      },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(assignmentDataPath, JSON.stringify(testData, null, 2));
    console.log(`\n✓ Assignment data saved to: ${assignmentDataPath}`);
    
    // Display summary
    console.log('\n=== Summary ===');
    console.log(`User assigned: ${userToAssign.full_name} (${userToAssign.department || 'N/A'} department)`);
    console.log(`Provider: ${providerToAssign.name}`);
    console.log(`Assignment type: attached_staff`);
    console.log(`Total assignments for provider: ${updatedAssignments.length}`);
    
    console.log('\n✓ Provider user assignment test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Provider user assignment test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as assignProviderUserTest };