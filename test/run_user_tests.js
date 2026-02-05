/**
 * User Test Suite Runner
 * Runs all user-related tests in sequence
 */

import { spawn } from 'child_process';
import path from 'path';

const tests = [
  {
    name: 'Create Extra Roles',
    script: 'users/create_extra_roles.js',
    description: 'Creates additional roles for testing'
  },
  {
    name: 'Multi User Creation', 
    script: 'users/multi_user_creation.js',
    description: 'Creates multiple users across departments'
  },
  {
    name: 'Support Staff Allocation',
    script: 'users/support_staff_allocation.js',
    description: 'Assigns support staff and generates attendance records'
  }
];

async function runTest(test) {
  console.log(`\n=== Running Test: ${test.name} ===`);
  console.log(`Script: ${test.script}`);
  console.log(`${test.description}\n`);
  
  return new Promise((resolve) => {
    const testProcess = spawn('node', [test.script], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${test.name} completed successfully`);
        resolve(true);
      } else {
        console.log(`✗ ${test.name} failed with exit code ${code}`);
        resolve(false);
      }
    });
    
    testProcess.on('error', (error) => {
      console.log(`✗ ${test.name} failed with error: ${error.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('=== T-Office User Test Suite ===\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const test of tests) {
    const success = await runTest(test);
    if (success) {
      passedTests++;
    } else {
      failedTests++;
    }
  }
  
  console.log('\n=== User Test Suite Summary ===');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Successful: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All user tests completed successfully!');
  } else {
    console.log(`\n⚠ ${failedTests} test(s) failed. Please check the output above.`);
  }
}

// Run the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runUserTests };