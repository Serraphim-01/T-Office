import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { Pool } = pg;

// Create a pool instance with the correct connection details
const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/office',
});

async function addTestAttendance() {
  try {
    console.log('Adding test attendance records to auto_attendance table...');
    
    // First, we need to create a location event to reference
    const locationEventResult = await pool.query(
      `INSERT INTO location_events (user_id, location_id, event_type, latitude, longitude) 
       VALUES (1, 1, 'entry', 40.7128, -74.0060) 
       RETURNING id`
    );
    
    const locationEventId = locationEventResult.rows[0].id;
    
    // Add some test attendance records for user ID 1
    const result = await pool.query(
      `INSERT INTO auto_attendance (user_id, location_event_id, event_type, timestamp, notes) 
       VALUES 
       (1, $1, 'clock_in', NOW() - INTERVAL '1 day', 'Manual clock-in at Main Office'),
       (1, $1, 'clock_out', NOW() - INTERVAL '1 day' + INTERVAL '8 hours', 'Manual clock-out at Main Office'),
       (1, $1, 'clock_in', NOW() - INTERVAL '2 days', 'Manual clock-in at Main Office'),
       (1, $1, 'clock_out', NOW() - INTERVAL '2 days' + INTERVAL '7.5 hours', 'Manual clock-out at Main Office'),
       (1, $1, 'clock_in', NOW() - INTERVAL '3 days', 'Manual clock-in at Main Office'),
       (1, $1, 'clock_out', NOW() - INTERVAL '3 days' + INTERVAL '9 hours', 'Manual clock-out at Main Office')
       RETURNING *`,
       [locationEventId]
    );
    
    console.log('Test attendance records added:', result.rows);
    
    // Verify the records were added
    const verifyResult = await pool.query(
      'SELECT * FROM auto_attendance WHERE user_id = 1 ORDER BY timestamp DESC'
    );
    
    console.log('All attendance records for user 1:', verifyResult.rows);
    
  } catch (error) {
    console.error('Error adding test attendance records:', error);
  } finally {
    await pool.end();
  }
}

addTestAttendance();