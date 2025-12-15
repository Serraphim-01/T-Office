# Inventory CSV Import Guide

This guide explains how to use the CSV import feature to add providers, products, and transactions to the inventory system.

## Understanding the Import Types

There are two ways to import data:

1. **Simple Product Import** - Imports only products and their providers
2. **Comprehensive Import** - Imports products, inbound transactions, stored transactions, and outbound transactions

## CSV Column Reference

### Product Records (type = "product")

| Column | Description | Required |
|--------|-------------|----------|
| type | Must be "product" | Yes |
| name | Product name | Yes |
| part_number | Unique product identifier | Yes |
| product_type | Category of product (e.g., Laptop, Tablet) | Yes |
| provider | Provider name | No (but recommended) |
| provider_email | Provider's organization email | No |
| provider_phone | Provider's organization phone | No |
| provider_address | Provider's physical address | No |
| official_contact_name* | Provider's official contact person | Yes (if creating new provider) |
| official_contact_email* | Official contact's email | Yes (if creating new provider) |
| official_contact_phone* | Official contact's phone | Yes (if creating new provider) |
| organization_contact_name | Secondary contact person | No |
| organization_contact_email | Secondary contact's email | No |
| organization_contact_phone | Secondary contact's phone | No |
| default_unit_price | Default selling price in Naira (₦) | No |

### Inbound Transaction Records (type = "inbound")

| Column | Description | Required |
|--------|-------------|----------|
| type | Must be "inbound" | Yes |
| product_part_number | Existing product's part number | Yes |
| provider | Provider name | Yes |
| quantity | Number of items | Yes |
| expected_arrival_start | Start of expected arrival period (YYYY-MM-DD) | Yes |
| expected_arrival_end | End of expected arrival period (YYYY-MM-DD) | Yes |
| serial_numbers | Pipe-separated serial numbers (SN001|SN002) | No |

### Stored Transaction Records (type = "stored")

| Column | Description | Required |
|--------|-------------|----------|
| type | Must be "stored" | Yes |
| product_part_number | Existing product's part number | Yes |
| provider | Provider name | Yes |
| quantity | Number of items | Yes |
| expected_arrival_start | Start of expected arrival period (YYYY-MM-DD) | Yes |
| expected_arrival_end | End of expected arrival period (YYYY-MM-DD) | Yes |
| arrival_date | Actual arrival date (YYYY-MM-DD) | Yes |
| serial_numbers | Pipe-separated serial numbers (SN001|SN002) | No |

### Outbound Transaction Records (type = "outbound")

| Column | Description | Required |
|--------|-------------|----------|
| type | Must be "outbound" | Yes |
| product_part_number | Existing product's part number | Yes |
| quantity | Number of items | Yes |
| receiver_address | Delivery address | Yes |
| receiver_email | Receiver's email | Yes |
| receiver_phone | Receiver's phone | Yes |
| dispatch_datetime | Dispatch date and time (YYYY-MM-DDTHH:MM:SS) | Yes |
| delivery_datetime | Expected delivery date and time (YYYY-MM-DDTHH:MM:SS) | Yes |
| serial_numbers | Pipe-separated serial numbers (SN001|SN002) | Yes |
| outbound_price | Selling price per unit | No |

## Working with Providers

### Adding New Providers

When adding a new provider, you must include:
- provider name
- official_contact_name
- official_contact_email
- official_contact_phone

Optional fields for new providers:
- provider_email
- provider_phone
- provider_address
- organization_contact_name
- organization_contact_email
- organization_contact_phone

### Using Existing Providers

To use an existing provider, simply provide the provider name. The system will automatically link to the existing provider.

## Formatting Guidelines

1. **Dates**: Use YYYY-MM-DD format (e.g., 2023-12-01)
2. **DateTimes**: Use YYYY-MM-DDTHH:MM:SS format (e.g., 2023-12-20T09:00:00)
3. **Serial Numbers**: Separate multiple serial numbers with the pipe character (|)
4. **Prices**: Use decimal format without currency symbols (e.g., 1200000.00 for ₦1,200,000.00)
5. **Addresses**: Enclose in quotes if they contain commas

## Sample Scenarios

### Scenario 1: Adding Products with a New Provider

```
type,name,part_number,product_type,provider,provider_email,provider_phone,provider_address,official_contact_name,official_contact_email,official_contact_phone,default_unit_price
product,MacBook Pro,MBA-2023-001,Laptop,Tech Solutions Inc.,info@techsolutions.com,+1-555-0123,"123 Tech Street, San Francisco, CA",Sam Wilson,sam@techsolutions.com,+1-555-0124,1200000.00
```

### Scenario 2: Adding Products with an Existing Provider

```
type,name,part_number,product_type,provider,default_unit_price
product,Monitor,MNT-2023-001,Display,Existing Provider,500000.00
```

### Scenario 3: Creating an Inbound Transaction

```
type,product_part_number,provider,quantity,expected_arrival_start,expected_arrival_end,serial_numbers
inbound,IPA-2023-001,Tech Solutions Inc.,10,2023-12-01,2023-12-15,SN001|SN002|SN003|SN004|SN005|SN006|SN007|SN008|SN009|SN010
```

## Best Practices

1. **Test with a small file first** - Import a few records to verify the format works correctly
2. **Ensure unique part numbers** - Each product must have a unique part number
3. **Validate provider information** - Make sure all required provider contact information is accurate
4. **Check date formats** - Ensure all dates follow the required format
5. **Verify serial numbers** - Ensure serial numbers are unique and properly formatted
6. **Backup before import** - Always backup your data before performing large imports

## Troubleshooting

### Common Errors

1. **"Row missing required fields"** - Check that all required fields are filled in
2. **"Product with part number not found"** - Verify the part number exists in the system
3. **"Invalid date format"** - Ensure dates follow YYYY-MM-DD format
4. **"Provider contact information missing"** - For new providers, ensure all required contact fields are provided

### Getting Help

If you encounter issues:
1. Check the error messages in the import results
2. Verify your CSV format against the sample template
3. Contact your system administrator for assistance