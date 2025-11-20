# T-Office System Documentation

## Overview
T-Office is a full-stack internal office management platform designed to streamline administrative, HR, inventory, and collaboration workflows within an organization.

## System Components

### 1. Authentication
- Login and signup flows
- JWT-based authentication
- Role-based access control

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

### 6. Wiki & Resources
- Department-specific documentation
- Dynamic routing
- Knowledge base with quizzes

### 7. Chat Module
- Internal team communication
- Message history
- Moderation features

### 8. Clock & Profile
- Time tracking
- Geofencing support
- Personal profile management

### 9. Offline Support
- PWA-enabled fallback page
- Service worker implementation

## Database Migration

The database migration system has been consolidated for better maintainability:

### Migration Files
- `drop_migration.sql`: Drops all existing database objects in the correct order
- `create_migration.sql`: Creates all tables, indexes, triggers, and populates initial data

### Migration Process
```bash
./run_migration.sh
```

### Schema Organization
All database schema definitions have been consolidated into the main migration files:
- User management tables
- Chat system tables
- HR features tables
- Wiki system tables
- Location/geofencing tables
- Department configuration tables
- Compliance tables
- Inventory system tables (products, inbound transactions, outbound transactions)

## API Endpoints

### Authentication
- POST `/api/login` - User login
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