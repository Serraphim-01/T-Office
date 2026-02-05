/**
 * Move Inbound Transactions to Stored State Test Script
 * This script moves inbound transactions from arrived state to stored state
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

async function getInboundTransactions(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/inbound`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching inbound transactions:', error.response?.data || error.message);
    return [];
  }
}

async function moveTransactionToStored(transactionId, token) {
  try {
    console.log(`Moving transaction ${transactionId} to Stored status...`);
    const response = await axios.post(
      `${API_BASE_URL}/api/inventory/inbound/${transactionId}/store`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ Transaction moved to Stored status successfully');
    return response.data;
  } catch (error) {
    console.error(`✗ Failed to move transaction ${transactionId} to Stored:`, error.response?.data || error.message);
    return null;
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

async function main() {
  console.log('=== Move Inbound Transactions to Stored State Test Script ===\n');
  
  try {
    // Authenticate
    const token = await authenticate();
    console.log('✓ Authentication successful\n');
    
    // Get current inbound transactions
    console.log('Fetching current inbound transactions...');
    const inboundTransactions = await getInboundTransactions(token);
    
    if (inboundTransactions.length === 0) {
      console.log('⚠ No inbound transactions found. Please run the inbound transactions creation test first.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${inboundTransactions.length} inbound transactions\n`);
    
    // Display current transactions
    console.log('Current Incoming transactions:');
    inboundTransactions.forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.product_name} (${transaction.batch_number})`);
      console.log(`     Quantity: ${transaction.quantity}`);
      console.log(`     Provider: ${transaction.provider_name}`);
      console.log(`     Expected Arrival: ${transaction.expected_arrival_start} to ${transaction.expected_arrival_end}`);
      console.log('');
    });
    
    // Move transactions to stored state
    const movedTransactions = [];
    const failedTransactions = [];
    
    console.log('Moving transactions to Stored status...\n');
    
    // Move first 3 transactions to stored (or all if less than 3)
    const transactionsToMove = inboundTransactions.slice(0, Math.min(3, inboundTransactions.length));
    
    for (const transaction of transactionsToMove) {
      const result = await moveTransactionToStored(transaction.id, token);
      if (result) {
        movedTransactions.push({
          ...transaction,
          stored_data: result.transaction
        });
      } else {
        failedTransactions.push(transaction);
      }
    }
    
    // Save moved transactions data for later use
    const storedDataPath = path.join(process.cwd(), 'test-data', 'stored-transactions.json');
    const testDataDir = path.dirname(storedDataPath);
    
    // Create test-data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const testData = {
      moved_transactions: movedTransactions,
      failed_transactions: failedTransactions,
      timestamp: new Date().toISOString(),
      total_moved: movedTransactions.length,
      total_failed: failedTransactions.length
    };
    
    fs.writeFileSync(storedDataPath, JSON.stringify(testData, null, 2));
    console.log(`✓ Test data saved to: ${storedDataPath}`);
    
    // Verify the move by checking stored transactions
    console.log('\nVerifying stored transactions...');
    const storedTransactions = await getStoredTransactions(token);
    
    console.log('\n=== Summary ===');
    console.log(`Transactions moved to Stored: ${movedTransactions.length}`);
    console.log(`Transactions failed to move: ${failedTransactions.length}`);
    console.log(`Total Stored transactions in system: ${storedTransactions.length}`);
    
    if (movedTransactions.length > 0) {
      console.log('\nSuccessfully moved transactions:');
      movedTransactions.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.product_name} (${transaction.batch_number})`);
        console.log(`     Quantity: ${transaction.quantity}`);
        console.log(`     Provider: ${transaction.provider_name}`);
        console.log(`     Arrival Date: ${transaction.stored_data.arrival_date}`);
        console.log(`     Status: ${transaction.stored_data.status}`);
        console.log('');
      });
    }
    
    if (failedTransactions.length > 0) {
      console.log('Failed transactions:');
      failedTransactions.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.product_name} (${transaction.batch_number})`);
        console.log('');
      });
    }
    
    // Show remaining incoming transactions
    const remainingInbound = await getInboundTransactions(token);
    console.log(`Remaining Incoming transactions: ${remainingInbound.length}`);
    
    console.log('\n✓ Move to stored state test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Move to stored state test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as moveToStoredTest };