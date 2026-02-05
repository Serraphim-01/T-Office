#!/usr/bin/env node

/**
 * Generate Attendance Records Script
 * Standalone script to generate attendance records from a start date to today for all users without attendance data
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
    
    // Get all users from the database
    const usersResult = await pool.query('SELECT id, full_name FROM users WHERE active = true');
    const allUsers = usersResult.rows;
    console.log(`👥 Found ${allUsers.length} active users in the database`);
    
    // Get users who already have attendance records
    const usersWithAttendanceResult = await pool.query(`
      SELECT DISTINCT user_id 
      FROM auto_attendance
    `);
    const usersWithAttendance = new Set(usersWithAttendanceResult.rows.map(row => row.user_id));
    
    // Find users without attendance records
    const usersWithoutAttendance = allUsers.filter(user => !usersWithAttendance.has(user.id));
    console.log(`👤 Found ${usersWithoutAttendance.length} users without attendance records`);
    
    if (usersWithoutAttendance.length === 0) {
      console.log('✅ All users already have attendance records. Nothing to generate.');
      return;
    }
    
    console.log(`📋 Users without attendance records: ${usersWithoutAttendance.map(u => u.full_name).join(', ')}`);
    
    // Process each user without attendance
    for (let i = 0; i < usersWithoutAttendance.length; i++) {
      const user = usersWithoutAttendance[i];
      console.log(`\n🔄 Processing user: ${user.full_name} (ID: ${user.id}) - ${i + 1}/${usersWithoutAttendance.length}`);
      
      // Create or get location event for this user
      let locationEventId;
      try {
        // First, try to get an existing location event for this user
        const existingEvent = await pool.query(
          'SELECT id FROM location_events WHERE user_id = $1 AND location_id = 1 LIMIT 1',
          [user.id]
        );
        
        if (existingEvent.rows.length > 0) {
          locationEventId = existingEvent.rows[0].id;
          console.log('📍 Using existing location event for user');
        } else {
          // Create a new location event if none exists
          const locationEventResult = await pool.query(
            `INSERT INTO location_events (user_id, location_id, event_type, latitude, longitude, is_auto_generated) 
             VALUES ($1, 1, 'entry', 6.432839, 3.419496, false) 
             RETURNING id`,
            [user.id]
          );
          
          locationEventId = locationEventResult.rows[0].id;
          console.log('📍 Created new location event for user');
        }
      } catch (error) {
        console.error('❌ Error setting up location event:', error);
        throw error;
      }
      
      // Count existing records for this user
      const existingCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM auto_attendance WHERE user_id = $1',
        [user.id]
      );
      const existingCount = parseInt(existingCountResult.rows[0].count);
      console.log(`📊 Existing attendance records for user ${user.id}: ${existingCount}`);
      
      // Generate attendance records for this user
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
        
        // Random chance to skip this day entirely (missed day) - 5% chance
        const skipDayChance = Math.random();
        if (skipDayChance < 0.05) {
          console.log(`   🚫 Skipping day ${currentDate.toISOString().split('T')[0]} (absent)`);
          continue;
        }
        
        // Generate realistic clock-in time (7:30 AM to 10:00 AM)
        let clockInHour = 8 + Math.floor(Math.random() * 2); // Base 8-9 AM
        
        // Sometimes come late (10% chance)
        if (Math.random() < 0.1) {
          clockInHour = 10 + Math.floor(Math.random() * 3); // 10-12 AM
        }
        // Sometimes come very early (5% chance)
        else if (Math.random() < 0.05) {
          clockInHour = 7 + Math.floor(Math.random() * 1); // 7-8 AM
        }
        
        const clockInMinute = Math.floor(Math.random() * 60);
        const clockInTime = new Date(currentDate);
        clockInTime.setHours(clockInHour, clockInMinute, 0, 0);
        
        // Generate realistic clock-out time (4:00 PM to 8:00 PM)
        let clockOutHour = 17 + Math.floor(Math.random() * 1); // Base 5-6 PM
        
        // Sometimes leave early (8% chance)
        if (Math.random() < 0.08) {
          clockOutHour = 16 + Math.floor(Math.random() * 1); // 4-5 PM
        }
        // Sometimes stay late (12% chance)
        else if (Math.random() < 0.12) {
          clockOutHour = 18 + Math.floor(Math.random() * 3); // 6-8 PM
        }
        
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
      
      console.log(`📈 Planning to generate records for ${recordsToGenerate.length} working days for user ${user.id}`);
      console.log(`📄 Total records to insert: ${recordsToGenerate.length * 2} (clock-in + clock-out pairs)`);
      
      // Insert the attendance records for this user
      let insertedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      
      console.log(`🔄 Inserting attendance records for ${user.full_name}...`);
      
      for (let j = 0; j < recordsToGenerate.length; j++) {
        const record = recordsToGenerate[j];
        const progress = Math.round((j / recordsToGenerate.length) * 100);
        
        try {
          // Insert clock-in record
          await pool.query(
            `INSERT INTO auto_attendance (user_id, location_event_id, event_type, timestamp, notes) 
             VALUES ($1, $2, 'clock_in', $3, 'Generated test clock-in')`,
            [user.id, locationEventId, record.clockIn]
          );
          
          // Insert clock-out record
          await pool.query(
            `INSERT INTO auto_attendance (user_id, location_event_id, event_type, timestamp, notes) 
             VALUES ($1, $2, 'clock_out', $3, 'Generated test clock-out')`,
            [user.id, locationEventId, record.clockOut]
          );
          
          insertedCount += 2;
          
          // Show progress every 10%
          if (j % Math.max(1, Math.floor(recordsToGenerate.length / 10)) === 0) {
            process.stdout.write(`\r   🔄 Progress: ${progress}% (${insertedCount} records inserted)`);
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
      
      // Verify and show results for this user
      const finalCountResult = await pool.query(
        `SELECT COUNT(*) as count FROM auto_attendance 
         WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3`,
        [user.id, startDate, today]
      );
      
      const totalCount = parseInt(finalCountResult.rows[0].count);
      
      console.log(`✅ User ${user.full_name} processing complete!`);
      console.log('📊 Summary:');
      console.log(`   • Working days processed: ${recordsToGenerate.length}`);
      console.log(`   • Records attempted: ${recordsToGenerate.length * 2}`);
      console.log(`   • Successfully inserted: ${insertedCount}`);
      console.log(`   • Duplicate records skipped: ${duplicateCount}`);
      console.log(`   • Errors encountered: ${errorCount}`);
      console.log(`   • Total records in database: ${totalCount}`);
      console.log(`   • Net new records added: ${insertedCount}`);
      
      // Show sample of recent records for this user
      console.log('\n📋 Sample of recent records:');
      const sampleRecords = await pool.query(
        `SELECT aa.timestamp, aa.event_type, aa.notes, le.latitude, le.longitude
         FROM auto_attendance aa
         JOIN location_events le ON aa.location_event_id = le.id
         WHERE aa.user_id = $1 
         ORDER BY aa.timestamp DESC 
         LIMIT 5`,
        [user.id]
      );
      
      sampleRecords.rows.forEach(record => {
        console.log(`   • ${record.timestamp.toLocaleString()} - ${record.event_type} - ${record.notes}`);
      });
    }
    
    console.log('\n🎉 All users processed successfully!');
    
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
  
  generateAttendanceRecords(startDateArg);
} else {
  console.log('ℹ️  No start date provided. Using default: 2024-01-01');
  console.log('💡 Usage: node generate_attendance_records.js YYYY-MM-DD');
  generateAttendanceRecords();
}