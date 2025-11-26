# Feature Access Control System

This document explains how to use the newly implemented feature access control system in the T-Office application.

## Overview

The feature access control system allows administrators to control which pages each department can access. This ensures that users only see and can navigate to pages that are relevant to their role.

## Key Features

1. **Department-Based Access Control**: Each department can be granted access to specific pages
2. **Admin Department Special Handling**: Admin department automatically has access to all admin pages
3. **Direct URL Protection**: Users cannot access pages directly via URL if they don't have permission
4. **Real-time Navigation Updates**: Navigation updates immediately when permissions are changed
5. **Access Denied Page**: Users see a friendly message when they don't have access to a page

## How It Works

### Backend Implementation

The system uses a `department_page_access` table in the database to store which pages each department can access:

```sql
CREATE TABLE department_page_access (
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    page_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (department_id, page_name)
);
```

### Frontend Implementation

1. **Access Control Wrapper**: All protected pages are wrapped with the `AccessControlWrapper` component
2. **Navigation Filtering**: The `AccessControlledNav` component only shows pages the user has access to
3. **Real-time Updates**: Navigation refreshes automatically when permissions change

## Setting Up Access Control

### 1. Run Database Migration

First, ensure the Admin department has access to all admin pages:

```bash
npm run migrate:admin-access
```

### 2. Verify Admin Access

Check that the Admin department has the correct access:

```bash
npm run test:admin-access
```

### 3. Configure Department Access

1. Log in as an Admin user
2. Navigate to the Features page (`/admin/features`)
3. Select a department from the dropdown
4. Check/uncheck pages to grant/revoke access
5. Click "Save Changes"

The navigation will update immediately to reflect the changes.

## Adding New Pages to Access Control

To add a new page to the access control system:

1. Add the page to the `pages` array in `/backend/routes/admin.js` in the `/pages` endpoint
2. Wrap the page component with `AccessControlWrapper` in the page's `page.tsx` file
3. Add the page to the navigation menu in `/components/access-controlled-nav.tsx` if it should appear in the sidebar

## Special Cases

### Admin Department

The Admin department automatically has access to all pages that start with `admin/`. This is handled in the `hasPageAccess` function in `/lib/page-access.ts`.

### Direct URL Access

If a user tries to access a page directly via URL that they don't have permission for, they will see an "Access Denied" message with a button to return to the dashboard.

## Testing Access Control

### Verify Updates

Run the verification script to ensure all components are correctly implemented:

```bash
npm run verify:updates
```

### Manual Testing

1. Log in as a user from a department with limited access
2. Verify they only see pages they have access to in the navigation
3. Try to access a page directly via URL that they don't have access to
4. Verify they see the access denied message
5. Log in as an Admin user
6. Go to the Features page and modify access for a department
7. Verify the navigation updates immediately
8. Log in as a user from that department and verify they can now access the newly granted pages

## Troubleshooting

### Navigation Not Updating

If navigation doesn't update after changing permissions:

1. Ensure the `navigation-refresh` event is being dispatched in the Features page
2. Check that the `AccessControlledNav` component is listening for this event
3. Verify there are no JavaScript errors in the browser console

### Access Denied for Admin User

If an Admin user is seeing access denied messages:

1. Run the admin access migration: `npm run migrate:admin-access`
2. Verify the Admin department has the correct access: `npm run test:admin-access`
3. Check that the special case handling for Admin department is working in `/lib/page-access.ts`

### Page Counts Not Updating

If department page counts are not updating in the Features page:

1. Ensure you're using the `/departments` endpoint which includes page counts
2. Verify that the page count is being updated in the UI after saving changes
3. Check that the cache is being cleared after saving changes

## Future Enhancements

1. **WebSocket Integration**: Use WebSockets for real-time navigation updates across all users
2. **Audit Logging**: Log all access control changes for security auditing
3. **Bulk Operations**: Add support for assigning/unassigning multiple pages at once
4. **Permission Templates**: Create templates for common department configurations

## Route Structure Changes

As part of the latest updates, the routing structure has been simplified:

- **Approvals**: Now accessible at `/approvals` instead of `/admin/approvals`
- **HR**: Remains accessible at `/hr` (not nested under admin)
- **Admin**: Contains only administrative functions like Database, Departments, and Features

This change makes the navigation more intuitive and aligns with the principle that HR and Approvals should be standalone top-level items rather than nested under the Admin section.