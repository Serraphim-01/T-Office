# Attendance Records Generation Scripts

This directory contains scripts to generate test attendance records for the T-Office application.

## Files

### 1. `generate_attendance_records.js` (Standalone Script)
A standalone Node.js script that can be run directly to generate attendance records.

**Features:**
- Generates attendance records from a specified start date to today
- Skips weekends automatically
- Uses realistic clock-in/clock-out times (8:00-9:30 AM for clock-in, 5:00-6:30 PM for clock-out)
- Uses default coordinates (6.432839, 3.419496) as required
- Provides detailed progress and summary output
- Handles duplicates gracefully

**Usage:**
```bash
# Generate records from 2024-01-01 to today
node generate_attendance_records.js 2024-01-01

# Generate records from a specific date
node generate_attendance_records.js 2023-06-01
```

**Output Example:**
```
🚀 Starting attendance records generation...
📅 Generating records from 2024-01-01 to 2026-01-23
📍 Created new location event
📊 Existing attendance records for user 1: 0
📈 Planning to generate records for 540 working days
📄 Total records to insert: 1080 (clock-in + clock-out pairs)
🔄 Inserting attendance records...
🔄 Progress: 90% (974 records inserted)

✅ Generation complete!
📊 Summary:
   • Working days processed: 540
   • Records attempted: 1080
   • Successfully inserted: 1080
   • Duplicate records skipped: 0
   • Errors encountered: 0
   • Total records in database: 1079
   • Net new records added: 1080
```

### 2. `generate_attendance_records.test.js` (Jest Test)
A Jest-compatible test file that can be used for automated testing.

**Features:**
- Jest test suite with multiple test cases
- Verifies attendance record generation
- Checks default coordinate usage
- Validates attendance patterns
- Can be run with Jest test runner

**Usage:**
```bash
# Run with Jest (may require additional configuration)
npx jest generate_attendance_records.test.js

# Run the standalone script instead (recommended)
node generate_attendance_records.js 2024-01-01
```

## How It Works

1. **Location Event Creation**: Creates a location event with default coordinates
2. **Date Range Processing**: Processes each weekday from start date to today
3. **Time Generation**: Generates realistic clock-in/clock-out times
4. **Record Insertion**: Inserts clock-in and clock-out records into the database
5. **Validation**: Verifies records were inserted correctly

## Database Requirements

- PostgreSQL database connection
- `auto_attendance` table with proper schema
- `location_events` table for location tracking
- User ID 1 must exist in the database

## Environment Variables

The script looks for database configuration in `.env.local` file:
```
DATABASE_URL=postgres://username:password@host:port/database
```

## Notes

- The script uses user ID 1 by default
- All generated records use the default coordinates 6.432839, 3.419496
- Weekend days (Saturday, Sunday) are automatically skipped
- Duplicate records are handled gracefully
- Progress is displayed during insertion

## Troubleshooting

If you encounter module import errors:
1. Ensure all dependencies are installed: `npm install` in project root
2. Run the script from the project root directory
3. Check that `.env.local` file exists with proper database configuration

For Jest test issues:
- The standalone script (`generate_attendance_records.js`) is recommended for direct usage
- Jest configuration may need adjustment for ES modules