import express from 'express';
import { authenticateJWT } from './auth.js';
// Import the helper functions for notifications
import {
  getUsersToNotifyOnOnboarding,
  getUsersToNotifyOnOffboarding,
  getUsersToNotifyOnSupportAssignment,
  getUsersToNotifyOnSupportRemoval
} from '../utils/helpers.js';

const router = express.Router();

// Assign support staff to a user
router.post('/:userId/assign-support', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const { supportStaffId } = req.body;
  
  try {
    // Check if user exists
    const userCheck = await req.pool.query(
      'SELECT id, full_name FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userName = userCheck.rows[0].full_name;
    
    // Check if support staff exists
    const staffCheck = await req.pool.query(
      'SELECT id, full_name FROM users WHERE id = $1',
      [supportStaffId]
    );
    
    if (staffCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Support staff not found' });
    }
    
    const staffName = staffCheck.rows[0].full_name;
    
    // Create assignment
    const result = await req.pool.query(
      `INSERT INTO user_support_assignments (user_id, support_staff_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, support_staff_id) 
       DO UPDATE SET updated_at = NOW()
       RETURNING id, user_id, support_staff_id, created_at, updated_at`,
      [userId, supportStaffId]
    );
    
    // Send notifications
    try {
      // Import the sendNotification function
      const { sendNotification } = await import('../index.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnSupportAssignment(req.pool, userId, supportStaffId);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        await sendNotification(notifyUserId, {
          type: 'support_assigned',
          title: 'Support Staff Assigned',
          message: `Support staff ${staffName} has been assigned to user ${userName}.`,
          timestamp: new Date().toISOString(),
          user_name: userName,
          support_staff_name: staffName,
          user_id: userId, // Add user ID for navigation
          support_staff_id: supportStaffId
        });
      }
    } catch (notificationError) {
      console.error('Error sending support assignment notifications:', notificationError);
    }
    
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
    // Get user names for notifications
    const userResult = await req.pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [userId]
    );
    
    const staffResult = await req.pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [supportStaffId]
    );
    
    if (userResult.rowCount === 0 || staffResult.rowCount === 0) {
      return res.status(404).json({ error: 'User or support staff not found' });
    }
    
    const userName = userResult.rows[0].full_name;
    const staffName = staffResult.rows[0].full_name;
    
    const result = await req.pool.query(
      'DELETE FROM user_support_assignments WHERE user_id = $1 AND support_staff_id = $2',
      [userId, supportStaffId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Send notifications
    try {
      // Import the sendNotification function
      const { sendNotification } = await import('../index.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnSupportRemoval(req.pool, userId, supportStaffId);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        await sendNotification(notifyUserId, {
          type: 'support_removed',
          title: 'Support Staff Removed',
          message: `Support staff ${staffName} has been removed from user ${userName}.`,
          timestamp: new Date().toISOString(),
          user_name: userName,
          support_staff_name: staffName,
          user_id: userId, // Add user ID for navigation
          support_staff_id: supportStaffId
        });
      }
    } catch (notificationError) {
      console.error('Error sending support removal notifications:', notificationError);
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

// Offboard a user
router.post('/:userId/offboard', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Get user details for notifications
    const userResult = await req.pool.query(
      'SELECT full_name, department FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userName = userResult.rows[0].full_name;
    const userDepartment = userResult.rows[0].department;
    
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Get the offboarded user's support staff
    const supportStaffResult = await req.pool.query(
      `SELECT usa.support_staff_id, u.full_name as support_staff_name
       FROM user_support_assignments usa
       JOIN users u ON usa.support_staff_id = u.id
       WHERE usa.user_id = $1`,
      [userId]
    );
    
    let reassignedUsers = []; // Track users whose support staff was reassigned
    
    // If the user has support staff, transfer responsibilities
    if (supportStaffResult.rows.length > 0) {
      const supportStaffId = supportStaffResult.rows[0].support_staff_id;
      const supportStaffName = supportStaffResult.rows[0].support_staff_name;
      
      // 1. Transfer provider attachments from offboarded user to support staff
      await req.pool.query(
        `UPDATE provider_user_assignments 
         SET user_id = $1 
         WHERE user_id = $2 AND assignment_type = 'attached_staff'`,
        [supportStaffId, userId]
      );
      
      // 2. If the offboarded user was a support staff to other users, 
      //    replace them with their own support staff
      const affectedUsersResult = await req.pool.query(
        `UPDATE user_support_assignments 
         SET support_staff_id = $1 
         WHERE support_staff_id = $2
         RETURNING user_id`,
        [supportStaffId, userId]
      );
      
      // Store the IDs of users whose support staff was reassigned
      reassignedUsers = affectedUsersResult.rows.map(row => row.user_id);
      
      // Get full details of reassigned users for notifications
      if (reassignedUsers.length > 0) {
        const reassignedUsersDetails = await req.pool.query(
          `SELECT id, full_name FROM users WHERE id = ANY($1)`,
          [reassignedUsers]
        );
        
        // Add full names to the reassignedUsers array
        reassignedUsers = reassignedUsersDetails.rows.map(row => ({
          id: row.id,
          full_name: row.full_name
        }));
      }
    }
    
    // Deactivate the user account
    await req.pool.query(
      'UPDATE users SET active = false WHERE id = $1',
      [userId]
    );
    
    // Commit transaction
    await req.pool.query('COMMIT');
    
    // Send notifications
    try {
      // Import the sendNotification function
      const { sendNotification } = await import('../index.js');
      
      // 1. Send user offboarding notification
      const usersToNotify = await getUsersToNotifyOnOffboarding(req.pool, userId);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        await sendNotification(notifyUserId, {
          type: 'user_offboarded',
          title: 'User Offboarded',
          message: `User ${userName} has been offboarded from the ${userDepartment} department.`,
          timestamp: new Date().toISOString(),
          user_name: userName,
          department: userDepartment,
          user_id: userId // Add user ID for navigation
        });
      }
      
      // 2. Send notifications about support staff reassignment
      if (supportStaffResult.rows.length > 0 && reassignedUsers.length > 0) {
        const supportStaffId = supportStaffResult.rows[0].support_staff_id;
        const supportStaffName = supportStaffResult.rows[0].support_staff_name;
        
        // Send notification to each user whose support staff was reassigned
        for (const reassignedUser of reassignedUsers) {
          // Get users to notify about the support staff reassignment
          const supportReassignNotifyUsers = await getUsersToNotifyOnSupportAssignment(
            req.pool, 
            reassignedUser.id, 
            supportStaffId
          );
          
          // Send notification to each user
          for (const notifyUserId of supportReassignNotifyUsers) {
            await sendNotification(notifyUserId, {
              type: 'support_reassigned',
              title: 'Support Staff Reassigned',
              message: `Your support staff has been changed from ${userName} to ${supportStaffName} due to offboarding.`,
              timestamp: new Date().toISOString(),
              user_name: reassignedUser.full_name,
              support_staff_name: supportStaffName,
              previous_support_staff_name: userName,
              user_id: reassignedUser.id, // Add user ID for navigation
              support_staff_id: supportStaffId
            });
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending offboarding notifications:', notificationError);
    }
    
    res.json({ 
      success: true, 
      message: 'User offboarded successfully',
      supportStaff: supportStaffResult.rows.length > 0 ? supportStaffResult.rows[0] : null,
      reassignedUsers: reassignedUsers
    });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error offboarding user:', error);
    res.status(500).json({ error: 'Internal server error during offboarding' });
  }
});

export default router;