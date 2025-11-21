# T-Office Database Migration Guide

**Note:** This guide has been updated to reflect that issues with PostgreSQL function definitions using dollar-quoted strings have been resolved. The migration system now correctly handles all PostgreSQL SQL syntax.

## Overview
This document explains how to run database migrations for the T-Office application. The migration system has been updated to use Node.js instead of requiring the PostgreSQL command-line tools (psql).

## Prerequisites
1. Node.js must be installed on your system
2. PostgreSQL database must be running and accessible
3. Database connection details must be configured in `backend/.env`

## Migration Files
The T-Office database schema is defined in two main files:
- `db/drop_migration.sql` - Drops all existing database objects
- `db/create_migration.sql` - Creates all tables, indexes, triggers, and populates initial data

## Running Migrations

### Method 1: Using the run_migration.sh script (Recommended)
From the project root directory, run:
```bash
./db/run_migration.sh
```

This script will:
1. Verify that required files exist
2. Check that Node.js is available
3. Execute the drop migration to clean the database
4. Execute the create migration to set up the schema
5. Provide instructions for verifying the migration

### Method 2: Manual execution using Node.js
From the project root directory, you can run the migrations manually:

```bash
# Drop existing schema
node db/run_sql.js db/drop_migration.sql

# Create new schema
node db/run_sql.js db/create_migration.sql
```

## Database Connection Configuration
The database connection is configured in `backend/.env`:
```
DATABASE_URL="postgres://postgres:password@localhost:5433/office"
```

Make sure this URL matches your PostgreSQL setup:
- `postgres` - Database username
- `password` - Database password
- `localhost` - Database host
- `5433` - Database port
- `office` - Database name

## Verifying Migration Success
After running migrations, you can verify the database is set up correctly:

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Test the database connection:
   ```bash
   curl http://localhost:4000/api/db-test
   ```

   You should receive a response like:
   ```json
   {
     "message": "DB connected ✅",
     "time": "2023-06-01T10:30:45.123Z"
   }
   ```

## Troubleshooting

### Error: "Node.js command not found"
Ensure Node.js is installed on your system. Download it from https://nodejs.org/

### Error: "Connection refused" or "Authentication failed"
1. Verify PostgreSQL is running
2. Check that the DATABASE_URL in `backend/.env` is correct
3. Ensure the database user and password are correct
4. Verify the database exists and is accessible

### Error during SQL execution
1. Check the error message for specific SQL issues
2. Review the migration files for syntax errors
3. Ensure the database is in a clean state before running migrations

## Migration Best Practices
1. Always run migrations from a clean database state
2. Backup your database before running migrations in production
3. Test migrations in a development environment first
4. Review migration files before execution
5. Verify the migration worked by testing application functionality

## Adding New Migrations
When adding new database features:
1. Update `db/create_migration.sql` with new tables/columns
2. Update `db/drop_migration.sql` with corresponding drop statements
3. Run migrations to apply changes
4. Test the new functionality