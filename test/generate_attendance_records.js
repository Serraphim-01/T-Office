#!/usr/bin/env node

/**
 * Generate Attendance Records Script
 * Standalone script to generate attendance records from a start date to today
 * Usage: node generate_attendance_records.js [start_date]
 * Example: node generate_attendance_records.js 2024-01-01
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.resolve(projectRoot, '.env.local') });

// Create a pool instance with the correct connection details
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
});

async function generateAttendanceRecords(startDateStr = '2024-01-01') {
  try {
    console.log('🚀 Starting attendance records generation...');
    
    const startDate = new Date(startDateStr);
    const today = new Date();
    
    console.log(`📅 Generating records from ${startDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
    
    // Create or get location event
    let locationEventId;
    try {
      const locationEventResult = await pool.query(
        `INSERT INTO location_events (user_id, location_id, event_type, latitude, longitude, is_auto_generated) 
         VALUES (1, 1, 'entry', 6.432839, 3.419496, false) 
         ON CONFLICT DO NOTHING
         RETURNING id`
      );
      
      if (locationEventResult.rows.length > 0) {
        locationEventId = locationEventResult.rows[0].id;
        console.log('📍 Created new location event');
      } else {
        // Get existing location event
        const existingEvent = await pool.query(
          'SELECT id FROM location_events WHERE user_id = 1 AND location_id = 1 LIMIT 1'
        );
        locationEventId = existingEvent.rows[0].id;
        console.log('📍 Using existing location event');
      }
    } catch (error) {
      console.error('❌ Error setting up location event:', error);
      throw error;
    }
    
    // Count existing records for user 1
    const existingCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM auto_attendance WHERE user_id = 1'
    );
    const existingCount = parseInt(existingCountResult.rows[0].count);
    console.log(`📊 Existing attendance records for user 1: ${existingCount}`);
    
    // Generate attendance records
    const recordsToGenerate = [];
    let workingDays = 0;
    
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }
      
      workingDays++;
      const currentDate = new Date(d);
      
      // Generate realistic clock-in time (8:00 AM to 9:30 AM)
      const clockInHour = 8 + Math.floor(Math.random() * 2);
      const clockInMinute = Math.floor(Math.random() * 60);
      const clockInTime = new Date(currentDate);
      clockInTime.setHours(clockInHour, clockInMinute, 0, 0);
      
      // Generate realistic clock-out time (5:00 PM to 6:30 PM)
      const clockOutHour = 17 + Math.floor(Math.random() * 2);
      const clockOutMinute = Math.floor(Math.random() * 60);
      const clockOutTime = new Date(currentDate);
      clockOutTime.setHours(clockOutHour, clockOutMinute, 0, 0);
      
      // Ensure clock-out is after clock-in (at least 6 hours, max 12 hours)
      const minWorkHours = 6;
      const maxWorkHours = 12;
      const workHours = minWorkHours + Math.random() * (maxWorkHours - minWorkHours);
      
      if (clockOutTime <= clockInTime) {
        clockOutTime.setTime(clockInTime.getTime() + workHours * 60 * 60 * 1000);
      } else {
        const actualHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
        if (actualHours < minWorkHours || actualHours > maxWorkHours) {
          clockOutTime.setTime(clockInTime.getTime() + workHours * 60 * 60 * 1000);
        }
      }
      
      recordsToGenerate.push({
        clockIn: clockInTime,
        clockOut: clockOutTime,
        date: currentDate
      });
    }
    
    console.log(`📈 Planning to generate records for ${workingDays} working days`);
    console.log(`📄 Total records to insert: ${recordsToGenerate.length * 2} (clock-in + clock-out pairs)`);
    
    // Insert the attendance records
    let insertedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Inserting attendance records...');
    
    for (let i = 0; i < recordsToGenerate.length; i++) {
      const record = recordsToGenerate[i];
      const progress = Math.round((i / recordsToGenerate.length) * 100);
      
      try {
        // Insert clock-in record
        await pool.query(
          `INSERT INTO auto_attendance (user_id, location_event_id, event_type, timestamp, notes) 
           VALUES (1, $1, 'clock_in', $2, 'Generated test clock-in')`,
          [locationEventId, record.clockIn]
        );
        
        // Insert clock-out record
        await pool.query(
          `INSERT INTO auto_attendance (user_id, location_event_id, event_type, timestamp, notes) 
           VALUES (1, $1, 'clock_out', $2, 'Generated test clock-out')`,
          [locationEventId, record.clockOut]
        );
        
        insertedCount += 2;
        
        // Show progress every 10%
        if (i % Math.max(1, Math.floor(recordsToGenerate.length / 10)) === 0) {
          process.stdout.write(`\r🔄 Progress: ${progress}% (${insertedCount} records inserted)`);
        }
        
      } catch (error) {
        if (error.code === '23505') { // Duplicate key error
          duplicateCount += 2;
        } else {
          errorCount += 2;
          console.error(`\n❌ Error inserting record for ${record.date.toISOString().split('T')[0]}:`, error.message);
        }
      }
    }
    
    process.stdout.write('\n');
    
    // Verify and show results
    const finalCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM auto_attendance 
       WHERE user_id = 1 AND timestamp >= $1 AND timestamp <= $2`,
      [startDate, today]
    );
    
    const totalCount = parseInt(finalCountResult.rows[0].count);
    
    console.log('\n✅ Generation complete!');
    console.log('📊 Summary:');
    console.log(`   • Working days processed: ${workingDays}`);
    console.log(`   • Records attempted: ${recordsToGenerate.length * 2}`);
    console.log(`   • Successfully inserted: ${insertedCount}`);
    console.log(`   • Duplicate records skipped: ${duplicateCount}`);
    console.log(`   • Errors encountered: ${errorCount}`);
    console.log(`   • Total records in database: ${totalCount}`);
    console.log(`   • Net new records added: ${insertedCount}`);
    
    // Show sample of recent records
    console.log('\n📋 Sample of recent records:');
    const sampleRecords = await pool.query(
      `SELECT aa.timestamp, aa.event_type, aa.notes, le.latitude, le.longitude
       FROM auto_attendance aa
       JOIN location_events le ON aa.location_event_id = le.id
       WHERE aa.user_id = 1 
       ORDER BY aa.timestamp DESC 
       LIMIT 5`
    );
    
    sampleRecords.rows.forEach(record => {
      console.log(`   • ${record.timestamp.toLocaleString()} - ${record.event_type} - ${record.notes}`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error during attendance generation:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed.');
  }
}

// Handle command line arguments
const startDateArg = process.argv[2];

if (startDateArg) {
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDateArg)) {
    console.error('❌ Invalid date format. Please use YYYY-MM-DD format.');
    console.error('💡 Example: node generate_attendance_records.js 2024-01-01');
    process.exit(1);
  }
  
  const startDate = new Date(startDateArg);
  if (isNaN(startDate.getTime())) {
    console.error('❌ Invalid date provided.');
    process.exit(1);
  }
  
  if (startDate > new Date()) {
    console.error('❌ Start date cannot be in the future.');
    process.exit(1);
  }
  
  generateAttendanceRecords(startDateArg);
} else {
  console.log('ℹ️  No start date provided. Using default: 2024-01-01');
  console.log('💡 Usage: node generate_attendance_records.js YYYY-MM-DD');
  generateAttendanceRecords();
}