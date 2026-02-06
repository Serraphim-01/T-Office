import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createRoleChangeRequestsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'role_change_requests'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('role_change_requests table already exists');
      return;
    }
    
    // Create the role_change_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_change_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        current_role_id INTEGER REFERENCES roles(id),
        requested_role_id INTEGER REFERENCES roles(id),
        status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        approved_at TIMESTAMP WITH TIME ZONE,
        approved_by INTEGER REFERENCES users(id),
        rejection_reason TEXT,
        expires_at TIMESTAMP WITH TIME ZONE, -- When the change status should disappear
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_role_change_requests_user_id 
      ON role_change_requests(user_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_role_change_requests_status 
      ON role_change_requests(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_role_change_requests_requested_at 
      ON role_change_requests(requested_at);
    `);
    
    console.log('role_change_requests table created successfully');
    
  } catch (err) {
    console.error('Error creating role_change_requests table:', err);
  } finally {
    await client.end();
  }
}

// Run the migration
createRoleChangeRequestsTable();