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

// Clear all database records including users
// Removed requireAdmin middleware to allow all users access
router.post("/clear-db", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  try {
    // Clear tables in order to avoid foreign key issues
    await pool.query('TRUNCATE TABLE user_activities CASCADE');
    await pool.query('TRUNCATE TABLE crawled_sites CASCADE');
    await pool.query('TRUNCATE TABLE compliance_documents CASCADE');
    await pool.query('TRUNCATE TABLE users CASCADE');

    res.json({ message: "Database cleared successfully" });
  } catch (err) {
    console.error('Error clearing database:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a specific user
// Removed requireAdmin middleware to allow all users access
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

// Get department configuration
// Removed requireAdmin middleware to allow all users access
router.get("/department-config/:department", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { department } = req.params;

  try {
    const result = await pool.query(
      'SELECT features FROM department_configs WHERE department = $1',
      [department]
    );

    if (result.rows.length === 0) {
      // Return default config if department not found
      const defaultConfig = {
        department,
        features: {}
      };
      return res.json(defaultConfig);
    }

    res.json({
      department,
      features: result.rows[0].features
    });
  } catch (err) {
    console.error('Error fetching department config:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update department configuration (Now available to all users)
// Removed requireAdmin middleware to allow all users access
router.put("/department-config/:department", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { department } = req.params;
  const config = req.body;

  try {
    await pool.query(
      'INSERT INTO department_configs (department, features) VALUES ($1, $2) ON CONFLICT (department) DO UPDATE SET features = $2',
      [department, JSON.stringify(config)]
    );

    res.json({ message: "Department configuration updated successfully" });
  } catch (err) {
    console.error('Error updating department config:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add new department
// Removed requireAdmin middleware to allow all users access
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
    const result = await pool.query('SELECT id, name FROM departments ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
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
