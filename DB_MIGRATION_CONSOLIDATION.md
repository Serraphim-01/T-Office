# Database Migration Consolidation

**Note:** This document has been updated to reflect that issues with PostgreSQL function definitions using dollar-quoted strings have been resolved. See `MIGRATION_ISSUE_RESOLUTION.md` for details.

## Overview
This document explains the consolidation of the database migration files. Previously, the inventory schema was defined in separate files (`db/inventory_schema.sql`, `db/inbound_schema.sql`, `db/outbound_schema.sql`). These have now been merged into the main migration files (`drop_migration.sql` and `create_migration.sql`) for better maintainability and consistency.

## Changes Made

### 1. drop_migration.sql
- Added inventory-related table drops in the correct order:
  - `outbound_serial_numbers`
  - `outbound_transactions`
  - `inbound_serial_numbers`
  - `inbound_transactions`
  - `products`
- Added inventory-related trigger drops:
  - `update_products_updated_at`
  - `update_inbound_transactions_updated_at`
  - `update_outbound_transactions_updated_at`

### 2. create_migration.sql
- Moved all inventory schema definitions from separate files to this main file
- Organized sections with clear headers:
  - INVENTORY TABLES
  - INVENTORY INBOUND TABLES
  - INVENTORY OUTBOUND TABLES
- Moved inventory indexes to the INDEXES section
- Moved inventory triggers to the TRIGGERS section
- Ensured sample data for products is included in the INITIAL DATA POPULATION section

## Benefits of Consolidation

1. **Simplified Management**: All schema definitions are now in two files instead of five
2. **Consistent Structure**: Follows the same pattern as other modules in the system
3. **Easier Maintenance**: Changes to the schema only need to be made in one place
4. **Better Dependency Management**: All dependencies are clearly visible in the main migration files
5. **Reduced Risk**: Eliminates potential issues with file ordering during migration

## Migration Process

The migration process remains the same:
```bash
./run_migration.sh
```

This script will:
1. Execute `drop_migration.sql` to remove existing tables
2. Execute `create_migration.sql` to create all tables and populate initial data

## Testing

To test the consolidated migration:
1. Run the migration script
2. Verify all tables are created correctly
3. Check that sample data is populated
4. Confirm that indexes and triggers are in place

## Rollback

If you need to rollback to the previous structure:
1. Restore the separate schema files
2. Revert the changes to `drop_migration.sql` and `create_migration.sql`
3. Update `run_migration.sh` if necessary