/**
 * Update Outbound Transactions to Delivered State Test Script
 * This script changes outbound transactions from Dispatched to Delivered status
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

async function updateTransactionToDelivered(transactionId, token) {
  try {
    console.log(`Updating transaction ${transactionId} to Delivered status...`);
    const response = await axios.post(
      `${API_BASE_URL}/api/inventory/outbound/${transactionId}/delivered`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ Transaction updated to Delivered status successfully');
    return response.data;
  } catch (error) {
    console.error(`✗ Failed to update transaction ${transactionId} to Delivered:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('=== Update Outbound Transactions to Delivered State Test Script ===\n');
  
  try {
    // Authenticate
    const token = await authenticate();
    console.log('✓ Authentication successful\n');
    
    // Get current outbound transactions
    console.log('Fetching current outbound transactions...');
    const outboundTransactions = await getOutboundTransactions(token);
    
    if (outboundTransactions.length === 0) {
      console.log('⚠ No outbound transactions found.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${outboundTransactions.length} outbound transactions\n`);
    
    // Filter for Dispatched transactions (transactions that can be delivered)
    const dispatchedTransactions = outboundTransactions.filter(t => t.status === 'Dispatched');
    
    if (dispatchedTransactions.length === 0) {
      console.log('⚠ No Dispatched transactions found. Please run the dispatched update test first.');
      console.log('Current transaction statuses:');
      const statusCounts = {};
      outboundTransactions.forEach(t => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      process.exit(1);
    }
    
    console.log(`✓ Found ${dispatchedTransactions.length} Dispatched transactions\n`);
    
    // Display current dispatched transactions
    console.log('Current Dispatched transactions:');
    dispatchedTransactions.forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.product_name}`);
      console.log(`     ID: ${transaction.id}`);
      console.log(`     Batch: ${transaction.batch_number}`);
      console.log(`     Quantity: ${transaction.quantity}`);
      console.log(`     Receiver: ${transaction.receiver_email}`);
      console.log(`     Dispatch Date: ${transaction.dispatch_datetime}`);
      console.log(`     Delivery Date: ${transaction.delivery_datetime}`);
      console.log('');
    });
    
    // Update transactions to delivered state
    const deliveredTransactions = [];
    const failedTransactions = [];
    
    console.log('Updating transactions to Delivered status...\n');
    
    // Update first 1 or 2 dispatched transactions to delivered
    const transactionsToUpdate = dispatchedTransactions.slice(0, Math.min(2, dispatchedTransactions.length));
    
    for (const transaction of transactionsToUpdate) {
      const result = await updateTransactionToDelivered(transaction.id, token);
      if (result) {
        deliveredTransactions.push({
          ...transaction,
          previous_status: 'Dispatched',
          new_status: 'Delivered'
        });
      } else {
        failedTransactions.push(transaction);
      }
    }
    
    // Save delivered transactions data for later use
    const deliveredDataPath = path.join(process.cwd(), 'test-data', 'delivered-transactions.json');
    const testDataDir = path.dirname(deliveredDataPath);
    
    // Create test-data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const testData = {
      delivered_transactions: deliveredTransactions,
      failed_transactions: failedTransactions,
      timestamp: new Date().toISOString(),
      total_delivered: deliveredTransactions.length,
      total_failed: failedTransactions.length
    };
    
    fs.writeFileSync(deliveredDataPath, JSON.stringify(testData, null, 2));
    console.log(`✓ Test data saved to: ${deliveredDataPath}`);
    
    // Verify the update by checking outbound transactions again
    console.log('\nVerifying updated transactions...');
    const updatedOutboundTransactions = await getOutboundTransactions(token);
    
    const deliveredCount = updatedOutboundTransactions.filter(t => t.status === 'Delivered').length;
    const dispatchedCount = updatedOutboundTransactions.filter(t => t.status === 'Dispatched').length;
    const outgoingCount = updatedOutboundTransactions.filter(t => t.status === 'Outgoing').length;
    
    console.log('\n=== Summary ===');
    console.log(`Transactions updated to Delivered: ${deliveredTransactions.length}`);
    console.log(`Transactions failed to update: ${failedTransactions.length}`);
    console.log(`Total Delivered transactions in system: ${deliveredCount}`);
    console.log(`Remaining Dispatched transactions: ${dispatchedCount}`);
    console.log(`Outgoing transactions: ${outgoingCount}`);
    
    if (deliveredTransactions.length > 0) {
      console.log('\nSuccessfully delivered transactions:');
      deliveredTransactions.forEach((transaction, index) => {
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
    
    // Show final status summary
    console.log('Final Transaction Status Summary:');
    const finalStatusCounts = {};
    updatedOutboundTransactions.forEach(t => {
      finalStatusCounts[t.status] = (finalStatusCounts[t.status] || 0) + 1;
    });
    
    Object.entries(finalStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\n✓ Update to delivered state test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Update to delivered state test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as updateToDeliveredTest };