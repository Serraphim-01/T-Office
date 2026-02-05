/**
 * Provider Creation Test Script
 * This script creates multiple providers for testing the inventory system
 */

import fs from 'fs';
import path from 'path';
import { getAdminToken, makeAuthenticatedRequest } from '../utils/test-auth.js';

// Test data
const testProviders = [
  {
    name: 'Tech Solutions Inc.',
    email: 'info@techsolutions.com',
    phone: '+1-555-0123',
    address: '123 Tech Street, San Francisco, CA',
    official_contact_name: 'Sam Wilson',
    official_contact_email: 'sam@techsolutions.com',
    official_contact_phone: '+1-555-0124',
    organization_contact_name: 'Jane Smith',
    organization_contact_email: 'jane@techsolutions.com',
    organization_contact_phone: '+1-555-0125'
  },
  {
    name: 'Global Electronics Ltd.',
    email: 'contact@globalelectronics.com',
    phone: '+1-555-0456',
    address: '456 Electronics Ave, New York, NY',
    official_contact_name: 'Michael Johnson',
    official_contact_email: 'michael@globalelectronics.com',
    official_contact_phone: '+1-555-0457',
    organization_contact_name: 'Sarah Davis',
    organization_contact_email: 'sarah@globalelectronics.com',
    organization_contact_phone: '+1-555-0458'
  },
  {
    name: 'Office Supply Co.',
    email: 'orders@officesupply.com',
    phone: '+1-555-0789',
    address: '789 Office Blvd, Chicago, IL',
    official_contact_name: 'Robert Brown',
    official_contact_email: 'robert@officesupply.com',
    official_contact_phone: '+1-555-0790',
    organization_contact_name: 'Lisa Wilson',
    organization_contact_email: 'lisa@officesupply.com',
    organization_contact_phone: '+1-555-0791'
  },
  {
    name: 'Digital Devices Corp.',
    email: 'sales@digitaldevices.com',
    phone: '+1-555-1011',
    address: '1011 Digital Drive, Austin, TX',
    official_contact_name: 'David Miller',
    official_contact_email: 'david@digitaldevices.com',
    official_contact_phone: '+1-555-1012',
    organization_contact_name: 'Emma Thompson',
    organization_contact_email: 'emma@digitaldevices.com',
    organization_contact_phone: '+1-555-1013'
  }
];

async function authenticate() {
  try {
    console.log('Authenticating as admin user...');
    const token = await getAdminToken();
    console.log('✓ Authentication successful');
    return token;
  } catch (error) {
    console.error('Authentication failed:', error.message);
    throw new Error('Failed to authenticate');
  }
}

async function createProvider(providerData, token) {
  try {
    console.log(`Creating provider: ${providerData.name}`);
    const response = await makeAuthenticatedRequest('POST', '/api/inventory/providers', providerData);
    
    console.log(`✓ Provider created successfully: ${providerData.name} (ID: ${response.data.id})`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log(`⚠ Provider already exists: ${providerData.name}`);
      // Try to get existing provider
      try {
        const providersResponse = await makeAuthenticatedRequest('GET', '/api/inventory/providers');
        
        const existingProvider = providersResponse.data.find(p => p.name === providerData.name);
        if (existingProvider) {
          return existingProvider;
        }
      } catch (getErr) {
        console.error('Error fetching existing providers:', getErr.message);
      }
      return null;
    }
    
    console.error(`✗ Failed to create provider ${providerData.name}:`, error.response?.data || error.message);
    return null;
  }
}

async function getAllProviders(token) {
  try {
    const response = await makeAuthenticatedRequest('GET', '/api/inventory/providers');
    return response.data;
  } catch (error) {
    console.error('Error fetching providers:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('=== Provider Creation Test Script ===\n');
  
  try {
    // Authenticate
    const token = await authenticate();
    console.log('✓ Authentication successful\n');
    
    // Create providers
    const createdProviders = [];
    
    console.log('Creating providers...\n');
    for (const providerData of testProviders) {
      const provider = await createProvider(providerData, token);
      if (provider) {
        createdProviders.push(provider);
      }
    }
    
    // Save created providers to file for later use
    const testDataPath = path.join(process.cwd(), 'test-data', 'providers.json');
    const testDataDir = path.dirname(testDataPath);
    
    // Create test-data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const testData = {
      providers: createdProviders,
      timestamp: new Date().toISOString(),
      totalCreated: createdProviders.length
    };
    
    fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
    console.log(`\n✓ Test data saved to: ${testDataPath}`);
    
    // Display summary
    console.log('\n=== Summary ===');
    console.log(`Total providers in system: ${createdProviders.length}`);
    console.log('Created providers:');
    createdProviders.forEach((provider, index) => {
      console.log(`  ${index + 1}. ${provider.name} (ID: ${provider.id})`);
    });
    
    console.log('\n✓ Provider creation test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Provider creation test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as createProvidersTest };