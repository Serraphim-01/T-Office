# Login Feature Documentation

This document provides a technical overview of the preset user login feature implemented in the backend service.

## 1. Overview

The new login flow enhances the authentication process by introducing a "preset user" system. If a user's credentials are not found in the main `users` table, the system checks against a `preset_users` table. If a match is found, a new user is created in the `users` table, and the user is logged in. This is useful for creating initial or administrative accounts without a formal registration process.

## 2. Database Changes

### `preset_users` Table

A new table named `preset_users` has been added to the PostgreSQL database.

**Schema:**

| Column   | Type         | Constraints          | Description                               |
| :------- | :----------- | :------------------- | :---------------------------------------- |
| `id`     | `SERIAL`     | `PRIMARY KEY`        | Auto-incrementing primary key.            |
| `email`  | `VARCHAR(255)` | `UNIQUE NOT NULL`    | The user's email address.                 |
| `password` | `VARCHAR(255)` | `NOT NULL`           | The user's bcrypt-hashed password.        |

### Database Seeding

A database initialization script, `backend/db-init.js`, has been created to:
1.  Create the `preset_users` table if it doesn't exist.
2.  Seed the table with a preset admin account (`admin@tasksystems.com`). The password for this account is read from an environment variable, hashed with `bcrypt`, and then stored.

## 3. Backend API Changes

### New Dependencies

The following dependencies were added to `backend/package.json`:

-   `bcrypt`: For hashing and comparing passwords securely.
-   `jsonwebtoken`: For creating and verifying JSON Web Tokens (JWT) for session management.
-   `dotenv`: For loading environment variables from a `.env` file.

### `/api/login` Endpoint

The core of the feature is the updated `POST /api/login` endpoint in `backend/index.js`.

**Authentication Flow:**

1.  The endpoint receives an `email` and `password` in the request body.
2.  It first queries the `users` table for the provided `email`.
    -   If a user is found, it compares the provided `password` with the stored hash using `bcrypt.compare`. If they match, a JWT is issued, and the user is logged in.
3.  If no user is found in the `users` table, it queries the `preset_users` table for the `email`.
    -   If a preset user is found, it compares the provided `password` with the stored hash using `bcrypt.compare`.
    -   If the credentials are valid, a **new user is created** in the `users` table. The provided plaintext `password` is re-hashed with `bcrypt` before being stored in the new `users` record.
    -   A JWT is then issued for the newly created user, and they are logged in.
4.  If the credentials do not match any user in either the `users` or `preset_users` table, a `401 Invalid credentials` error is returned.

**JWT Generation:**

Upon successful authentication, a JWT is generated and signed with the `JWT_SECRET` from the environment variables. The token contains the user's ID and expires in one hour.

**Response:**

On success, the endpoint returns a JSON object containing the `token` and a `user` object (with `id` and `email`).

```json
{
  "token": "...",
  "user": {
    "id": 1,
    "email": "admin@tasksystems.com"
  }
}
```

## 4. Configuration

The backend service requires a `.env.local` file in the `backend/` directory with the following environment variables:

-   `DATABASE_URL`: The connection string for the PostgreSQL database.
    -   Example: `postgresql://user:password@localhost:5432/database`
-   `JWT_SECRET`: A secret key for signing JWTs.
    -   Example: `your-super-secret-jwt-secret`
-   `BCRYPT_SALT_ROUNDS`: The cost factor for bcrypt hashing (e.g., `10`).
-   `PRESET_ADMIN_PASSWORD`: The plaintext password for the preset admin account to be seeded.
    -   Example: `password123`

## 5. Setup and Initialization

To set up and run the backend service with the new feature:

1.  **Install Dependencies:** Navigate to the `backend/` directory and run:
    ```bash
    npm install
    ```
2.  **Initialize Database:** To create the `preset_users` table and seed it, run the following command from the `backend/` directory:
    ```bash
    npm run db:init
    ```
    This script needs to be run only once to set up the table. It is safe to run multiple times, as it will not duplicate the preset user.
3.  **Start the Server:**
    ```bash
    npm start
    ```
