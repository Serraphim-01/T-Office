#!/bin/bash

# Database migration script for T-Office
# This script drops existing tables and recreates the schema

echo "Starting database migration..."

# Check if we're in the right directory
if [ ! -f "drop_migration.sql" ] || [ ! -f "create_migration.sql" ]; then
  echo "Error: Required migration files not found!"
  echo "Please run this script from the project root directory."
  exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "Error: psql command not found!"
  echo "Please ensure PostgreSQL client tools are installed and in your PATH."
  echo "Alternatively, you can run migrations through the application:"
  echo "1. Make sure the backend server is running"
  echo "2. Use the database initialization endpoints if available"
  echo "3. Or manually verify database connectivity through the application"
  exit 1
fi

# Drop existing schema
echo "Dropping existing schema..."
psql "$DATABASE_URL" -f drop_migration.sql

# Create new schema
echo "Creating new schema..."
psql "$DATABASE_URL" -f create_migration.sql

echo "Database migration completed successfully!"