# Database Migration System

This directory contains all the necessary files for managing the database schema for the T-Office application.

## Consolidated Migration Files

As part of our effort to simplify the database migration process, we have consolidated all SQL migration scripts into two main files:

### `create_migration.sql`
This file contains all the necessary SQL statements to create the complete database schema including:
- All table definitions
- Indexes
- Triggers
- Initial data population
- All department page access configurations

### `drop_migration.sql`
This file contains all the necessary SQL statements to drop the complete database schema in the correct order to avoid dependency issues.

## Enhanced SQL Parser

The `run_sql.js` script has been enhanced to properly handle PostgreSQL dollar-quoted strings (used in function definitions). This fixes issues with executing function definitions that contain semicolons within dollar-quoted blocks.

## Migration Execution

### Using the Node.js Script (Recommended)
```bash
# From the project root directory
node db/run_sql.js db/create_migration.sql
```

### Using the Shell Script
```bash
# From the project root directory
./db/run_migration.sh
```

## Backup Files

All previous migration files have been moved to the `backup` directory for reference. These files are no longer used in the current migration process but are kept for historical purposes.

## JavaScript Migration Scripts

The JavaScript migration scripts (`run_admin_access_migration.js` and `run_inventory_features_migration.js`) have been updated to reflect that their functionality is now included in the main `create_migration.sql` file.