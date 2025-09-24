import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

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
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

// Login route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists in the users table
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = userResult.rows[0];

    // If user does not exist, or password doesn't match, return error
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Log the successful login activity
    await logActivity(pool, user.id, 'auth.login');

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------
// Middleware for authentication
// ---------------------------------
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403); // Forbidden
      }
      req.user = user; // { userId: ... }
      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized
  }
};

// ---------------------------------
// Compliance Agent API Endpoints
// ---------------------------------
import {
  getSites,
  addSite,
  deleteSite,
  getDocument,
  updateDocument,
  crawlSite
} from './compliance.js';
import { logActivity, getActivities } from './activity.js';

// Get all sites
app.get("/api/compliance/sites", authenticateJWT, async (req, res) => {
  try {
    const sites = await getSites(pool);
    res.json(sites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a site
app.post("/api/compliance/sites", authenticateJWT, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    const newSite = await addSite(pool, req.user.userId, { url });
    res.status(201).json(newSite);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a site
app.delete("/api/compliance/sites/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteSite(pool, req.user.userId, id);
    res.status(204).send(); // No Content
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get the compliance document
app.get("/api/compliance/document", authenticateJWT, async (req, res) => {
  try {
    const doc = await getDocument(pool);
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update the compliance document
app.post("/api/compliance/document", authenticateJWT, async (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: "Content is required" });
    }
    const updatedDoc = await updateDocument(pool, req.user.userId, content);
    res.json(updatedDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Crawl a site
app.post("/api/compliance/crawl", authenticateJWT, async (req, res) => {
  try {
    const { siteId } = req.body;
    if (!siteId) {
      return res.status(400).json({ error: "siteId is required" });
    }
    const result = await crawlSite(pool, siteId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Get all activities for the logged-in user
app.get("/api/activities", authenticateJWT, async (req, res) => {
  try {
    const activities = await getActivities(pool, req.user.userId);
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
