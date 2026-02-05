# T-Office Test Execution Guide

This guide lists all available test scripts in the recommended execution order, along with instructions on how to run each one.

## Test Scripts Overview

### 1. User Management Tests

#### Create Extra Roles
Creates additional roles for testing different user scenarios.
```bash
npm run test:users:roles
```

#### Multi User Creation
Creates multiple users across different departments for testing.
```bash
npm run test:users:create
```

#### Support User Allocation
Assigns support staff to users and generates attendance records.
```bash
npm run test:users:support
```

### 2. Inventory Management Tests

#### Provider Creation
Creates multiple providers with complete contact information.
```bash
npm run test:inventory:providers
```

#### Product Creation
Creates multiple products under different providers.
```bash
npm run test:inventory:products
```

#### Provider User Assignment
Assigns a user (preferably from sales department) to a provider.
```bash
npm run test:inventory:assign-user
```

#### Inbound Transactions
Generates inbound transactions for products.
```bash
npm run test:inventory:inbound
```

#### Move to Stored
Changes inbound transactions from Incoming to Stored state.
```bash
npm run test:inventory:stored
```

#### Outbound Transactions
Creates outbound transactions from stored inventory.
```bash
npm run test:inventory:outbound
```

#### Update to Dispatched
Changes outbound transactions from Outgoing to Dispatched.
```bash
npm run test:inventory:dispatched
```

#### Update to Delivered
Changes outbound transactions from Dispatched to Delivered.
```bash
npm run test:inventory:delivered
```

### 3. Complete Test Suites

#### Run All User Tests
Executes all user management tests in sequence.
```bash
npm run test:users:all
```

#### Run All Inventory Tests (Without Cleanup)
Executes all inventory tests in sequence without removing test data.
```bash
npm run test:inventory:all
```

#### Run All Tests
Executes both user and inventory tests in sequence.
```bash
npm run test:all
```

#### List All Test Commands
Displays all available test commands and their descriptions.
```bash
npm run test:list
```

#### Run Cleanup Scripts
Removes test data when you want to start fresh.
```bash
# Clean up user data only
npm run cleanup:users

# Clean up inventory data only  
npm run cleanup:inventory

# Clean up all test data
npm run cleanup:all
```

## Recommended Execution Order

For a complete end-to-end test of the system, run tests in this order:

1. `npm run test:users:roles`
2. `npm run test:users:create` 
3. `npm run test:users:support`
4. `npm run test:inventory:providers`
5. `npm run test:inventory:products`
6. `npm run test:inventory:assign-user`
7. `npm run test:inventory:inbound`
8. `npm run test:inventory:stored`
9. `npm run test:inventory:outbound`
10. `npm run test:inventory:dispatched`
11. `npm run test:inventory:delivered`

Or run everything at once:
```bash
npm run test:all
```

## Individual Test Execution

Each test script can be run individually using its specific npm command:

```bash
# List all available commands
npm run test:list

# User tests
npm run test:users:roles
npm run test:users:create
npm run test:users:support

# Inventory tests
npm run test:inventory:providers
npm run test:inventory:products
npm run test:inventory:assign-user
npm run test:inventory:inbound
npm run test:inventory:stored
npm run test:inventory:outbound
npm run test:inventory:dispatched
npm run test:inventory:delivered

# Complete suites
npm run test:users:all
npm run test:inventory:all
npm run test:all

# Cleanup
npm run cleanup:users
npm run cleanup:inventory
npm run cleanup:all
```

## Test Data Management

Test data is saved in the `test-data/` directory:
- Provider data: `test-data/providers.json`
- Product data: `test-data/products.json`
- User assignment data: `test-data/provider-assignments.json`
- Inbound transactions: `test-data/inbound-transactions.json`
- Stored transactions: `test-data/stored-transactions.json`
- Outbound transactions: `test-data/outbound-transactions.json`
- Dispatched transactions: `test-data/dispatched-transactions.json`
- Delivered transactions: `test-data/delivered-transactions.json`

## Environment Requirements

Make sure you have the following environment variables configured in `.env.local`:
```env
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin_password"
API_BASE_URL="http://localhost:4000"
```

## Prerequisites

Before running tests, ensure:
1. The T-Office backend server is running on port 4000
2. The database is accessible and properly configured
3. An admin user exists with the credentials specified in environment variables