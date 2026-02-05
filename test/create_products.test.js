/**
 * Product Creation Test Script
 * This script creates multiple products under the providers created in the previous test
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

async function createProduct(productData, token) {
  try {
    console.log(`Creating product: ${productData.name} (${productData.part_number})`);
    const response = await axios.post(`${API_BASE_URL}/api/inventory/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✓ Product created successfully: ${productData.name} (ID: ${response.data.id})`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log(`⚠ Product already exists: ${productData.name}`);
      return null;
    }
    
    console.error(`✗ Failed to create product ${productData.name}:`, error.response?.data || error.message);
    return null;
  }
}

async function getAllProducts(token) {
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

async function main() {
  console.log('=== Product Creation Test Script ===\n');
  
  try {
    // Authenticate
    const token = await authenticate();
    console.log('✓ Authentication successful\n');
    
    // Get existing providers
    console.log('Fetching existing providers...');
    const providers = await getProviders(token);
    
    if (providers.length === 0) {
      console.log('⚠ No providers found. Please run the provider creation test first.');
      console.log('You can run it with: node create_providers.test.js');
      process.exit(1);
    }
    
    console.log(`✓ Found ${providers.length} providers\n`);
    
    // Create products for each provider
    const createdProducts = [];
    const testDataPath = path.join(process.cwd(), 'test-data', 'providers.json');
    
    // Load provider data if available
    let providerTestData = null;
    if (fs.existsSync(testDataPath)) {
      providerTestData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));
    }
    
    // Define products for each provider
    const providerProducts = {
      'Tech Solutions Inc.': [
        {
          name: 'MacBook Pro 16"',
          part_number: 'MBA-2023-001',
          product_type: 'Laptop',
          default_unit_price: 2500.00,
          default_markup_percentage: 20.00
        },
        {
          name: 'iPad Air',
          part_number: 'IPA-2023-001',
          product_type: 'Tablet',
          default_unit_price: 750.00,
          default_markup_percentage: 15.00
        },
        {
          name: 'Magic Mouse',
          part_number: 'MM-2023-001',
          product_type: 'Accessory',
          default_unit_price: 80.00,
          default_markup_percentage: 25.00
        }
      ],
      'Global Electronics Ltd.': [
        {
          name: 'Dell XPS 13',
          part_number: 'DXPS-2023-001',
          product_type: 'Laptop',
          default_unit_price: 1800.00,
          default_markup_percentage: 18.00
        },
        {
          name: 'Samsung Galaxy Tab',
          part_number: 'SGT-2023-001',
          product_type: 'Tablet',
          default_unit_price: 600.00,
          default_markup_percentage: 20.00
        },
        {
          name: 'Wireless Keyboard',
          part_number: 'WK-2023-001',
          product_type: 'Accessory',
          default_unit_price: 65.00,
          default_markup_percentage: 30.00
        }
      ],
      'Office Supply Co.': [
        {
          name: 'Ergonomic Office Chair',
          part_number: 'EOC-2023-001',
          product_type: 'Furniture',
          default_unit_price: 350.00,
          default_markup_percentage: 25.00
        },
        {
          name: 'Standing Desk Converter',
          part_number: 'SDC-2023-001',
          product_type: 'Furniture',
          default_unit_price: 280.00,
          default_markup_percentage: 30.00
        },
        {
          name: 'Desk Lamp LED',
          part_number: 'DL-2023-001',
          product_type: 'Accessory',
          default_unit_price: 45.00,
          default_markup_percentage: 35.00
        }
      ],
      'Digital Devices Corp.': [
        {
          name: '4K Monitor 27"',
          part_number: 'MON-2023-001',
          product_type: 'Display',
          default_unit_price: 450.00,
          default_markup_percentage: 20.00
        },
        {
          name: 'Gaming Keyboard',
          part_number: 'GK-2023-001',
          product_type: 'Accessory',
          default_unit_price: 120.00,
          default_markup_percentage: 25.00
        },
        {
          name: 'Wireless Headphones',
          part_number: 'WH-2023-001',
          product_type: 'Accessory',
          default_unit_price: 180.00,
          default_markup_percentage: 22.00
        }
      ]
    };
    
    console.log('Creating products...\n');
    
    // Create products for each provider
    for (const provider of providers) {
      const productsToCreate = providerProducts[provider.name] || [];
      
      if (productsToCreate.length === 0) {
        console.log(`⚠ No products defined for provider: ${provider.name}`);
        continue;
      }
      
      console.log(`Creating ${productsToCreate.length} products for ${provider.name}:`);
      
      for (const productData of productsToCreate) {
        const fullProductData = {
          ...productData,
          provider_id: provider.id
        };
        
        const product = await createProduct(fullProductData, token);
        if (product) {
          createdProducts.push({
            ...product,
            provider_name: provider.name,
            provider_id: provider.id
          });
        }
      }
      console.log(''); // Empty line for better readability
    }
    
    // Save created products to file for later use
    const productsDataPath = path.join(process.cwd(), 'test-data', 'products.json');
    const testDataDir = path.dirname(productsDataPath);
    
    // Create test-data directory if it doesn't exist
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const testData = {
      products: createdProducts,
      timestamp: new Date().toISOString(),
      totalCreated: createdProducts.length
    };
    
    fs.writeFileSync(productsDataPath, JSON.stringify(testData, null, 2));
    console.log(`✓ Test data saved to: ${productsDataPath}`);
    
    // Display summary
    console.log('\n=== Summary ===');
    console.log(`Total products created: ${createdProducts.length}`);
    console.log('Products by provider:');
    
    const productsByProvider = {};
    createdProducts.forEach(product => {
      if (!productsByProvider[product.provider_name]) {
        productsByProvider[product.provider_name] = [];
      }
      productsByProvider[product.provider_name].push(product);
    });
    
    Object.entries(productsByProvider).forEach(([providerName, products]) => {
      console.log(`  ${providerName}:`);
      products.forEach(product => {
        console.log(`    - ${product.name} (${product.part_number}) - ID: ${product.id}`);
      });
    });
    
    console.log('\n✓ Product creation test completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Product creation test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as createProductsTest };