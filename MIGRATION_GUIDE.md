# T-Office Database Migration Guide

## Overview

T-Office now uses a proper database migration system that allows for safe, versioned schema changes. The system is designed to meet the following requirements:

- ✅ Migrations are applied automatically during backend deployment
- ✅ Migrations are non-interactive in production
- ✅ No migration logic runs on application startup
- ✅ Backend respects DATABASE_URL from environment variables
- ✅ Schema changes are represented as versioned migration files

## Migration System Architecture

The migration system consists of:
- Migration files stored in `db/migrations/` directory
- A migration runner (`db/migrate.js`) that applies pending migrations
- A CLI tool (`db/migrate-cli.js`) for managing migrations
- A tracking system that records applied migrations in the database

## Running Migrations

### Apply pending migrations
```bash
# From project root
npm run migrate

# Or from backend directory
cd backend && npm run migrate
```

### Create a new migration
```bash
# From project root
npm run create-migration add_user_roles

# Or from backend directory
cd backend && npm run create-migration add_user_roles
```

## Production Deployment

For production deployments, use this sequence:

```bash
# 1. Apply migrations
npm run migrate

# 2. Start the application
npm start
```

## Migration File Format

Migration files follow the naming convention: `{version}_{description}.sql`

Examples:
- `001_initial_schema.sql`
- `002_add_active_to_users.sql`
- `003_create_global_chat_settings.sql`

Each migration file should contain:
- A descriptive comment at the top
- SQL statements to modify the schema
- No destructive operations that could cause data loss (unless intentional)

## Best Practices

1. **Always test migrations** in a development environment first
2. **Keep migrations small** and focused on a single change
3. **Write reversible migrations** when possible
4. **Use transactions** to ensure atomicity of changes
5. **Test both forward and backward** compatibility

## Directory Structure

```
db/
├── migrate.js              # Main migration runner
├── migrate-cli.js          # Command line interface
├── MIGRATION_SYSTEM.md     # Detailed system documentation
├── migrations/             # Versioned migration files
│   ├── 001_initial_schema.sql
│   ├── 002_add_active_to_users.sql
│   └── ...
└── run_migration.sh        # Legacy migration script (still available)
```

## Environment Configuration

The migration system uses the same `DATABASE_URL` environment variable as the application:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## Rollback Strategy

Currently, the system doesn't support automatic rollbacks. For rollbacks, you'll need to:
1. Create a reverse migration file manually
2. Apply it using the migration system

## Security Considerations

- Migration files are stored in version control and reviewed as part of code review
- Migrations run with the same database permissions as the application
- No sensitive data should be stored in migration files
- Environment-specific configuration is handled through environment variables

## Troubleshooting

### Migration fails
- Check the database connection
- Verify the DATABASE_URL is correct
- Review the migration file for SQL syntax errors
- Check if the migration has already been applied

### Migration runs too slowly
- Consider breaking large migrations into smaller ones
- Optimize the SQL statements in the migration
- Run migrations during maintenance windows

### Duplicate migration errors
- Verify the migration numbering sequence
- Check that migration names are unique
- Ensure no two developers created migrations with the same number