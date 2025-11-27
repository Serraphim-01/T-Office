import express from "express";
import { authenticateJWT, saltRounds } from "./auth.js";
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
router.get("/users", authenticateJWT, async (req, res) => {
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

// Get specific user with their details
router.get("/users/:id", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.department, u.created_at,
        ud.certifications, ud.cv, ud.portfolio, ud.job_description, ud.contract,
        ud.query_count, ud.attendance, ud.other_details
      FROM users u
      LEFT JOIN user_details ud ON u.id = ud.user_id
      WHERE u.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user details
router.put("/users/:id", authenticateJWT, async (req, res) => {
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
router.post("/inductions", authenticateJWT, async (req, res) => {
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
router.get("/inductions", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  try {
    const result = await pool.query('SELECT * FROM inductions ORDER BY induction_time DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inductions:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete induction
router.delete("/inductions/:id", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM inductions WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Induction not found" });
    }

    res.json({ message: "Induction deleted successfully" });
  } catch (err) {
    console.error('Error deleting induction:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send query to user
router.post("/queries", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { user_id, subject, description, query_type, is_locked } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO hr_queries (user_id, subject, description, query_type, is_locked) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, subject, description, query_type, is_locked]
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

// Get queries for a user with replies
router.get("/queries/:userId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    // Get queries for this user with replies
    const queriesResult = await pool.query(
      `SELECT q.*, u.full_name as replied_by_name, r.id as reply_id, r.reply_text, r.replied_by, r.created_at as reply_created_at
       FROM hr_queries q
       LEFT JOIN query_replies r ON q.id = r.query_id
       LEFT JOIN users u ON r.replied_by = u.id
       WHERE q.user_id = $1 
       ORDER BY q.created_at DESC, r.created_at ASC`,
      [userId]
    );

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
          replies: []
        });
      }
      
      // Add reply if exists
      if (row.reply_id) {
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

    res.json(Array.from(queriesMap.values()));
  } catch (err) {
    console.error('Error fetching queries:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update query response
router.put("/queries/:id", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  const { resolution } = req.body; // Removed status

  try {
    await pool.query(
      'UPDATE hr_queries SET resolution = $1, resolved_at = NOW(), updated_at = NOW() WHERE id = $2',
      [resolution, id] // Removed status
    );

    res.json({ message: "Query updated successfully" });
  } catch (err) {
    console.error('Error updating query:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reply to a query
router.post("/queries/:id/reply", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;
  const { reply_text, is_locked } = req.body;
  const userId = req.user.userId;

  try {
    // Insert the reply
    const result = await pool.query(
      'INSERT INTO query_replies (query_id, reply_text, replied_by) VALUES ($1, $2, $3) RETURNING *',
      [id, reply_text, userId]
    );

    // Update query resolved_at timestamp and locked status if provided
    let updateQuery = 'UPDATE hr_queries SET resolved_at = NOW(), updated_at = NOW()';
    const updateParams = [id];
    
    if (is_locked !== undefined) {
      updateQuery += ', is_locked = $2 WHERE id = $1';
      updateParams.push(is_locked);
    } else {
      updateQuery += ' WHERE id = $1';
    }
    
    await pool.query(updateQuery, updateParams);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error replying to query:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all query replies (for HR queries page)
router.get("/queries-replies", authenticateJWT, async (req, res) => {
  const pool = req.pool;

  try {
    // Get all queries that have replies where the last reply was not from someone with HR queries access
    const queriesResult = await pool.query(
      `WITH latest_replies AS (
         SELECT 
           qr.query_id,
           qr.replied_by,
           u.department as replied_by_department,
           ROW_NUMBER() OVER (PARTITION BY qr.query_id ORDER BY qr.created_at DESC) as rn
         FROM query_replies qr
         JOIN users u ON qr.replied_by = u.id
       )
       SELECT q.*, u.full_name as user_name, r.id as reply_id, r.reply_text, r.replied_by, r.created_at as reply_created_at, ur.full_name as replied_by_name,
              CASE 
                WHEN lr.replied_by_department IN ('HR', 'Admin') THEN true
                ELSE false
              END as last_reply_from_authorized_user
       FROM hr_queries q
       JOIN users u ON q.user_id = u.id
       JOIN query_replies r ON q.id = r.query_id
       JOIN users ur ON r.replied_by = ur.id
       LEFT JOIN latest_replies lr ON q.id = lr.query_id AND lr.rn = 1
       WHERE lr.replied_by_department NOT IN ('HR', 'Admin') OR lr.replied_by_department IS NULL
       ORDER BY q.created_at DESC, r.created_at ASC`
    );

    // Group queries with their replies
    const queriesMap = new Map();
    queriesResult.rows.forEach(row => {
      if (!queriesMap.has(row.id)) {
        queriesMap.set(row.id, {
          id: row.id,
          user_id: row.user_id,
          user_name: row.user_name,
          subject: row.subject,
          description: row.description,
          assigned_to: row.assigned_to,
          resolution: row.resolution,
          resolved_at: row.resolved_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          query_type: row.query_type,
          is_locked: row.is_locked,
          replies: [],
          last_reply_from_authorized_user: row.last_reply_from_authorized_user
        });
      }
      
      // Add reply
      queriesMap.get(row.id).replies.push({
        id: row.reply_id,
        query_id: row.id,
        reply_text: row.reply_text,
        replied_by: row.replied_by,
        replied_by_name: row.replied_by_name,
        created_at: row.reply_created_at
      });
    });

    res.json(Array.from(queriesMap.values()));
  } catch (err) {
    console.error('Error fetching query replies:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a query
router.delete("/queries/:id", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    // Delete the query (replies will be deleted automatically due to CASCADE)
    await pool.query('DELETE FROM hr_queries WHERE id = $1', [id]);
    res.json({ message: "Query deleted successfully" });
  } catch (err) {
    console.error('Error deleting query:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get attendance for a user
router.get("/attendance/:userId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    // Get all attendance records for the user ordered by timestamp
    const result = await pool.query(`
      SELECT 
        aa.id,
        aa.event_type,
        aa.timestamp,
        aa.notes
      FROM auto_attendance aa
      WHERE aa.user_id = $1
      ORDER BY aa.timestamp ASC
    `, [userId]);
    
    // Group clock_in and clock_out events into pairs
    const attendanceRecords = [];
    let clockInRecord = null;
    
    for (const record of result.rows) {
      if (record.event_type === 'clock_in') {
        // Store the clock_in record
        clockInRecord = {
          id: record.id,
          clock_in: record.timestamp,
          clock_out: null,
          total_hours: null,
          status: 'present',
          notes: record.notes,
          created_at: record.timestamp,
          updated_at: record.timestamp
        };
      } else if (record.event_type === 'clock_out' && clockInRecord) {
        // Pair with the previous clock_in record
        clockInRecord.clock_out = record.timestamp;
        
        // Calculate total hours if both clock_in and clock_out exist
        if (clockInRecord.clock_in && clockInRecord.clock_out) {
          const clockInTime = new Date(clockInRecord.clock_in);
          const clockOutTime = new Date(clockInRecord.clock_out);
          const diffInHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
          clockInRecord.total_hours = parseFloat(diffInHours.toFixed(2));
        }
        
        attendanceRecords.push(clockInRecord);
        clockInRecord = null;
      }
    }
    
    // If there's an unpaired clock_in record, add it to the results
    if (clockInRecord) {
      attendanceRecords.push(clockInRecord);
    }
    
    // Return the records in descending order (most recent first)
    res.json(attendanceRecords.reverse());
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get wiki completions for a user
router.get("/wiki-completions/:userId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    // Get all wiki topics with completion status for the user
    const result = await pool.query(`
      SELECT 
        wt.id,
        wt.department,
        wt.topic,
        wc.completed_at
      FROM wiki_topics wt
      LEFT JOIN wiki_lesson_completions wc ON wt.id = wc.topic_id AND wc.user_id = $1
      ORDER BY wt.department, wt.topic
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching wiki completions:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add attendance record
router.post("/attendance", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { user_id, date, status, notes } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO attendance (user_id, clock_in, status, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, date, status, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding attendance:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
