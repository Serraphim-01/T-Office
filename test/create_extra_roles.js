/**
 * Extra Roles Creation Test Script
 * This script creates extra roles in departments:
 * - 1 extra role for the 'Admin' department
 * - 2-4 extra roles for other departments
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../backend/.env.local' });

async function createExtraRoles() {
  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL || process.env.BACKEND_DATABASE_URL
  });
  
  try {
    await dbClient.connect();
    console.log('Connected to database successfully.');

    // Get all departments
    const departmentsResult = await dbClient.query('SELECT id, name FROM departments');
    const departments = departmentsResult.rows;
    
    console.log(`Found ${departments.length} departments:`);
    departments.forEach(dept => {
      console.log(`  - ${dept.name} (ID: ${dept.id})`);
    });

    // Create extra roles for each department
    for (const department of departments) {
      console.log(`\nProcessing department: ${department.name}`);

      if (department.name.toLowerCase() === 'admin') {
        // For Admin department: create 1 extra role
        await createRole(dbClient, department.id, 'admin-manager');
        console.log(`  Created 1 extra role for ${department.name}`);
      } else {
        // For other departments: create 2-4 extra roles
        const numExtraRoles = Math.floor(Math.random() * 3) + 2; // Random number between 2 and 4
        
        for (let i = 1; i <= numExtraRoles; i++) {
          await createRole(dbClient, department.id, `${department.name.toLowerCase()}-role-${i}`);
        }
        console.log(`  Created ${numExtraRoles} extra roles for ${department.name}`);
      }
    }

    // Count total roles by department
    const roleCounts = await dbClient.query(`
      SELECT d.name as department, COUNT(r.id) as role_count
      FROM departments d
      LEFT JOIN roles r ON d.id = r.department_id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);

    console.log('\nFinal role counts by department:');
    roleCounts.rows.forEach(row => {
      console.log(`  ${row.department}: ${row.role_count} roles`);
    });

    console.log('\n✅ Extra roles creation completed successfully!');
  } catch (error) {
    console.error('❌ Error creating extra roles:', error.message);
    throw error;
  } finally {
    await dbClient.end();
  }
}

async function createRole(dbClient, departmentId, roleName) {
  try {
    // Check if role already exists
    const existingRole = await dbClient.query(
      'SELECT id FROM roles WHERE department_id = $1 AND name = $2',
      [departmentId, roleName]
    );

    if (existingRole.rows.length > 0) {
      console.log(`    Role '${roleName}' already exists for department ID ${departmentId}`);
      return existingRole.rows[0].id;
    }

    // Create the new role
    const result = await dbClient.query(
      'INSERT INTO roles (department_id, name, is_default) VALUES ($1, $2, $3) RETURNING id',
      [departmentId, roleName, false]
    );

    console.log(`    Created role: ${roleName} (ID: ${result.rows[0].id})`);
    return result.rows[0].id;
  } catch (error) {
    console.error(`    Error creating role '${roleName}' for department ID ${departmentId}:`, error.message);
    throw error;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createExtraRoles()
    .then(() => console.log('Script completed successfully'))
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { createExtraRoles, createRole };