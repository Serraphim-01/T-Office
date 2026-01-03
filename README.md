# T-Office

T-Office is a full-stack internal office management platform designed to streamline administrative, HR, inventory, and collaboration workflows within an organization.

## Features

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
- **User Offboarding**: Automated transfer of responsibilities to support staff
- **Real-time Notifications**: Instant alerts for user lifecycle events, system activities, and communications

## Technology Stack

### Frontend
- Framework: Next.js 13.5.1
- Language: TypeScript (React 18.2.0)
- Styling: Tailwind CSS 3.3.3
- UI Components: Radix UI primitives
- State/Form: React Hook Form + Zod

### Backend
- Runtime: Node.js 18
- Framework: Express
- Database: PostgreSQL
- Routing: Plain JavaScript route handlers

## Getting Started

### Prerequisites
- Node.js v18+
- npm
- PostgreSQL database

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

## Database Migration

T-Office now uses a proper database migration system that supports versioned, tracked schema changes. The system allows for safe, automated migrations during deployment.

### Running Migrations

Apply pending migrations:
```bash
npm run migrate
```

Create a new migration:
```bash
npm run create-migration <migration-name>
```

### Migration System Features

- ✅ Versioned migration files stored in `db/migrations/`
- ✅ Automatic tracking of applied migrations
- ✅ Non-interactive operation for production deployments
- ✅ No runtime migration logic in the application
- ✅ Respects `DATABASE_URL` from environment variables

For more details, see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) and [DB_MIGRATION_CONSOLIDATION.md](DB_MIGRATION_CONSOLIDATION.md).

## User Offboarding

The T-Office platform includes a comprehensive user offboarding system:

1. **Support Staff Assignment**: Assign support staff to users in preparation for offboarding
2. **Automated Responsibility Transfer**: When a user is offboarded:
   - Their support staff takes over as attached contacts for providers
   - If the offboarded user was a support staff for other users, their support staff becomes the new support staff for those users
   - The offboarded user's account is deactivated
3. **Irreversible Process**: Once offboarded, user accounts cannot be reactivated

### Offboarding Process

1. Navigate to the HR Users section
2. Select the user to be offboarded
3. Click the "Offboard User" button
4. Confirm the offboarding action

The system will automatically:
- Transfer provider attachments to the user's support staff
- Reassign any users who had the offboarded user as their support staff
- Deactivate the user's account

## Real-time Notifications

The T-Office platform includes a comprehensive real-time notification system that keeps users informed about important events:

### Notification Types

- **User Lifecycle Events**: Notifications when users are onboarded, offboarded, or when support staff assignments change
- **Activity Tracking**: Notifications for clock-ins, clock-outs, and completed wiki lessons
- **System Events**: Notifications for chat messages, location changes, and feature updates

### Notification Targeting

The system implements intelligent notification targeting to ensure the right people receive the right notifications:

- **Onboarding Notifications**: Sent to users with HR access and others in the same department
- **Offboarding Notifications**: Sent to HR personnel, department colleagues, support staff, and those supported by the offboarded user
- **Support Staff Notifications**: Sent to HR personnel, the assigned support staff, and the user receiving support

For detailed technical information about the notification system, see [NOTIFICATION_SYSTEM.md](NOTIFICATION_SYSTEM.md).

## Changelog

For a detailed history of changes to the project, see [CHANGELOG.md](CHANGELOG.md).

## Project Structure

```
.
├── app/                 # Next.js App Router pages and layouts
├── backend/             # Express server with API routes and DB logic
├── components/          # Reusable UI components
├── backend/db/          # Database migration files
├── hooks/               # Custom React hooks
├── lib/                 # Shared logic
├── public/              # Static assets including PWA files
└── ...
```

## Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build the Next.js application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run changelog` - View the project changelog

## Docker Support

The application includes Docker configuration for easy deployment:
```bash
docker-compose up --build
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the MIT License.