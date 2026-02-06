import express from 'express';
import { authenticateJWT } from './auth.js';

const router = express.Router();

// Get all roles in a user's department
router.get('/available-roles/:userId', authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    // Get user's department
    const userResult = await pool.query(
      'SELECT department FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDepartment = userResult.rows[0].department;

    // Get department ID
    const deptResult = await pool.query(
      'SELECT id FROM departments WHERE name = $1',
      [userDepartment]
    );

    if (deptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const departmentId = deptResult.rows[0].id;

    // Get all roles in the user's department
    const rolesResult = await pool.query(
      'SELECT id, name FROM roles WHERE department_id = $1 ORDER BY name',
      [departmentId]
    );

    res.json(rolesResult.rows);
  } catch (error) {
    console.error('Error fetching available roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a role change request
router.post('/request-role-change', authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const requestingUserId = req.user.userId;
  const { requested_role_id } = req.body;

  try {
    // Validate input
    if (!requested_role_id) {
      return res.status(400).json({ error: 'Requested role ID is required' });
    }

    // Get current user info
    const userResult = await pool.query(
      `SELECT u.id, u.role_id, u.department, r.name as current_role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [requestingUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get requested role info
    const requestedRoleResult = await pool.query(
      'SELECT id, name, department_id FROM roles WHERE id = $1',
      [requested_role_id]
    );

    if (requestedRoleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Requested role not found' });
    }

    const requestedRole = requestedRoleResult.rows[0];

    // Verify that the requested role is in the same department as the user
    const userDepartmentResult = await pool.query(
      'SELECT id FROM departments WHERE name = $1',
      [user.department]
    );

    if (userDepartmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'User department not found' });
    }

    const userDepartmentId = userDepartmentResult.rows[0].id;

    if (requestedRole.department_id !== userDepartmentId) {
      return res.status(400).json({ error: 'Requested role must be in the same department' });
    }

    // Check if there's already a pending request for this user
    const existingRequest = await pool.query(
      'SELECT id FROM role_change_requests WHERE user_id = $1 AND status = $2',
      [requestingUserId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'There is already a pending role change request for this user' });
    }

    // Calculate the expiration date (2 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    // Create the role change request
    const result = await pool.query(
      `INSERT INTO role_change_requests 
       (user_id, current_role_id, requested_role_id, expires_at) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, user_id, current_role_id, requested_role_id, status, requested_at`,
      [requestingUserId, user.role_id, requested_role_id, expiresAt]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting role change request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending role change requests for approvals
router.get('/pending-requests', authenticateJWT, async (req, res) => {
  const pool = req.pool;

  try {
    // Get all pending role change requests with user and role information
    const result = await pool.query(`
      SELECT 
        rcr.id,
        rcr.user_id,
        u.full_name as user_name,
        u.email as user_email,
        cr.name as current_role_name,
        rr.name as requested_role_name,
        rcr.status,
        rcr.requested_at,
        rcr.expires_at
      FROM role_change_requests rcr
      JOIN users u ON rcr.user_id = u.id
      LEFT JOIN roles cr ON rcr.current_role_id = cr.id
      LEFT JOIN roles rr ON rcr.requested_role_id = rr.id
      WHERE rcr.status = 'pending'
      ORDER BY rcr.requested_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending role change requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or reject a role change request
router.put('/requests/:requestId', authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { requestId } = req.params;
  const { status, rejection_reason } = req.body;
  const approvingUserId = req.user.userId;

  try {
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
    }

    // Get the role change request
    const requestResult = await pool.query(
      'SELECT * FROM role_change_requests WHERE id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role change request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Update the role change request
    const updateFields = ['status = $1', 'updated_at = $2'];
    const updateValues = [status, new Date()];
    let paramCounter = 3;

    if (status === 'approved') {
      updateFields.push('approved_at = $' + paramCounter, 'approved_by = $' + (paramCounter + 1));
      updateValues.push(new Date(), approvingUserId);
      paramCounter += 2;
    } else if (status === 'rejected' && rejection_reason) {
      updateFields.push('rejection_reason = $' + paramCounter);
      updateValues.push(rejection_reason);
      paramCounter++;
    }

    // Add the WHERE clause parameters
    updateValues.push(requestId);

    const updateQuery = `
      UPDATE role_change_requests 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const updatedRequest = await pool.query(updateQuery, updateValues);

    // If approved, update the user's role
    if (status === 'approved') {
      await pool.query(
        'UPDATE users SET role_id = $1 WHERE id = $2',
        [request.requested_role_id, request.user_id]
      );
    }

    res.json(updatedRequest.rows[0]);
  } catch (error) {
    console.error('Error updating role change request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get role change history for a user
router.get('/user-history/:userId', authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    // Get role change requests for the user
    const result = await pool.query(`
      SELECT 
        rcr.id,
        rcr.user_id,
        cr.name as current_role_name,
        rr.name as requested_role_name,
        rcr.status,
        rcr.requested_at,
        rcr.approved_at,
        rcr.rejection_reason,
        approver.full_name as approved_by_name
      FROM role_change_requests rcr
      LEFT JOIN roles cr ON rcr.current_role_id = cr.id
      LEFT JOIN roles rr ON rcr.requested_role_id = rr.id
      LEFT JOIN users approver ON rcr.approved_by = approver.id
      WHERE rcr.user_id = $1
      ORDER BY rcr.requested_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching role change history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;