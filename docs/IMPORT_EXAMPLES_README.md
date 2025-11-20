# CSV Import Examples

This directory contains example CSV files for the two different import methods available in the T-Office inventory system.

## Product Import (Simple Import)
**File**: `test_product_import.csv`

This import method is for importing products only. It's the simpler import option when you only need to add or update product information.

### When to use:
- Adding new products to your inventory
- Updating existing product information
- Initial product catalog setup

### Features:
- Imports product name, part number, and product type
- Updates existing products if part number already exists
- Simple CSV format with just product information

### How to use:
1. Navigate to Inventory > Products in the application
2. Click the "Import CSV" button
3. Select the product CSV file
4. View results in the notification

## Comprehensive Import (Advanced Import)
**File**: `test_comprehensive_import.csv`

This import method allows you to import products along with inbound transactions, stored transactions, and outbound transactions all at once. This is particularly useful when migrating from an existing system.

### When to use:
- Migrating from another inventory system
- Setting up a new installation with existing data
- Bulk importing complete product and transaction history

### Features:
- Imports products, inbound transactions, stored transactions, and outbound transactions
- Uses a "type" column to identify record types
- Maintains transaction relationships and status
- Processes all data in a single operation with database transaction support

### How to use:
1. Navigate to Inventory > Products in the application
2. Click the "Import All Data" button
3. Select the comprehensive CSV file
4. View results in the notification

### CSV Format:
The comprehensive import CSV requires a "type" column to identify the record type:
- `product` for product records
- `inbound` for incoming transactions
- `stored` for stored transactions
- `outbound` for outgoing shipments

Each record type has specific required columns as detailed in the [Comprehensive Import Guide](COMPREHENSIVE_IMPORT_GUIDE.md).