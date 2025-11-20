import express from "express";
import { authenticateJWT, requireHR, saltRounds } from "./auth.js";
import bcrypt from "bcrypt";

const router = express.Router();

// Create a new user
router.post("/users", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { name, email, department } = req.body;

  console.log('User creation:', { name, email, department });

  try {
    // Default password for new users
    const defaultPassword = 'TaskLtd@2025';
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    const result = await pool.query(
      'INSERT INTO users (full_name, email, department, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, department, hashedPassword]
    );
    const userId = result.rows[0].id;

    console.log('User created successfully with default password');
    res.status(201).json({
      id: userId,
      full_name: name,
      email: email,
      department: department,
      default_password: defaultPassword
    });
  } catch (err) {
    console.error('User creation error:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Get all users with their details
router.get("/users", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.department, u.created_at,
        ud.certifications, ud.cv, ud.portfolio, ud.job_description, ud.contract,
        ud.query_count, ud.attendance, ud.other_details
      FROM users u
      LEFT JOIN user_details ud ON u.id = ud.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user details
router.put("/users/:id", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  const { certifications, cv, portfolio, job_description, contract, other_details } = req.body;

  try {
    await pool.query(`
      UPDATE user_details
      SET certifications = $1, cv = $2, portfolio = $3, job_description = $4,
          contract = $5, other_details = $6, updated_at = NOW()
      WHERE user_id = $7
    `, [certifications, cv, portfolio, job_description, contract, other_details, id]);

    res.json({ message: "User details updated successfully" });
  } catch (err) {
    console.error('Error updating user details:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create induction
router.post("/inductions", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  const { department, induction_time, attendees } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO inductions (department, induction_time, attendees) VALUES ($1, $2, $3) RETURNING *',
      [department, induction_time, JSON.stringify(attendees)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating induction:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all inductions
router.get("/inductions", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  try {
    const result = await pool.query('SELECT * FROM inductions ORDER BY induction_time DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inductions:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send query to user
router.post("/queries", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  const { user_id, query_text } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO hr_queries (user_id, query_text) VALUES ($1, $2) RETURNING *',
      [user_id, query_text]
    );

    // Increment query count
    await pool.query(
      'UPDATE user_details SET query_count = query_count + 1 WHERE user_id = $1',
      [user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error sending query:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get queries for a user
router.get("/queries/:userId", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM hr_queries WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching queries:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update query response
router.put("/queries/:id", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  const { response, status } = req.body;

  try {
    await pool.query(
      'UPDATE hr_queries SET response = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [response, status, id]
    );

    res.json({ message: "Query updated successfully" });
  } catch (err) {
    console.error('Error updating query:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get attendance for a user
router.get("/attendance/:userId", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add attendance record
router.post("/attendance", authenticateJWT, requireHR, async (req, res) => {
  const pool = req.pool;
  const { user_id, date, status, notes } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO attendance (user_id, date, status, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, date, status, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding attendance:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
