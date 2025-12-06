#!/bin/bash

# Database migration script for T-Office
# This script drops existing tables and recreates the schema using Node.js

echo "Starting database migration..."

# Store the original directory
ORIGINAL_DIR=$(pwd)

# Check if we're in the right directory by looking for key files
if [ ! -f "db/drop_migration.sql" ] || [ ! -f "db/create_migration.sql" ] || [ ! -d "backend" ]; then
  echo "Error: Required project files not found!"
  echo "Please run this script from the project root directory."
  echo "Current directory: $(pwd)"
  echo "Looking for db/drop_migration.sql, db/create_migration.sql, and backend/ directory."
  exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "Error: Node.js command not found!"
  echo "Please ensure Node.js is installed and in your PATH."
  echo "Download Node.js from: https://nodejs.org/"
  exit 1
fi

# Run migrations directly from the current directory (project root)
echo "Running migrations from project root directory..."

echo "Dropping existing schema..."
node db/run_sql.js db/drop_migration.sql

if [ $? -ne 0 ]; then
  echo "Error: Failed to drop existing schema"
  exit 1
fi

echo "Creating new schema..."
node db/run_sql.js db/create_migration.sql

if [ $? -ne 0 ]; then
  echo "Error: Failed to create new schema"
  exit 1
fi

echo "Running additional migrations..."
cd backend
node ../db/run_additional_migrations.js

if [ $? -ne 0 ]; then
  echo "Error: Failed to run additional migrations"
  exit 1
fi

echo "Database migration completed successfully!"
echo ""
echo "To verify the migration worked correctly:"
echo "1. Make sure your PostgreSQL database is running"
echo "2. Start the backend server with: cd backend && npm run dev"
echo "3. Test the connection with: curl http://localhost:4000/api/db-test"