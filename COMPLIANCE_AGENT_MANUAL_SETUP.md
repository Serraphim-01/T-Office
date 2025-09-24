# Compliance Agent: Manual Setup Guide

## 1. Overview

This document provides instructions on how to set up and run the Compliance Agent feature locally. This feature allows an administrator to monitor a list of public-facing websites to ensure their content aligns with a master compliance document.

The agent consists of:
- A Next.js frontend located in `/app/compliance`.
- A Node.js (Express) backend in `/backend`.
- New database tables for storing the master document and monitored sites.

## 2. Environment Variables

The backend and database rely on environment variables.

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create a `.env.local` file:**
    Copy the contents of `.env.example` (if it exists) or create a new file named `.env.local`.

3.  **Add the following variables:**
    ```
    # The full connection string for your PostgreSQL database.
    # If using the provided Docker setup for Supabase, this will be available
    # from your Supabase project's settings.
    DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@localhost:54322/postgres"

    # A secret key for signing JWT tokens. Generate a secure random string.
    JWT_SECRET="your-super-secret-jwt-key"

    # The port for the backend server.
    PORT=4000

    # The password for the preset admin user (admin@tasksystems.com)
    # This is used by the db-init script.
    PRESET_ADMIN_PASSWORD="your-secure-admin-password"

    # The number of salt rounds for bcrypt hashing.
    BCRYPT_SALT_ROUNDS=10
    ```

**Note:** The frontend also requires environment variables for the Supabase client (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`), but these should already be configured as part of the main project setup.

## 3. Database Migration

The new tables for the compliance agent (`compliance_documents` and `crawled_sites`) are defined in a migration file located in `supabase/migrations`.

If you are using the Supabase local development environment with Docker, these migrations should be applied automatically when you start the services.

To start the Supabase stack (which includes the database):
```bash
# Make sure you have the Supabase CLI installed: npm install -g supabase
supabase start
```
This command will start the Docker containers and apply any new migrations found in the `supabase/migrations` directory.

## 4. Running the Application

You need to run two separate processes: the backend server and the frontend development server.

**Terminal 1: Start the Backend**
```bash
cd backend
npm install
npm run dev
```
This will start the Node.js server, which by default runs on `http://localhost:4000`.

**Terminal 2: Start the Frontend**
```bash
# In the root directory of the project
npm install
npm run dev
```
This will start the Next.js frontend, which by default runs on `http://localhost:3000`.

Once both are running, you can access the application at `http://localhost:3000` and navigate to the `/compliance` page to use the new feature.
