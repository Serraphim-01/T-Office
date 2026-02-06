/**
 * Inventory System Test Runner with Support Staff Allocation
 * This script runs inventory tests along with support staff allocation
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test scripts in order
const testScripts = [
  { name: 'Provider Creation', file: 'inventory/create_providers.test.js' },
  { name: 'Product Creation', file: 'inventory/create_products.test.js' },
  { name: 'Provider User Assignment', file: 'inventory/assign_provider_user.test.js' },
  { name: 'Support Staff Allocation', file: 'users/support_staff_allocation.js' },
  { name: 'Inbound Transactions Creation', file: 'inventory/create_inbound_transactions.test.js' },
  { name: 'Move to Stored State', file: 'inventory/move_to_stored.test.js' },
  { name: 'Outbound Transactions Creation', file: 'inventory/create_outbound_transactions.test.js' },
  { name: 'Update to Dispatched State', file: 'inventory/update_to_dispatched.test.js' },
  { name: 'Update to Delivered State', file: 'inventory/update_to_delivered.test.js' }
];

async function runTestScript(scriptInfo, index) {
  console.log(`\n=== Running Test ${index + 1}/${testScripts.length}: ${scriptInfo.name} ===`);
  console.log(`Script: ${scriptInfo.file}`);
  
  return new Promise((resolve) => {
    const testProcess = spawn('node', [scriptInfo.file], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${scriptInfo.name} completed successfully`);
        resolve(true);
      } else {
        console.log(`✗ ${scriptInfo.name} failed with exit code ${code}`);
        resolve(false);
      }
    });
    
    testProcess.on('error', (error) => {
      console.log(`✗ ${scriptInfo.name} failed with error: ${error.message}`);
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('=== T-Office Inventory System Test Suite with Support Staff Allocation ===\n');
  
  // Check if test directory exists
  if (!fs.existsSync(process.cwd())) {
    console.log('✗ Test directory not found');
    process.exit(1);
  }
  
  let successCount = 0;
  let failureCount = 0;
  const failedTests = [];
  
  // Run each test script
  for (let i = 0; i < testScripts.length; i++) {
    const scriptInfo = testScripts[i];
    const scriptPath = path.join(process.cwd(), scriptInfo.file);
    
    // Check if script file exists
    if (!fs.existsSync(scriptPath)) {
      console.log(`✗ Test script not found: ${scriptInfo.file}`);
      failureCount++;
      failedTests.push(scriptInfo.name);
      continue;
    }
    
    const success = await runTestScript(scriptInfo, i);
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
      failedTests.push(scriptInfo.name);
      
      // For automation, we'll continue by default
      console.log('Continuing with next test...\n');
    }
  }
  
  // Final summary
  console.log('\n=== Test Suite Summary ===');
  console.log(`Total tests: ${testScripts.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  
  if (failedTests.length > 0) {
    console.log('\nFailed tests:');
    failedTests.forEach(testName => {
      console.log(`  - ${testName}`);
    });
  }
  
  if (successCount === testScripts.length) {
    console.log('\n🎉 All tests completed successfully!');
    console.log('\nYour inventory system is now populated with:');
    console.log('  - Multiple providers');
    console.log('  - Multiple products under providers');
    console.log('  - User assigned to provider');
    console.log('  - Support staff allocated to users');
    console.log('  - Inbound transactions');
    console.log('  - Stored inventory');
    console.log('  - Outbound transactions');
    console.log('  - Dispatched shipments');
    console.log('  - Delivered shipments');
  } else {
    console.log('\n⚠ Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

async function runSingleTest(testName) {
  const scriptInfo = testScripts.find(script => 
    script.name.toLowerCase().includes(testName.toLowerCase()) || 
    script.file.toLowerCase().includes(testName.toLowerCase())
  );
  
  if (!scriptInfo) {
    console.log(`✗ Test not found: ${testName}`);
    console.log('\nAvailable tests:');
    testScripts.forEach((script, index) => {
      console.log(`  ${index + 1}. ${script.name} (${script.file})`);
    });
    process.exit(1);
  }
  
  const success = await runTestScript(scriptInfo, 0);
  process.exit(success ? 0 : 1);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all tests
    await runAllTests();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('Usage:');
    console.log('  node run_inventory_with_support_tests.js           # Run all tests');
    console.log('  node run_inventory_with_support_tests.js <test>    # Run specific test');
    console.log('  node run_inventory_with_support_tests.js --help    # Show this help');
    console.log('\nAvailable tests:');
    testScripts.forEach((script, index) => {
      console.log(`  ${index + 1}. ${script.name}`);
    });
  } else {
    // Run specific test
    await runSingleTest(args[0]);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { runAllTests, runSingleTest };