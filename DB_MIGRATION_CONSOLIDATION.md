# Database Migration Consolidation

## Overview

This document explains the consolidation of database migration files to simplify the database setup process for the T-Office application.

## Changes Made

### 1. Consolidated SQL Files

All separate SQL migration files have been consolidated into the main `create_migration.sql` file:

- `ensure_admin_access.sql`
- `feature_access_migration.sql`
- `migrate_inventory_features.sql`
- `update_admin_access.sql`
- `ensure_approvals_access.sql`
- `check_admin_access.sql`
- `check_feature_access.sql`
- `show_feature_access.sql`
- `remove_admin_hr_approvals_access.sql`

These files have been moved to the `db/backup` directory for historical reference.

### 2. Fixed Dollar-Quoting Issue

The `run_sql.js` script was updated to properly handle PostgreSQL dollar-quoted strings (used in function definitions). This fixes the "unterminated dollar-quoted string" error that occurred when executing the migration scripts.

### 3. Updated Drop Migration

The `drop_migration.sql` file was updated to include dropping the `department_page_access` table which was missing from the original version.

### 4. Updated JavaScript Migration Scripts

The JavaScript migration scripts (`run_admin_access_migration.js` and `run_inventory_features_migration.js`) were updated to inform users that their functionality is now included in the main `create_migration.sql` file.

### 5. Added Module Type Declaration

Added `"type": "module"` to the `package.json` file to eliminate Node.js warnings when using ES6 import syntax.

### 6. Created Documentation

- Added a `README.md` file in the `db` directory to explain the consolidated approach
- This document to summarize the changes

## Benefits

1. **Simplified Migration Process**: Users now only need to run one create and one drop script
2. **Reduced Complexity**: Eliminates the need to run multiple migration scripts in a specific order
3. **Easier Maintenance**: All schema definitions are in one place
4. **Clearer Documentation**: Users can see the complete schema in one file

## How to Use

### Complete Database Reset and Recreation

From the project root directory:

```bash
./db/run_migration.sh
```

Or manually:

```bash
node db/run_sql.js db/drop_migration.sql
node db/run_sql.js db/create_migration.sql
```

### Running Individual SQL Files

The `run_sql.js` script can still be used to run individual SQL files:

```bash
node db/run_sql.js <path_to_sql_file>
```

## Backup Files

All original SQL files have been preserved in the `db/backup` directory for reference. These files are no longer used in the active migration process but can be consulted for historical purposes.

## Verification

To verify that the consolidation was successful:

1. Check that all tables are created correctly
2. Verify that all department page access entries are present
3. Confirm that all indexes and triggers are in place
4. Test that the application functions as expected with the new schema

## Future Updates

When adding new features that require database changes:

1. Add the necessary CREATE TABLE, ALTER TABLE, INSERT, etc. statements to `create_migration.sql`
2. Update `drop_migration.sql` if new tables are added
3. Ensure the drop order maintains referential integrity
4. Test the changes thoroughly