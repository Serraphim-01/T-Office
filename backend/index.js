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
    let userResult = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    let user = userResult.rows[0];

    if (user) {
      // User exists, check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    } else {
      // User does not exist, check preset_users
      const presetUserResult = await pool.query(
        "SELECT * FROM preset_users WHERE email = $1",
        [email]
      );
      const presetUser = presetUserResult.rows[0];

      if (!presetUser) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, presetUser.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Create a new user in the users table
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const newUserResult = await pool.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
        [email, hashedPassword]
      );
      user = newUserResult.rows[0];
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
