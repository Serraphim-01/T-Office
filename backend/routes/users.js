import express from 'express';
import { authenticateJWT } from './auth.js';

const router = express.Router();

// Assign support staff to a user
router.post('/:userId/assign-support', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const { supportStaffId } = req.body;
  
  try {
    // Check if user exists
    const userCheck = await req.pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if support staff exists
    const staffCheck = await req.pool.query(
      'SELECT id FROM users WHERE id = $1',
      [supportStaffId]
    );
    
    if (staffCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Support staff not found' });
    }
    
    // Create assignment
    const result = await req.pool.query(
      `INSERT INTO user_support_assignments (user_id, support_staff_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, support_staff_id) 
       DO UPDATE SET updated_at = NOW()
       RETURNING id, user_id, support_staff_id, created_at, updated_at`,
      [userId, supportStaffId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning support staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove support staff from a user
router.delete('/:userId/unassign-support/:supportStaffId', authenticateJWT, async (req, res) => {
  const { userId, supportStaffId } = req.params;
  
  try {
    const result = await req.pool.query(
      'DELETE FROM user_support_assignments WHERE user_id = $1 AND support_staff_id = $2',
      [userId, supportStaffId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error unassigning support staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get support staff assigned to a user
router.get('/:userId/support-staff', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await req.pool.query(
      `SELECT usa.id, usa.created_at, usa.updated_at,
              u.id as support_staff_id, u.full_name, u.email, u.department
       FROM user_support_assignments usa
       JOIN users u ON usa.support_staff_id = u.id
       WHERE usa.user_id = $1
       ORDER BY u.full_name`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching support staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users that a support staff member is supporting
router.get('/:supportStaffId/supported-users', authenticateJWT, async (req, res) => {
  const { supportStaffId } = req.params;
  
  try {
    const result = await req.pool.query(
      `SELECT usa.id, usa.created_at, usa.updated_at,
              u.id as user_id, u.full_name, u.email, u.department
       FROM user_support_assignments usa
       JOIN users u ON usa.user_id = u.id
       WHERE usa.support_staff_id = $1
       ORDER BY u.full_name`,
      [supportStaffId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching supported users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;