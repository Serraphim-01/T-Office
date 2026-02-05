/**
 * Create Outbound Transactions from Stored Test Script
 * This script creates outbound transactions from stored inventory
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

// Function to load admin credentials from file
async function loadAdminCredentials() {
  const adminDataPath = path.join(process.cwd(), '..', 'test-data', 'admin-user.json');
  const localAdminDataPath = path.join(process.cwd(), 'test-data', 'admin-user.json');
  
  // Check both possible locations
  if (fs.existsSync(localAdminDataPath)) {
    return JSON.parse(fs.readFileSync(localAdminDataPath, 'utf8'));
  } else if (fs.existsSync(adminDataPath)) {
    return JSON.parse(fs.readFileSync(adminDataPath, 'utf8'));
  } else {
    throw new Error('Admin user credentials not found. Run auth/create_admin_user.js first.');
  }
}

async function authenticate() {
  try {
    console.log('Authenticating as admin user...');
    
    // Load admin credentials from the created file
    const adminData = await loadAdminCredentials();
    
    // Use the token directly if it's fresh, otherwise login
    // Check if token is expired by verifying it against the API
    try {
      // Try to make a simple authenticated request to verify the token
      await axios.get(`${API_BASE_URL}/api/admin/departments`, {
        headers: { 'Authorization': `Bearer ${adminData.token}` }
      });
      
      console.log('✓ Using existing admin token');
      return adminData.token;
    } catch (verificationError) {
      // If token is invalid/expired, try to log in with credentials
      console.log('Token verification failed, attempting to login with credentials...');
      const response = await axios.post(`${API_BASE_URL}/api/login`, {
        email: adminData.email,
        password: adminData.password
      });
      
      return response.data.token;
    }
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw new Error('Failed to authenticate');
  }
}

async function getStoredTransactions(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/inbound/store`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching stored transactions:', error.response?.data || error.message);
    return [];
  }
}

async function createOutboundTransaction(transactionData, token) {
  try {
    console.log(`Creating outbound transaction for ${transactionData.product_name}...`);
    const response = await axios.post(`${API_BASE_URL}/api/inventory/outbound`, transactionData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✓ Outbound transaction created successfully');
    return response.data;
  } catch (error) {
    console.error(`✗ Failed to create outbound transaction:`, error.response?.data || error.message);
    return null;
  }
}

async function getOutboundTransactions(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/outbound`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching outbound transactions:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('=== Create Outbound Transactions from Stored Test Script ===\n');
  
  try {
    // Authenticate
    const token = await authenticate();
    console.log('✓ Authentication successful\n');
    
    // Get stored transactions
    console.log('Fetching stored transactions...');
    const storedTransactions = await getStoredTransactions(token);
    
    if (storedTransactions.length === 0) {
      console.log('⚠ No stored transactions found. Please run the move to stored test first.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${storedTransactions.length} stored transactions\n`);
    
    // Display stored transactions
    console.log('Available Stored transactions:');
    storedTransactions.forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.product_name} (${transaction.batch_number})`);
      console.log(`     Quantity: ${transaction.quantity}`);
      console.log(`     Provider: ${transaction.provider_name}`);
      console.log(`     Arrival Date: ${transaction.arrival_date}`);
      console.log(`     Serial Numbers: ${transaction.serial_numbers ? transaction.serial_numbers.join(', ') : 'None'}`);
      console.log('');
    });
    
    // Create outbound transactions
    const createdOutbound = [];
    const failedOutbound = [];
    
    console.log('Creating outbound transactions...\n');
    
    // Create outbound transactions for first 2 stored transactions
    const transactionsToProcess = storedTransactions.slice(0, Math.min(2, storedTransactions.length));
    
    // Sample outbound transaction data
    const outboundData = [
      {
        receiver_address: '123 Main Street, New York, NY 10001',
        receiver_email: 'john.doe@company.com',
        receiver_phone: '+1-555-0123',
        dispatch_datetime: '2024-02-25T09:00:00',
        delivery_datetime: '2024-02-26T17:00:00',
        outbound_price: 2800.00 // With markup
      },
      {
        receiver_address: '456 Business Ave, Los Angeles, CA 90210',
        receiver_email: 'jane.smith@corp.com',
        receiver_phone: '+1-555-0456',
        dispatch_datetime: '2024-02-26T10:00:00',
        delivery_datetime: '2024-02-27T16:00:00',
        outbound_price: 850.00 // With markup
      }
    ];
    
    for (let i = 0; i < transactionsToProcess.length; i++) {
      const storedTransaction = transactionsToProcess[i];
      const outboundInfo = outboundData[i];
      
      // Use first few serial numbers from the stored transaction
      const serialNumbersToUse = storedTransaction.serial_numbers 
        ? storedTransaction.serial_numbers.slice(0, Math.min(2, storedTransaction.serial_numbers.length))
        : [];
      
      if (serialNumbersToUse.length === 0) {
        console.log(`⚠ No serial numbers available for ${storedTransaction.product_name}`);
        failedOutbound.push(storedTransaction);
        continue;
      }
      
      const transactionData = {
        inbound_transaction_id: storedTransaction.id,
        quantity: serialNumbersToUse.length,
        serial_numbers: serialNumbersToUse,
        receiver_address: outboundInfo.receiver_address,
        receiver_email: outboundInfo.receiver_email,
        receiver_phone: outboundInfo.receiver_phone,
        dispatch_datetime: outboundInfo.dispatch_datetime,
        delivery_datetime: outboundInfo.delivery_datetime,
        inbound_price: storedTransaction.unit_price,
        outbound_price: outboundInfo.outbound_price
      };
      
      const result = await createOutboundTransaction(transactionData, token);
      if (result) {
        createdOutbound.push({
          ...result,
          product_name: storedTransaction.product_name,
          batch_number: storedTransaction.batch_number,
          serial_numbers: serialNumbersToUse,
          receiver_info: {
            address: outboundInfo.receiver_address,
            email: outboundInfo.receiver_email,
            phone: outboundInfo.receiver_phone
          }
        });
      } else {
        failedOutbound.push(storedTransaction);
      }
    }
    
    // Save outbound transactions data for later use
    const outboundDataPath = path.join(process.cwd(), 'test-data', 'outbound-transactions.json');
    const testDataDir = path.dirname(outboundDataPath);
    
    // Create test-data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const testData = {
      created_outbound: createdOutbound,
      failed_outbound: failedOutbound,
      timestamp: new Date().toISOString(),
      total_created: createdOutbound.length,
      total_failed: failedOutbound.length
    };
    
    fs.writeFileSync(outboundDataPath, JSON.stringify(testData, null, 2));
    console.log(`✓ Test data saved to: ${outboundDataPath}`);
    
    // Verify by checking outbound transactions
    console.log('\nVerifying outbound transactions...');
    const outboundTransactions = await getOutboundTransactions(token);
    
    console.log('\n=== Summary ===');
    console.log(`Outbound transactions created: ${createdOutbound.length}`);
    console.log(`Transactions failed to create: ${failedOutbound.length}`);
    console.log(`Total Outbound transactions in system: ${outboundTransactions.length}`);
    
    if (createdOutbound.length > 0) {
      console.log('\nSuccessfully created outbound transactions:');
      createdOutbound.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.product_name}`);
        console.log(`     Serial Numbers: ${transaction.serial_numbers.join(', ')}`);
        console.log(`     Receiver: ${transaction.receiver_info.email}`);
        console.log(`     Dispatch: ${transaction.receiver_info.dispatch_datetime}`);
        console.log(`     Delivery: ${transaction.receiver_info.delivery_datetime}`);
        console.log(`     Status: Outgoing`);
        console.log('');
      });
    }
    
    if (failedOutbound.length > 0) {
      console.log('Failed outbound transactions:');
      failedOutbound.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.product_name} (${transaction.batch_number})`);
        console.log('');
      });
    }
    
    console.log('\n✓ Outbound transactions creation test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Outbound transactions creation test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as createOutboundTransactionsTest };