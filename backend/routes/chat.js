import express from "express";
import { authenticateJWT } from "./auth.js";
import { checkToxicity, summarizeChat, cleanupOldMessages } from "../utils/helpers.js";
import { sendNotification } from '../index.js'; // Import our notification function
import axios from "axios";

const router = express.Router();

// Get chat settings for a user
router.get("/settings/:userId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM chat_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default settings
      return res.json({
        user_id: userId,
        is_paused: false,
        theme: 'light',
        notifications_enabled: true,
        sound_enabled: true,
        auto_summarize: false,
        summary_interval: 50
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching chat settings:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update chat settings for a user
router.put("/settings/:userId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;
  const { is_paused, theme, notifications_enabled, sound_enabled, auto_summarize, summary_interval } = req.body;
  
  // Check if user is trying to pause/unpause and validate permissions
  if (is_paused !== undefined) {
    // Allow any authenticated user to pause the chat
    // But store who paused it for tracking purposes
  }

  try {
    await pool.query(
      `INSERT INTO chat_settings (user_id, is_paused, paused_by, paused_at, theme, notifications_enabled, sound_enabled, auto_summarize, summary_interval)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         is_paused = EXCLUDED.is_paused,
         paused_by = EXCLUDED.paused_by,
         paused_at = EXCLUDED.paused_at,
         theme = EXCLUDED.theme,
         notifications_enabled = EXCLUDED.notifications_enabled,
         sound_enabled = EXCLUDED.sound_enabled,
         auto_summarize = EXCLUDED.auto_summarize,
         summary_interval = EXCLUDED.summary_interval,
         updated_at = NOW()`,
      [userId, is_paused, is_paused ? req.user.userId : null, is_paused ? new Date() : null, theme, notifications_enabled, sound_enabled, auto_summarize, summary_interval]
    );

    res.json({ message: "Chat settings updated successfully" });
  } catch (err) {
    console.error('Error updating chat settings:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New endpoint to get global chat pause status
router.get("/global-pause", authenticateJWT, async (req, res) => {
  const pool = req.pool;

  try {
    const result = await pool.query(
      'SELECT is_chat_paused, paused_by, paused_at FROM global_chat_settings WHERE id = 1'
    );

    if (result.rows.length === 0) {
      // Return default settings
      return res.json({
        is_chat_paused: false,
        paused_by: null,
        paused_at: null
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching global chat pause status:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// New endpoint to set global chat pause status
router.put("/global-pause", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { is_chat_paused } = req.body;
  const userId = req.user.userId;

  try {
    // Get the previous state to determine if this is a pause or resume action
    const previousStateResult = await pool.query(
      'SELECT is_chat_paused FROM global_chat_settings WHERE id = 1'
    );
    
    const wasPaused = previousStateResult.rows.length > 0 ? previousStateResult.rows[0].is_chat_paused : false;
    const isPausing = is_chat_paused && !wasPaused;
    const isResuming = !is_chat_paused && wasPaused;

    const result = await pool.query(
      `UPDATE global_chat_settings 
       SET is_chat_paused = $1, paused_by = $2, paused_at = $3, updated_at = NOW()
       WHERE id = 1
       RETURNING is_chat_paused, paused_by, paused_at`,
      [is_chat_paused, is_chat_paused ? userId : null, is_chat_paused ? new Date() : null]
    );

    if (result.rows.length === 0) {
      // Insert if not exists
      await pool.query(
        `INSERT INTO global_chat_settings (id, is_chat_paused, paused_by, paused_at)
         VALUES (1, $1, $2, $3)`,
        [is_chat_paused, is_chat_paused ? userId : null, is_chat_paused ? new Date() : null]
      );
      
      // Notify all users about the pause/resume event
      if (isPausing || isResuming) {
        // Get all users to notify
        const usersResult = await pool.query('SELECT id FROM users');
        
        // Send notification to all users
        for (const user of usersResult.rows) {
          // Don't notify the user who initiated the action
          if (user.id != userId) {
            await sendNotification(user.id, {
              type: 'chat_status',
              title: isPausing ? 'Chat Paused' : 'Chat Resumed',
              message: isPausing 
                ? `Chat has been paused by a moderator. Only moderators can send messages.` 
                : `Chat has been resumed. Everyone can send messages again.`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      return res.json({
        is_chat_paused: is_chat_paused,
        paused_by: is_chat_paused ? userId : null,
        paused_at: is_chat_paused ? new Date() : null
      });
    }

    // Notify all users about the pause/resume event
    if (isPausing || isResuming) {
      // Get all users to notify
      const usersResult = await pool.query('SELECT id FROM users');
      
      // Send notification to all users
      for (const user of usersResult.rows) {
        // Don't notify the user who initiated the action
        if (user.id != userId) {
          await sendNotification(user.id, {
            type: 'chat_status',
            title: isPausing ? 'Chat Paused' : 'Chat Resumed',
            message: isPausing 
              ? `Chat has been paused by a moderator. Only moderators can send messages.` 
              : `Chat has been resumed. Everyone can send messages again.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating global chat pause status:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send a message (with toxicity check)
router.post("/messages", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { user_id, text, is_moderator } = req.body;
  const senderUserId = req.user.userId; // Get the actual sender's user ID

  // Verify that the user_id matches the authenticated user, unless they're a moderator
  if (senderUserId != user_id && !is_moderator) {
    return res.status(403).json({ error: "Access denied. You can only send messages as yourself." });
  }

  // Check if user is moderator when is_moderator flag is set
  if (is_moderator && req.user.department !== 'Admin' && req.user.department !== 'HR') {
    return res.status(403).json({ error: "Access denied. Only Admin and HR users can send messages as moderator." });
  }

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Message text is required" });
  }

  try {
    // Check if chat is paused for this user
    const settingsResult = await pool.query(
      'SELECT is_paused FROM chat_settings WHERE user_id = $1',
      [user_id]
    );
    
    const isPaused = settingsResult.rows.length > 0 ? settingsResult.rows[0].is_paused : false;
    
    // Check if global chat is paused
    const globalPauseResult = await pool.query(
      'SELECT is_chat_paused FROM global_chat_settings WHERE id = 1'
    );
    
    const isGlobalPaused = globalPauseResult.rows.length > 0 ? globalPauseResult.rows[0].is_chat_paused : false;
    
    // If either chat is paused, only allow moderators to send messages
    if ((isPaused || isGlobalPaused) && !is_moderator) {
      return res.status(403).json({ error: "Chat is currently paused. Only moderators can send messages." });
    }

    // Check for toxicity if not a moderator message
    if (!is_moderator) {
      const toxicityResult = await checkToxicity(text);
      if (toxicityResult.isToxic) {
        return res.status(400).json({
          error: "Message contains inappropriate content",
          toxicityType: toxicityResult.toxicType
        });
      }
    }

    const result = await pool.query(
      'INSERT INTO chat_messages (user_id, text, is_bot, is_moderator) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, text.trim(), false, is_moderator || false]
    );

    // Notify all other connected users about the new message (except the sender)
    const newMessage = result.rows[0];
    
    // Get all users except the sender
    const usersResult = await pool.query(
      'SELECT id FROM users WHERE id != $1',
      [senderUserId] // Use senderUserId instead of user_id
    );
    
    // Send notification to all other users
    for (const user of usersResult.rows) {
      await sendNotification(user.id, {
        type: 'chat_message',
        title: 'New Chat Message',
        message: 'You have a new message in the chat',
        messageId: newMessage.id,
        timestamp: new Date().toISOString()
      });
    }

    // Check if auto-summarization should be triggered
    const autoSummarySettings = await pool.query(
      'SELECT auto_summarize, summary_interval FROM chat_settings WHERE user_id = $1',
      [user_id]
    );

    if (autoSummarySettings.rows.length > 0 && autoSummarySettings.rows[0].auto_summarize) {
      const interval = autoSummarySettings.rows[0].summary_interval || 50;

      // Count messages since last summary
      const countResult = await pool.query(
        'SELECT COUNT(*) as message_count FROM chat_messages WHERE user_id = $1 AND created_at > (SELECT COALESCE(MAX(created_at), \'1970-01-01\') FROM chat_summaries WHERE user_id = $1)',
        [user_id]
      );

      if (countResult.rows[0].message_count >= interval) {
        // Trigger summarization
        const messagesResult = await pool.query(
          'SELECT text FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
          [user_id, interval]
        );

        const messages = messagesResult.rows.reverse();
        const summary = await summarizeChat(messages);

        if (summary && summary !== 'Summary generation failed. Please try again later.') {
          await pool.query(
            'INSERT INTO chat_summaries (user_id, summary_text, message_count) VALUES ($1, $2, $3)',
            [user_id, summary, interval]
          );
        }
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get messages for a user with optional time range filtering
router.get("/messages/:userId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;
  const { timeRange } = req.query;

  try {
    // Modified to fetch all messages for shared chat, not filtered by user_id
    let query = 'SELECT * FROM chat_messages';
    let params = [];

    if (timeRange) {
      const { startDate, endDate } = getDateRange(timeRange);
      query += ' WHERE created_at >= $1 AND created_at <= $2';
      params = [startDate, endDate];
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows.reverse()); // Reverse to show oldest first
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get chat summaries for a user
router.get("/summaries/:userId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM chat_summaries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching chat summaries:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Manually trigger summarization for a user
router.post("/summaries/:userId", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { userId } = req.params;
  const { messageCount } = req.body;

  try {
    const count = messageCount || 50;

    const messagesResult = await pool.query(
      'SELECT text FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, count]
    );

    if (messagesResult.rows.length === 0) {
      return res.status(400).json({ error: "No messages found to summarize" });
    }

    const messages = messagesResult.rows.reverse();
    const summary = await summarizeChat(messages);

    if (!summary || summary === 'Summary generation failed. Please try again later.') {
      return res.status(500).json({ error: "Failed to generate summary" });
    }

    const result = await pool.query(
      'INSERT INTO chat_summaries (user_id, summary_text, message_count) VALUES ($1, $2, $3) RETURNING *',
      [userId, summary, count]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating chat summary:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a message
router.delete("/messages/:id", authenticateJWT, async (req, res) => {
  const pool = req.pool;
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM chat_messages WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Clear all chat messages (Now available to all users)
// Removed requireAdmin middleware to allow all users access
router.post("/cleanup", authenticateJWT, async (req, res) => {
  const pool = req.pool;

  try {
    const result = await pool.query('DELETE FROM chat_messages');
    res.json({ message: `All chat messages cleared successfully. ${result.rowCount} messages deleted.` });
  } catch (err) {
    console.error('Error clearing chat messages:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;