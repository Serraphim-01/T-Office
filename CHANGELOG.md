# Changelog

All notable changes to the T-Office project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Provider-based organization for Inventory Products page
- New `providers` table in the database to store provider information
- `provider_id` foreign key column in `inbound_transactions` table
- API endpoints to fetch providers and products grouped by providers
- UI redesign of Products page with collapsible provider sections
- Providers table and related indexes to centralized migration files

### Changed
- Updated comprehensive import functionality to use provider IDs instead of provider names
- Modified inbound transaction routes to use provider IDs
- Updated database queries to join with the new providers table
- Fixed TypeScript error in Products page by ensuring `hasPageAccess` receives user ID as string
- Fixed department renaming to update all associated users in real-time
- Department renaming now updates both department records and all users with that department
- Updated create and drop migration files to include providers table

### Migration
- Created migration script to set up providers table and migrate existing data
- Added indexes for better performance on provider-related queries
- Centralized providers table definition in main migration files

## [0.2.0] - 2025-12-01

### Added
- Provider-based organization for Inventory Products page
- New `providers` table in the database to store provider information
- `provider_id` foreign key column in `inbound_transactions` table
- API endpoints to fetch providers and products grouped by providers
- UI redesign of Products page with collapsible provider sections
- Providers table and related indexes to centralized migration files

### Changed
- Updated comprehensive import functionality to use provider IDs instead of provider names
- Modified inbound transaction routes to use provider IDs
- Updated database queries to join with the new providers table
- Fixed TypeScript error in Products page by ensuring `hasPageAccess` receives user ID as string
- Updated project version to 0.2.0
- Fixed department renaming to update all associated users in real-time
- Department renaming now updates both department records and all users with that department
- Updated create and drop migration files to include providers table

### Migration
- Created migration script to set up providers table and migrate existing data
- Added indexes for better performance on provider-related queries
- Centralized providers table definition in main migration files

## [0.1.0] - 2025-12-01

### Added
- Initial release of T-Office platform
- Authentication system with JWT
- Dashboard with activity overview
- HR Management (onboarding, queries, user management)
- Admin Panel (approvals, database oversight, feature access control)
- Full CRUD Inventory System (inbound, outbound, products, stores)
- Wiki & Resources with dynamic routing per department
- Internal Chat Module
- Clock-in/out and location tracking
- Offline PWA support
- Fine-grained Role-Based Access Control (RBAC)