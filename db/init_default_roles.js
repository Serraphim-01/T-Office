import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve('.env.local') });

async function initDefaultRoles() {
  // Use the correct database URL from the docker-compose configuration
  const pool = new Pool({
    connectionString: 'postgres://postgres:password@localhost:5433/office',
  });

  try {
    console.log('Initializing default roles for all departments...');
    
    // Get all departments
    const deptResult = await pool.query('SELECT id, name FROM departments');
    const departments = deptResult.rows;
    
    console.log(`Found ${departments.length} departments`);
    
    // For each department, ensure it has a default role
    for (const dept of departments) {
      console.log(`Processing department: ${dept.name}`);
      
      // Check if default role already exists
      const roleResult = await pool.query(
        'SELECT id FROM roles WHERE department_id = $1 AND is_default = true',
        [dept.id]
      );
      
      if (roleResult.rows.length === 0) {
        console.log(`  Creating default role for ${dept.name}`);
        // Create default role
        await pool.query(
          'INSERT INTO roles (department_id, name, is_default) VALUES ($1, $2, $3)',
          [dept.id, 'default', true]
        );
      } else {
        console.log(`  Default role already exists for ${dept.name}`);
      }
      
      // Update existing users in this department to have the default role
      console.log(`  Updating users in ${dept.name} to have default role`);
      await pool.query(
        `UPDATE users 
         SET role_id = (
           SELECT id FROM roles 
           WHERE department_id = $1 AND is_default = true
         )
         WHERE department = $2 AND role_id IS NULL`,
        [dept.id, dept.name]
      );
    }
    
    console.log('Default roles initialization completed successfully!');
  } catch (err) {
    console.error('Initialization failed:', err);
  } finally {
    await pool.end();
  }
}

initDefaultRoles();