# Product CSV Import Documentation

## Overview
This feature allows you to import products into the T-Office inventory system using CSV files. The import process supports various column name formats and handles duplicates by updating existing products.

**Note:** This is for importing products only. For importing products along with inbound, stored, and outbound transactions, use the [Comprehensive Import](COMPREHENSIVE_IMPORT_GUIDE.md) feature.

## Supported File Formats
- CSV (Comma Separated Values)
- Excel files saved as CSV
- Other spreadsheet formats exported as CSV

## Required Columns
The CSV file must contain at least these two columns:
- **Name** (Product name)
- **Part Number** (Unique identifier for the product)

## Optional Columns
- **Product Type** (Defaults to "Electronics" if not provided)

## Supported Column Name Variations
The system recognizes various column name formats to accommodate different spreadsheet layouts:

### Name Column Variations
- `name`
- `Name`
- `Product Name`

### Part Number Column Variations
- `part_number`
- `partNumber`
- `Part Number`
- `part number`

### Product Type Column Variations
- `product_type`
- `productType`
- `Product Type`
- `product type`

## Example CSV Format

```csv
name,part_number,product_type
"Laptop Computer",LAPTOP-001,Electronics
"Wireless Mouse",MOUSE-001,Electronics
"Mechanical Keyboard",KEYBOARD-001,Electronics
"USB-C Cable",CABLE-001,Electronics
"External Hard Drive",HDD-001,Electronics
```

## How It Works
1. The system reads the uploaded CSV file
2. For each row, it extracts the required fields (name and part number)
3. If a product with the same part number already exists, it updates the existing record
4. If a product with the same part number doesn't exist, it creates a new record
5. The system returns a report showing:
   - Number of successfully imported/updated products
   - Number of errors
   - Detailed error messages (if any)

## API Endpoint
**POST** `/api/inventory/products/import`

### Request
- **Method**: POST
- **URL**: `http://localhost:4000/api/inventory/products/import`
- **Headers**: 
  - `Authorization: Bearer <your-jwt-token>`
  - `Content-Type: multipart/form-data`
- **Body**: 
  - `file`: The CSV file to import

### Response
```json
{
  "message": "CSV import completed",
  "successCount": 5,
  "errorCount": 0
}
```

## Frontend Integration
The CSV import functionality is also available through the user interface:
1. Navigate to Inventory > Products
2. Click the "Import CSV" button
3. Select your CSV file
4. View the import results in the notification

## Error Handling
- If a row is missing required fields, it will be skipped and counted as an error
- If there's a database error for a specific row, it will be skipped and counted as an error
- The system continues processing even if some rows fail
- Duplicate entries are handled by updating existing records

## Best Practices
1. Always backup your data before importing
2. Test with a small sample file first
3. Ensure part numbers are unique identifiers
4. Use consistent naming conventions
5. Remove any empty rows from your CSV file

## Troubleshooting
- **"No file uploaded"**: Make sure you're sending the file in the request
- **"Error parsing CSV file"**: Check that your file is properly formatted CSV
- **Duplicate entry errors**: These are handled automatically (existing records are updated)
- **Authentication errors**: Ensure you're using a valid JWT token with appropriate permissions

## Testing Results
The CSV import functionality has been thoroughly tested:
- Successfully imports valid CSV files with proper formatting
- Correctly handles files with missing required fields
- Properly manages duplicate entries by updating existing records
- Provides detailed error reporting for troubleshooting
- Works through both API calls and frontend UI

## For Comprehensive Data Import
If you need to import products along with inbound transactions, stored transactions, and outbound transactions all at once, please refer to the [Comprehensive Import Guide](COMPREHENSIVE_IMPORT_GUIDE.md).