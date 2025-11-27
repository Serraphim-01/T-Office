import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve('./backend/.env.local') });

async function testDbQuery() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    
    // Test the exact query used in the authenticateJWT middleware
    const userId = 1; // Oyebode Jeremiah's user ID
    console.log('Testing query for user ID:', userId);
    
    const userResult = await pool.query(
      `SELECT u.department, COALESCE(r.name, 'default') as role 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [userId]
    );
    
    console.log('Query result:', userResult);
    console.log('Rows:', userResult.rows);
    
    if (userResult.rows.length > 0) {
      const { department, role } = userResult.rows[0];
      console.log('User data:', { department, role });
    }
    
  } catch (error) {
    console.error('Database query error:', error);
  } finally {
    await pool.end();
  }
}

testDbQuery();