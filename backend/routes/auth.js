import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Load environment variables
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);

// Middleware for authentication
export const authenticateJWT = async (req, res, next) => {
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
          const userResult = await req.pool.query('SELECT department FROM users WHERE id = $1', [req.user.userId]);
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
export const requireAdmin = (req, res, next) => {
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
export const requireHR = (req, res, next) => {
  console.log('HR check - req.user:', req.user);
  if (req.user && (req.user.department === 'Admin' || req.user.department === 'HR')) {
    console.log('HR/Admin access granted');
    next();
  } else {
    console.log('HR/Admin access denied - user department:', req.user?.department);
    res.status(403).json({ error: "Access denied. HR/Admin privileges required." });
  }
};

// Export saltRounds for use in other files
export { saltRounds };
