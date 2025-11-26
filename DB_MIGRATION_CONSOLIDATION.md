# Database Migration Consolidation

This document explains the consolidation of database migrations in the T-Office application.

## Overview

Previously, the database migrations were split across multiple files:
- Main migrations: [create_migration.sql](file:///Users/serraphim/Desktop/T-Office/db/create_migration.sql) and [drop_migration.sql](file:///Users/serraphim/Desktop/T-Office/db/drop_migration.sql)
- Roles migrations: roles_feature_access_migration.sql and drop_roles_migration.sql
- Migration runners: run_roles_migration.js, run_drop_roles_migration.js

This structure has been consolidated to centralize all database migrations in the main migration files for simplicity and maintainability.

## Consolidated Structure

### Main Migration Files

1. **[db/create_migration.sql](file:///Users/serraphim/Desktop/T-Office/db/create_migration.sql)** - Contains all table creation, indexes, triggers, and initial data population including:
   - All existing tables and relationships
   - Roles and role_page_access tables
   - Role_id column in users table
   - All necessary indexes for roles
   - Initial data population for roles
   - Migration of existing users to default roles

2. **[db/drop_migration.sql](file:///Users/serraphim/Desktop/T-Office/db/drop_migration.sql)** - Contains all table drops in the correct order including:
   - All existing table drops in reverse order
   - Role-related table drops
   - Role-related index drops
   - Role_id column removal from users table

### Removed Files

The following files have been removed as they are now redundant:
- `db/roles_feature_access_migration.sql`
- `db/drop_roles_migration.sql`
- `db/run_roles_migration.js`
- `db/run_drop_roles_migration.js`
- `db/roles_migration.sql`

## Benefits of Consolidation

1. **Simplified Migration Process**: Single command to run all migrations
2. **Reduced Complexity**: No need to manage multiple migration files
3. **Better Maintainability**: All schema changes in one place
4. **Consistent Execution**: All database objects created in a single, predictable order
5. **Easier Troubleshooting**: Issues can be traced in a single file

## Migration Execution

To run the consolidated database migration:

```bash
./db/run_migration.sh
```

This script will:
1. Drop all existing tables using [drop_migration.sql](file:///Users/serraphim/Desktop/T-Office/db/drop_migration.sql)
2. Create all tables and relationships using [create_migration.sql](file:///Users/serraphim/Desktop/T-Office/db/create_migration.sql)

## Backward Compatibility

The consolidation maintains full backward compatibility:
- All existing functionality continues to work
- No changes to the application code were required
- Existing data migration logic is preserved
- Role-based access control continues to function as expected

## Testing

The consolidation has been tested to ensure:
- All tables are created correctly
- All relationships are maintained
- All indexes and triggers are properly set up
- Role-based access control works as expected
- Existing data migration works correctly