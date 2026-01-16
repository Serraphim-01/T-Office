#!/bin/bash

# Script to drop the database using the drop_migration.sql file

echo "Dropping database with drop_migration.sql..."

# Load environment variables from .env if it exists
ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  # Source the environment variables properly
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "Warning: $ENV_FILE not found. Make sure to set DATABASE_URL before running migrations."
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  echo "Please set DATABASE_URL in your .env file."
  exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "Error: psql command not found!"
  echo "Please ensure PostgreSQL is installed and psql is in your PATH."
  echo "Install PostgreSQL from: https://www.postgresql.org/download/"
  exit 1
fi

echo "Running drop_migration.sql..."
psql "$DATABASE_URL" -f drop_migration.sql

if [ $? -ne 0 ]; then
  echo "Error: Failed to run drop_migration.sql"
  exit 1
fi

echo "Database dropped successfully!"