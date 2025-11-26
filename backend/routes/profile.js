import express from "express";
import { authenticateJWT } from "./auth.js";

const router = express.Router();

// Get user profile
router.get("/", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const userId = req.user.userId;

  try {
    // Get user info with role
    const userResult = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.department, u.created_at, r.name as role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    
    // Get user details
    const detailsResult = await pool.query(
      `SELECT certifications, cv, portfolio, job_description, contract, query_count, attendance, other_details
       FROM user_details
       WHERE user_id = $1`,
      [userId]
    );
    
    const userDetails = detailsResult.rows.length > 0 ? detailsResult.rows[0] : {};
    
    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      department: user.department,
      role: user.role,
      created_at: user.created_at,
      certifications: userDetails.certifications || [],
      cv: userDetails.cv || null,
      portfolio: userDetails.portfolio || null,
      job_description: userDetails.job_description || null,
      contract: userDetails.contract || null,
      query_count: userDetails.query_count || 0,
      attendance: userDetails.attendance || [],
      other_details: userDetails.other_details || {}
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get queries for the current user
router.get("/queries", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const userId = req.user.userId;

  try {
    // Get the maximum number of queries before action is required
    const maxQueriesResult = await pool.query(
      'SELECT query_count FROM user_details WHERE user_id = $1',
      [userId]
    );
    
    const maxQueriesBeforeAction = maxQueriesResult.rows.length > 0 ? maxQueriesResult.rows[0].query_count : 5;
    
    // Get queries for this user
    const queriesResult = await pool.query(
      'SELECT * FROM hr_queries WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      queries: queriesResult.rows,
      max_queries_before_action: maxQueriesBeforeAction
    });
  } catch (err) {
    console.error('Error fetching user queries:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit a new query
router.post("/queries", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const userId = req.user.userId;
  const { subject, description } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO hr_queries (user_id, subject, description) VALUES ($1, $2, $3) RETURNING *',
      [userId, subject, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting query:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a certification
router.post("/certifications", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const userId = req.user.userId;
  const { title, issuer, file_data, file_name, file_type, expiry_date, has_expiry } = req.body;

  try {
    // Get current certifications
    const currentResult = await pool.query(
      'SELECT certifications FROM user_details WHERE user_id = $1',
      [userId]
    );

    let certifications = [];
    if (currentResult.rows.length > 0) {
      certifications = currentResult.rows[0].certifications || [];
    }

    // Create new certification object
    const newCertification = {
      id: Date.now().toString(), // Simple ID generation
      title,
      issuer,
      file_data: file_data || null,
      file_name: file_name || null,
      file_type: file_type || null,
      expiry_date: expiry_date || null,
      has_expiry: has_expiry || false,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Add new certification to array
    certifications.push(newCertification);

    // Update user details
    const result = await pool.query(
      `INSERT INTO user_details (user_id, certifications)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET certifications = $2, updated_at = NOW()`,
      [userId, JSON.stringify(certifications)]
    );

    res.status(201).json(newCertification);
  } catch (err) {
    console.error('Error adding certification:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a certification
router.delete("/certifications/:certId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const userId = req.user.userId;
  const { certId } = req.params;

  try {
    // Get current certifications
    const currentResult = await pool.query(
      'SELECT certifications FROM user_details WHERE user_id = $1',
      [userId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "User details not found" });
    }

    let certifications = currentResult.rows[0].certifications || [];

    // Remove certification with matching ID
    certifications = certifications.filter((cert) => cert.id !== certId);

    // Update user details
    await pool.query(
      'UPDATE user_details SET certifications = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(certifications), userId]
    );

    res.json({ message: "Certification deleted successfully" });
  } catch (err) {
    console.error('Error deleting certification:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
