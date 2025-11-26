import express from "express";
import { authenticateJWT } from "./auth.js";

const router = express.Router();

// Get all tables, their columns, and sample records
router.get("/tables", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  try {
    // Get all table names
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = [];

    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;

      // Get columns for this table
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);

      // Get sample records (first 10)
      const recordsResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 10`);

      tables.push({
        name: tableName,
        columns: columnsResult.rows,
        records: recordsResult.rows
      });
    }

    res.json(tables);
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a specific user
router.delete("/users/:id", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user (CASCADE will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add new department
router.post("/departments", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { name } = req.body;

  try {
    // Check if department already exists
    const existing = await pool.query(
      'SELECT id FROM departments WHERE name = $1',
      [name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Department already exists" });
    }

    const result = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING id, name',
      [name]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding department:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Rename department
router.put("/departments/:id", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Check if department exists
    const existing = await pool.query(
      'SELECT id FROM departments WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Check if another department with the same name already exists
    const nameCheck = await pool.query(
      'SELECT id FROM departments WHERE name = $1 AND id != $2',
      [name, id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ error: "A department with this name already exists" });
    }

    const result = await pool.query(
      'UPDATE departments SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name',
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error renaming department:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete department
router.delete("/departments/:id", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    // Check if department exists
    const existing = await pool.query(
      'SELECT id, name FROM departments WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    // According to requirements, departments should not be deletable
    // We'll return a specific error message indicating this
    return res.status(400).json({ error: "Departments cannot be deleted. You can only rename them." });
    
    // If we wanted to allow deletion, we would use the following code:
    /*
    const result = await pool.query(
      'DELETE FROM departments WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json({ message: "Department deleted successfully", department: result.rows[0] });
    */
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all departments
// Removed requireAdmin middleware to allow all users access
router.get("/departments", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        d.name,
        COUNT(dpa.page_name) as page_count
      FROM departments d
      LEFT JOIN department_page_access dpa ON d.id = dpa.department_id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New endpoint to get roles for a department
router.get("/departments/:departmentId/roles", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { departmentId } = req.params;

  try {
    // Validate department exists
    const deptResult = await pool.query(
      'SELECT id FROM departments WHERE id = $1',
      [departmentId]
    );

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Get roles for this department with page counts
    const result = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.is_default,
        COUNT(rpa.page_name) as page_count
      FROM roles r
      LEFT JOIN role_page_access rpa ON r.id = rpa.role_id
      WHERE r.department_id = $1
      GROUP BY r.id, r.name, r.is_default
      ORDER BY r.is_default DESC, r.name
    `, [departmentId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching department roles:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New endpoint to create a role for a department
router.post("/departments/:departmentId/roles", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { departmentId } = req.params;
  const { name } = req.body;

  try {
    // Validate department exists
    const deptResult = await pool.query(
      'SELECT id FROM departments WHERE id = $1',
      [departmentId]
    );

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Check if role already exists
    const existingRole = await pool.query(
      'SELECT id FROM roles WHERE department_id = $1 AND name = $2',
      [departmentId, name]
    );

    if (existingRole.rows.length > 0) {
      return res.status(400).json({ error: "Role already exists in this department" });
    }

    // Create the new role
    const result = await pool.query(
      'INSERT INTO roles (department_id, name) VALUES ($1, $2) RETURNING id, name, is_default',
      [departmentId, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating role:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New endpoint to update a role name
router.put("/roles/:roleId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { roleId } = req.params;
  const { name } = req.body;

  try {
    // Validate role exists
    const roleResult = await pool.query(
      'SELECT id, department_id, is_default FROM roles WHERE id = $1',
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }

    const role = roleResult.rows[0];

    // Check if another role with the same name already exists in this department
    const nameCheck = await pool.query(
      'SELECT id FROM roles WHERE department_id = $1 AND name = $2 AND id != $3',
      [role.department_id, name, roleId]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ error: "A role with this name already exists in this department" });
    }

    // Determine if the role should still be marked as default
    // A role is default if its name is "default" (case insensitive)
    const shouldBeDefault = name.toLowerCase() === 'default';

    // Update the role name and is_default flag
    const result = await pool.query(
      'UPDATE roles SET name = $1, is_default = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, is_default',
      [name, shouldBeDefault, roleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New endpoint to get pages assigned to a role
router.get("/roles/:roleId/pages", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { roleId } = req.params;

  try {
    let roleQuery, queryParams;
    
    // Check if roleId is numeric (ID) or a string (name)
    if (isNaN(roleId)) {
      // It's a role name, we need to find the role by name and department
      const userDept = req.user.department;
      roleQuery = `SELECT r.id FROM roles r 
                   JOIN departments d ON r.department_id = d.id 
                   WHERE r.name = $1 AND d.name = $2`;
      queryParams = [roleId, userDept];
    } else {
      // It's a role ID
      roleQuery = 'SELECT id FROM roles WHERE id = $1';
      queryParams = [roleId];
    }

    // Validate role exists
    const roleResult = await pool.query(roleQuery, queryParams);

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }

    const actualRoleId = roleResult.rows[0].id;

    // Get pages assigned to this role
    const result = await pool.query(
      'SELECT page_name FROM role_page_access WHERE role_id = $1',
      [actualRoleId]
    );

    const pages = result.rows.map(row => row.page_name);
    res.json(pages);
  } catch (err) {
    console.error('Error fetching role page access:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New endpoint to update pages assigned to a role
router.post("/roles/:roleId/pages", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { roleId } = req.params;
  const { pages } = req.body; // Array of page names

  try {
    // Validate role exists
    const roleResult = await pool.query(
      'SELECT id FROM roles WHERE id = $1',
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Begin transaction
    await pool.query('BEGIN');

    // Delete existing page assignments for this role
    await pool.query(
      'DELETE FROM role_page_access WHERE role_id = $1',
      [roleId]
    );

    // Insert new page assignments
    if (pages && pages.length > 0) {
      for (const page of pages) {
        await pool.query(
          'INSERT INTO role_page_access (role_id, page_name) VALUES ($1, $2)',
          [roleId, page]
        );
      }
    }

    // Commit transaction
    await pool.query('COMMIT');

    res.json({ message: "Role feature access updated successfully" });
  } catch (err) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Error updating role page access:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get pending certificate approvals
router.get("/approvals/certifications", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  try {
    // Get all users with their certifications
    const result = await pool.query(`
      SELECT
        u.id as user_id, u.full_name as user_name, u.email as user_email,
        ud.certifications
      FROM users u
      LEFT JOIN user_details ud ON u.id = ud.user_id
      WHERE ud.certifications IS NOT NULL
    `);

    const pendingCertifications = [];

    for (const userRow of result.rows) {
      const certifications = Array.isArray(userRow.certifications) ? userRow.certifications : [];
      for (const cert of certifications) {
        if (cert.status === 'pending') {
          pendingCertifications.push({
            id: cert.id,
            user_id: userRow.user_id,
            user_name: userRow.user_name,
            user_email: userRow.user_email,
            title: cert.title,
            issuer: cert.issuer,
            file_url: cert.file_url,
            file_data: cert.file_data,
            file_type: cert.file_type,
            expiry_date: cert.expiry_date,
            has_expiry: cert.has_expiry,
            status: cert.status,
            created_at: cert.created_at
          });
        }
      }
    }

    res.json(pendingCertifications);
  } catch (err) {
    console.error('Error fetching certificate approvals:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update certificate approval status
router.put("/approvals/certifications/:certId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { certId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  try {
    // Find the user and certification
    const allUsersResult = await pool.query('SELECT user_id, certifications FROM user_details');

    for (const userRow of allUsersResult.rows) {
      const certs = userRow.certifications || [];
      const certIndex = certs.findIndex(cert => cert.id === certId);

      if (certIndex !== -1) {
        certs[certIndex].status = status;
        certs[certIndex].approved_at = status === 'approved' ? new Date().toISOString() : null;

        await pool.query(
          'UPDATE user_details SET certifications = $1, updated_at = NOW() WHERE user_id = $2',
          [JSON.stringify(certs), userRow.user_id]
        );

        return res.json({ message: `Certification ${status} successfully` });
      }
    }

    res.status(404).json({ error: "Certification not found" });
  } catch (err) {
    console.error('Error updating certification status:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete certificate
router.delete("/approvals/certifications/:certId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { certId } = req.params;

  try {
    // Find the user and certification
    const allUsersResult = await pool.query('SELECT user_id, certifications FROM user_details');

    for (const userRow of allUsersResult.rows) {
      const certs = userRow.certifications || [];
      const certIndex = certs.findIndex(cert => cert.id === certId);

      if (certIndex !== -1) {
        // Remove the certification from the array
        certs.splice(certIndex, 1);

        await pool.query(
          'UPDATE user_details SET certifications = $1, updated_at = NOW() WHERE user_id = $2',
          [JSON.stringify(certs), userRow.user_id]
        );

        return res.json({ message: "Certification deleted successfully" });
      }
    }

    res.status(404).json({ error: "Certification not found" });
  } catch (err) {
    console.error('Error deleting certification:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------
// Feature Access Control APIs
// ---------------------------------

// Get all available pages and features
router.get("/pages", authenticateJWT, async (req, res) => {
  try {
    // Define all available pages and features in the application
    const pages = [
      { name: 'dashboard', title: 'Dashboard' },
      { name: 'profile', title: 'Profile' },
      { name: 'chat', title: 'Chat' },
      { name: 'chat/moderator', title: 'Chat - Moderator Mode' },
      { name: 'chat/pause', title: 'Chat - Pause/Resume' },
      { name: 'chat/summarizer', title: 'Chat - Summarizer' },
      { name: 'chat/clear', title: 'Chat - Clear Chat' },
      { name: 'clock', title: 'Clock' },
      { name: 'clock/manage-locations', title: 'Clock - Manage Your Locations' },
      { name: 'clock/delete-locations', title: 'Clock - Delete Locations' },
      { name: 'settings', title: 'Settings' },
      { name: 'approvals', title: 'Approvals' },
      { name: 'admin/departments', title: 'Admin Departments' },
      { name: 'admin/features', title: 'Admin Features' },
      { name: 'hr/onboarding', title: 'HR Onboarding' },
      { name: 'hr/onboarding/create-user', title: 'HR Onboarding - Create New User' },
      { name: 'hr/onboarding/schedule-inductions', title: 'HR Onboarding - Schedule Inductions' },
      { name: 'hr/queries', title: 'HR Queries' },
      { name: 'hr/queries/send-query', title: 'HR Queries - Send Query' },
      { name: 'hr/users', title: 'HR Users' },
      { name: 'hr/users/view-details', title: 'HR Users - View Details' },
      { name: 'inventory/inbound', title: 'Inventory Inbound' },
      { name: 'inventory/inbound/export-csv', title: 'Inventory Inbound - Export CSV' },
      { name: 'inventory/inbound/add-transaction', title: 'Inventory Inbound - Add Inbound Transaction' },
      { name: 'inventory/inbound/edit-transaction', title: 'Inventory Inbound - Edit Inbound Transaction' },
      { name: 'inventory/inbound/delete-transaction', title: 'Inventory Inbound - Delete Transaction' },
      { name: 'inventory/inbound/mark-as-stored', title: 'Inventory Inbound - Mark As Stored' },
      { name: 'inventory/store', title: 'Inventory Store' },
      { name: 'inventory/store/export-csv', title: 'Inventory Store - Export CSV' },
      { name: 'inventory/store/create-outbound', title: 'Inventory Store - Create Outbound' },
      { name: 'inventory/outbound', title: 'Inventory Outbound' },
      { name: 'inventory/outbound/export-csv', title: 'Inventory Outbound - Export CSV' },
      { name: 'inventory/outbound/mark-as-dispatched', title: 'Inventory Outbound - Mark As Dispatched' },
      { name: 'inventory/outbound/mark-as-delivered', title: 'Inventory Outbound - Mark as Delivered' },
      { name: 'inventory/outbound/delete-transaction', title: 'Inventory Outbound - Delete Transaction' },
      { name: 'inventory/products', title: 'Inventory Products' },
      { name: 'inventory/products/import-csv', title: 'Inventory Products - Import CSV' },
      { name: 'inventory/products/import-all-data', title: 'Inventory Products - Import All Data' },
      { name: 'inventory/products/export-csv', title: 'Inventory Products - Export CSV' },
      { name: 'inventory/products/add-product', title: 'Inventory Products - Add Product' },
      { name: 'inventory/products/view-details', title: 'Inventory Products - View Details' },
      { name: 'inventory/products/edit-product', title: 'Inventory Products - Edit Product' },
      { name: 'inventory/products/delete-product', title: 'Inventory Products - Delete Product' },
      { name: 'resources/wiki', title: 'Resources Wiki' },
      { name: 'resources/wiki/create', title: 'Create Wiki Page' },
      { name: 'resources/wiki/create-topic', title: 'Create Wiki - Create Topic Button' }
    ];

    res.json(pages);
  } catch (err) {
    console.error('Error fetching pages:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get pages assigned to a department
router.get("/departments/:departmentId/pages", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { departmentId } = req.params;

  try {
    // Validate department exists
    const deptResult = await pool.query(
      'SELECT id FROM departments WHERE id = $1',
      [departmentId]
    );

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Get pages assigned to this department
    const result = await pool.query(
      'SELECT page_name FROM department_page_access WHERE department_id = $1',
      [departmentId]
    );

    const pages = result.rows.map(row => row.page_name);
    res.json(pages);
  } catch (err) {
    console.error('Error fetching department page access:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update pages assigned to a department
router.post("/departments/:departmentId/pages", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { departmentId } = req.params;
  const { pages } = req.body; // Array of page names

  try {
    // Validate department exists
    const deptResult = await pool.query(
      'SELECT id FROM departments WHERE id = $1',
      [departmentId]
    );

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Begin transaction
    await pool.query('BEGIN');

    // Delete existing page assignments for this department
    await pool.query(
      'DELETE FROM department_page_access WHERE department_id = $1',
      [departmentId]
    );

    // Insert new page assignments
    if (pages && pages.length > 0) {
      for (const page of pages) {
        await pool.query(
          'INSERT INTO department_page_access (department_id, page_name) VALUES ($1, $2)',
          [departmentId, page]
        );
      }
    }

    // Commit transaction
    await pool.query('COMMIT');

    res.json({ message: "Feature access updated successfully" });
  } catch (err) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Error updating department page access:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------
// Temporary endpoint to setup inventory schema
// ---------------------------------
router.post("/setup-inventory", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  try {
    const fs = await import('fs');
    const schema = fs.readFileSync('./inventory_schema.sql', 'utf8');

    // First drop existing inventory tables if they exist
    await pool.query('DROP TABLE IF EXISTS sub_products CASCADE');
    await pool.query('DROP TABLE IF EXISTS product_states CASCADE');
    await pool.query('DROP TABLE IF EXISTS products CASCADE');

    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    res.json({ message: "Inventory schema setup completed" });
  } catch (err) {
    console.error('Error setting up inventory schema:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------
// Location and Geofencing API Endpoints
// ---------------------------------

// Setup location schema
router.post("/setup-locations", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  try {
    const fs = await import('fs');
    const schema = fs.readFileSync('./location_schema.sql', 'utf8');

    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    res.json({ message: "Location schema setup completed" });
  } catch (err) {
    console.error('Error setting up location schema:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;