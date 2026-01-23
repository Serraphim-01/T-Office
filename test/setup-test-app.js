import express from 'express';
import cors from 'cors';
import { testAuth } from './test-auth-helper.js';

/**
 * Creates a test version of the app with swappable authentication
 * @param {Object} options - Configuration options
 * @param {Function} options.authMiddleware - Authentication middleware to use (test or real)
 * @returns {Object} The configured app instance
 */
export function createTestApp({ authMiddleware = null } = {}) {
  const app = express();

  // Enable CORS for testing
  app.use(cors());

  app.use(express.json({ limit: '2mb' }));

  // Use the provided auth middleware, test auth, or default to test auth
  if (authMiddleware) {
    app.use(authMiddleware);
  } else {
    // Default to test auth middleware
    app.use(testAuth());
  }

  // Add a test endpoint to verify authentication is working
  app.get('/api/test-auth', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No user authenticated' });
    }
    
    res.json({
      message: 'Authentication successful',
      user: req.user
    });
  });
  
  // Example protected endpoints for testing
  app.get('/api/protected-data', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({
      message: 'Protected data accessed',
      user: req.user,
      data: 'This is protected data'
    });
  });
  
  app.post('/api/admin-action', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    res.json({
      message: 'Admin action performed successfully',
      performedBy: req.user.full_name
    });
  });

  return app;
}