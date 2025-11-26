# Role-Based Access Control Implementation Summary

This document summarizes the implementation of role-based access control (RBAC) in the T-Office application.

## Overview

The implementation adds a role-based access control system that extends the existing department-based access control. Each department can now have multiple roles, and users can be assigned specific roles within their department. Roles inherit access from the department but can have specific feature access configured.

## Database Schema Changes

### New Tables

1. **roles** - Stores department roles
   - `id` (SERIAL PRIMARY KEY)
   - `department_id` (INTEGER REFERENCES departments)
   - `name` (VARCHAR(255))
   - `is_default` (BOOLEAN)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. **role_page_access** - Stores role-specific feature access
   - `role_id` (INTEGER REFERENCES roles)
   - `page_name` (VARCHAR(255))
   - `created_at` (TIMESTAMP)

### Modified Tables

1. **users** - Added role assignment
   - `role_id` (INTEGER REFERENCES roles)

## Migration Files

1. **db/create_migration.sql** - Main database creation migration (now includes roles tables)
2. **db/drop_migration.sql** - Main database drop migration (now includes roles tables)

## Backend API Changes

### New Endpoints

1. `GET /api/admin/departments/:departmentId/roles` - Get roles for a department
2. `POST /api/admin/departments/:departmentId/roles` - Create a new role for a department
3. `GET /api/admin/roles/:roleId/pages` - Get pages assigned to a role
4. `POST /api/admin/roles/:roleId/pages` - Update pages assigned to a role

### Modified Endpoints

1. `POST /api/signup` - Added role parameter to signup
2. `POST /api/login` - Returns role information in user data
3. `GET /api/profile` - Returns role information in user data

## Frontend Changes

### Modified Components

1. **app/admin/departments/page.tsx** - Added role management UI
2. **app/admin/features/page.tsx** - Updated to work with roles
3. **app/signup/page.tsx** - Added role selection to signup form

### New Components

1. **lib/page-access.ts** - Utility functions for checking page access
2. **lib/departments.ts** - Added fetchRoles function

## Key Features

1. **Default Roles**: Every department automatically gets a "default" role
2. **Role Management**: Admins can create custom roles for each department
3. **Feature Access Control**: Both department-level and role-level feature access
4. **User Assignment**: Users can be assigned specific roles within their department
5. **Backward Compatibility**: Existing department-level access still works
6. **Enhanced Security**: Role-based access provides finer-grained control

## Implementation Details

### How It Works

1. When a user signs up, they select both a department and a role within that department
2. Each role can have specific feature access configured
3. When checking access, the system first checks role-specific permissions, falling back to department-level permissions if no role is assigned
4. The access control wrapper ensures users can only access pages/features they have permission for

### Data Migration

The migration script:
1. Creates the new roles tables
2. Adds the role_id column to the users table
3. Creates default roles for all existing departments
4. Updates existing users to have the default role of their department
5. Copies existing department page access to default roles
6. Ensures all default roles have access to common pages

## Testing

The implementation includes test scripts to verify:
1. Departments are correctly set up
2. Roles are created for each department
3. Role page access is properly configured
4. Users are assigned to roles
5. Default roles exist for all departments

## Files Created

- `lib/page-access.ts`
- `ROLES_IMPLEMENTATION_SUMMARY.md`

## Files Modified

- `db/create_migration.sql`
- `db/drop_migration.sql`
- `backend/routes/admin.js`
- `backend/routes/auth.js`
- `backend/index.js`
- `app/admin/departments/page.tsx`
- `app/admin/features/page.tsx`
- `app/signup/page.tsx`
- `lib/departments.ts`
- `package.json`