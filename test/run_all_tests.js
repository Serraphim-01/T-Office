/**
 * Complete Test Suite Runner
 * Runs all user and inventory tests in sequence
 */

import { spawn } from 'child_process';
import path from 'path';

const testSuites = [
  {
    name: 'User Management Tests',
    runner: 'run_user_tests.js'
  },
  {
    name: 'Inventory Management Tests', 
    runner: 'run_inventory_tests.js'
  }
];

async function runTestSuite(suite) {
  console.log(`\n=== Running Test Suite: ${suite.name} ===`);
  console.log(`Runner: ${suite.runner}\n`);
  
  return new Promise((resolve) => {
    const suiteProcess = spawn('node', [suite.runner], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    suiteProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${suite.name} completed successfully`);
        resolve(true);
      } else {
        console.log(`✗ ${suite.name} failed with exit code ${code}`);
        resolve(false);
      }
    });
    
    suiteProcess.on('error', (error) => {
      console.log(`✗ ${suite.name} failed with error: ${error.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('=== T-Office Complete Test Suite ===\n');
  
  let passedSuites = 0;
  let failedSuites = 0;
  
  for (const suite of testSuites) {
    const success = await runTestSuite(suite);
    if (success) {
      passedSuites++;
    } else {
      failedSuites++;
    }
  }
  
  console.log('\n=== Complete Test Suite Summary ===');
  console.log(`Total test suites: ${testSuites.length}`);
  console.log(`Successful: ${passedSuites}`);
  console.log(`Failed: ${failedSuites}`);
  
  if (failedSuites === 0) {
    console.log('\n🎉 All test suites completed successfully!');
    console.log('\nYour system is now populated with:');
    console.log('  - Multiple user roles');
    console.log('  - Multiple users across departments');
    console.log('  - Support staff assignments');
    console.log('  - Attendance records');
    console.log('  - Multiple providers');
    console.log('  - Multiple products');
    console.log('  - User-provider assignments');
    console.log('  - Inbound transactions');
    console.log('  - Stored inventory');
    console.log('  - Outbound transactions');
    console.log('  - Dispatched shipments');
    console.log('  - Delivered shipments');
  } else {
    console.log(`\n⚠ ${failedSuites} test suite(s) failed. Please check the output above.`);
  }
}

// Run the complete test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runAllTests };