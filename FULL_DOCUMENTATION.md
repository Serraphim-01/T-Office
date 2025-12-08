# T-Office - Internal Office Management Platform

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Components](#system-components)
3. [Architecture Diagram](#architecture-diagram)
4. [Technology Stack](#technology-stack)
5. [Database Migration](#database-migration)
6. [Feature Access Control System](#feature-access-control-system)
7. [Application Features](#application-features)
8. [API Endpoints](#api-endpoints)
9. [Development Setup](#development-setup)
10. [Deployment](#deployment)
11. [Best Practices](#best-practices)

---

## Project Overview

T-Office is a full-stack internal office management platform designed to streamline administrative, HR, inventory, and collaboration workflows within an organization.

### Features

- **Authentication**: Login and signup flows
- **Dashboard**: Central hub for user activities
- **HR Management**: Onboarding, user management, query handling
- **Admin Panel**: Approval workflows, database access, HR oversight
- **Inventory System**: Full CRUD support for inbound, outbound, products, and stores
- **Wiki & Resources**: Department-specific documentation with dynamic routing
- **Chat Module**: Internal team communication
- **Clock & Profile**: Time tracking and personal profile settings
- **Offline Support**: PWA-enabled fallback page
- **Role-Based Access Control**: Fine-grained permission system with roles and departments

---

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

---

## Architecture Diagram

### High-Level Architecture

```
graph TD
    A[Client Browser] --> B[Next.js Frontend]
    B --> C[Express Backend API]
    C --> D[(PostgreSQL Database)]
    
    subgraph Frontend
        B
    end
    
    subgraph Backend
        C
    end
    
    subgraph Data
        D
    end
```

### Directory Structure

```
T-Office/
├── app/                     # Next.js App Router pages and layouts
│   ├── login/               # Authentication pages
│   ├── signup/
│   ├── dashboard/           # Main dashboard page
│   ├── hr/                  # HR management section
│   ├── admin/               # Admin panel
│   ├── inventory/           # Inventory management
│   ├── resources/wiki/      # Knowledge base/wiki
│   ├── chat/                # Chat module
│   ├── profile/             # User profile settings
│   ├── clock/               # Time tracking
│   ├── settings/            # Application settings
│   ├── about/               # About page
│   ├── help/                # Help documentation
│   ├── offline/             # Offline support page
│   ├── test/                # Testing pages
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Home page
├── backend/                 # Express backend server
│   ├── routes/              # API route handlers
│   ├── utils/               # Helper functions
│   ├── index.js             # Server entry point
│   └── package.json         # Backend dependencies
├── components/              # Reusable UI components
│   ├── ui/                  # Atomic design system components
│   ├── navbar.tsx           # Navigation component
│   ├── footer.tsx           # Footer component
│   └── dashboard-layout.tsx # Dashboard layout
├── lib/                     # Shared logic and utilities
│   ├── auth-context.tsx     # Authentication context
│   └── ui-context.tsx       # UI context provider
├── public/                  # Static assets
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── db/                      # Database migration files
├── hooks/                   # Custom React hooks
└── package.json             # Root dependencies and scripts
```

### Frontend Architecture

The frontend is built with Next.js 13.5.1 using the App Router pattern. It follows a component-based architecture with a clear separation of concerns.

#### Key Components

```
graph TD
    A[Root Layout] --> B[Navbar]
    A --> C[Page Content]
    A --> D[Footer]
    
    C --> E[Dashboard]
    C --> F[Authentication Pages]
    C --> G[HR Management]
    C --> H[Admin Panel]
    C --> I[Inventory System]
    C --> J[Wiki/Resources]
    C --> K[Chat Module]
    C --> L[Profile Settings]
    
    subgraph Layout Components
        A
        B
        D
    end
    
    subgraph Page Components
        C
        E
        F
        G
        H
        I
        J
        K
        L
    end
```

#### Authentication Flow

```
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    
    U->>F: Navigate to /login
    F->>U: Display login form
    U->>F: Submit credentials
    F->>B: POST /api/login
    B->>B: Validate credentials
    B->>B: Generate JWT token
    B->>F: Return token and user data
    F->>U: Store token, redirect to dashboard
```

### Backend Architecture

The backend is a standalone Node.js + Express server that exposes RESTful endpoints for the frontend to consume.

#### API Structure

```
graph TD
    A[Express Server] --> B[Middleware]
    A --> C[Route Handlers]
    
    B --> D[CORS]
    B --> E[Body Parser]
    B --> F[Auth Middleware]
    
    C --> G[/api/auth]
    C --> H[/api/hr]
    C --> I[/api/admin]
    C --> J[/api/inventory]
    C --> K[/api/chat]
    C --> L[/api/profile]
    C --> M[/api/wiki]
    
    subgraph Middleware
        D
        E
        F
    end
    
    subgraph Routes
        G
        H
        I
        J
        K
        L
        M
    end
```

#### Database Schema

```
erDiagram
    USERS ||--o{ HR_RECORDS : has
    USERS ||--o{ INVENTORY_ITEMS : manages
    USERS ||--o{ CHAT_MESSAGES : sends
    USERS ||--o{ WIKI_PAGES : creates
    
    USERS {
        int id PK
        string full_name
        string email
        string department
        string password_hash
    }
    
    HR_RECORDS {
        int id PK
        int user_id FK
        string position
        date start_date
        string status
    }
    
    INVENTORY_ITEMS {
        int id PK
        string name
        string description
        int quantity
        string location
    }
    
    CHAT_MESSAGES {
        int id PK
        int sender_id FK
        string content
        timestamp sent_at
    }
    
    WIKI_PAGES {
        int id PK
        string title
        string content
        string department
        int author_id FK
    }
```

### Data Flow

```
flowchart LR
    A[User Action] --> B[Frontend Component]
    B --> C[API Request]
    C --> D[Backend Route Handler]
    D --> E[Database Query]
    E --> F[Data Processing]
    F --> G[Response]
    G --> H[State Update]
    H --> I[UI Render]
    
    subgraph Client Side
        A
        B
        H
        I
    end
    
    subgraph Server Side
        C
        D
        E
        F
        G
    end
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 13.5.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.3.3
- **UI Components**: Radix UI primitives
- **State Management**: React Context API
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React
- **Notifications**: Sonner

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: PostgreSQL (pg driver)
- **Authentication**: JWT
- **Password Security**: bcrypt
- **Environment Management**: dotenv

### DevOps & Tooling
- **Build Tool**: npm scripts
- **Development Orchestration**: concurrently
- **Containerization**: Docker
- **Linting**: ESLint + TypeScript

---

## Database Migration

### Overview

The database migrations have been consolidated for better maintainability and no longer requires PostgreSQL command-line tools.

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

### Database Migration System

This directory contains all the necessary files for managing the database schema for the T-Office application.

#### Consolidated Migration Files

As part of our effort to simplify the database migration process, we have consolidated all SQL migration scripts into two main files:

##### `create_migration.sql`
This file contains all the necessary SQL statements to create the complete database schema including:
- All table definitions
- Indexes
- Triggers
- Initial data population
- All department page access configurations

##### `drop_migration.sql`
This file contains all the necessary SQL statements to drop the complete database schema in the correct order to avoid dependency issues.

#### Enhanced SQL Parser

The `run_sql.js` script has been enhanced to properly handle PostgreSQL dollar-quoted strings (used in function definitions). This fixes issues with executing function definitions that contain semicolons within dollar-quoted blocks.

#### Migration Execution

##### Using the Node.js Script (Recommended)
``bash
# From the project root directory
node db/run_sql.js db/create_migration.sql
```

##### Using the Shell Script
```
# From the project root directory
./db/run_migration.sh
```

#### Backup Files

All previous migration files have been moved to the `backup` directory for reference. These files are no longer used in the current migration process but are kept for historical purposes.

#### JavaScript Migration Scripts

The JavaScript migration scripts (`run_admin_access_migration.js` and `run_inventory_features_migration.js`) have been updated to reflect that their functionality is now included in the main `create_migration.sql` file.

---

## Feature Access Control System

### Overview

The feature access control system allows administrators to grant or revoke access to specific pages and features for different departments. This provides fine-grained control over who can access which parts of the application.

All access control is managed through a single unified system using the `department_page_access` table, which stores both page access and feature access permissions.

### How It Works

#### Backend Implementation

The system uses a single table in the database to store all access information:

##### Page and Feature Access Table
```
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

### Managing Access

#### 1. Run the Migration

First, run the feature access migration to create the necessary database tables:

```bash
npm run migrate:admin-access
```

#### 2. Verify Admin Access

Check that the Admin department has the correct access:

```bash
npm run test:admin-access
```

#### 3. Configure Department Access

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

### Adding New Pages or Features to Access Control

To add a new page or feature to the access control system:

1. Add the page/feature to the `pages` array in `/backend/routes/admin.js` in the `/pages` endpoint
2. Wrap the page component with `AccessControlWrapper` in the page's `page.tsx` file
3. Add the page/feature to the navigation menu in `/components/access-controlled-nav.tsx` if it should appear in the sidebar
4. For features, implement access checks in the relevant frontend components using `hasPageAccess`

### Special Cases

#### Admin Department

The Admin department automatically has access to all pages that start with `admin/`. This is handled in the `hasPageAccess` function in `/lib/page-access.ts`.

#### Direct URL Access

If a user tries to access a page directly via URL that they don't have permission for, they will see an "Access Denied" message with a button to return to the dashboard.

### Testing Access Control

#### Verify Updates

Run the verification script to ensure all components are correctly implemented:

```bash
npm run verify:updates
```

### API Endpoints

The following API endpoints are available in `/backend/routes/admin.js`:

#### Page and Feature Access Endpoints
- `GET /api/admin/pages` - Get all available pages and features
- `GET /api/admin/departments/:departmentId/pages` - Get pages and features assigned to a department
- `POST /api/admin/departments/:departmentId/pages` - Update pages and features assigned to a department

### Utility Functions

The following utility functions in `/lib/page-access.ts` can be used throughout the application:

- `hasPageAccess(user, pagePath)` - Check if user has access to a specific page or feature
- `clearPageAccessCache()` - Clear the access cache
- `checkCurrentPageAccess(user, currentPagePath)` - Check if user has access to current page

### Feature Dependencies

#### Chat Features
The following chat features can be controlled per department:
- **chat/moderator** - Allows users to send messages as a moderator
- **chat/pause** - Allows users to pause/resume the chat for all users
- **chat/summarizer** - Allows users to generate summaries of chat conversations
- **chat/clear** - Allows users to clear all messages from the chat

Important: Chat features are dependent on the main chat page access. When the main chat page (`chat`) is disabled for a department, all chat sub-features are automatically inaccessible. When the main chat page is enabled, individual chat features can be selectively enabled or disabled.

#### Clock Features
The following clock features can be controlled per department:
- **clock/manage-locations** - Allows users to manage their stored locations
- **clock/delete-locations** - Allows users to delete stored locations

Important: Clock features are dependent on the main clock page access. When the main clock page (`clock`) is disabled for a department, all clock sub-features are automatically inaccessible. When the main clock page is enabled, individual clock features can be selectively enabled or disabled.

#### HR Features
The following HR features can be controlled per department:

##### HR Onboarding Features
- **hr/onboarding/create-user** - Allows users to create new users in the onboarding section
- **hr/onboarding/schedule-inductions** - Allows users to schedule inductions in the onboarding section

Important: HR Onboarding features are dependent on the main HR Onboarding page access. When the main HR Onboarding page (`hr/onboarding`) is disabled for a department, all related sub-features are automatically inaccessible. When the main HR Onboarding page is enabled, individual HR Onboarding features can be selectively enabled or disabled.

##### HR Queries Features
- **hr/queries/send-query** - Allows users to send queries in the queries section
- **hr/queries/query-replies** - Allows users to view and respond to query replies in the queries section

Important: HR Queries features are dependent on the main HR Queries page access. When the main HR Queries page (`hr/queries`) is disabled for a department, all related sub-features are automatically inaccessible. When the main HR Queries page is enabled, individual HR Queries features can be selectively enabled or disabled.

##### HR Users Features
- **hr/users/view-details** - Allows users to view user details in the users management section

Important: HR Users features are dependent on the main HR Users page access. When the main HR Users page (`hr/users`) is disabled for a department, all related sub-features are automatically inaccessible. When the main HR Users page is enabled, individual HR Users features can be selectively enabled or disabled.

##### Support Staff Features
- **hr/users/assign-support-staff** - Allows users to assign support staff to other users for offboarding scenarios
- **hr/users/view-support-staff** - Allows users to view support staff assignments for users

Important: Support Staff features are dependent on the main HR Users page access. When the main HR Users page (`hr/users`) is disabled for a department, all related sub-features are automatically inaccessible. When the main HR Users page is enabled, individual Support Staff features can be selectively enabled or disabled.

#### Wiki Features
The following wiki features can be controlled per department:
- **resources/wiki/create** - Allows users to access the create wiki page
- **resources/wiki/create-topic** - Allows users to create new topics in the wiki

Important: Wiki features are dependent on the main wiki page access. When the main wiki page (`resources/wiki`) is disabled for a department, all wiki sub-features are automatically inaccessible. When the main wiki page is enabled, individual wiki features can be selectively enabled or disabled. Additionally, the "Create Topic" feature (`resources/wiki/create-topic`) is dependent on the "Create Wiki" page access (`resources/wiki/create`).

#### Inventory Features
The following inventory features can be controlled per department:

##### Inbound Features
- **inventory/inbound/export-csv** - Allows users to export inbound transactions to CSV
- **inventory/inbound/add-transaction** - Allows users to add new inbound transactions
- **inventory/inbound/edit-transaction** - Allows users to edit existing inbound transactions
- **inventory/inbound/delete-transaction** - Allows users to delete inbound transactions
- **inventory/inbound/mark-as-stored** - Allows users to mark inbound transactions as stored

Important: Inventory Inbound features are dependent on the main Inbound page access. When the main Inbound page (`inventory/inbound`) is disabled for a department, all related sub-features are automatically inaccessible. When the main Inbound page is enabled, individual Inbound features can be selectively enabled or disabled.

##### Store Features
- **inventory/store/export-csv** - Allows users to export stored transactions to CSV
- **inventory/store/create-outbound** - Allows users to create outbound transactions from stored items

Important: Inventory Store features are dependent on the main Store page access. When the main Store page (`inventory/store`) is disabled for a department, all related sub-features are automatically inaccessible. When the main Store page is enabled, individual Store features can be selectively enabled or disabled.

##### Outbound Features
- **inventory/outbound/export-csv** - Allows users to export outbound transactions to CSV
- **inventory/outbound/mark-as-dispatched** - Allows users to mark outbound transactions as dispatched
- **inventory/outbound/mark-as-delivered** - Allows users to mark outbound transactions as delivered
- **inventory/outbound/delete-transaction** - Allows users to delete outbound transactions

Important: Inventory Outbound features are dependent on the main Outbound page access. When the main Outbound page (`inventory/outbound`) is disabled for a department, all related sub-features are automatically inaccessible. When the main Outbound page is enabled, individual Outbound features can be selectively enabled or disabled.

##### Products Features
- **inventory/products/import-csv** - Allows users to import products from CSV files
- **inventory/products/import-all-data** - Allows users to import comprehensive data including products and their states
- **inventory/products/export-csv** - Allows users to export all products to CSV
- **inventory/products/add-product** - Allows users to add new products
- **inventory/products/view-details** - Allows users to view product details
- **inventory/products/edit-product** - Allows users to edit existing products
- **inventory/products/delete-product** - Allows users to delete products

Important: Inventory Products features are dependent on the main Products page access. When the main Products page (`inventory/products`) is disabled for a department, all related sub-features are automatically inaccessible. When the main Products page is enabled, individual Products features can be selectively enabled or disabled.

When a department does not have access to a feature, the corresponding UI elements are hidden from the interface.

---

## Application Features

### Dashboard

**Path:** /dashboard

**Description:** Central hub for user activities and overview

#### Features:

- **Activity Feed**: Displays recent user activities and system events
- **Quick Stats**: Shows key metrics and statistics relevant to the user
- **Navigation Hub**: Provides quick access to frequently used sections

### Anonymous Chat

**Path:** /chat

**Description:** Internal anonymous communication system with real-time notifications

#### Features:

- **Send Chat**: User can Send and recieve messages
- **MOderator Mode**: Send Messages as a Moderator
- **Summarizer**: Summarize and generate the key points from past chat messages
- **Chat History**: View past chat messages
- **Pause Chat**: Manage chat activity stops and continuations
- **Clear Chat**: Manage entire chat history
- **Real-time Notifications**: Receive instant notifications for new messages and chat status changes
- **Notification Sound**: Audible alerts for new notifications
- **Unread Message Tracking**: Persistent tracking of read/unread messages across sessions
- **Notification Panel**: Centralized interface for viewing and managing notifications

#### Notification System

The chat module includes a comprehensive notification system that provides real-time alerts for:

1. **New Chat Messages**: 
   - Users receive notifications when new messages are posted in the chat
   - Notifications are automatically marked as read when the user visits the chat page
   - Sender does not receive notifications for their own messages

2. **Chat Status Changes**:
   - Users receive notifications when the chat is paused or resumed by a moderator
   - Notifications include information about who initiated the action
   - Visual indicators are displayed in the chat interface when paused

3. **Notification Management**:
   - Unread notifications are displayed at the top of the notification panel
   - Read notifications are displayed below unread ones
   - Users can mark individual notifications as read
   - Users can mark all notifications as read at once
   - Users can clear only read notifications to reduce clutter
   - Notification sounds play when new notifications arrive

#### Technical Implementation

**Frontend Components**:
- `app/chat/page.tsx`: Main chat interface with real-time message display
- `lib/notification-context.tsx`: Centralized notification state management
- `components/notification-panel.tsx`: Notification display and management interface

**Backend Services**:
- `backend/routes/chat.js`: Chat message handling and notification dispatch
- `backend/index.js`: WebSocket server for real-time communication
- Database tables for persistent notification storage

**Key Features**:
- Real-time WebSocket communication for instant notification delivery
- Persistent notification storage in PostgreSQL database
- Client-side caching for offline support
- Smart notification deduplication to prevent duplicate alerts
- Context-aware notifications (no notifications when user is already in chat)
- Notification merging for multiple unread messages with badge counts
- Audio alerts for new notifications

### Clock

**Path:** /clock

**Description:** Time tracking and attendance management

#### Features:

- **Clock In/Out**: Record work hours with timestamp logging
- **Location Management**: 
    - **Add Location**: Add a locationto the Stored Locations
    - **Delete Location**: Remove a location from the Stored Locations
    - **View Location**: View a list of the added locations in the Stored Locations
- **Map View**: View your current location on the map and where the office location is. 
- **Attendance History**: View past clock-in/clock-out records
- **Reports**: Generate attendance reports for managers

### Profile

**Path:** /profile

**Description:** User personal information and settings

#### Features:

- **Personal Information**: View personal details
- **View Certifications**: View certifications
- **Delete Certifications**: Remove certifications
- **View Account Status**: View account status
- **HR Queries**: View All queries from the HR.

### Settings

**Path:** /settings

**Description:** Application configuration and preferences

#### Features:

- **Theme Selection**: Choose between light/dark themes

### HR Management

**Path:** /hr

**Description:** Human resources operations and employee management

#### Features:

- **Create New Users**: Create new user accounts
- **Schedule Inductions**: Schedule Inductions for New or Existing Employees for multiple departments
- **View Inductions**: View all scheduled Inductions
- **Delete Inductions**: Delete scheduled Inductions
- **View User Details**: View All users and their details
- **Assign Support Staff**: Assign support staff to users for offboarding scenarios
- **View Support Staff Assignments**: View support staff assignments for users
- **Send Queries**: Send queries to users
- **View Query History**: View All queries to a particular user

### Admin Panel

**Path:** /admin

**Description:** Administrative controls and system management

#### Features:

- **Database Management**: View and manage database tables and records

- **User Administration**: Manage user accounts, roles, and permissions
- **System Logs**: Monitor system activities and audit trails
- **Features Documentation**: Comprehensive listing of all application features

### Approvals

**Path:** /approvals

#### Features:

- **Accept/Reject Certificate approval**: Approve or reject certificate requests

### Inventory

**Path:** /inventory

**Description:** Product and stock management system

#### Features:

- **Product Catalog**: Manage product listings and information
- **Inbound Tracking**: Track incoming inventory shipments
- **Storage Management**: Manage stored inventory and locations
- **Outbound Processing**: Process outgoing inventory requests

### Resources

**Path:** /resources

**Description:** Knowledge base and documentation

#### Features:

- **View Wiki**: Department-specific documentation and guides
- **Create Wiki**: Create new wiki pages under departments

### Authentication

**Path:** /login, /signup

**Description:** User authentication and account creation

#### Features:

- **Login**: Secure user authentication with credentials
- **Signup**: New user registration and account creation
- **Password Recovery**: Reset forgotten passwords via email

---

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

### Chat
- GET `/api/chat/messages/:userId` - Get chat messages for a user
- POST `/api/chat/messages` - Send a chat message
- GET `/api/chat/settings/:userId` - Get chat settings for a user
- PUT `/api/chat/settings/:userId` - Update chat settings for a user
- GET `/api/chat/global-pause` - Get global chat pause status
- PUT `/api/chat/global-pause` - Set global chat pause status
- GET `/api/chat/summaries/:userId` - Get chat summaries for a user
- POST `/api/chat/summaries/:userId` - Generate chat summary for a user
- POST `/api/chat/cleanup` - Clear all chat messages
- DELETE `/api/chat/messages/:id` - Delete a specific chat message

### Notifications
- GET `/api/notifications/:userId` - Get notifications for a user
- PUT `/api/notifications/:notificationId/read` - Mark a notification as read
- PUT `/api/notifications/read-all` - Mark all notifications as read
- DELETE `/api/notifications/read` - Clear read notifications
- POST `/api/set-current-page` - Set user's current page for notification context

---

## Development Setup

### Prerequisites
1. Node.js must be installed on your system
2. PostgreSQL database must be running and accessible
3. Database connection details must be configured in `backend/.env`

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```
3. Set up your PostgreSQL database
4. Configure your database connection in `backend/.env`

### Running the Application

Start both frontend and backend in development mode:
```bash
npm run dev
```

This will run:
- Next.js frontend on port 3000
- Express backend on port 4000

### Migration Files
The T-Office database schema is defined in two main files:
- `db/drop_migration.sql` - Drops all existing database objects
- `db/create_migration.sql` - Creates all tables, indexes, triggers, and populates initial data

### Running Migrations

#### Method 1: Using the run_migration.sh script (Recommended)
From the project root directory, run:
```bash
./db/run_migration.sh
```

This script will:
1. Verify that required files exist
2. Check that Node.js is available
3. Execute the drop migration to clean the database
4. Execute the create migration to set up the schema
5. Provide instructions for verifying the migration

#### Method 2: Manual execution using Node.js
From the project root directory, you can run the migrations manually:

```
# Drop existing schema
node db/run_sql.js db/drop_migration.sql

# Create new schema
node db/run_sql.js db/create_migration.sql
```

### Database Connection Configuration
The database connection is configured in `backend/.env`:
```
DATABASE_URL="postgres://postgres:password@localhost:5433/office"
```

Make sure this URL matches your PostgreSQL setup:
- `postgres` - Database username
- `password` - Database password
- `localhost` - Database host
- `5433` - Database port
- `office` - Database name

### Verifying Migration Success
After running migrations, you can verify the database is set up correctly:

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Test the database connection:
   ```bash
   curl http://localhost:4000/api/db-test
   ```

   You should receive a response like:
   ```json
   {
     "message": "DB connected ✅",
     "time": "2023-06-01T10:30:45.123Z"
   }
   ```

---

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

### Docker Support

The application includes Docker configuration for easy deployment:
```bash
docker-compose up --build
```

---

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

### Migration Best Practices
1. Always run migrations from a clean database state
2. Backup your database before running migrations in production
3. Test migrations in a development environment first
4. Review migration files before execution
5. Verify the migration worked by testing application functionality

### Adding New Migrations
When adding new database features:
1. Update `db/create_migration.sql` with new tables/columns
2. Update `db/drop_migration.sql` with corresponding drop statements
3. Run migrations to apply changes
4. Test the new functionality

## 8. Chat System

The chat system enables anonymous communication among all users in the organization. Key features include:

- **Anonymous Messaging**: User identities are hidden to encourage open communication
- **Shared Chat Room**: All users participate in a single shared chat room
- **Moderation Capabilities**: Admin and HR users can send messages as moderators
- **Pause/Resume Functionality**: Chat can be paused globally for all users except moderators
- **Message Summarization**: Automatic summarization of chat conversations
- **Toxicity Filtering**: Automated checking for inappropriate content
- **Real-time Notifications**: Instant notifications for new messages and chat status changes

### Chat Status Notifications

The system now notifies all users when the chat is paused or resumed by a moderator:

- **Pause Notifications**: Inform users that chat has been paused and only moderators can send messages
- **Resume Notifications**: Inform users that chat has been resumed and everyone can send messages
- **Visual Indicators**: Banner notifications in the chat interface showing current status
- **Self-Exclusion**: Users who initiate pause/resume actions don't receive notifications about their own actions

## 7. OFFBOARDING SYSTEM

### Overview
The offboarding system provides a structured way to deactivate user accounts while ensuring continuity of operations by transferring responsibilities to designated support staff.

### Key Features
1. **User Deactivation**: Mark user accounts as inactive to prevent further login or actions
2. **Responsibility Transfer**: Automatically transfer user responsibilities to their assigned support staff
3. **Provider Attachment Transfer**: Move provider attachments from offboarded users to their support staff
4. **Support Staff Chain Update**: If an offboarded user was acting as support staff for others, their own support staff takes over
5. **Irreversible Process**: Once offboarded, accounts cannot be reactivated

### Offboarding Workflow

#### Prerequisites
Before offboarding a user, ensure they have at least one support staff member assigned. This can be done through the HR Users management interface.

#### Offboarding Process
1. Navigate to HR → Users in the admin panel
2. Select the user to be offboarded
3. Click the "Offboard User" button
4. Confirm the offboarding action in the confirmation dialog

#### What Happens During Offboarding
When a user is offboarded, the system performs the following actions:

1. **Provider Attachments Transfer**:
   - All provider attachments where the offboarded user was listed as "attached_staff" are transferred to their support staff
   - This ensures continuity of vendor/provider relationships

2. **Support Staff Chain Update**:
   - If the offboarded user was assigned as support staff to other users, those assignments are updated
   - The offboarded user's own support staff becomes the new support staff for those users

3. **Account Deactivation**:
   - The user's account is marked as inactive in the database
   - The `active` field in the users table is set to `false`
   - Inactive users cannot log in or perform any actions in the system

#### Technical Implementation

##### Database Changes
- Added `active` boolean column to the `users` table (defaults to `true`)
- Created migration script `002_add_active_to_users.sql` for existing installations

##### API Endpoints
- `POST /api/users/:userId/offboard` - Offboards a user and transfers their responsibilities

##### Frontend Components
- Added "Offboard User" button to HR Users management page
- Added account status indicators to user detail views
- Added confirmation dialogs for offboarding actions

##### Authentication Updates
- Modified authentication middleware to check user active status
- Users with `active = false` are denied access with a 403 error

### Limitations
- Offboarding is irreversible - once an account is deactivated, it cannot be reactivated
- All responsibilities are transferred automatically - there is no option for selective transfer
- Only one support staff member is considered during offboarding - if multiple support staff exist, only the first one is used for transfers

## 11. Notification System

The T-Office application includes a comprehensive notification system that provides real-time updates to users. This system enhances user engagement by delivering timely information about important events and activities.

### Features

- **Real-time Notifications**: Instant delivery of notifications using WebSocket technology
- **Persistent Storage**: Notifications are saved across sessions using localStorage
- **Multiple Notification Types**: Support for different categories (chat, system, success, warnings)
- **Visual Indicators**: Unread notification counts and status indicators
- **User-friendly Interface**: Notification panel with history and management options
- **Automatic Read Status**: Smart handling of read/unread notifications

### Technical Implementation

The notification system is built with:
- **Socket.IO** for real-time communication
- **React Context API** for state management
- **localStorage** for persistence
- **Tailwind CSS** for responsive UI components

For detailed implementation information, see [NOTIFICATION_SYSTEM.md](NOTIFICATION_SYSTEM.md).
