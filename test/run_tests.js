/**
 * Test Runner Script
 * This script helps run the user signup and cleanup tests.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'test');

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function installDependencies() {
  console.log('📦 Installing test dependencies...');
  try {
    await runCommand('npm', ['install', 'axios'], { cwd: TEST_DIR });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.warn('⚠️ Could not install axios automatically. Please install it manually with: npm install axios');
  }
}

async function runSignupTest() {
  console.log('🧪 Running user signup test...');
  try {
    await runCommand('node', ['user_signup.test.js'], { cwd: TEST_DIR });
    console.log('✅ Signup test completed');
  } catch (error) {
    console.error('❌ Signup test failed:', error.message);
  }
}

async function runCleanupTest() {
  console.log('🧹 Running user cleanup test...');
  try {
    await runCommand('node', ['user_cleanup.test.js'], { cwd: TEST_DIR });
    console.log('✅ Cleanup test completed');
  } catch (error) {
    console.error('❌ Cleanup test failed:', error.message);
  }
}

// Note: Direct cleanup is now built into user_cleanup.test.js as a fallback

async function main() {
  const action = process.argv[2];

  switch (action) {
    case 'signup':
      await installDependencies();
      await runSignupTest();
      break;
    case 'cleanup':
      await runCleanupTest();
      break;
    case 'both':
      await installDependencies();
      await runSignupTest();
      // Wait a moment before cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      await runCleanupTest();
      break;
    case 'all':
      await installDependencies();
      await runSignupTest();
      // Wait a moment before cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      await runCleanupTest();
      break;
    default:
      console.log('Usage:');
      console.log('  node test/run_tests.js signup       - Run signup test');
      console.log('  node test/run_tests.js cleanup      - Run cleanup test (direct DB access, no auth required)');
      console.log('  node test/run_tests.js both         - Run signup and cleanup');
      console.log('  node test/run_tests.js all          - Run signup and cleanup (same as both)');
      break;
  }
}

// Run the main function
main().catch(error => {
  console.error('💥 Error running tests:', error.message);
  process.exit(1);
});