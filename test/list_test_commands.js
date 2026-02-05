#!/usr/bin/env node

/**
 * Test Command List
 * Displays all available test commands and their descriptions
 */

const commands = [
  {
    category: 'User Management Tests',
    commands: [
      { cmd: 'npm run test:users:roles', desc: 'Create extra roles for testing' },
      { cmd: 'npm run test:users:create', desc: 'Create multiple users across departments' },
      { cmd: 'npm run test:users:support', desc: 'Assign support staff and generate attendance records' },
      { cmd: 'npm run test:users:all', desc: 'Run all user management tests' },
      { cmd: 'npm run cleanup:users', desc: 'Clean up user test data' }
    ]
  },
  {
    category: 'Inventory Management Tests',
    commands: [
      { cmd: 'npm run test:inventory:providers', desc: 'Create multiple providers' },
      { cmd: 'npm run test:inventory:products', desc: 'Create products under providers' },
      { cmd: 'npm run test:inventory:assign-user', desc: 'Assign user to provider' },
      { cmd: 'npm run test:inventory:inbound', desc: 'Create inbound transactions' },
      { cmd: 'npm run test:inventory:stored', desc: 'Move inbound to stored state' },
      { cmd: 'npm run test:inventory:outbound', desc: 'Create outbound transactions' },
      { cmd: 'npm run test:inventory:dispatched', desc: 'Update to dispatched state' },
      { cmd: 'npm run test:inventory:delivered', desc: 'Update to delivered state' },
      { cmd: 'npm run test:inventory:all', desc: 'Run all inventory tests (no cleanup)' },
      { cmd: 'npm run cleanup:inventory', desc: 'Clean up inventory test data' }
    ]
  },
  {
    category: 'Complete Test Suites',
    commands: [
      { cmd: 'npm run test:all', desc: 'Run all user and inventory tests' },
      { cmd: 'npm run cleanup:all', desc: 'Clean up all test data' }
    ]
  }
];

function displayCommands() {
  console.log('=== T-Office Test Commands ===\n');
  
  commands.forEach((category, index) => {
    console.log(`${index + 1}. ${category.category}`);
    console.log('─'.repeat(category.category.length + 3));
    
    category.commands.forEach((command, cmdIndex) => {
      console.log(`   ${cmdIndex + 1}. ${command.cmd}`);
      console.log(`      ${command.desc}`);
    });
    
    console.log(''); // Empty line between categories
  });
  
  console.log('=== Usage Examples ===');
  console.log('Run individual tests:');
  console.log('  npm run test:users:roles');
  console.log('  npm run test:inventory:providers');
  console.log('');
  console.log('Run complete test suites:');
  console.log('  npm run test:users:all');
  console.log('  npm run test:inventory:all');
  console.log('  npm run test:all');
  console.log('');
  console.log('Clean up test data:');
  console.log('  npm run cleanup:users');
  console.log('  npm run cleanup:inventory');
  console.log('  npm run cleanup:all');
}

// Display the commands
displayCommands();