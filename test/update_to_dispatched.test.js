/**
 * Update Outbound Transactions to Dispatched State Test Script
 * This script changes outbound transactions from Outgoing to Dispatched status
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

async function updateTransactionToDispatched(transactionId, token) {
  try {
    console.log(`Updating transaction ${transactionId} to Dispatched status...`);
    const response = await axios.post(
      `${API_BASE_URL}/api/inventory/outbound/${transactionId}/dispatched`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ Transaction updated to Dispatched status successfully');
    return response.data;
  } catch (error) {
    console.error(`✗ Failed to update transaction ${transactionId} to Dispatched:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('=== Update Outbound Transactions to Dispatched State Test Script ===\n');
  
  try {
    // Authenticate
    const token = await authenticate();
    console.log('✓ Authentication successful\n');
    
    // Get current outbound transactions
    console.log('Fetching current outbound transactions...');
    const outboundTransactions = await getOutboundTransactions(token);
    
    if (outboundTransactions.length === 0) {
      console.log('⚠ No outbound transactions found. Please run the outbound transactions creation test first.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${outboundTransactions.length} outbound transactions\n`);
    
    // Filter for Outgoing transactions (transactions that can be dispatched)
    const outgoingTransactions = outboundTransactions.filter(t => t.status === 'Outgoing');
    
    if (outgoingTransactions.length === 0) {
      console.log('⚠ No Outgoing transactions found. All transactions may already be dispatched or delivered.');
      console.log('Current transaction statuses:');
      outboundTransactions.forEach(t => {
        console.log(`  - ${t.product_name}: ${t.status}`);
      });
      process.exit(1);
    }
    
    console.log(`✓ Found ${outgoingTransactions.length} Outgoing transactions\n`);
    
    // Display current outgoing transactions
    console.log('Current Outgoing transactions:');
    outgoingTransactions.forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.product_name}`);
      console.log(`     ID: ${transaction.id}`);
      console.log(`     Batch: ${transaction.batch_number}`);
      console.log(`     Quantity: ${transaction.quantity}`);
      console.log(`     Receiver: ${transaction.receiver_email}`);
      console.log(`     Dispatch Date: ${transaction.dispatch_datetime}`);
      console.log(`     Delivery Date: ${transaction.delivery_datetime}`);
      console.log('');
    });
    
    // Update transactions to dispatched state
    const dispatchedTransactions = [];
    const failedTransactions = [];
    
    console.log('Updating transactions to Dispatched status...\n');
    
    // Update first 2 outgoing transactions to dispatched (or all if less than 2)
    const transactionsToUpdate = outgoingTransactions.slice(0, Math.min(2, outgoingTransactions.length));
    
    for (const transaction of transactionsToUpdate) {
      const result = await updateTransactionToDispatched(transaction.id, token);
      if (result) {
        dispatchedTransactions.push({
          ...transaction,
          previous_status: 'Outgoing',
          new_status: 'Dispatched'
        });
      } else {
        failedTransactions.push(transaction);
      }
    }
    
    // Save dispatched transactions data for later use
    const dispatchedDataPath = path.join(process.cwd(), 'test-data', 'dispatched-transactions.json');
    const testDataDir = path.dirname(dispatchedDataPath);
    
    // Create test-data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const testData = {
      dispatched_transactions: dispatchedTransactions,
      failed_transactions: failedTransactions,
      timestamp: new Date().toISOString(),
      total_dispatched: dispatchedTransactions.length,
      total_failed: failedTransactions.length
    };
    
    fs.writeFileSync(dispatchedDataPath, JSON.stringify(testData, null, 2));
    console.log(`✓ Test data saved to: ${dispatchedDataPath}`);
    
    // Verify the update by checking outbound transactions again
    console.log('\nVerifying updated transactions...');
    const updatedOutboundTransactions = await getOutboundTransactions(token);
    
    const dispatchedCount = updatedOutboundTransactions.filter(t => t.status === 'Dispatched').length;
    const outgoingCount = updatedOutboundTransactions.filter(t => t.status === 'Outgoing').length;
    const deliveredCount = updatedOutboundTransactions.filter(t => t.status === 'Delivered').length;
    
    console.log('\n=== Summary ===');
    console.log(`Transactions updated to Dispatched: ${dispatchedTransactions.length}`);
    console.log(`Transactions failed to update: ${failedTransactions.length}`);
    console.log(`Total Dispatched transactions in system: ${dispatchedCount}`);
    console.log(`Remaining Outgoing transactions: ${outgoingCount}`);
    console.log(`Delivered transactions: ${deliveredCount}`);
    
    if (dispatchedTransactions.length > 0) {
      console.log('\nSuccessfully dispatched transactions:');
      dispatchedTransactions.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.product_name}`);
        console.log(`     ID: ${transaction.id}`);
        console.log(`     Batch: ${transaction.batch_number}`);
        console.log(`     Receiver: ${transaction.receiver_email}`);
        console.log(`     Status: ${transaction.new_status}`);
        console.log('');
      });
    }
    
    if (failedTransactions.length > 0) {
      console.log('Failed transactions:');
      failedTransactions.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.product_name} (ID: ${transaction.id})`);
        console.log('');
      });
    }
    
    console.log('\n✓ Update to dispatched state test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Update to dispatched state test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as updateToDispatchedTest };