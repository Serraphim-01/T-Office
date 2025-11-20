# Frontend CSV Import Guide

## How to Import Products via CSV in the UI

### Accessing the Import Feature

1. Navigate to the Inventory section in the main navigation menu
2. Click on "Products" in the submenu
3. On the products page, you'll see an "Import CSV" button next to the "Add Product" button

### Preparing Your CSV File

Your CSV file should follow this format:

```csv
name,part_number,product_type
"Product Name 1",PART-001,Electronics
"Product Name 2",PART-002,Furniture
"Product Name 3",PART-003,Office Supplies
```

#### Required Columns
- **name**: The product name
- **part_number**: Unique identifier for the product
- **product_type**: Category of the product (defaults to "Electronics" if omitted)

#### Supported Column Variations
The system recognizes various column name formats:
- Name: `name`, `Name`, `Product Name`
- Part Number: `part_number`, `partNumber`, `Part Number`, `part number`
- Product Type: `product_type`, `productType`, `Product Type`, `product type`

### Using the Import Feature

1. Click the "Import CSV" button
2. Select your prepared CSV file from the file dialog
3. Wait for the import process to complete
4. You'll receive a notification showing:
   - Number of products successfully imported
   - Number of errors (if any)

### Handling Duplicates

If a product with the same part number already exists in the system:
- The existing product will be updated with the new information
- No duplicate entries will be created

### Error Handling

If there are any errors during the import:
- Valid products will still be imported
- Invalid rows will be skipped
- Detailed error information will be shown in the notification

### Best Practices

1. Always backup your data before importing
2. Test with a small sample file first
3. Ensure part numbers are unique identifiers
4. Use consistent naming conventions
5. Remove any empty rows from your CSV file