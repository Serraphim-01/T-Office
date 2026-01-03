# T-Office Database Migration System

This document describes the database migration system for T-Office.

## Overview

The migration system allows for safe, versioned database schema changes that can be applied automatically during deployment without running migrations at application startup.

## Key Features

- **Versioned migrations**: Each migration is numbered and stored in the `db/migrations/` directory
- **Idempotent execution**: Migrations are tracked in the database to prevent re-execution
- **Non-interactive**: Migrations can be run automatically in production environments
- **Environment-aware**: Respects `DATABASE_URL` from environment variables
- **Transactional**: Each migration runs in a transaction to ensure atomicity

## Migration File Naming

Migration files follow the pattern: `{version}_{description}.sql`

Examples:
- `001_create_users_table.sql`
- `002_add_email_to_users.sql`
- `003_create_products_table.sql`

## Running Migrations

### Apply pending migrations
```bash
cd backend
npm run migrate
```

### Create a new migration
```bash
cd backend
npm run create-migration <migration-name>
```

Example:
```bash
npm run create-migration add_user_roles
```

## Production Deployment

In production, run migrations before starting the application:

```bash
# Apply migrations
npm run migrate

# Then start the application
npm start
```

## Migration Tracking

Applied migrations are tracked in the `migration_history` table in the database. This table is created automatically if it doesn't exist.

## Best Practices

1. Always test migrations in a development environment first
2. Write reversible migrations when possible
3. Keep migrations small and focused on a single change
4. Use transactions when possible to ensure atomicity
5. Test both forward and rollback scenarios

## Directory Structure

```
backend/db/
├── migrate.js          # Main migration runner
├── migrate-cli.js      # Command line interface
├── migrations/         # Migration files directory
│   ├── 001_*.sql
│   ├── 002_*.sql
│   └── ...
└── MIGRATION_SYSTEM.md # This document
```