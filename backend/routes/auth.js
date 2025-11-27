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
    console.log('Auth header present, token:', token);

    jwt.verify(token, process.env.JWT_SECRET || 'demo-secret', async (err, user) => {
      if (err) {
        console.log('JWT verification error:', err);
        return res.sendStatus(403); // Forbidden
      }
      console.log('JWT verified, user:', user);
      req.user = user; // { userId: ..., department: ..., role: ... }

      // Always fetch the latest user information from the database to ensure role info is current
      try {
        const userResult = await req.pool.query(
          'SELECT u.department, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1', 
          [req.user.userId]
        );
        if (userResult.rows.length > 0) {
          req.user.department = userResult.rows[0].department;
          req.user.role = userResult.rows[0].role;
          console.log(`User ${req.user.userId} department/role updated from DB: department=${req.user.department}, role=${req.user.role}`);
        }
      } catch (dbErr) {
        console.error('Error fetching user department/role:', dbErr);
        return res.sendStatus(500);
      }

      next();
    });
  } else {
    console.log('No auth header present');
    res.sendStatus(401); // Unauthorized
  }
};

// Export saltRounds for use in other files
export { saltRounds };