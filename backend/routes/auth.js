import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Load environment variables
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);

// Middleware for authentication
export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    // Basic validation to avoid processing obviously invalid tokens
    if (!token || typeof token !== 'string' || token.length < 10) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid token format" });
    }
    
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
      req.user = user; // { userId: ..., department: ..., role: ... }

      // Validate that userId exists and is valid
      if (!req.user.userId) {
        console.error('User ID not found in token payload');
        return res.status(400).json({ error: "User ID not found in token payload" });
      }

      // Validate that userId is a valid format
      if (typeof req.user.userId !== 'string' && typeof req.user.userId !== 'number') {
        console.error('Invalid user ID format in token payload:', req.user.userId);
        return res.status(400).json({ error: "Invalid user ID format in token payload" });
      }

      // Always fetch the latest user information from the database to ensure role info is current
      const userResult = await req.pool.query(
        `SELECT u.department, u.active, u.full_name, COALESCE(r.name, 'default') as role 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.id = $1`,
        [req.user.userId]
      );
      
      if (userResult.rows.length > 0) {
        // Check if user account is active
        if (userResult.rows[0].active === false) {
          return res.status(403).json({ error: "Account deactivated", message: "User account has been deactivated" });
        }
        
        req.user.department = userResult.rows[0].department;
        req.user.role = userResult.rows[0].role || 'default';
        req.user.full_name = userResult.rows[0].full_name; // Add full_name to the user object
      } else {
        return res.status(404).json({ error: "User not found" });
      }
      next();
    } catch (err) {
      console.error('Authentication error:', err);
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: "Forbidden", message: "Invalid token" });
      } else if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ error: "Forbidden", message: "Token expired" });
      } else {
        console.error('Database error in authenticateJWT:', err);
        return res.status(500).json({ error: "Database error during authentication", message: err.message });
      }
    }
  } else {
    res.status(401).json({ error: "Unauthorized", message: "No authorization header" });
  }
};

// Export saltRounds for use in other files
export { saltRounds };