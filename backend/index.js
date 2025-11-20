import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import { authenticateJWT, requireAdmin, requireHR, saltRounds } from "./routes/auth.js";
import { checkToxicity, summarizeChat, cleanupOldMessages } from "./utils/helpers.js";
import { logActivity } from "./activity.js";

// Import route modules
import adminRoutes from "./routes/admin.js";
import hrRoutes from "./routes/hr.js";
import chatRoutes from "./routes/chat.js";
import profileRoutes from "./routes/profile.js";
import wikiRoutes from "./routes/wiki.js";
import locationRoutes from "./routes/locations.js";
import inventoryRoutes from "./routes/inventory.js";
import inboundRoutes from "./routes/inbound.js"; // Added inbound routes
import outboundRoutes from "./routes/outbound.js"; // Added outbound routes

// Load environment variables
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 4000;

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

// Middleware to attach pool to requests
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Mount route modules
app.use("/api/admin", adminRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/wiki", wikiRoutes);
app.use("/api", locationRoutes); // Mount location routes at /api
app.use("/api/inventory", inventoryRoutes); // Mount inventory routes at /api/inventory
app.use("/api/inventory/inbound", inboundRoutes); // Mount inbound routes at /api/inventory/inbound
app.use("/api/inventory/outbound", outboundRoutes); // Mount outbound routes at /api/inventory/outbound

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

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});