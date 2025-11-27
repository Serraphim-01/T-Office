import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve('./backend/.env.local') });

async function checkDbSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    
    // Check if users table exists and has role_id column
    const usersTableQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role_id'
    `;
    
    const usersResult = await pool.query(usersTableQuery);
    console.log('Users table role_id column:', usersResult.rows);
    
    // Check if roles table exists
    const rolesTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'roles'
    `;
    
    const rolesResult = await pool.query(rolesTableQuery);
    console.log('Roles table exists:', rolesResult.rows.length > 0);
    
    // Check if role_page_access table exists
    const rolePageAccessTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'role_page_access'
    `;
    
    const rolePageAccessResult = await pool.query(rolePageAccessTableQuery);
    console.log('Role page access table exists:', rolePageAccessResult.rows.length > 0);
    
    // Check sample data in users table
    const sampleUsersQuery = `
      SELECT id, full_name, email, department, role_id 
      FROM users 
      LIMIT 5
    `;
    
    const sampleUsersResult = await pool.query(sampleUsersQuery);
    console.log('Sample users:', sampleUsersResult.rows);
    
    // Check sample data in roles table
    if (rolesResult.rows.length > 0) {
      const sampleRolesQuery = `
        SELECT id, department_id, name, is_default 
        FROM roles 
        LIMIT 5
      `;
      
      const sampleRolesResult = await pool.query(sampleRolesQuery);
      console.log('Sample roles:', sampleRolesResult.rows);
    }
    
    // Check sample data in role_page_access table
    if (rolePageAccessResult.rows.length > 0) {
      const sampleRolePageAccessQuery = `
        SELECT role_id, page_name 
        FROM role_page_access 
        LIMIT 5
      `;
      
      const sampleRolePageAccessResult = await pool.query(sampleRolePageAccessQuery);
      console.log('Sample role page access:', sampleRolePageAccessResult.rows);
    }
    
    // Check if there's a user with a known email
    const userQuery = `
      SELECT id, full_name, email, department, role_id, password_hash
      FROM users 
      WHERE email = 'jeremiah@example.com'
    `;
    
    const userResult = await pool.query(userQuery);
    if (userResult.rows.length > 0) {
      console.log('Found user with email jeremiah@example.com:', userResult.rows[0]);
    } else {
      console.log('No user found with email jeremiah@example.com');
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

checkDbSchema();