import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 4000;
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);

// ------------------------
// Enable CORS for frontend
// ------------------------
app.use(
  cors({
    origin: "http://localhost:3000", // allow requests from your Next.js frontend
    credentials: true,
  })
);

app.use(express.json());

// Postgres setup
let pool;
try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  // Test the connection
  pool.on('error', (err) => {
    console.error('Database connection error:', err.message);
    process.exit(1);
  });
} catch (err) {
  console.error('Database setup failed:', err.message);
  process.exit(1);
}

// Test route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend 👋" });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ message: "DB connected ✅", time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB connection failed ❌" });
  }
});

// Signup route
app.post("/api/signup", async (req, res) => {
  const { name, email, password, department } = req.body;

  console.log('Signup attempt:', { name, email, password, department });

  try {
    console.log('Step 1: Hashing password');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('Step 2: Inserting user into database');
    const result = await pool.query(
      'INSERT INTO users (full_name, email, department, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, department, hashedPassword]
    );
    const userId = result.rows[0].id;

    console.log('Step 3: Generating JWT token');
    const token = jwt.sign({ userId, department }, process.env.JWT_SECRET || 'demo-secret', {
      expiresIn: "1h",
    });

    console.log('Step 4: Signup successful, user added to DB');
    res.status(201).json({
      token,
      user: {
        id: userId,
        full_name: name,
        email: email,
        department: department
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Login route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  console.log('Login attempt:', { email, password });

  try {
    console.log('Step 1: Finding user by email');
    const userResult = await pool.query(
      'SELECT id, full_name, email, department, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userResult.rows[0];

    console.log('Step 2: Verifying password');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.log('Step 3: Generating JWT token');
    const token = jwt.sign({ userId: user.id, department: user.department }, process.env.JWT_SECRET || 'demo-secret', {
      expiresIn: "1h",
    });

    console.log('Step 4: Login successful');
    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        department: user.department
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------
// Middleware for authentication
// ---------------------------------
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    jwt.verify(token, process.env.JWT_SECRET || 'demo-secret', async (err, user) => {
      if (err) {
        return res.sendStatus(403); // Forbidden
      }
      req.user = user; // { userId: ..., department: ... }

      // If department is missing from JWT (for backward compatibility), fetch from DB
      if (!req.user.department) {
        try {
          const userResult = await pool.query('SELECT department FROM users WHERE id = $1', [req.user.userId]);
          if (userResult.rows.length > 0) {
            req.user.department = userResult.rows[0].department;
          }
        } catch (dbErr) {
          console.error('Error fetching user department:', dbErr);
          return res.sendStatus(500);
        }
      }

      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  console.log('Admin check - req.user:', req.user);
  if (req.user && req.user.department === 'Admin') {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin access denied - user department:', req.user?.department);
    res.status(403).json({ error: "Access denied. Admin privileges required." });
  }
};

// Middleware to check if user is admin or HR
const requireHR = (req, res, next) => {
  console.log('HR check - req.user:', req.user);
  if (req.user && (req.user.department === 'Admin' || req.user.department === 'HR')) {
    console.log('HR/Admin access granted');
    next();
  } else {
    console.log('HR/Admin access denied - user department:', req.user?.department);
    res.status(403).json({ error: "Access denied. HR/Admin privileges required." });
  }
};


// Get all activities for the logged-in user - removed for demo mode

// Generic endpoint for the frontend to log a specific activity
app.post("/api/log-activity", authenticateJWT, async (req, res) => {
  try {
    const { action, details } = req.body;
    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }
    await logActivity(pool, req.user.userId, action, details);
    res.status(200).json({ message: "Activity logged" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------
// Admin Database API Endpoints
// ---------------------------------

// Get all tables, their columns, and sample records
app.get("/api/admin/tables", authenticateJWT, requireAdmin, async (req, res) => {
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
app.post("/api/admin/clear-db", authenticateJWT, requireAdmin, async (req, res) => {
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
app.delete("/api/admin/users/:id", authenticateJWT, requireAdmin, async (req, res) => {
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

// ---------------------------------
// Anonymous Chat API Endpoints
// ---------------------------------

// Get all chat messages
app.get("/api/chat/messages", async (req, res) => {
  try {
    const result = await pool.query('SELECT id, text, created_at, is_moderator FROM chat_messages ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Post a new chat message (anonymous or moderator)
app.post("/api/chat/messages", async (req, res) => {
  try {
    const { text, isModerator } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Message text is required" });
    }

    // Check for toxic content using Hugging Face API (only for anonymous messages)
    if (!isModerator) {
      const toxicityCheck = await checkToxicity(text.trim());
      if (toxicityCheck.isToxic) {
        return res.status(400).json({
          error: "Message contains inappropriate content and cannot be sent. Please maintain a respectful environment.",
          toxicType: toxicityCheck.toxicType
        });
      }
    }

    const result = await pool.query(
      'INSERT INTO chat_messages (text, is_moderator) VALUES ($1, $2) RETURNING id, text, is_moderator, created_at',
      [text.trim(), isModerator || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error posting chat message:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Function to check toxicity using Hugging Face API
async function checkToxicity(text) {
  try {
    const response = await axios.post(
      'https://router.huggingface.co/hf-inference/models/unitary/toxic-bert',
      { inputs: text },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_TASK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // The model returns an array of results for each input
    const results = response.data[0] || [];
    const toxicLabels = results.filter(label => label.score > 0.5);

    // Check if any toxic label has high score
    const isToxic = toxicLabels.length > 0;
    const toxicType = isToxic ? toxicLabels.map(l => l.label).join(', ') : null;

    return { isToxic, toxicType, score: toxicLabels.length > 0 ? Math.max(...toxicLabels.map(l => l.score)) : 0 };
  } catch (error) {
    console.error('Error checking toxicity:', error);
    // If API fails, allow the message to proceed (fail-safe)
    return { isToxic: false, toxicType: null, score: 0 };
  }
}

// Function to summarize chat messages using Hugging Face API
async function summarizeChat(messages) {
  try {
    const conversationText = messages.map(msg => msg.text).join(' ');

    const response = await axios.post(
      'https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn',
      {
        inputs: conversationText,
        parameters: {
          max_length: 150,
          min_length: 30,
          do_sample: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_TASK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data[0]?.summary_text || 'Unable to generate summary.';
  } catch (error) {
    console.error('Error summarizing chat:', error);
    return 'Summary generation failed. Please try again later.';
  }
}

// ---------------------------------
// Department Configuration API Endpoints
// ---------------------------------

// Get department configuration
app.get("/api/admin/department-config/:department", authenticateJWT, requireAdmin, async (req, res) => {
  const { department } = req.params;

  try {
    const result = await pool.query(
      'SELECT config FROM department_configs WHERE department = $1',
      [department]
    );

    if (result.rows.length === 0) {
      // Return default config if department not found
      const defaultConfig = {
        department,
        roles: [],
        features: {}
      };
      return res.json(defaultConfig);
    }

    res.json(result.rows[0].config);
  } catch (err) {
    console.error('Error fetching department config:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update department configuration (Admin only)
app.put("/api/admin/department-config/:department", authenticateJWT, requireAdmin, async (req, res) => {
  const { department } = req.params;
  const config = req.body;

  try {
    await pool.query(
      'INSERT INTO department_configs (department, config) VALUES ($1, $2) ON CONFLICT (department) DO UPDATE SET config = $2',
      [department, JSON.stringify(config)]
    );

    res.json({ message: "Department configuration updated successfully" });
  } catch (err) {
    console.error('Error updating department config:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add new department
app.post("/api/admin/departments", authenticateJWT, requireAdmin, async (req, res) => {
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
      'INSERT INTO departments (name) VALUES ($1) RETURNING id',
      [name]
    );

    res.status(201).json({ id: result.rows[0].id, name });
  } catch (err) {
    console.error('Error adding department:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all departments
app.get("/api/admin/departments", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM departments ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------
// Profile API Endpoints
// ---------------------------------

// Get user profile
app.get("/api/profile", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.department, u.created_at,
        ud.certifications, ud.cv, ud.portfolio, ud.job_description, ud.contract,
        ud.query_count, ud.attendance, ud.other_details
      FROM users u
      LEFT JOIN user_details ud ON u.id = ud.user_id
      WHERE u.id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    // Get user role from department_configs
    let userRole = null;
    try {
      const roleResult = await pool.query(
        'SELECT config FROM department_configs WHERE department = $1',
        [user.department]
      );
      if (roleResult.rows.length > 0) {
        const config = roleResult.rows[0].config;
        // For now, assign the first role or a default role
        // In a real app, this would be stored in the user record
        if (config.roles && config.roles.length > 0) {
          userRole = config.roles[0].id; // Default to first role
        }
      }
    } catch (roleErr) {
      console.error('Error fetching user role:', roleErr);
    }

    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      department: user.department,
      role: userRole,
      created_at: user.created_at,
      certifications: user.certifications || [],
      cv: user.cv,
      portfolio: user.portfolio,
      job_description: user.job_description,
      contract: user.contract,
      query_count: user.query_count || 0,
      attendance: user.attendance || [],
      other_details: user.other_details || {}
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
app.put("/api/profile", authenticateJWT, async (req, res) => {
  const { certifications, cv, portfolio, job_description, contract, other_details } = req.body;

  try {
    await pool.query(`
      UPDATE user_details
      SET certifications = $1, cv = $2, portfolio = $3, job_description = $4,
          contract = $5, other_details = $6, updated_at = NOW()
      WHERE user_id = $7
    `, [certifications, cv, portfolio, job_description, contract, other_details, req.user.userId]);

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add certification to user profile
app.post("/api/profile/certifications", authenticateJWT, async (req, res) => {
  const { title, issuer, file_url, expiry_date, has_expiry } = req.body;

  try {
    // Get current certifications
    const currentResult = await pool.query(
      'SELECT certifications FROM user_details WHERE user_id = $1',
      [req.user.userId]
    );

    const currentCerts = currentResult.rows[0]?.certifications || [];
    const newCert = {
      id: Date.now().toString(),
      title,
      issuer,
      file_url,
      expiry_date: has_expiry ? expiry_date : null,
      has_expiry,
      status: 'pending', // Pending approval
      created_at: new Date().toISOString()
    };

    const updatedCerts = [...currentCerts, newCert];

    await pool.query(
      'UPDATE user_details SET certifications = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(updatedCerts), req.user.userId]
    );

    res.status(201).json(newCert);
  } catch (err) {
    console.error('Error adding certification:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update certification status (Admin/HR only)
app.put("/api/profile/certifications/:certId", authenticateJWT, requireHR, async (req, res) => {
  const { certId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  try {
    // Get current certifications for all users (since we need to find which user has this cert)
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

// ---------------------------------
// HR API Endpoints
// ---------------------------------

// Create a new user (HR/Admin only)
app.post("/api/hr/users", authenticateJWT, requireHR, async (req, res) => {
  const { name, email, department, induction_eligible } = req.body;

  console.log('HR user creation:', { name, email, department, induction_eligible });

  try {
    // Default password for new users
    const defaultPassword = 'Welcome123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    const result = await pool.query(
      'INSERT INTO users (full_name, email, department, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, department, hashedPassword]
    );
    const userId = result.rows[0].id;

    // Create user details entry
    await pool.query(
      'INSERT INTO user_details (user_id, induction_eligible) VALUES ($1, $2)',
      [userId, induction_eligible]
    );

    console.log('User created successfully with default password');
    res.status(201).json({
      id: userId,
      full_name: name,
      email: email,
      department: department,
      induction_eligible: induction_eligible,
      default_password: defaultPassword
    });
  } catch (err) {
    console.error('HR user creation error:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Get all users with their details
app.get("/api/hr/users", authenticateJWT, requireHR, async (req, res) => {
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
app.put("/api/hr/users/:id", authenticateJWT, requireHR, async (req, res) => {
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
app.post("/api/hr/inductions", authenticateJWT, requireHR, async (req, res) => {
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
app.get("/api/hr/inductions", authenticateJWT, requireHR, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inductions ORDER BY induction_time DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inductions:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send query to user
app.post("/api/hr/queries", authenticateJWT, requireHR, async (req, res) => {
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
app.get("/api/hr/queries/:userId", authenticateJWT, requireHR, async (req, res) => {
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
app.put("/api/hr/queries/:id", authenticateJWT, requireHR, async (req, res) => {
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
app.get("/api/hr/attendance/:userId", authenticateJWT, requireHR, async (req, res) => {
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
app.post("/api/hr/attendance", authenticateJWT, requireHR, async (req, res) => {
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

// ---------------------------------
// Admin Approvals API Endpoints
// ---------------------------------

// Get pending certificate approvals
app.get("/api/admin/approvals/certifications", authenticateJWT, requireAdmin, async (req, res) => {
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
            ...cert
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
app.put("/api/admin/approvals/certifications/:certId", authenticateJWT, requireAdmin, async (req, res) => {
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

// Get pending role change requests
app.get("/api/admin/approvals/roles", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // For now, return empty array as we don't have a role_requests table yet
    // This would be implemented when role change requests are stored in the database
    res.json([]);
  } catch (err) {
    console.error('Error fetching role approvals:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update role change request status
app.put("/api/admin/approvals/roles/:requestId", authenticateJWT, requireAdmin, async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  try {
    // For now, this is a placeholder
    // Implementation would update the role_requests table and potentially update user roles
    res.json({ message: `Role change request ${status} successfully` });
  } catch (err) {
    console.error('Error updating role request:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Summarize chat messages (Admin/HR only)
app.post("/api/chat/summarize", authenticateJWT, requireHR, async (req, res) => {
  try {
    const { startDate, endDate, useCurrentTime } = req.body;

    let query = 'SELECT id, text, created_at, is_moderator FROM chat_messages WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (useCurrentTime) {
      // Use current time as end date, start from beginning
      query += ` AND created_at <= NOW()`;
    } else {
      if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
    }

    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.json({ summary: 'No messages found in the specified time range.' });
    }

    const summary = await summarizeChat(result.rows);

    res.json({
      summary,
      messageCount: result.rows.length,
      timeRange: useCurrentTime ? 'All messages up to now' : `${startDate || 'Beginning'} to ${endDate || 'Now'}`
    });
  } catch (err) {
    console.error('Error summarizing chat:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});

// ---------------------------------
// Temporary endpoint to setup inventory schema
// ---------------------------------
app.post("/api/admin/setup-inventory", authenticateJWT, requireAdmin, async (req, res) => {
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
// Inventory API Endpoints
// ---------------------------------

// Get all products with state history
app.get("/api/inventory/products", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
             json_agg(
               json_build_object(
                 'id', ps.id,
                 'state', ps.state,
                 'timestamp', ps.timestamp,
                 'notes', ps.notes
               ) ORDER BY ps.timestamp DESC
             ) as state_history
      FROM products p
      LEFT JOIN product_states ps ON p.id = ps.product_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new product
app.post("/api/inventory/products", authenticateJWT, async (req, res) => {
  const { name, serial_number, part_number, quantity, container, type, child_products } = req.body;

  // Validate child_products - only allowed for cartons
  if (child_products && child_products.length > 0 && container !== 'Carton') {
    return res.status(400).json({ error: "Child products can only be added to cartons" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO products (name, serial_number, part_number, quantity, container, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, serial_number, part_number, quantity, container, type]
    );
    const product = result.rows[0];

    // Add initial state to history
    await client.query(
      'INSERT INTO product_states (product_id, state, notes) VALUES ($1, $2, $3)',
      [product.id, 'Incoming', 'Product created']
    );

    // Add child products if provided
    if (child_products && child_products.length > 0) {
      for (const childId of child_products) {
        await client.query(
          'INSERT INTO sub_products (parent_id, child_id) VALUES ($1, $2)',
          [product.id, childId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(product);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating product:', err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: "Serial number already exists or child product relationship already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  } finally {
    client.release();
  }
});

// Update product
app.put("/api/inventory/products/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, serial_number, part_number, quantity, container, type, child_products } = req.body;

  // Validate child_products - only allowed for cartons
  if (child_products && child_products.length > 0 && container !== 'Carton') {
    return res.status(400).json({ error: "Child products can only be added to cartons" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE products SET name = $1, serial_number = $2, part_number = $3, quantity = $4, container = $5, type = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, serial_number, part_number, quantity, container, type, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Product not found" });
    }

    // Update child products - remove existing and add new ones
    if (child_products !== undefined) {
      // Remove existing child relationships
      await client.query('DELETE FROM sub_products WHERE parent_id = $1', [id]);

      // Add new child products if provided
      if (child_products && child_products.length > 0) {
        for (const childId of child_products) {
          await client.query(
            'INSERT INTO sub_products (parent_id, child_id) VALUES ($1, $2)',
            [id, childId]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating product:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: "Serial number already exists or child product relationship already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  } finally {
    client.release();
  }
});

// Delete product
app.delete("/api/inventory/products/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update product state
app.put("/api/inventory/products/:id/state", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { state, notes } = req.body;

  try {
    // Update product state
    const productResult = await pool.query(
      'UPDATE products SET state = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [state, id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Add to state history
    await pool.query(
      'INSERT INTO product_states (product_id, state, notes) VALUES ($1, $2, $3)',
      [id, state, notes || 'State changed to ' + state]
    );

    res.json(productResult.rows[0]);
  } catch (err) {
    console.error('Error updating product state:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get inbound products (Incoming, Arrived)
app.get("/api/inventory/inbound", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE state IN ('Incoming', 'Arrived') ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inbound products:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get outbound products (Outgoing, Dispatched, Delivered)
app.get("/api/inventory/outbound", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE state IN ('Outgoing', 'Dispatched', 'Delivered') ORDER BY updated_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching outbound products:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get child products for a parent product
app.get("/api/inventory/products/:id/children", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT p.* FROM products p
      INNER JOIN sub_products sp ON p.id = sp.child_id
      WHERE sp.parent_id = $1
      ORDER BY p.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching child products:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add child product to a parent product
app.post("/api/inventory/products/:id/children", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { child_id } = req.body;

  if (!child_id) {
    return res.status(400).json({ error: "child_id is required" });
  }

  try {
    // Check if parent exists and is a carton
    const parentResult = await pool.query('SELECT container FROM products WHERE id = $1', [id]);
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: "Parent product not found" });
    }
    if (parentResult.rows[0].container !== 'Carton') {
      return res.status(400).json({ error: "Parent product must be a carton" });
    }

    // Check if child exists
    const childResult = await pool.query('SELECT id FROM products WHERE id = $1', [child_id]);
    if (childResult.rows.length === 0) {
      return res.status(404).json({ error: "Child product not found" });
    }

    // Check if relationship already exists
    const existingResult = await pool.query(
      'SELECT id FROM sub_products WHERE parent_id = $1 AND child_id = $2',
      [id, child_id]
    );
    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: "Child product already added to this parent" });
    }

    const result = await pool.query(
      'INSERT INTO sub_products (parent_id, child_id) VALUES ($1, $2) RETURNING *',
      [id, child_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding child product:', err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: "Child product already exists for this parent" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Remove child product from a parent product
app.delete("/api/inventory/products/:id/children/:childId", authenticateJWT, async (req, res) => {
  const { id, childId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM sub_products WHERE parent_id = $1 AND child_id = $2 RETURNING *',
      [id, childId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Child product relationship not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error removing child product:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------
// Wiki API Endpoints
// ---------------------------------

// Get all departments
app.get("/api/wiki/departments", async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM departments ORDER BY name');
    res.json(result.rows.map(row => row.name));
  } catch (err) {
    console.error('Error fetching wiki departments:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all topics for a department
app.get("/api/wiki/:department/topics", async (req, res) => {
  const { department } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, topic, content, created_at, updated_at FROM wiki_topics WHERE department = $1 ORDER BY topic',
      [department]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching wiki topics:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific topic content
app.get("/api/wiki/:department/:topic", async (req, res) => {
  const { department, topic } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM wiki_topics WHERE department = $1 AND topic = $2',
      [department, topic]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const wikiTopic = result.rows[0];
    res.json({
      id: wikiTopic.id,
      department: wikiTopic.department,
      topic: wikiTopic.topic,
      content: wikiTopic.content,
      created_by: wikiTopic.created_by,
      created_at: wikiTopic.created_at,
      updated_at: wikiTopic.updated_at
    });
  } catch (err) {
    console.error('Error fetching wiki topic:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create or update topic content (Admin only)
app.put("/api/wiki/:department/:topic", authenticateJWT, requireAdmin, async (req, res) => {
  const { department, topic } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Content is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO wiki_topics (department, topic, content, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (department, topic)
       DO UPDATE SET content = $3, updated_at = NOW()
       RETURNING *`,
      [department, topic, content.trim(), req.user.userId]
    );

    res.json({
      id: result.rows[0].id,
      department: result.rows[0].department,
      topic: result.rows[0].topic,
      content: result.rows[0].content,
      created_by: result.rows[0].created_by,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    });
  } catch (err) {
    console.error('Error saving wiki topic:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete topic (Admin only)
app.delete("/api/wiki/:department/:topic", authenticateJWT, requireAdmin, async (req, res) => {
  const { department, topic } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM wiki_topics WHERE department = $1 AND topic = $2 RETURNING *',
      [department, topic]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.json({ message: "Topic deleted successfully" });
  } catch (err) {
    console.error('Error deleting wiki topic:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});
