// Test script to check notification filtering
import { Client } from 'pg';

// Database configuration
const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'password',
  database: 'office'
});

async function testNotificationFiltering() {
  try {
    // Connect to database
    await client.connect();
    
    // Insert test notifications directly into the database
    console.log('Inserting test notifications...');
    
    // Insert a chat notification
    await client.query(
      `INSERT INTO user_notifications (user_id, type, title, message, timestamp) 
       VALUES (1, 'chat_message', 'Test Chat Message', 'This is a test chat message', NOW())`
    );
    
    // Insert a clock notification
    await client.query(
      `INSERT INTO user_notifications (user_id, type, title, message, timestamp) 
       VALUES (1, 'location_created', 'Location Created', 'A new location was created', NOW())`
    );
    
    // Insert a regular notification
    await client.query(
      `INSERT INTO user_notifications (user_id, type, title, message, timestamp) 
       VALUES (1, 'info', 'General Info', 'This is general information', NOW())`
    );
    
    console.log('Test notifications inserted.');
    
    // Check what notifications are in the database
    const result = await client.query(
      'SELECT id, type, title, message FROM user_notifications WHERE user_id = 1 ORDER BY timestamp DESC LIMIT 10'
    );
    
    console.log('Current notifications in database:');
    result.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Type: ${row.type}, Title: ${row.title}, Message: ${row.message}`);
    });
    
    // Close connection
    await client.end();
  } catch (err) {
    console.error('Error testing notification filtering:', err);
  }
}

testNotificationFiltering();