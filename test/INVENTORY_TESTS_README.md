# T-Office Inventory Test Scripts

This directory contains comprehensive test scripts for the T-Office inventory management system. These scripts automate the complete inventory workflow from provider and product creation through to delivery completion.

## Test Scripts Overview

### 1. Provider Creation (`create_providers.test.js`)
- Creates multiple providers with complete contact information
- Sets up official and organization contacts
- Saves provider data for use in subsequent tests

### 2. Product Creation (`create_products.test.js`)
- Creates multiple products under different providers
- Assigns appropriate product types and pricing
- Links products to their respective providers

### 3. Provider User Assignment (`assign_provider_user.test.js`)
- Assigns a user from the sales department to a provider
- Creates the provider-user relationship for tracking
- Verifies the assignment was successful

### 4. Inbound Transactions Creation (`create_inbound_transactions.test.js`)
- Creates inbound transactions for various products
- Generates batch numbers automatically
- Assigns serial numbers to track individual items
- Sets expected arrival dates

### 5. Move to Stored State (`move_to_stored.test.js`)
- Transitions inbound transactions from "Incoming" to "Stored" status
- Sets actual arrival dates
- Updates inventory availability

### 6. Outbound Transactions Creation (`create_outbound_transactions.test.js`)
- Creates outbound transactions from stored inventory
- Assigns receivers with complete contact information
- Sets dispatch and delivery dates
- Tracks serial numbers for traceability

### 7. Update to Dispatched State (`update_to_dispatched.test.js`)
- Changes outbound transactions from "Outgoing" to "Dispatched" status
- Marks items as in transit
- Updates tracking information

### 8. Update to Delivered State (`update_to_delivered.test.js`)
- Changes outbound transactions from "Dispatched" to "Delivered" status
- Completes the delivery process
- Finalizes the transaction lifecycle

## Master Test Runner

### `run_inventory_tests.js`
A comprehensive test runner that can:
- Execute all tests in the correct sequence
- Run individual tests by name
- Provide detailed progress reporting
- Generate summary statistics

## Usage

### Run All Tests (Recommended)
```bash
cd test
node run_inventory_tests.js
```

### Run Specific Test
```bash
node run_inventory_tests.js "Provider Creation"
# or
node run_inventory_tests.js "create_providers.test.js"
```

### Get Help
```bash
node run_inventory_tests.js --help
```

## Prerequisites

1. **Backend Server**: Ensure the T-Office backend is running on `http://localhost:4000` (or configured URL)
2. **Admin Credentials**: Valid admin user account for API authentication
3. **Environment Variables**: Configure in `.env.local`:
   ```env
   API_BASE_URL=http://localhost:4000
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=admin_password
   ```

## Test Data Management

All test scripts automatically save their output to `test-data/` directory:
- `providers.json` - Created providers
- `products.json` - Created products  
- `provider-assignments.json` - User-provider assignments
- `inbound-transactions.json` - Created inbound transactions
- `stored-transactions.json` - Moved to stored status
- `outbound-transactions.json` - Created outbound transactions
- `dispatched-transactions.json` - Updated to dispatched status
- `delivered-transactions.json` - Updated to delivered status

## Test Workflow Sequence

The tests must be run in this specific order:

1. **Provider Creation** → Sets up suppliers
2. **Product Creation** → Creates products linked to providers
3. **Provider User Assignment** → Assigns sales staff to providers
4. **Inbound Transactions** → Receives inventory from suppliers
5. **Move to Stored** → Processes received inventory
6. **Outbound Transactions** → Ships inventory to customers
7. **Update to Dispatched** → Marks shipments as in transit
8. **Update to Delivered** → Completes delivery process

## Expected Outcomes

After running all tests successfully, your system will contain:
- **4+ Providers** with complete contact information
- **12+ Products** across different categories
- **1 User** assigned to a provider
- **5+ Inbound transactions** with serial numbers
- **3+ Stored transactions** ready for shipping
- **2+ Outbound transactions** in various states
- **Mixed transaction statuses** showing complete workflow

## Troubleshooting

### Common Issues:
1. **Authentication Failed**: Check admin credentials and server status
2. **No Data Found**: Run prerequisite tests first (providers/products)
3. **API Errors**: Verify backend server is running and accessible
4. **Database Issues**: Ensure database is properly initialized

### Debug Information:
Each test script provides detailed console output including:
- Authentication status
- Data creation progress
- Error messages with context
- Summary statistics
- File paths for saved test data

## Cleanup

The test data is designed to remain in the system for verification purposes. For cleanup, you can:
1. Use the admin interface to delete test data manually
2. Run database reset scripts if available
3. Use direct database queries to remove test records

## Development Notes

- All scripts use ES modules (`import`/`export`)
- Authentication uses JWT tokens
- Error handling includes graceful fallbacks
- Progress is tracked and reported in real-time
- Test data is persisted for verification and debugging