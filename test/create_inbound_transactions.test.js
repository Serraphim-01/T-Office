/**
 * Inbound Transactions Creation Test Script
 * This script creates inbound transactions for products from providers
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

async function getProducts(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/inventory/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error.response?.data || error.message);
    return [];
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

async function createInboundTransaction(transactionData, token) {
  try {
    console.log(`Creating inbound transaction for ${transactionData.product_name}...`);
    const response = await axios.post(`${API_BASE_URL}/api/inventory/inbound`, transactionData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✓ Inbound transaction created successfully (Batch: ${response.data.batch_number})`);
    return {
      ...response.data,
      product_name: transactionData.product_name,
      provider_name: transactionData.provider_name
    };
  } catch (error) {
    console.error(`✗ Failed to create inbound transaction:`, error.response?.data || error.message);
    return null;
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

async function main() {
  console.log('=== Inbound Transactions Creation Test Script ===\n');
  
  try {
    // Authenticate
    const token = await authenticate();
    console.log('✓ Authentication successful\n');
    
    // Get products and providers
    console.log('Fetching products and providers...');
    const products = await getProducts(token);
    const providers = await getProviders(token);
    
    if (products.length === 0) {
      console.log('⚠ No products found. Please run the product creation test first.');
      process.exit(1);
    }
    
    if (providers.length === 0) {
      console.log('⚠ No providers found. Please run the provider creation test first.');
      process.exit(1);
    }
    
    console.log(`✓ Found ${products.length} products and ${providers.length} providers\n`);
    
    // Create inbound transactions for various products
    const createdTransactions = [];
    
    // Sample inbound transactions data
    const inboundTransactions = [
      {
        product_name: 'MacBook Pro 16"',
        part_number: 'MBA-2023-001',
        quantity: 5,
        expected_arrival_start: '2024-02-10',
        expected_arrival_end: '2024-02-15',
        unit_price: 2500.00,
        serial_numbers: ['MB2023001', 'MB2023002', 'MB2023003', 'MB2023004', 'MB2023005']
      },
      {
        product_name: 'iPad Air',
        part_number: 'IPA-2023-001',
        quantity: 10,
        expected_arrival_start: '2024-02-12',
        expected_arrival_end: '2024-02-18',
        unit_price: 750.00,
        serial_numbers: ['IP2023001', 'IP2023002', 'IP2023003', 'IP2023004', 'IP2023005', 'IP2023006', 'IP2023007', 'IP2023008', 'IP2023009', 'IP2023010']
      },
      {
        product_name: 'Dell XPS 13',
        part_number: 'DXPS-2023-001',
        quantity: 8,
        expected_arrival_start: '2024-02-15',
        expected_arrival_end: '2024-02-20',
        unit_price: 1800.00,
        serial_numbers: ['DX2023001', 'DX2023002', 'DX2023003', 'DX2023004', 'DX2023005', 'DX2023006', 'DX2023007', 'DX2023008']
      },
      {
        product_name: '4K Monitor 27"',
        part_number: 'MON-2023-001',
        quantity: 12,
        expected_arrival_start: '2024-02-18',
        expected_arrival_end: '2024-02-25',
        unit_price: 450.00,
        serial_numbers: ['M2023001', 'M2023002', 'M2023003', 'M2023004', 'M2023005', 'M2023006', 'M2023007', 'M2023008', 'M2023009', 'M2023010', 'M2023011', 'M2023012']
      },
      {
        product_name: 'Ergonomic Office Chair',
        part_number: 'EOC-2023-001',
        quantity: 15,
        expected_arrival_start: '2024-02-20',
        expected_arrival_end: '2024-02-28',
        unit_price: 350.00,
        serial_numbers: ['C2023001', 'C2023002', 'C2023003', 'C2023004', 'C2023005', 'C2023006', 'C2023007', 'C2023008', 'C2023009', 'C2023010', 'C2023011', 'C2023012', 'C2023013', 'C2023014', 'C2023015']
      }
    ];
    
    console.log('Creating inbound transactions...\n');
    
    // Create each transaction
    for (const transaction of inboundTransactions) {
      // Find the product by part number
      const product = products.find(p => p.part_number === transaction.part_number);
      if (!product) {
        console.log(`⚠ Product not found: ${transaction.part_number}`);
        continue;
      }
      
      // Find the provider for this product
      const provider = providers.find(p => p.id === product.provider_id);
      if (!provider) {
        console.log(`⚠ Provider not found for product: ${product.name}`);
        continue;
      }
      
      const transactionData = {
        product_id: product.id,
        product_name: product.name,
        provider_id: provider.id,
        provider_name: provider.name,
        quantity: transaction.quantity,
        expected_arrival_start: transaction.expected_arrival_start,
        expected_arrival_end: transaction.expected_arrival_end,
        unit_price: transaction.unit_price,
        serial_numbers: transaction.serial_numbers
      };
      
      const createdTransaction = await createInboundTransaction(transactionData, token);
      if (createdTransaction) {
        createdTransactions.push(createdTransaction);
      }
    }
    
    // Save created transactions to file for later use
    const transactionsDataPath = path.join(process.cwd(), 'test-data', 'inbound-transactions.json');
    const testDataDir = path.dirname(transactionsDataPath);
    
    // Create test-data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const testData = {
      transactions: createdTransactions,
      timestamp: new Date().toISOString(),
      totalCreated: createdTransactions.length
    };
    
    fs.writeFileSync(transactionsDataPath, JSON.stringify(testData, null, 2));
    console.log(`✓ Test data saved to: ${transactionsDataPath}`);
    
    // Display summary
    console.log('\n=== Summary ===');
    console.log(`Total inbound transactions created: ${createdTransactions.length}`);
    console.log('Transactions created:');
    
    createdTransactions.forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.product_name}`);
      console.log(`     Batch: ${transaction.batch_number}`);
      console.log(`     Quantity: ${transaction.quantity}`);
      console.log(`     Provider: ${transaction.provider_name}`);
      console.log(`     Status: Incoming`);
      console.log('');
    });
    
    // Get current inbound transactions to verify
    console.log('Verifying transactions in system...');
    const allInboundTransactions = await getInboundTransactions(token);
    const incomingTransactions = allInboundTransactions.filter(t => t.status === 'Incoming');
    
    console.log(`✓ Total Incoming transactions in system: ${incomingTransactions.length}`);
    
    console.log('\n✓ Inbound transactions creation test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Inbound transactions creation test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as createInboundTransactionsTest };