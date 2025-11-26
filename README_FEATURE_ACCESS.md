# Feature Access Control System

This document explains the feature access control system in the T-Office application.

## Overview

The feature access control system allows administrators to grant or revoke access to specific pages and features for different departments. This provides fine-grained control over who can access which parts of the application.

All access control is managed through a single unified system using the `department_page_access` table, which stores both page access and feature access permissions.

## How It Works

### Backend Implementation

The system uses a single table in the database to store all access information:

#### Page and Feature Access Table
```sql
CREATE TABLE department_page_access (
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    page_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (department_id, page_name)
);
```

Pages and features are stored in the same table. Features are identified by paths like `chat/moderator`, `chat/pause`, etc.

### Default Access

By default, all departments have access to common pages:
- dashboard
- profile
- chat
- clock
- resources/wiki
- settings
- approvals

The Admin department additionally has access to all admin pages and features:
- admin/features
- admin/departments
- admin/db
- approvals
- chat/moderator
- chat/pause
- chat/summarizer
- chat/clear
- clock/manage-locations
- clock/delete-locations
- resources/wiki/create
- resources/wiki/create-topic

The HR department has access to HR pages and features:
- hr/onboarding
- hr/onboarding/create-user
- hr/onboarding/schedule-inductions
- hr/queries
- hr/queries/send-query
- hr/users
- hr/users/view-details
- chat/moderator
- chat/pause
- chat/summarizer
- chat/clear
- clock/manage-locations
- clock/delete-locations
- resources/wiki/create
- resources/wiki/create-topic

## Managing Access

### 1. Run the Migration

First, run the feature access migration to create the necessary database tables:

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
4. Check/uncheck pages or features to grant/revoke access
5. Click "Save Changes"

The navigation will update immediately to reflect the changes.

Note: 
- Chat features (moderator, pause, summarizer, clear) are dependent on the main chat page access. When the main chat page is disabled, all chat sub-features are automatically disabled and non-selectable. When the main chat page is enabled, the chat sub-features become selectable.
- Clock features (manage-locations, delete-locations) are dependent on the main clock page access.
- HR features are dependent on their respective HR page access (onboarding, queries, users).
- Wiki features (create-topic) are dependent on the main wiki page access.
- Inventory features are dependent on their respective inventory page access (inbound, store, outbound, products).

## Adding New Pages or Features to Access Control

To add a new page or feature to the access control system:

1. Add the page/feature to the `pages` array in `/backend/routes/admin.js` in the `/pages` endpoint
2. Wrap the page component with `AccessControlWrapper` in the page's `page.tsx` file
3. Add the page/feature to the navigation menu in `/components/access-controlled-nav.tsx` if it should appear in the sidebar
4. For features, implement access checks in the relevant frontend components using `hasPageAccess`

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

## API Endpoints

The following API endpoints are available in `/backend/routes/admin.js`:

### Page and Feature Access Endpoints
- `GET /api/admin/pages` - Get all available pages and features
- `GET /api/admin/departments/:departmentId/pages` - Get pages and features assigned to a department
- `POST /api/admin/departments/:departmentId/pages` - Update pages and features assigned to a department

## Utility Functions

The following utility functions in `/lib/page-access.ts` can be used throughout the application:

- `hasPageAccess(user, pagePath)` - Check if user has access to a specific page or feature
- `clearPageAccessCache()` - Clear the access cache
- `checkCurrentPageAccess(user, currentPagePath)` - Check if user has access to current page

## Feature Dependencies

### Chat Features
The following chat features can be controlled per department:
- **chat/moderator** - Allows users to send messages as a moderator
- **chat/pause** - Allows users to pause/resume the chat for all users
- **chat/summarizer** - Allows users to generate summaries of chat conversations
- **chat/clear** - Allows users to clear all messages from the chat

Important: Chat features are dependent on the main chat page access. When the main chat page (`chat`) is disabled for a department, all chat sub-features are automatically inaccessible. When the main chat page is enabled, individual chat features can be selectively enabled or disabled.

### Clock Features
The following clock features can be controlled per department:
- **clock/manage-locations** - Allows users to manage their stored locations
- **clock/delete-locations** - Allows users to delete stored locations

Important: Clock features are dependent on the main clock page access. When the main clock page (`clock`) is disabled for a department, all clock sub-features are automatically inaccessible. When the main clock page is enabled, individual clock features can be selectively enabled or disabled.

### HR Features
The following HR features can be controlled per department:

#### HR Onboarding Features
- **hr/onboarding/create-user** - Allows users to create new users in the onboarding section
- **hr/onboarding/schedule-inductions** - Allows users to schedule inductions in the onboarding section

Important: HR Onboarding features are dependent on the main HR Onboarding page access. When the main HR Onboarding page (`hr/onboarding`) is disabled for a department, all related sub-features are automatically inaccessible. When the main HR Onboarding page is enabled, individual HR Onboarding features can be selectively enabled or disabled.

#### HR Queries Features
- **hr/queries/send-query** - Allows users to send queries in the queries section

Important: HR Queries features are dependent on the main HR Queries page access. When the main HR Queries page (`hr/queries`) is disabled for a department, all related sub-features are automatically inaccessible. When the main HR Queries page is enabled, individual HR Queries features can be selectively enabled or disabled.

#### HR Users Features
- **hr/users/view-details** - Allows users to view user details in the users management section

Important: HR Users features are dependent on the main HR Users page access. When the main HR Users page (`hr/users`) is disabled for a department, all related sub-features are automatically inaccessible. When the main HR Users page is enabled, individual HR Users features can be selectively enabled or disabled.

### Wiki Features
The following wiki features can be controlled per department:
- **resources/wiki/create** - Allows users to access the create wiki page
- **resources/wiki/create-topic** - Allows users to create new topics in the wiki

Important: Wiki features are dependent on the main wiki page access. When the main wiki page (`resources/wiki`) is disabled for a department, all wiki sub-features are automatically inaccessible. When the main wiki page is enabled, individual wiki features can be selectively enabled or disabled. Additionally, the "Create Topic" feature (`resources/wiki/create-topic`) is dependent on the "Create Wiki" page access (`resources/wiki/create`).

### Inventory Features
The following inventory features can be controlled per department:

#### Inbound Features
- **inventory/inbound/export-csv** - Allows users to export inbound transactions to CSV
- **inventory/inbound/add-transaction** - Allows users to add new inbound transactions
- **inventory/inbound/edit-transaction** - Allows users to edit existing inbound transactions
- **inventory/inbound/delete-transaction** - Allows users to delete inbound transactions
- **inventory/inbound/mark-as-stored** - Allows users to mark inbound transactions as stored

Important: Inventory Inbound features are dependent on the main Inbound page access. When the main Inbound page (`inventory/inbound`) is disabled for a department, all related sub-features are automatically inaccessible. When the main Inbound page is enabled, individual Inbound features can be selectively enabled or disabled.

#### Store Features
- **inventory/store/export-csv** - Allows users to export stored transactions to CSV
- **inventory/store/create-outbound** - Allows users to create outbound transactions from stored items

Important: Inventory Store features are dependent on the main Store page access. When the main Store page (`inventory/store`) is disabled for a department, all related sub-features are automatically inaccessible. When the main Store page is enabled, individual Store features can be selectively enabled or disabled.

#### Outbound Features
- **inventory/outbound/export-csv** - Allows users to export outbound transactions to CSV
- **inventory/outbound/mark-as-dispatched** - Allows users to mark outbound transactions as dispatched
- **inventory/outbound/mark-as-delivered** - Allows users to mark outbound transactions as delivered
- **inventory/outbound/delete-transaction** - Allows users to delete outbound transactions

Important: Inventory Outbound features are dependent on the main Outbound page access. When the main Outbound page (`inventory/outbound`) is disabled for a department, all related sub-features are automatically inaccessible. When the main Outbound page is enabled, individual Outbound features can be selectively enabled or disabled.

#### Products Features
- **inventory/products/import-csv** - Allows users to import products from CSV files
- **inventory/products/import-all-data** - Allows users to import comprehensive data including products and their states
- **inventory/products/export-csv** - Allows users to export all products to CSV
- **inventory/products/add-product** - Allows users to add new products
- **inventory/products/view-details** - Allows users to view product details
- **inventory/products/edit-product** - Allows users to edit existing products
- **inventory/products/delete-product** - Allows users to delete products

Important: Inventory Products features are dependent on the main Products page access. When the main Products page (`inventory/products`) is disabled for a department, all related sub-features are automatically inaccessible. When the main Products page is enabled, individual Products features can be selectively enabled or disabled.

When a department does not have access to a feature, the corresponding UI elements are hidden from the interface.