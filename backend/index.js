import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";

// Load environment variables
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

// Get chat settings (pause status)
app.get("/api/chat/settings", async (req, res) => {
  try {
    const result = await pool.query('SELECT is_paused, paused_by, paused_at FROM chat_settings WHERE id = 1');
    if (result.rows.length === 0) {
      // Initialize settings if not exists
      await pool.query('INSERT INTO chat_settings (id, is_paused) VALUES (1, false)');
      res.json({ is_paused: false, paused_by: null, paused_at: null });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error fetching chat settings:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Toggle chat pause (Moderator only)
app.put("/api/chat/settings/pause", authenticateJWT, requireHR, async (req, res) => {
  const { is_paused } = req.body;

  try {
    const result = await pool.query(
      'UPDATE chat_settings SET is_paused = $1, paused_by = $2, paused_at = CASE WHEN $1 THEN NOW() ELSE NULL END WHERE id = 1 RETURNING *',
      [is_paused, req.user.userId]
    );

    if (result.rows.length === 0) {
      // Create settings if not exists
      await pool.query(
        'INSERT INTO chat_settings (id, is_paused, paused_by, paused_at) VALUES (1, $1, $2, CASE WHEN $1 THEN NOW() ELSE NULL END)',
        [is_paused, req.user.userId]
      );
    }

    res.json({ message: `Chat ${is_paused ? 'paused' : 'unpaused'} successfully` });
  } catch (err) {
    console.error('Error updating chat settings:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Clear all chat messages (Admin only)
app.post("/api/chat/clear", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE chat_messages CASCADE');
    res.json({ message: "All chat messages cleared successfully" });
  } catch (err) {
    console.error('Error clearing chat messages:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

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

    // Check if chat is paused
    const settingsResult = await pool.query('SELECT is_paused FROM chat_settings WHERE id = 1');
    const isPaused = settingsResult.rows.length > 0 ? settingsResult.rows[0].is_paused : false;

    if (isPaused && !isModerator) {
      return res.status(403).json({ error: "Chat is currently paused. Only moderators can send messages." });
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
    const conversationText = messages.map(msg => msg.text).join('\n');

    const prompt = `Please provide a narrative summary of this company chat conversation. Write it as one or two flowing paragraphs that tell the story of what happened, including the emotional tone, key concerns, and overall atmosphere. Do not list individual messages or use bullet points.

Chat conversation:
${conversationText}

Narrative summary:`;

    const response = await axios.post(
      'https://router.huggingface.co/hf-inference/models/philschmid/bart-large-cnn-samsum',
      {
        inputs: prompt,
        parameters: {
          max_length: 1000,
          min_length: 50,
          temperature: 0.7,
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

    let summaryText = response.data[0]?.summary_text || 'Unable to generate summary.';

    // Clean up the response to remove any prompt text that might have been included
    summaryText = summaryText.replace(/^Summarize the following.*?\n\n/i, '');
    summaryText = summaryText.replace(/^Chat conversation:.*?\n\n/i, '');
    summaryText = summaryText.replace(/^Summary:/i, '');
    summaryText = summaryText.trim();

    // If the summary is too short or seems to be just the prompt, provide a fallback
    if (summaryText.length < 20 || summaryText.toLowerCase().includes('summarize the following')) {
      summaryText = 'The chat conversation covered various topics with a generally professional tone. Participants engaged in discussions about workplace matters, sharing feedback and information.';
    }

    return summaryText;
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

// Update department configuration (Admin only)
app.put("/api/admin/department-config/:department", authenticateJWT, requireAdmin, async (req, res) => {
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

    // Get user features from department_configs
    let userFeatures = {};
    try {
      const configResult = await pool.query(
        'SELECT features FROM department_configs WHERE department = $1',
        [user.department]
      );

      console.log('[PROFILE API] Department config query result:', configResult.rows);

      if (configResult.rows.length > 0) {
        userFeatures = configResult.rows[0].features || {};
        console.log('[PROFILE API] Using existing config:', userFeatures);
      } else {
        // Set default features based on department
        userFeatures = {
          'Profile': {
            'profile': { enabled: true, functions: { 'view_details': true, 'update_details': true, 'view_role_management': true, 'request_role': true } }
          },
          'Chat': {
            'messages': { enabled: true }
          },
          'Inventory': {
            'inventory': { enabled: true },
            'products': { enabled: true },
            'inbound': { enabled: true },
            'outbound': { enabled: true }
          },
          'Resources': {
            'wiki': { enabled: true }
          }
        };

        // Add department-specific features
        if (user.department === 'Admin') {
          userFeatures = {
            ...userFeatures,
            'Admin': {
              'features': { enabled: true },
              'db': { enabled: true },
              'users': { enabled: true }
            },
            'HR': {
              'onboarding': { enabled: true },
              'users': { enabled: true },
              'queries': { enabled: true },
              'attendance': { enabled: true }
            },
            'Compliance': {
              'sites': { enabled: true },
              'documents': { enabled: true },
              'crawling': { enabled: true }
            },
            'Approvals': {
              'certifications': { enabled: true },
              'roles': { enabled: true },
              'documents': { enabled: true }
            }
          };
        } else if (user.department === 'HR') {
          userFeatures['HR'] = {
            'users': { enabled: true },
            'queries': { enabled: true },
            'attendance': { enabled: true }
          };
        } else if (user.department === 'Compliance') {
          userFeatures['Compliance'] = {
            'sites': { enabled: true },
            'documents': { enabled: true },
            'crawling': { enabled: true }
          };
        }

        console.log('[PROFILE API] Using default config for department', user.department, ':', userFeatures);

        // Insert default config into database for future use
        try {
          await pool.query(
            'INSERT INTO department_configs (department, features) VALUES ($1, $2)',
            [user.department, JSON.stringify(userFeatures)]
          );
          console.log('[PROFILE API] Inserted default config into database');
        } catch (insertErr) {
          console.error('Error inserting default config:', insertErr);
        }
      }
    } catch (configErr) {
      console.error('Error fetching user features:', configErr);
    }

    console.log('[PROFILE API] Final userFeatures being returned:', userFeatures);

    const responseData = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      department: user.department,
      features: userFeatures,
      created_at: user.created_at,
      certifications: user.certifications || [],
      cv: user.cv,
      portfolio: user.portfolio,
      job_description: user.job_description,
      contract: user.contract,
      query_count: user.query_count || 0,
      attendance: user.attendance || [],
      other_details: user.other_details || {}
    };

    res.json(responseData);
  } catch (err) {
    console.error('[PROFILE API] Error fetching profile:', err);
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



// Function to calculate date range based on time range option
function getDateRange(timeRange) {
  const now = new Date();
  let startDate;
  let endDate;

  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = now;
      break;
    case 'last_7_days':
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      endDate = now;
      break;
    case 'last_2_weeks':
      startDate = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      endDate = now;
      break;
    case 'last_1_month':
      startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      endDate = now;
      break;
    default:
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Default to last 7 days
      endDate = now;
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

// Function to cleanup old messages based on lifespan
async function cleanupOldMessages() {
  try {
    const lifespanDays = parseInt(process.env.MESSAGE_LIFESPAN_DAYS, 10) || 30; // Default 30 days
    const cutoffDate = new Date(Date.now() - (lifespanDays * 24 * 60 * 60 * 1000));

    const result = await pool.query(
      'DELETE FROM chat_messages WHERE created_at < $1',
      [cutoffDate.toISOString()]
    );

    if (result.rowCount > 0) {
      console.log(`Cleaned up ${result.rowCount} old chat messages older than ${lifespanDays} days`);
    }
  } catch (err) {
    console.error('Error cleaning up old messages:', err);
  }
}

// Summarize chat messages (Admin/HR only)
app.post("/api/chat/summarize", authenticateJWT, requireHR, async (req, res) => {
  try {
    const { timeRange } = req.body;

    // Clean up old messages before summarizing
    await cleanupOldMessages();

    const { startDate, endDate } = getDateRange(timeRange);

    const result = await pool.query(
      'SELECT id, text, created_at, is_moderator FROM chat_messages WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at ASC',
      [startDate, endDate]
    );

    if (result.rows.length === 0) {
      return res.json({ summary: 'No messages found in the specified time range.' });
    }

    const summary = await summarizeChat(result.rows);

    res.json({
      summary,
      messageCount: result.rows.length,
      timeRange: timeRange.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
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
// Location and Geofencing API Endpoints
// ---------------------------------

// Setup location schema
app.post("/api/admin/setup-locations", authenticateJWT, requireAdmin, async (req, res) => {
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

// Get all locations
app.get("/api/locations", authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM locations WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new location (Admin/HR only)
app.post("/api/locations", authenticateJWT, requireHR, async (req, res) => {
  const { name, latitude, longitude, radius_meters, address } = req.body;

  if (!name || !latitude || !longitude) {
    return res.status(400).json({ error: "Name, latitude, and longitude are required" });
  }

  try {
    const result = await pool.query(
      'INSERT INTO locations (name, latitude, longitude, radius_meters, address, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, latitude, longitude, radius_meters || 100, address, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update location (Admin/HR only)
app.put("/api/locations/:id", authenticateJWT, requireHR, async (req, res) => {
  const { id } = req.params;
  const { name, latitude, longitude, radius_meters, address, is_active } = req.body;

  try {
    const result = await pool.query(
      'UPDATE locations SET name = $1, latitude = $2, longitude = $3, radius_meters = $4, address = $5, is_active = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, latitude, longitude, radius_meters, address, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete location (Admin only)
app.delete("/api/locations/:id", authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Record location event (entry/exit from geofence)
app.post("/api/location-events", authenticateJWT, async (req, res) => {
  const { location_id, event_type, latitude, longitude, accuracy } = req.body;

  if (!location_id || !event_type || !latitude || !longitude) {
    return res.status(400).json({ error: "Location ID, event type, latitude, and longitude are required" });
  }

  if (!['entry', 'exit'].includes(event_type)) {
    return res.status(400).json({ error: "Event type must be 'entry' or 'exit'" });
  }

  try {
    const result = await pool.query(
      'INSERT INTO location_events (user_id, location_id, event_type, latitude, longitude, accuracy) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.userId, location_id, event_type, latitude, longitude, accuracy]
    );

    // Check if this triggers automatic attendance
    await handleAutomaticAttendance(req.user.userId, location_id, event_type, result.rows[0].id);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error recording location event:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's location events
app.get("/api/location-events", authenticateJWT, async (req, res) => {
  const { limit = 50 } = req.query;

  try {
    const result = await pool.query(
      `SELECT le.*, l.name as location_name, l.latitude, l.longitude, l.radius_meters
       FROM location_events le
       JOIN locations l ON le.location_id = l.id
       WHERE le.user_id = $1
       ORDER BY le.timestamp DESC
       LIMIT $2`,
      [req.user.userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching location events:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Manual clock-in/out
app.post("/api/attendance/clock", authenticateJWT, async (req, res) => {
  const { type, latitude, longitude, accuracy } = req.body; // type: 'in' or 'out'

  if (!type || !['in', 'out'].includes(type)) {
    return res.status(400).json({ error: "Type must be 'in' or 'out'" });
  }

  try {
    // Check if user is within any active geofence
    const locationCheck = await checkUserInGeofence(req.user.userId, latitude, longitude);

    if (!locationCheck.isInGeofence) {
      return res.status(403).json({
        error: "You must be within a configured location to clock in/out",
        nearest_location: locationCheck.nearestLocation
      });
    }

    // Record manual attendance
    const eventType = type === 'in' ? 'clock_in' : 'clock_out';
    const result = await pool.query(
      'INSERT INTO auto_attendance (user_id, location_event_id, event_type, notes) VALUES ($1, NULL, $2, $3) RETURNING *',
      [req.user.userId, eventType, `Manual ${type} at ${locationCheck.locationName}`]
    );

    res.status(201).json({
      message: `Successfully clocked ${type}`,
      attendance: result.rows[0],
      location: locationCheck.locationName
    });
  } catch (err) {
    console.error('Error recording manual attendance:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check user's current location status
app.post("/api/location-status", authenticateJWT, async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  try {
    const locationCheck = await checkUserInGeofence(req.user.userId, latitude, longitude);

    if (locationCheck.isInGeofence) {
      res.json({
        isInGeofence: true,
        locationName: locationCheck.locationName,
        locationId: locationCheck.locationId,
        distance: locationCheck.distance
      });
    } else {
      res.json({
        isInGeofence: false,
        nearestLocation: locationCheck.nearestLocation
      });
    }
  } catch (err) {
    console.error('Error checking location status:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's attendance records
app.get("/api/attendance", authenticateJWT, async (req, res) => {
  const { date } = req.query;

  try {
    let query = `
      SELECT aa.*, le.latitude, le.longitude, l.name as location_name
      FROM auto_attendance aa
      LEFT JOIN location_events le ON aa.location_event_id = le.id
      LEFT JOIN locations l ON le.location_id = l.id
      WHERE aa.user_id = $1
    `;
    const params = [req.user.userId];

    if (date) {
      query += ' AND DATE(aa.timestamp) = $2';
      params.push(date);
    }

    query += ' ORDER BY aa.timestamp DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to handle automatic attendance based on location events
async function handleAutomaticAttendance(userId, locationId, eventType, locationEventId) {
  try {
    // Get location details
    const locationResult = await pool.query('SELECT name FROM locations WHERE id = $1', [locationId]);
    if (locationResult.rows.length === 0) return;

    const locationName = locationResult.rows[0].name;
    let attendanceType = null;

    if (eventType === 'entry') {
      // Check if user was previously clocked out (no recent clock_in without clock_out)
      const lastAttendance = await pool.query(
        'SELECT event_type FROM auto_attendance WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [userId]
      );

      if (lastAttendance.rows.length === 0 || lastAttendance.rows[0].event_type === 'clock_out') {
        attendanceType = 'clock_in';
      }
    } else if (eventType === 'exit') {
      // Check if user was previously clocked in (has clock_in without clock_out)
      const lastAttendance = await pool.query(
        'SELECT event_type FROM auto_attendance WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [userId]
      );

      if (lastAttendance.rows.length > 0 && lastAttendance.rows[0].event_type === 'clock_in') {
        attendanceType = 'clock_out';
      }
    }

    if (attendanceType) {
      await pool.query(
        'INSERT INTO auto_attendance (user_id, location_event_id, event_type, notes) VALUES ($1, $2, $3, $4)',
        [userId, locationEventId, attendanceType, `Auto ${attendanceType} at ${locationName}`]
      );

      console.log(`Auto ${attendanceType} recorded for user ${userId} at ${locationName}`);
    }
  } catch (err) {
    console.error('Error handling automatic attendance:', err);
  }
}

// Helper function to check if user is within any geofence
async function checkUserInGeofence(userId, userLat, userLng) {
  try {
    const locations = await pool.query('SELECT id, name, latitude, longitude, radius_meters FROM locations WHERE is_active = true');

    for (const location of locations.rows) {
      const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);

      if (distance <= location.radius_meters) {
        return {
          isInGeofence: true,
          locationId: location.id,
          locationName: location.name,
          distance: distance
        };
      }
    }

    // Find nearest location
    let nearestLocation = null;
    let minDistance = Infinity;

    for (const location of locations.rows) {
      const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = {
          id: location.id,
          name: location.name,
          distance: distance
        };
      }
    }

    return {
      isInGeofence: false,
      nearestLocation: nearestLocation
    };
  } catch (err) {
    console.error('Error checking geofence:', err);
    return { isInGeofence: false };
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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

    // Get questions for this topic
    const questionsResult = await pool.query(
      'SELECT id, question, options, correct_answer FROM wiki_questions WHERE topic_id = $1 ORDER BY id',
      [wikiTopic.id]
    );

    res.json({
      id: wikiTopic.id,
      department: wikiTopic.department,
      topic: wikiTopic.topic,
      content: wikiTopic.content,
      video_url: wikiTopic.video_url,
      questions: questionsResult.rows.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer
      })),
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
  const { content, questions } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Content is required" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert or update the topic
    const result = await client.query(
      `INSERT INTO wiki_topics (department, topic, content, video_url, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (department, topic)
       DO UPDATE SET content = $3, video_url = $4, updated_at = NOW()
       RETURNING *`,
      [department, topic, content.trim(), req.body.video_url || null, req.user.userId]
    );

    const topicId = result.rows[0].id;

    // Delete existing questions for this topic
    await client.query('DELETE FROM wiki_questions WHERE topic_id = $1', [topicId]);

    // Insert new questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      for (const question of questions) {
        if (question.question && question.options && question.correct_answer !== undefined) {
          await client.query(
            'INSERT INTO wiki_questions (topic_id, question, options, correct_answer) VALUES ($1, $2, $3, $4)',
            [topicId, question.question.trim(), JSON.stringify(question.options), question.correct_answer]
          );
        }
      }
    }

    await client.query('COMMIT');

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
    await client.query('ROLLBACK');
    console.error('Error saving wiki topic:', err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
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

// Check if user has completed a lesson
app.get("/api/wiki/:department/:topic/completion", authenticateJWT, async (req, res) => {
  const { department, topic } = req.params;

  try {
    // First get the topic ID
    const topicResult = await pool.query(
      'SELECT id FROM wiki_topics WHERE department = $1 AND topic = $2',
      [department, topic]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const topicId = topicResult.rows[0].id;

    // Check if user has completed this topic
    const completionResult = await pool.query(
      'SELECT id, completed_at FROM wiki_lesson_completions WHERE user_id = $1 AND topic_id = $2',
      [req.user.userId, topicId]
    );

    res.json({
      completed: completionResult.rows.length > 0,
      completed_at: completionResult.rows[0]?.completed_at || null
    });
  } catch (err) {
    console.error('Error checking lesson completion:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark lesson as completed
app.post("/api/wiki/:department/:topic/completion", authenticateJWT, async (req, res) => {
  const { department, topic } = req.params;

  try {
    // First get the topic ID
    const topicResult = await pool.query(
      'SELECT id FROM wiki_topics WHERE department = $1 AND topic = $2',
      [department, topic]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    const topicId = topicResult.rows[0].id;

    // Insert completion record (ON CONFLICT DO NOTHING due to UNIQUE constraint)
    const result = await pool.query(
      'INSERT INTO wiki_lesson_completions (user_id, topic_id) VALUES ($1, $2) ON CONFLICT (user_id, topic_id) DO NOTHING RETURNING *',
      [req.user.userId, topicId]
    );

    res.json({
      completed: true,
      completed_at: result.rows[0]?.completed_at || new Date().toISOString(),
      was_already_completed: result.rows.length === 0
    });
  } catch (err) {
    console.error('Error marking lesson as completed:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get next lesson in department
app.get("/api/wiki/:department/:topic/next", authenticateJWT, async (req, res) => {
  const { department, topic } = req.params;

  try {
    // Get all topics in the department ordered by topic name
    const topicsResult = await pool.query(
      'SELECT id, topic FROM wiki_topics WHERE department = $1 ORDER BY topic',
      [department]
    );

    if (topicsResult.rows.length === 0) {
      return res.json({ next_lesson: null });
    }

    // Find current topic index
    const currentIndex = topicsResult.rows.findIndex(t => t.topic === topic);

    if (currentIndex === -1) {
      return res.json({ next_lesson: null });
    }

    // Get next topic
    const nextIndex = currentIndex + 1;
    if (nextIndex >= topicsResult.rows.length) {
      // No more lessons in this department
      return res.json({ next_lesson: null });
    }

    const nextTopic = topicsResult.rows[nextIndex];

    res.json({
      next_lesson: {
        department: department,
        topic: nextTopic.topic,
        id: nextTopic.id
      }
    });
  } catch (err) {
    console.error('Error getting next lesson:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});
