# T-Office System Consolidated Documentation

## Overview
T-Office is a full-stack internal office management platform designed to streamline administrative, HR, inventory, and collaboration workflows within an organization.

## System Components

### 1. Authentication
- Login and signup flows
- JWT-based authentication
- Role-based access control
- Preset user system for initial admin accounts

### 2. Dashboard
- Central hub for user activities
- Activity tracking
- Quick access to all modules

### 3. HR Management
- Employee onboarding
- User management
- HR query handling
- Induction tracking

### 4. Admin Panel
- Approval workflows
- Database management
- User administration

### 5. Inventory System
- Product management
- Inbound transaction tracking
- Stored inventory management
- Outbound shipment tracking
- Serial number tracking
- CSV import functionality for products and comprehensive data
- Export functionality for transactions (Inbound, Outbound, Stored, Products)

### 6. Wiki & Resources
- Department-specific documentation
- Dynamic routing
- Knowledge base with quizzes

### 7. Chat Module
- Internal team communication
- Message history
- Moderation features
- Anonymous chat functionality
- Chat summaries

### 8. Clock & Profile
- Time tracking
- Geofencing support
- Personal profile management

### 9. Offline Support
- PWA-enabled fallback page
- Service worker implementation

## Database Migration

The database migration system has been consolidated for better maintainability and no longer requires PostgreSQL command-line tools:

### Migration Files
- `drop_migration.sql`: Drops all existing database objects in the correct order
- `create_migration.sql`: Creates all tables, indexes, triggers, and populates initial data

### Migration Process
```
./db/run_migration.sh
```

### Schema Organization
All database schema definitions have been consolidated into the main migration files:
- User management tables
- Chat system tables (including chat summaries)
- HR features tables (including updated inductions schema)
- Wiki system tables
- Location/geofencing tables
- Department configuration tables
- Compliance tables
- Inventory system tables (products, inbound transactions, outbound transactions)

For detailed information about the migration process, see [DB_MIGRATION_GUIDE.md](DB_MIGRATION_GUIDE.md).

## API Endpoints

### Authentication
- POST `/api/login` - User login (supports preset users)
- POST `/api/signup` - User registration

### Inventory
- GET `/api/inventory/products` - List all products
- GET `/api/inventory/products/:id` - Get specific product
- POST `/api/inventory/products` - Create new product
- PUT `/api/inventory/products/:id` - Update product
- DELETE `/api/inventory/products/:id` - Delete product
- POST `/api/inventory/products/import` - Import products from CSV
- POST `/api/inventory/comprehensive-import` - Import all inventory data from CSV
- GET `/api/inventory/inbound` - List inbound transactions
- GET `/api/inventory/inbound/store` - List stored transactions
- GET `/api/inventory/outbound` - List outbound transactions
- GET `/api/inventory/export/:type` - Export inventory data (products, inbound, outbound, stored)

### HR
- GET `/api/hr/users` - List all users
- GET `/api/hr/users/:id` - Get specific user
- PUT `/api/hr/users/:id` - Update user
- DELETE `/api/hr/users/:id` - Delete user
- GET `/api/hr/onboarding` - Get onboarding status
- POST `/api/hr/onboarding` - Update onboarding status
- GET `/api/hr/queries` - List HR queries
- POST `/api/hr/queries` - Create HR query
- PUT `/api/hr/queries/:id` - Update HR query

### Profile
- GET `/api/profile` - Get user profile
- PUT `/api/profile` - Update user profile
- POST `/api/profile/upload-cv` - Upload CV
- POST `/api/profile/upload-portfolio` - Upload portfolio
- POST `/api/profile/upload-contract` - Upload contract
- POST `/api/profile/upload-profile-picture` - Upload profile picture

### Wiki
- GET `/api/wiki/:department` - List wiki topics for department
- GET `/api/wiki/:department/:topic` - Get specific wiki topic
- POST `/api/wiki` - Create wiki topic
- PUT `/api/wiki/:id` - Update wiki topic
- DELETE `/api/wiki/:id` - Delete wiki topic

## CSV Import Functionality

### Simple Product Import
Allows importing products only with basic information:
- Name
- Part Number
- Product Type

### Comprehensive Data Import
Allows importing products along with inbound transactions, stored transactions, and outbound transactions all at once.

#### Supported Record Types
1. **Product Records** - Basic product information
2. **Inbound Records** - Incoming inventory transactions
3. **Stored Records** - Inventory that has arrived and is stored
4. **Outbound Records** - Inventory that has been shipped out

#### Processing Order
1. Products (creates or updates products)
2. Inbound transactions (creates new incoming transactions)
3. Stored transactions (creates stored transactions)
4. Outbound transactions (creates outbound shipments)

## Export Functionality

### Overview
The inventory system now supports exporting transaction data in CSV format for all major categories:
- Products
- Inbound transactions
- Stored transactions
- Outbound transactions

### How to Use
1. Navigate to the Inventory section in the main navigation menu
2. Select the data type you want to export (Products, Inbound, Outbound, or Store)
3. Click the "Export to CSV" button
4. The system will generate and download a CSV file with the requested data

### Exported Data Format
Each export contains relevant information for the selected data type:
- **Products**: Name, Part Number, Product Type, Created/Updated timestamps
- **Inbound**: Product information, quantity, provider, expected arrival dates, serial numbers
- **Stored**: Product information, quantity, provider, arrival date, serial numbers
- **Outbound**: Product information, quantity, receiver details, dispatch/delivery dates, serial numbers

## Technology Stack

### Frontend
- Next.js 13.5.1 with App Router
- TypeScript
- Tailwind CSS
- Radix UI components
- React Hook Form + Zod

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- CSV processing libraries (csv-parser)

### DevOps
- Docker containerization
- Concurrent development server
- PWA support

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Access application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

## Deployment

Build and run production version:
```bash
npm run build
npm start
```

Or using Docker:
```bash
docker build -t toffice .
docker run -p 3000:3000 toffice
```

## Best Practices

### Data Management
1. Always backup your data before importing
2. Test with a small sample file first
3. Ensure part numbers are unique identifiers
4. Use consistent naming conventions
5. Remove any empty rows from your CSV files

### Security
1. Use strong passwords for admin accounts
2. Regularly update JWT secrets
3. Monitor user activities through the activity log
4. Implement proper role-based access controls

### Maintenance
1. Regularly run database migrations when updating
2. Monitor system logs for errors
3. Keep dependencies up to date
4. Perform regular database backups