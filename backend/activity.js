/**
 * Inserts a user activity into the database.
 * @param {object} pool - The PostgreSQL connection pool.
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} action - A machine-readable string for the action (e.g., 'auth.login').
 * @param {object} [details={}] - A JSON object for additional context.
 */
export async function logActivity(pool, userId, action, details = {}) {
  try {
    const query = {
      text: 'INSERT INTO user_activities (user_id, action, details) VALUES ($1, $2, $3)',
      values: [userId, action, details],
    };
    await pool.query(query);
  } catch (error) {
    // Log the error but don't let it crash the main operation
    console.error('Failed to log user activity:', error);
  }
}

/**
 * Fetches activities for a given user.
 * @param {object} pool - The PostgreSQL connection pool.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Array>} A promise that resolves to an array of activities.
 */
export async function getActivities(pool, userId) {
    try {
        const query = {
            text: 'SELECT action, details, created_at FROM user_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            values: [userId],
        };
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Failed to get user activities:', error);
        // Re-throw to be handled by the API endpoint
        throw error;
    }
}
