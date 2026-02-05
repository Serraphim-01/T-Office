/**
 * Complete Test Cleanup Script
 * Removes all test data from both user and inventory tests
 */

import { spawn } from 'child_process';
import path from 'path';

const cleanupScripts = [
  {
    name: 'User Test Cleanup',
    script: 'cleanup_multi_users.test.js'
  },
  {
    name: 'Inventory Test Cleanup', 
    script: 'cleanup_inventory_tests.js'
  }
];

async function runCleanup(script) {
  console.log(`\n=== Running Cleanup: ${script.name} ===`);
  console.log(`Script: ${script.script}\n`);
  
  return new Promise((resolve) => {
    const cleanupProcess = spawn('node', [script.script], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    cleanupProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${script.name} completed successfully`);
        resolve(true);
      } else {
        console.log(`✗ ${script.name} failed with exit code ${code}`);
        resolve(false);
      }
    });
    
    cleanupProcess.on('error', (error) => {
      console.log(`✗ ${script.name} failed with error: ${error.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('=== T-Office Complete Test Cleanup ===\n');
  
  let passedCleanups = 0;
  let failedCleanups = 0;
  
  for (const script of cleanupScripts) {
    const success = await runCleanup(script);
    if (success) {
      passedCleanups++;
    } else {
      failedCleanups++;
    }
  }
  
  console.log('\n=== Cleanup Summary ===');
  console.log(`Total cleanup scripts: ${cleanupScripts.length}`);
  console.log(`Successful: ${passedCleanups}`);
  console.log(`Failed: ${failedCleanups}`);
  
  if (failedCleanups === 0) {
    console.log('\n🎉 All test data has been cleaned up successfully!');
  } else {
    console.log(`\n⚠ ${failedCleanups} cleanup script(s) failed. Please check the output above.`);
  }
}

// Run the cleanup
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as cleanupAllTests };