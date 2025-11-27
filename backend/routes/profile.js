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
    
    // Log user info for debugging
    console.log(`Profile request for user ${userId}: department=${user.department}, role=${user.role}`);

    // Get user details
    const detailsResult = await pool.query(
      `SELECT certifications, cv, portfolio, job_description, contract, query_count, attendance, other_details
       FROM user_details
       WHERE user_id = $1`,
      [userId]
    );
    
    const userDetails = detailsResult.rows.length > 0 ? detailsResult.rows[0] : {};
    
    // Get user inductions
    const inductionsResult = await pool.query(
      `SELECT i.id, i.department, i.induction_time, i.attendees
       FROM inductions i
       WHERE $1::text = ANY(SELECT jsonb_array_elements_text(i.attendees))`,
      [userId.toString()]
    );
    
    // Enhance inductions with attendee names
    const enhancedInductions = [];
    for (const induction of inductionsResult.rows) {
      // Get attendee names
      const attendeeIds = induction.attendees || [];
      if (attendeeIds.length > 0) {
        const attendeeQuery = `SELECT id, full_name FROM users WHERE id = ANY($1::int[])`;
        const attendeeResult = await pool.query(attendeeQuery, [attendeeIds]);
        const attendeeMap = {};
        attendeeResult.rows.forEach(row => {
          attendeeMap[row.id] = row.full_name;
        });
        
        enhancedInductions.push({
          ...induction,
          attendee_names: attendeeIds.map(id => ({
            id: id,
            name: attendeeMap[id] || 'Unknown User'
          }))
        });
      } else {
        enhancedInductions.push({
          ...induction,
          attendee_names: []
        });
      }
    }
    
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
      other_details: userDetails.other_details || {},
      inductions: enhancedInductions || []
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
    
    // Get queries for this user with replies
    // First check if query_replies table exists
    const tableExistsResult = await pool.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_name = 'query_replies'
       )`
    );
    
    let queriesResult;
    if (tableExistsResult.rows[0].exists) {
      // Table exists, use the full query with joins
      queriesResult = await pool.query(
        `WITH latest_replies AS (
           SELECT 
             qr.query_id,
             qr.replied_by,
             u.department as replied_by_department,
             ROW_NUMBER() OVER (PARTITION BY qr.query_id ORDER BY qr.created_at DESC) as rn
           FROM query_replies qr
           JOIN users u ON qr.replied_by = u.id
         )
         SELECT q.*, u.full_name as replied_by_name, r.id as reply_id, r.reply_text, r.replied_by, r.created_at as reply_created_at,
                CASE 
                  WHEN lr.replied_by_department IN ('HR', 'Admin') THEN true
                  ELSE false
                END as last_reply_from_authorized_user
         FROM hr_queries q
         LEFT JOIN query_replies r ON q.id = r.query_id
         LEFT JOIN users u ON r.replied_by = u.id
         LEFT JOIN latest_replies lr ON q.id = lr.query_id AND lr.rn = 1
         WHERE q.user_id = $1 
         ORDER BY q.created_at DESC, r.created_at ASC`,
        [userId]
      );
    } else {
      // Table doesn't exist, use simplified query without joins
      queriesResult = await pool.query(
        `SELECT *, NULL as replied_by_name, NULL as reply_id, NULL as reply_text, NULL as replied_by, NULL as reply_created_at, false as last_reply_from_authorized_user
         FROM hr_queries
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );
    }

    // Group queries with their replies
    const queriesMap = new Map();
    queriesResult.rows.forEach(row => {
      if (!queriesMap.has(row.id)) {
        queriesMap.set(row.id, {
          id: row.id,
          user_id: row.user_id,
          subject: row.subject,
          description: row.description,
          assigned_to: row.assigned_to,
          resolution: row.resolution,
          resolved_at: row.resolved_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          query_type: row.query_type,
          is_locked: row.is_locked,
          last_reply_from_authorized_user: row.last_reply_from_authorized_user || false,
          replies: []
        });
      }
      
      // Add reply if exists (and table exists)
      if (row.reply_id && tableExistsResult.rows[0].exists) {
        queriesMap.get(row.id).replies.push({
          id: row.reply_id,
          query_id: row.id,
          reply_text: row.reply_text,
          replied_by: row.replied_by,
          replied_by_name: row.replied_by_name,
          created_at: row.reply_created_at
        });
      }
    });

    res.json({
      queries: Array.from(queriesMap.values()),
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
  const { subject, description, query_type } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO hr_queries (user_id, subject, description, query_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, subject, description, query_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error submitting query:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get available query types
router.get("/query-types", authenticateJWT, async (req, res) => {
  const pool = req.pool;

  try {
    const result = await pool.query('SELECT name FROM query_types ORDER BY name');
    res.json(result.rows.map(row => row.name));
  } catch (err) {
    console.error('Error fetching query types:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a new query type
router.post("/query-types", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { name } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO query_types (name) VALUES ($1) RETURNING name',
      [name]
    );
    res.status(201).json({ name: result.rows[0].name });
  } catch (err) {
    console.error('Error adding query type:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: "Query type already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
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
