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

# The number of salt rounds for bcrypt hashing.
BCRYPT_SALT_ROUNDS=10
```

**Note:** The frontend also requires environment variables for the Supabase client (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`), but these should already be configured as part of the main project setup.

## 3. Database Migration

The new tables for the compliance agent must be added to your Supabase database. The SQL code required to create these tables is located in the following file: `supabase/migrations/20250924120000_create_compliance_tables.sql`.

Additionally, the activity tracking feature requires the `user_activities` table, found in `supabase/migrations/20250924190000_create_user_activities_table.sql`.

**To apply these changes manually:**
1.  Open your Supabase project on the Supabase website.
2.  Navigate to the **SQL Editor**.
3.  For each new migration file, click **New query**, copy the file's contents into the editor, and click **Run**.

## 4. Running the Application

You need to run two separate processes in two separate terminals: the backend server and the frontend development server.

**Terminal 1: Start the Backend**
```bash
# First, install dependencies for the backend
npm install --prefix backend

# Then, start the backend server
npm run dev --prefix backend
```
This will start the Node.js server, which by default runs on `http://localhost:4000`.

**Terminal 2: Start the Frontend**
```bash
# First, install dependencies for the frontend
npm install

# Then, start the frontend server
npm run dev
```
This will start the Next.js frontend, which by default runs on `http://localhost:3000`.

Once both are running, you can access the application at `http://localhost:3000` and navigate to the `/compliance` page to use the new feature.