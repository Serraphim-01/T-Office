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

Database migrations have been consolidated for simplicity. See [DB_MIGRATION_CONSOLIDATION.md](DB_MIGRATION_CONSOLIDATION.md) for details.

To run the database migration:
```bash
./db/run_migration.sh
```

## Project Structure

```
.
├── app/                 # Next.js App Router pages and layouts
├── backend/             # Express server with API routes and DB logic
├── components/          # Reusable UI components
├── db/                  # Database migration files
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