#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';
import runMigrations from './migrate.js';

// Load environment variables from both .env and .env.local to ensure compatibility
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Function to create a new migration file
function createMigration(name) {
  if (!name) {
    console.error('Error: Migration name is required');
    console.log('Usage: npm run migrate create <migration-name>');
    process.exit(1);
  }
  
  // Sanitize the name to be alphanumeric with underscores
  const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Get the next migration number
  const migrationsDir = resolve(process.cwd(), 'migrations');
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true });
  }
  
  const files = [];
  try {
    files.push(...readdirSync(migrationsDir));
  } catch (err) {
    // Directory doesn't exist or is empty
  }
  
  const existingNumbers = files
    .filter(file => file.match(/^\d+_.*\.sql$/))
    .map(file => parseInt(file.split('_')[0]))
    .sort((a, b) => b - a);
  
  const nextNumber = existingNumbers.length > 0 ? existingNumbers[0] + 1 : 1;
  const paddedNumber = nextNumber.toString().padStart(3, '0');
  
  const fileName = `${paddedNumber}_${sanitizedName}.sql`;
  const filePath = resolve(migrationsDir, fileName);
  
  // Create the migration file with a template
  const template = `-- Migration: ${sanitizedName}
-- Description: Add your migration description here

-- Add your SQL statements below:

`;
  
  writeFileSync(filePath, template);
  
  console.log(`Created migration file: ${filePath}`);
}

// Function to show help
function showHelp() {
  console.log(`
T-Office Database Migration Tool

Usage:
  npm run migrate up          Run pending migrations
  npm run migrate create <name>  Create a new migration file
  npm run migrate help        Show this help message

Examples:
  npm run migrate up
  npm run migrate create add_user_roles
  npm run migrate create update_products_table
`);
}

// Execute the command
async function executeCommand() {
  switch (command) {
    case 'up':
      await runMigrations();
      break;
    case 'create':
      createMigration(args[1]);
      break;
    case 'help':
    case undefined:
      showHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Run the command
executeCommand().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});