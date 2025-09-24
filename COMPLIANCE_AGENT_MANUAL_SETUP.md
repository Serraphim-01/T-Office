# Compliance Agent: Manual Setup Guide

## 1. Overview

This document provides instructions on how to set up and run the Compliance Agent feature locally. This feature allows an administrator to monitor a list of public-facing websites to ensure their content aligns with a master compliance document.

The agent consists of:
- A Next.js frontend located in `/app/compliance`.
- A Node.js (Express) backend in `/backend`.
- New database tables for storing the master document and monitored sites.

## 2. Environment Variables

The backend and database rely on environment variables. You will need to create a `.env.local` file in the `backend/` directory.

**Add the following variables to `backend/.env.local`:**
```
# The full connection string for your PostgreSQL database.
# This should point to your cloud-hosted Supabase project or other PostgreSQL instance.
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres"

# A secret key for signing JWT tokens. Generate a secure random string.
JWT_SECRET="your-super-secret-jwt-key"

# The port for the backend server.
PORT=4000

# The password for the preset admin user (admin@tasksystems.com)
PRESET_ADMIN_PASSWORD="your-secure-admin-password"

# The number of salt rounds for bcrypt hashing.
BCRYPT_SALT_ROUNDS=10
```

**Note:** The frontend also requires environment variables for the Supabase client (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`), but these should already be configured as part of the main project setup.

## 3. Database Migration

The new tables for the compliance agent must be added to your Supabase database.

The SQL code required to create these tables is located in the following file:
`supabase/migrations/20250924120000_create_compliance_tables.sql`

**To apply these changes manually:**
1.  Open your Supabase project on the Supabase website.
2.  Navigate to the **SQL Editor**.
3.  Click **New query**.
4.  Copy the entire content of the `.sql` file mentioned above and paste it into the editor.
5.  Click **Run**.

This will create the `compliance_documents` and `crawled_sites` tables in your database.

## 4. Running the Application

The project is configured to run both the frontend and backend servers with a single command.

**To start the application:**
1.  Open your terminal in the root directory of the project.
2.  Install all dependencies for both the root and the backend.
    ```bash
    npm install
    npm install --prefix backend
    ```
3.  Run the development server.
    ```bash
    npm run dev
    ```

This command will start both the Next.js frontend (on `http://localhost:3000`) and the Node.js backend (on `http://localhost:4000`) at the same time.

You can now access the application at `http://localhost:3000` and navigate to the `/compliance` page to use the new feature.
