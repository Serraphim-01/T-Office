#!/bin/bash

# Database migration script for T-Office
# This script runs the new migration system

echo "Starting database migration..."

# Load environment variables from .env.local if it exists
ENV_FILE="../.env.local"
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  export $(cat $ENV_FILE | xargs)
else
  echo "Warning: $ENV_FILE not found. Make sure to set DATABASE_URL before running migrations."
fi

# Check if we're in the right directory by looking for key files
if [ ! -f "./migrate-cli.js" ] || [ ! -f "./migrate.js" ] || [ ! -d "./migrations" ]; then
  echo "Error: Required migration files not found!"
  echo "Please run this script from the backend/db directory."
  echo "Current directory: $(pwd)"
  echo "Looking for migrate-cli.js, migrate.js, and migrations/ directory."
  exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  echo "Error: Node.js command not found!"
  echo "Please ensure Node.js is installed and in your PATH."
  echo "Download Node.js from: https://nodejs.org/"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Warning: DATABASE_URL environment variable is not set."
  echo "Make sure to set DATABASE_URL before running migrations."
fi

echo "Running migrations using new migration system..."
node migrate-cli.js up

if [ $? -ne 0 ]; then
  echo "Error: Failed to run migrations"
  exit 1
fi

echo "Database migration completed successfully!"
echo ""
echo "To verify the migration worked correctly:"
echo "1. Make sure your PostgreSQL database is running"
echo "2. Start the backend server with: cd .. && npm run dev"
echo "3. Test the connection with: curl http://localhost:4000/api/db-test"