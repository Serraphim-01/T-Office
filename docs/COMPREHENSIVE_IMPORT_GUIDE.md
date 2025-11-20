# Comprehensive Data Import Guide

## Overview
This feature allows you to import all product-related data including products, inbound transactions, stored transactions, and outbound transactions in a single CSV operation. This is particularly useful when migrating from an existing system.

## Supported File Format
- CSV (Comma Separated Values)
- Excel files saved as CSV

## CSV Structure
The import file must follow this structure with a "type" column to identify the record type:

```csv
type,name,part_number,product_type,product_part_number,quantity,provider,expected_arrival_start,expected_arrival_end,arrival_date,receiver_address,receiver_email,receiver_phone,dispatch_datetime,delivery_datetime,serial_numbers
product,Laptop Computer,LAPTOP-001,Electronics,,,,,,,,,,,,
product,Wireless Mouse,MOUSE-001,Electronics,,,,,,,,,,,,
inbound,,PHONE-001,,PHONE-001,5,Tech Distributors Inc.,2023-06-01,2023-06-10,,,SN001,SN002,SN003,SN004,SN005
stored,,TABLET-001,,TABLET-001,3,Tech Distributors Inc.,2023-05-01,2023-05-05,2023-05-03,,,,,,,,TB001,TB002,TB003
outbound,,HEADPHONE-001,,HEADPHONE-001,2,,2023-05-15,2023-05-20,,123 Business Ave,orders@company.com,+1987654321,2023-06-15T09:00:00Z,2023-06-16T17:00:00Z,HP001,HP002
```

## Column Requirements

### Common Columns
- `type` (required): Record type - one of "product", "inbound", "stored", "outbound"

### Product Records
- `name` (required): Product name
- `part_number` (required): Unique identifier for the product
- `product_type` (optional, defaults to "Electronics"): Category of the product

### Inbound Transaction Records
- `product_part_number` (required): Part number of the product (must match an existing product)
- `quantity` (required): Number of items
- `provider` (required): Supplier/provider name
- `expected_arrival_start` (required): Start of expected arrival date (YYYY-MM-DD)
- `expected_arrival_end` (required): End of expected arrival date (YYYY-MM-DD)
- `serial_numbers` (optional): Comma-separated list of serial numbers

### Stored Transaction Records
- `product_part_number` (required): Part number of the product (must match an existing product)
- `quantity` (required): Number of items
- `provider` (required): Supplier/provider name
- `expected_arrival_start` (required): Start of expected arrival date (YYYY-MM-DD)
- `expected_arrival_end` (required): End of expected arrival date (YYYY-MM-DD)
- `arrival_date` (required): Actual arrival date (YYYY-MM-DD)
- `serial_numbers` (optional): Comma-separated list of serial numbers

### Outbound Transaction Records
- `product_part_number` (required): Part number of the product (must match an existing product with stored status)
- `quantity` (required): Number of items
- `receiver_address` (required): Delivery address
- `receiver_email` (required): Receiver's email
- `receiver_phone` (required): Receiver's phone number
- `dispatch_datetime` (required): Planned dispatch datetime (ISO 8601 format)
- `delivery_datetime` (required): Planned delivery datetime (ISO 8601 format)
- `serial_numbers` (required): Comma-separated list of serial numbers to be shipped

## API Endpoint
**POST** `/api/inventory/comprehensive-import`

### Request
- **Method**: POST
- **URL**: `http://localhost:4000/api/inventory/comprehensive-import`
- **Headers**: 
  - `Authorization: Bearer <your-jwt-token>`
  - `Content-Type: multipart/form-data`
- **Body**: 
  - `file`: The CSV file to import

### Response
```json
{
  "message": "Comprehensive CSV import completed",
  "successCount": {
    "products": 5,
    "inbound": 3,
    "stored": 2,
    "outbound": 1
  },
  "errorCount": {
    "products": 0,
    "inbound": 0,
    "stored": 0,
    "outbound": 0
  },
  "errors": []
}
```

## Processing Order
The system processes data in this order:
1. Products (creates or updates products)
2. Inbound transactions (creates new incoming transactions)
3. Stored transactions (creates stored transactions)
4. Outbound transactions (creates outbound shipments)

## Error Handling
- If a product with the same part number already exists, it will be updated
- If a referenced product doesn't exist, the transaction will be skipped
- The system continues processing even if some entries fail
- All operations are wrapped in a database transaction for consistency

## Best Practices
1. Always backup your data before importing
2. Test with a small sample file first
3. Ensure part numbers are unique identifiers
4. Verify all date formats are correct
5. Make sure referenced products exist before creating transactions
6. Check that stored transactions exist before creating outbound transactions
7. Separate multiple serial numbers with commas

## Example CSV File
```csv
type,name,part_number,product_type,product_part_number,quantity,provider,expected_arrival_start,expected_arrival_end,arrival_date,receiver_address,receiver_email,receiver_phone,dispatch_datetime,delivery_datetime,serial_numbers
product,Smartphone X1,PHONE-001,Electronics,,,,,,,,,,,,
product,Tablet Pro,TABLET-001,Electronics,,,,,,,,,,,,
product,Bluetooth Headphones,HEADPHONE-001,Electronics,,,,,,,,,,,,
inbound,,PHONE-001,,PHONE-001,5,Tech Distributors Inc.,2023-06-01,2023-06-10,,,,,,PH001,PH002,PH003,PH004,PH005
stored,,TABLET-001,,TABLET-001,3,Tech Distributors Inc.,2023-05-01,2023-05-05,2023-05-03,,,,,,TB001,TB002,TB003
stored,,HEADPHONE-001,,HEADPHONE-001,10,Audio Supplies Co.,2023-05-15,2023-05-20,2023-05-18,,,,,,HP001,HP002,HP003,HP004,HP005,HP006,HP007,HP008,HP009,HP010
outbound,,HEADPHONE-001,,HEADPHONE-001,2,,2023-05-15,2023-05-20,,123 Business Ave,orders@company.com,+1987654321,2023-06-15T09:00:00Z,2023-06-16T17:00:00Z,HP001,HP002
```