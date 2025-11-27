import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve('./backend/.env.local') });

// Create a valid JWT token for user ID 1
const userId = 1;
const department = 'Admin';
const role = 'default';

const token = jwt.sign(
  { userId, department, role },
  process.env.JWT_SECRET || 'demo-secret',
  { expiresIn: '1h' }
);

console.log('Generated token:', token);

// Now let's decode it to verify
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
  console.log('Decoded token:', decoded);
} catch (error) {
  console.error('Error decoding token:', error);
}