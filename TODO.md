# Task: Add Inventory and Resources Features to Admin Feature Management

## Overview
Add Inventory and Resources features to the admin features page so they can be toggled on and off for certain departments and roles, just like other features.

## Steps
- [x] Update featureHierarchy in app/admin/features/page.tsx to include Inventory and Resources
- [x] Update default Admin features in app/admin/features/page.tsx to include Inventory and Resources
- [x] Update dashboard-layout.tsx to gate Inventory and Resources menus based on feature access
- [x] Update wiki page to use feature access instead of department check for create button
- [x] Fix delete functionality to respect feature permissions
- [x] Ensure Admin doesn't have default access to Resources create/delete operations
- [x] Implement inline editing for wiki topics
- [ ] Test the feature toggling functionality

## Files to Edit
- app/admin/features/page.tsx
- components/dashboard-layout.tsx
- app/resources/wiki/page.tsx
