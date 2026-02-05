/**
 * Inventory Test Data Cleanup Script
 * This script removes test data created by the inventory test scripts
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Test data files to clean up
const testDataFiles = [
  'providers.json',
  'products.json', 
  'provider-assignments.json',
  'inbound-transactions.json',
  'stored-transactions.json',
  'outbound-transactions.json',
  'dispatched-transactions.json',
  'delivered-transactions.json'
];

const testDataDir = path.join(process.cwd(), 'test-data');

async function cleanupTestData() {
  console.log('=== Inventory Test Data Cleanup ===\n');
  
  if (!fs.existsSync(testDataDir)) {
    console.log('✓ No test data directory found. Nothing to clean up.');
    return;
  }
  
  let cleanedCount = 0;
  let failedCount = 0;
  
  console.log('Cleaning up test data files...\n');
  
  for (const fileName of testDataFiles) {
    const filePath = path.join(testDataDir, fileName);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`✓ Removed: ${fileName}`);
        cleanedCount++;
      } catch (error) {
        console.log(`✗ Failed to remove ${fileName}: ${error.message}`);
        failedCount++;
      }
    } else {
      console.log(`- Not found: ${fileName}`);
    }
  }
  
  // Remove test-data directory if empty
  try {
    const files = fs.readdirSync(testDataDir);
    if (files.length === 0) {
      fs.rmdirSync(testDataDir);
      console.log('\n✓ Removed empty test-data directory');
    } else {
      console.log(`\n⚠ test-data directory not empty (${files.length} files remaining)`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log(`\n✗ Error checking test-data directory: ${error.message}`);
    }
  }
  
  console.log('\n=== Cleanup Summary ===');
  console.log(`Files cleaned: ${cleanedCount}`);
  console.log(`Files failed: ${failedCount}`);
  console.log(`Total files checked: ${testDataFiles.length}`);
  
  if (cleanedCount > 0) {
    console.log('\n✓ Test data cleanup completed successfully!');
  } else {
    console.log('\nℹ No test data files were removed.');
  }
}

async function cleanupDatabase() {
  console.log('\n=== Database Cleanup ===');
  console.log('Note: Database cleanup requires manual intervention through the admin interface');
  console.log('or direct database queries. This script only removes local test data files.');
  console.log('\nTo clean database records, you can:');
  console.log('1. Use the admin panel to delete test providers/products');
  console.log('2. Run database cleanup scripts if available');
  console.log('3. Use direct SQL queries to remove test records');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  node cleanup_inventory_tests.js           # Clean up test data files');
    console.log('  node cleanup_inventory_tests.js --all     # Clean up files and show DB info');
    console.log('  node cleanup_inventory_tests.js --help    # Show this help');
    return;
  }
  
  // Clean up test data files
  await cleanupTestData();
  
  // Show database cleanup information if requested
  if (args.includes('--all')) {
    await cleanupDatabase();
  }
  
  console.log('\nTo re-run tests, use: node run_inventory_tests.js');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
}

export { cleanupTestData, cleanupDatabase };