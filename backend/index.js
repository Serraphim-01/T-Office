import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import { authenticateJWT, saltRounds } from "./routes/auth.js";
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
import inboundRoutes from "./routes/inbound.js"; 
import outboundRoutes from "./routes/outbound.js"; 
import userRoutes from "./routes/users.js"; 

// Load environment variables
dotenv.config({ path: ".env.local" });

const app = express();

// ------------------------
// Enable CORS for frontend
// ------------------------
app.use(
  cors({
    origin: "http://localhost:3000", // frontend requests
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

// Middleware to attach pool to requests (must be before all routes that need it)
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Add WebSocket support
import http from 'http';
import { Server } from 'socket.io';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store connected clients and their current pages
const connectedClients = new Map();

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Register user with their socket
  socket.on('register_user', (userId) => {
    connectedClients.set(userId, { socketId: socket.id, currentPage: '' });
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });
  
  // Update user's current page
  socket.on('set_current_page', (data) => {
    const { userId, page } = data;
    if (connectedClients.has(userId)) {
      const client = connectedClients.get(userId);
      client.currentPage = page;
      connectedClients.set(userId, client);
      console.log(`User ${userId} is now on page ${page}`);
    } else {
      // If user is not registered yet, register them now
      connectedClients.set(userId, { socketId: socket.id, currentPage: page });
      console.log(`User ${userId} registered and set to page ${page}`);
    }
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove client from connected clients
    for (let [userId, client] of connectedClients.entries()) {
      if (client.socketId === socket.id) {
        connectedClients.delete(userId);
        break;
      }
    }
  });
});

// Function to save notification to database
const saveNotificationToDB = async (userId, notification) => {
  try {
    const result = await pool.query(
      `INSERT INTO user_notifications (user_id, type, title, message, timestamp, message_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        notification.type,
        notification.title,
        notification.message,
        notification.timestamp,
        notification.messageId
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error saving notification to database:', err);
    return null;
  }
};

// Function to fetch user notifications from database
const fetchUserNotifications = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT id, type, title, message, timestamp, read, message_id as "messageId"
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT 100`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    console.error('Error fetching notifications from database:', err);
    return [];
  }
};

// Function to mark notification as read in database
const markNotificationAsReadInDB = async (notificationId, userId) => {
  try {
    await pool.query(
      `UPDATE user_notifications
       SET read = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  } catch (err) {
    console.error('Error marking notification as read in database:', err);
  }
};

// Function to mark all notifications as read in database
const markAllNotificationsAsReadInDB = async (userId) => {
  try {
    await pool.query(
      `UPDATE user_notifications
       SET read = true, updated_at = NOW()
       WHERE user_id = $1 AND read = false`,
      [userId]
    );
  } catch (err) {
    console.error('Error marking all notifications as read in database:', err);
  }
};

// Function to clear read notifications from database
const clearReadNotificationsFromDB = async (userId) => {
  try {
    await pool.query(
      `DELETE FROM user_notifications
       WHERE user_id = $1 AND read = true`,
      [userId]
    );
  } catch (err) {
    console.error('Error clearing read notifications from database:', err);
  }
};

// Export function to send notifications
export const sendNotification = async (userId, notification) => {
  // Check if user is connected and on the chat page
  const client = connectedClients.get(userId);
  if (client && client.currentPage === '/chat' && notification.type === 'chat_message') {
    // Don't send chat notifications if user is already in chat
    console.log(`Skipping notification for user ${userId} as they are already in chat`);
    return;
  }
  
  // Save notification to database
  await saveNotificationToDB(userId, notification);
  
  // Send notification via WebSocket if user is connected
  if (client) {
    io.to(client.socketId).emit('notification', notification);
  }
};

// Add endpoint to fetch user notifications
app.get("/api/notifications/:userId", authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    // Verify that the user can only fetch their own notifications
    if (req.user.userId != userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const notifications = await fetchUserNotifications(userId);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to mark notification as read
app.put("/api/notifications/:notificationId/read", authenticateJWT, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    await markNotificationAsReadInDB(notificationId, userId);
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to mark all notifications as read
app.put("/api/notifications/read-all", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await markAllNotificationsAsReadInDB(userId);
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to clear read notifications
app.delete("/api/notifications/read", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await clearReadNotificationsFromDB(userId);
    res.json({ message: "Read notifications cleared" });
  } catch (err) {
    console.error('Error clearing read notifications:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to set user's current page
app.post("/api/set-current-page", authenticateJWT, (req, res) => {
  try {
    const { page } = req.body;
    const userId = req.user.userId;
    
    // Update the user's current page in the connected clients map
    if (connectedClients.has(userId)) {
      const client = connectedClients.get(userId);
      client.currentPage = page;
      connectedClients.set(userId, client);
      console.log(`User ${userId} set to page ${page} via API`);
    } else {
      // If user is not registered yet, register them now
      connectedClients.set(userId, { socketId: null, currentPage: page });
      console.log(`User ${userId} registered and set to page ${page} via API`);
    }
    
    res.json({ message: "Current page updated" });
  } catch (err) {
    console.error('Error updating current page:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Refresh token route
app.post("/api/refresh-token", authenticateJWT, async (req, res) => {
  try {
    console.log('Refresh token request received');
    // Get user info from the authenticated request
    const { userId } = req.user;
    console.log('User ID from token:', userId);

    // Check if userId exists
    if (!userId) {
      console.error('User ID not found in token during refresh');
      return res.status(400).json({ error: "User ID not found in token" });
    }

    // Validate that userId is a valid format
    if (typeof userId !== 'string' && typeof userId !== 'number') {
      console.error('Invalid user ID format:', userId);
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    console.log('Fetching user data from database for user ID:', userId);
    // Fetch the latest user information from the database
    // Handle cases where role_id might be null or role might not exist
    const userResult = await req.pool.query(
      `SELECT u.department, COALESCE(r.name, 'default') as role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );
    console.log('Database query result:', userResult);

    if (userResult.rows.length === 0) {
      console.error('User not found in database during refresh:', userId);
      return res.status(404).json({ error: "User not found" });
    }

    const { department, role } = userResult.rows[0];
    console.log('User data fetched:', { department, role });

    // Validate department
    if (!department) {
      console.error('Department not found for user:', userId);
      return res.status(400).json({ error: "Department not found for user" });
    }

    // Log the refresh for debugging
    console.log(`Token refresh for user ${userId}: department=${department}, role=${role || 'default'}`);

    // Generate a new token with extended expiration and updated information
    const newToken = jwt.sign(
      {
        userId: userId,
        department: department,
        role: role || 'default' // Use 'default' if no role found
      },
      process.env.JWT_SECRET || 'demo-secret',
      {
        expiresIn: "1h",
      }
    );

    console.log('New token generated successfully');
    res.json({ token: newToken });
  } catch (err) {
    console.error('Token refresh error:', err);
    // Send a more detailed error message
    if (err instanceof Error) {
      // Check if it's a database error
      if (err.message && err.message.includes('database')) {
        res.status(500).json({ error: "Database error during token refresh", message: err.message, stack: err.stack });
      } else {
        res.status(500).json({ error: "Internal server error", message: err.message, stack: err.stack });
      }
    } else {
      res.status(500).json({ error: "Internal server error", details: JSON.stringify(err) });
    }
  }
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

// Signup route
app.post("/api/signup", async (req, res) => {
  const { name, email, password, department, role } = req.body;

  // Signup attempt: name, email, password, department, role

  try {
    // Hashing password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Get department ID
    const deptResult = await pool.query(
      'SELECT id FROM departments WHERE name = $1',
      [department]
    );

    if (deptResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid department" });
    }

    const departmentId = deptResult.rows[0].id;

    // Get role ID (default to 'default' role if not specified)
    let roleId;
    if (role) {
      const roleResult = await pool.query(
        'SELECT id FROM roles WHERE department_id = $1 AND name = $2',
        [departmentId, role]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(400).json({ error: "Invalid role for this department" });
      }
      
      roleId = roleResult.rows[0].id;
    } else {
      // Use default role
      const defaultRoleResult = await pool.query(
        'SELECT id FROM roles WHERE department_id = $1 AND is_default = true',
        [departmentId]
      );
      
      if (defaultRoleResult.rows.length === 0) {
        return res.status(500).json({ error: "Default role not found for department" });
      }
      
      roleId = defaultRoleResult.rows[0].id;
    }

    // Inserting user into database
    const result = await pool.query(
      'INSERT INTO users (full_name, email, department, role_id, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, department, roleId, hashedPassword]
    );
    const userId = result.rows[0].id;

    // Get role name for JWT token
    const roleNameResult = await pool.query(
      'SELECT name FROM roles WHERE id = $1',
      [roleId]
    );
    const roleName = roleNameResult.rows[0].name;

    // Generating JWT token
    const token = jwt.sign({ userId, department, role: roleName }, process.env.JWT_SECRET || 'demo-secret', {
      expiresIn: "1h",
    });

    // Signup successful, user added to DB
    res.status(201).json({
      token,
      user: {
        id: userId,
        full_name: name,
        email: email,
        department: department,
        role: roleName
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

  try {
    // Finding user by email with role information
    const userResult = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.department, u.password_hash, 
              r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userResult.rows[0];

    // Verifying password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generating JWT token
    const token = jwt.sign({ userId: user.id, department: user.department, role: user.role_name }, process.env.JWT_SECRET || 'demo-secret', {
      expiresIn: "1h",
    });

    // Login successful
    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        department: user.department,
        role: user.role_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mount route modules
app.use("/api/admin", adminRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/wiki", wikiRoutes);
app.use("/api", locationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory/inbound", inboundRoutes);
app.use("/api/inventory/outbound", outboundRoutes);
app.use("/api/users", userRoutes);

// Public endpoint to get roles for a department during signup
app.get("/api/public/roles/:departmentId", async (req, res) => {
  const { departmentId } = req.params;

  try {
    // Validate department exists
    const deptResult = await req.pool.query(
      'SELECT id FROM departments WHERE id = $1',
      [departmentId]
    );

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Get roles for this department
    const result = await req.pool.query(
      'SELECT id, name, is_default FROM roles WHERE department_id = $1 ORDER BY is_default DESC, name',
      [departmentId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching department roles:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public endpoint to get all departments during signup
app.get("/api/public/departments", async (req, res) => {
  try {
    const result = await req.pool.query(
      'SELECT id, name FROM departments ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public endpoint to get role ID by name and department
app.get("/api/public/role-id", async (req, res) => {
  const { department, roleName } = req.query;

  try {
    // Get department ID
    const deptResult = await req.pool.query(
      'SELECT id FROM departments WHERE name = $1',
      [department]
    );

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }

    const departmentId = deptResult.rows[0].id;

    // Get role ID
    const roleResult = await req.pool.query(
      'SELECT id FROM roles WHERE department_id = $1 AND name = $2',
      [departmentId, roleName]
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: "Role not found" });
    }

    res.json({ roleId: roleResult.rows[0].id });
  } catch (err) {
    console.error('Error fetching role ID:', err);
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

// Change app.listen to server.listen
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});