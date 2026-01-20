import express from "express";
import { authenticateJWT } from "./auth.js";
import { sendNotification } from '../index.js'; // Import sendNotification function

const router = express.Router();

// Setup location schema
router.post("/admin/setup-locations", authenticateJWT, async (req, res) => {
  try {
    const fs = await import('fs');
    const schema = fs.readFileSync('./location_schema.sql', 'utf8');

    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await req.pool.query(statement);
      }
    }

    res.json({ message: "Location schema setup completed" });
  } catch (err) {
    console.error('Error setting up location schema:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all user locations (for display purposes, all user-created locations)
router.get("/user-locations", authenticateJWT, async (req, res) => {
  try {
    const result = await req.pool.query(
      'SELECT id, name, latitude, longitude, radius_meters, address, is_active, created_at, updated_at, created_by FROM locations WHERE created_by IS NOT NULL ORDER BY name',
      []
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user locations:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new user location (save to global locations table with created_by)
router.post("/user-locations", authenticateJWT, async (req, res) => {
  const { name, latitude, longitude, radius_meters, address } = req.body;

  if (!name || !latitude || !longitude) {
    return res.status(400).json({ error: "Name, latitude, and longitude are required" });
  }

  try {
    const result = await req.pool.query(
      'INSERT INTO locations (name, latitude, longitude, radius_meters, address, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, latitude, longitude, radius_meters, address, is_active, created_at, updated_at, created_by',
      [name, latitude, longitude, radius_meters || 100, address, req.user.userId]
    );

    // Emit real-time update to all connected clients
    req.app.get('io').emit('location_added', result.rows[0]);

    // Send notification to users with manage locations access (excluding the creator)
    // First, get all users with clock/manage-locations access
    const usersWithAccess = await req.pool.query(`
      SELECT DISTINCT u.id, u.full_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN department_page_access dpa ON r.department_id = dpa.department_id
      WHERE dpa.page_name = 'clock/manage-locations'
      AND u.id != $1
    `, [req.user.userId]);

    // Send notifications to each user with access
    for (const user of usersWithAccess.rows) {
      await sendNotification(user.id, {
        type: 'location_created',
        title: 'New Location Added',
        message: `${req.user.full_name || 'A user'} added a new location: ${name}`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user location:', err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: "Location name already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Update user location (in global locations table, check created_by)
router.put("/user-locations/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, latitude, longitude, radius_meters, address, is_active } = req.body;

  try {
    // First check if the location was created by the user
    const checkResult = await req.pool.query(
      'SELECT id FROM locations WHERE id = $1 AND created_by = $2',
      [id, req.user.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Location not found or you don't have permission to edit it" });
    }

    const result = await req.pool.query(
      'UPDATE locations SET name = $1, latitude = $2, longitude = $3, radius_meters = $4, address = $5, is_active = $6, updated_at = NOW() WHERE id = $7 AND created_by = $8 RETURNING id, name, latitude, longitude, radius_meters, address, is_active, created_at, updated_at',
      [name, latitude, longitude, radius_meters, address, is_active, id, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user location:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: "Location name already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Delete user location (from global locations table, allow anyone to delete user-created locations)
router.delete("/user-locations/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    // First get the location name for the notification
    const locationResult = await req.pool.query(
      'SELECT name, created_by FROM locations WHERE id = $1 AND created_by IS NOT NULL',
      [id]
    );

    if (locationResult.rows.length === 0) {
      return res.status(404).json({ error: "Location not found or cannot be deleted" });
    }

    const locationName = locationResult.rows[0].name;
    const createdBy = locationResult.rows[0].created_by;

    const result = await req.pool.query(
      'DELETE FROM locations WHERE id = $1 AND created_by IS NOT NULL RETURNING *',
      [id]
    );

    // Emit real-time update to all connected clients
    req.app.get('io').emit('location_deleted', { id });

    // Send notification to users with manage locations access (excluding the deleter)
    // First, get all users with clock/manage-locations access
    const usersWithAccess = await req.pool.query(`
      SELECT DISTINCT u.id, u.full_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN department_page_access dpa ON r.department_id = dpa.department_id
      WHERE dpa.page_name = 'clock/manage-locations'
      AND u.id != $1
    `, [req.user.userId]);

    // Send notifications to each user with access
    for (const user of usersWithAccess.rows) {
      await sendNotification(user.id, {
        type: 'location_deleted',
        title: 'Location Deleted',
        message: `${req.user.full_name || 'A user'} deleted location: ${locationName}`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting user location:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all locations
router.get("/locations", authenticateJWT, async (req, res) => {
  try {
    const result = await req.pool.query(
      'SELECT * FROM locations WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new location (Now available to all users)
// Removed requireHR middleware to allow all users access
router.post("/locations", authenticateJWT, async (req, res) => {
  const { name, latitude, longitude, radius_meters, address } = req.body;

  if (!name || !latitude || !longitude) {
    return res.status(400).json({ error: "Name, latitude, and longitude are required" });
  }

  try {
    const result = await req.pool.query(
      'INSERT INTO locations (name, latitude, longitude, radius_meters, address, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, latitude, longitude, radius_meters || 100, address, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update location (Now available to all users)
// Removed requireHR middleware to allow all users access
router.put("/locations/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, latitude, longitude, radius_meters, address, is_active } = req.body;

  try {
    const result = await req.pool.query(
      'UPDATE locations SET name = $1, latitude = $2, longitude = $3, radius_meters = $4, address = $5, is_active = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, latitude, longitude, radius_meters, address, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete location (Now available to all users)
// Removed requireAdmin middleware to allow all users access
router.delete("/locations/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await req.pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Record location event (entry/exit from geofence)
router.post("/location-events", authenticateJWT, async (req, res) => {
  const { location_id, event_type, latitude, longitude, accuracy } = req.body;

  if (!location_id || !event_type || !latitude || !longitude) {
    return res.status(400).json({ error: "Location ID, event type, latitude, and longitude are required" });
  }

  if (!['entry', 'exit'].includes(event_type)) {
    return res.status(400).json({ error: "Event type must be 'entry' or 'exit'" });
  }

  try {
    const result = await req.pool.query(
      'INSERT INTO location_events (user_id, location_id, event_type, latitude, longitude, accuracy) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.userId, location_id, event_type, latitude, longitude, accuracy]
    );

    // Check if this triggers automatic attendance
    await handleAutomaticAttendance(req.user.userId, location_id, event_type, result.rows[0].id);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error recording location event:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's location events
router.get("/location-events", authenticateJWT, async (req, res) => {
  const { limit = 50 } = req.query;

  try {
    const result = await req.pool.query(
      `SELECT le.*, l.name as location_name, l.latitude, l.longitude, l.radius_meters
       FROM location_events le
       JOIN locations l ON le.location_id = l.id
       WHERE le.user_id = $1
       ORDER BY le.timestamp DESC
       LIMIT $2`,
      [req.user.userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching location events:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Manual clock-in
router.post("/attendance/clock-in", authenticateJWT, async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId = req.user.userId;

  // Removed verbose logging
  // Removed verbose logging

  try {
    // Validate input coordinates
    if (!latitude || !longitude) {
      console.error(`[CLOCK-IN] Missing coordinates: lat=${latitude}, lng=${longitude}`);
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      console.error(`[CLOCK-IN] Invalid coordinates: lat=${latitude}, lng=${longitude}`);
      return res.status(400).json({ error: "Invalid latitude or longitude values" });
    }

    // Check if user is within any active geofence
    // Removed verbose logging
    const locationCheck = await checkUserInGeofence(req.pool, userId, parseFloat(latitude), parseFloat(longitude));

    // Removed verbose logging

    if (!locationCheck.isInGeofence) {
      // Removed verbose logging
      return res.status(403).json({
        error: "You must be within a configured location to clock in",
        nearest_location: locationCheck.nearestLocation,
        debug_info: {
          user_coordinates: { lat: latitude, lng: longitude },
          geofence_check: locationCheck
        }
      });
    }

    // Create a location event record for manual clock-in
    // Removed verbose logging
    const locationEventResult = await req.pool.query(
      'INSERT INTO location_events (user_id, location_id, event_type, latitude, longitude, is_auto_generated) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, locationCheck.locationId, 'entry', parseFloat(latitude), parseFloat(longitude), false]
    );
    const locationEventId = locationEventResult.rows[0].id;

    // Record manual clock-in
    // Removed verbose logging
    const result = await req.pool.query(
      'INSERT INTO auto_attendance (user_id, location_event_id, event_type, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, locationEventId, 'clock_in', `Manual clock-in at ${locationCheck.locationName}`]
    );

    // Removed verbose logging

    // Emit real-time update for attendance
    req.app.get('io').emit('attendance_updated', { 
      userId, 
      record: result.rows[0],
      type: 'clock_in'
    });

    // Send notification to users with HR Users access when someone clocks in
    try {
      // Import the sendNotification function
      const { sendNotification } = await import('../index.js');
      
      // Get all users with HR Users access (through either department or role-based access)
      const hrUsersResult = await req.pool.query(`
        SELECT DISTINCT u.id
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN role_page_access rpa ON r.id = rpa.role_id AND rpa.page_name = 'hr/users'
        LEFT JOIN department_page_access dpa ON r.department_id = dpa.department_id AND dpa.page_name = 'hr/users'
        WHERE rpa.page_name = 'hr/users' OR dpa.page_name = 'hr/users'
      `);
      
      // Send notification to each HR user
      for (const userRow of hrUsersResult.rows) {
        // Don't notify the user who clocked in
        if (userRow.id != userId) {
          await sendNotification(userRow.id, {
            type: 'clock_in',
            title: 'User Clocked In',
            message: `${req.user.full_name || 'A user'} has clocked in at ${locationCheck.locationName}.`,
            timestamp: new Date().toISOString(),
            user_name: req.user.full_name || 'A user',
            location: locationCheck.locationName,
            user_id: userId // Add user ID for navigation
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending clock-in notifications:', notificationError);
    }

    res.status(201).json({
      message: "Successfully clocked in",
      attendance: result.rows[0],
      location: locationCheck.locationName
    });
  } catch (err) {
    console.error(`[CLOCK-IN] Error recording manual clock-in for user ${userId}:`, {
      error: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      position: err.position,
      internalPosition: err.internalPosition,
      internalQuery: err.internalQuery,
      where: err.where,
      schema: err.schema,
      table: err.table,
      column: err.column,
      dataType: err.dataType,
      constraint: err.constraint,
      file: err.file,
      line: err.line,
      routine: err.routine
    });
    res.status(500).json({
      error: "Internal server error",
      debug_info: {
        error_message: err.message,
        error_code: err.code
      }
    });
  }
});

// Manual clock-out
router.post("/attendance/clock-out", authenticateJWT, async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId = req.user.userId;

  // Removed verbose logging
  try {
    // Validate input coordinates
    if (!latitude || !longitude) {
      console.error(`[CLOCK-OUT] Missing coordinates: lat=${latitude}, lng=${longitude}`);
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      console.error(`[CLOCK-OUT] Invalid coordinates: lat=${latitude}, lng=${longitude}`);
      return res.status(400).json({ error: "Invalid latitude or longitude values" });
    }

    // Check if user is within any active geofence
    const locationCheck = await checkUserInGeofence(req.pool, userId, parseFloat(latitude), parseFloat(longitude));

    if (!locationCheck.isInGeofence) {
      return res.status(403).json({
        error: "You must be within a configured location to clock out",
        nearest_location: locationCheck.nearestLocation,
        debug_info: {
          user_coordinates: { lat: latitude, lng: longitude },
          geofence_check: locationCheck
        }
      });
    }

    // Create a location event record for manual clock-out
    const locationEventResult = await req.pool.query(
      'INSERT INTO location_events (user_id, location_id, event_type, latitude, longitude, is_auto_generated) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, locationCheck.locationId, 'exit', parseFloat(latitude), parseFloat(longitude), false]
    );
    const locationEventId = locationEventResult.rows[0].id;

    // Record manual clock-out
    const result = await req.pool.query(
      'INSERT INTO auto_attendance (user_id, location_event_id, event_type, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, locationEventId, 'clock_out', `Manual clock-out at ${locationCheck.locationName}`]
    );

    // Emit real-time update for attendance
    req.app.get('io').emit('attendance_updated', { 
      userId, 
      record: result.rows[0],
      type: 'clock_out'
    });

    // Send notification to users with HR Users access when someone clocks out
    try {
      // Import the sendNotification function
      const { sendNotification } = await import('../index.js');
      
      // Get all users with HR Users access (through either department or role-based access)
      const hrUsersResult = await req.pool.query(`
        SELECT DISTINCT u.id
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN role_page_access rpa ON r.id = rpa.role_id AND rpa.page_name = 'hr/users'
        LEFT JOIN department_page_access dpa ON r.department_id = dpa.department_id AND dpa.page_name = 'hr/users'
        WHERE rpa.page_name = 'hr/users' OR dpa.page_name = 'hr/users'
      `);
      
      // Send notification to each HR user
      for (const userRow of hrUsersResult.rows) {
        // Don't notify the user who clocked out
        if (userRow.id != userId) {
          await sendNotification(userRow.id, {
            type: 'clock_out',
            title: 'User Clocked Out',
            message: `${req.user.full_name || 'A user'} has clocked out at ${locationCheck.locationName}.`,
            timestamp: new Date().toISOString(),
            user_name: req.user.full_name || 'A user',
            location: locationCheck.locationName,
            user_id: userId // Add user ID for navigation
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending clock-out notifications:', notificationError);
    }

    res.status(201).json({
      message: "Successfully clocked out",
      attendance: result.rows[0],
      location: locationCheck.locationName
    });
  } catch (err) {
    console.error(`[CLOCK-OUT] Error recording manual clock-out for user ${userId}:`, {
      error: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      position: err.position,
      internalPosition: err.internalPosition,
      internalQuery: err.internalQuery,
      where: err.where,
      schema: err.schema,
      table: err.table,
      column: err.column,
      dataType: err.dataType,
      constraint: err.constraint,
      file: err.file,
      line: err.line,
      routine: err.routine
    });
    res.status(500).json({
      error: "Internal server error",
      debug_info: {
        error_message: err.message,
        error_code: err.code
      }
    });
  }
});

// Manual clock-in/out (legacy endpoint)
router.post("/attendance/clock", authenticateJWT, async (req, res) => {
  const { type, latitude, longitude, accuracy } = req.body; // type: 'in' or 'out'
  const userId = req.user.userId;

  // Removed verbose logging
  // Removed verbose logging

  if (!type || !['in', 'out'].includes(type)) {
    console.error(`[CLOCK-LEGACY] Invalid type: ${type}`);
    return res.status(400).json({ error: "Type must be 'in' or 'out'" });
  }

  try {
    // Validate input coordinates
    if (!latitude || !longitude) {
      console.error(`[CLOCK-LEGACY] Missing coordinates: lat=${latitude}, lng=${longitude}`);
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      console.error(`[CLOCK-LEGACY] Invalid coordinates: lat=${latitude}, lng=${longitude}`);
      return res.status(400).json({ error: "Invalid latitude or longitude values" });
    }

    // Check if user is within any active geofence
    // Removed verbose logging
    const locationCheck = await checkUserInGeofence(req.pool, userId, parseFloat(latitude), parseFloat(longitude));

    // Removed verbose logging

    if (!locationCheck.isInGeofence) {
      // Removed verbose logging
      return res.status(403).json({
        error: "You must be within a configured location to clock in/out",
        nearest_location: locationCheck.nearestLocation,
        debug_info: {
          user_coordinates: { lat: latitude, lng: longitude },
          geofence_check: locationCheck
        }
      });
    }

    // Create a location event record for manual attendance
    const eventTypeLocation = type === 'in' ? 'entry' : 'exit';
    // Removed verbose logging
    const locationEventResult = await req.pool.query(
      'INSERT INTO location_events (user_id, location_id, event_type, latitude, longitude, is_auto_generated) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, locationCheck.locationId, eventTypeLocation, parseFloat(latitude), parseFloat(longitude), false]
    );
    const locationEventId = locationEventResult.rows[0].id;

    // Record manual attendance
    const eventType = type === 'in' ? 'clock_in' : 'clock_out';
    // Removed verbose logging
    const result = await req.pool.query(
      'INSERT INTO auto_attendance (user_id, location_event_id, event_type, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, locationEventId, eventType, `Manual ${type} at ${locationCheck.locationName}`]
    );

    // Removed verbose logging

    res.status(201).json({
      message: `Successfully clocked ${type}`,
      attendance: result.rows[0],
      location: locationCheck.locationName
    });
  } catch (err) {
    console.error(`[CLOCK-LEGACY] Error recording manual attendance for user ${userId}:`, {
      error: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      position: err.position,
      internalPosition: err.internalPosition,
      internalQuery: err.internalQuery,
      where: err.where,
      schema: err.schema,
      table: err.table,
      column: err.column,
      dataType: err.dataType,
      constraint: err.constraint,
      file: err.file,
      line: err.line,
      routine: err.routine
    });
    res.status(500).json({
      error: "Internal server error",
      debug_info: {
        error_message: err.message,
        error_code: err.code
      }
    });
  }
});

// Check user's current location status
router.post("/location-status", authenticateJWT, async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId = req.user.userId;

  // Removed verbose logging
  // Removed verbose logging

  if (!latitude || !longitude) {
    console.error(`[LOCATION-STATUS] Missing coordinates: lat=${latitude}, lng=${longitude}`);
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
    console.error(`[LOCATION-STATUS] Invalid coordinates: lat=${latitude}, lng=${longitude}`);
    return res.status(400).json({ error: "Invalid latitude or longitude values" });
  }

  try {
    // Removed verbose logging
    const locationCheck = await checkUserInGeofence(req.pool, userId, parseFloat(latitude), parseFloat(longitude));

    if (locationCheck.isInGeofence) {
      res.json({
        isInGeofence: true,
        locationName: locationCheck.locationName,
        locationId: locationCheck.locationId,
        distance: locationCheck.distance,
        locationType: locationCheck.locationType
      });
    } else {
      res.json({
        isInGeofence: false,
        nearestLocation: locationCheck.nearestLocation
      });
    }
  } catch (err) {
    console.error(`[LOCATION-STATUS] Error checking location status for user ${userId}:`, {
      error: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      position: err.position,
      internalPosition: err.internalPosition,
      internalQuery: err.internalQuery,
      where: err.where,
      schema: err.schema,
      table: err.table,
      column: err.column,
      dataType: err.dataType,
      constraint: err.constraint,
      file: err.file,
      line: err.line,
      routine: err.routine
    });
    res.status(500).json({
      error: "Internal server error",
      debug_info: {
        error_message: err.message,
        error_code: err.code
      }
    });
  }
});

// Get user's attendance records
router.get("/attendance", authenticateJWT, async (req, res) => {
  const { date } = req.query;

  try {
    let query = `
      SELECT aa.*, le.latitude, le.longitude, l.name as location_name
      FROM auto_attendance aa
      LEFT JOIN location_events le ON aa.location_event_id = le.id
      LEFT JOIN locations l ON le.location_id = l.id
      WHERE aa.user_id = $1
    `;
    const params = [req.user.userId];

    if (date) {
      query += ' AND DATE(aa.timestamp) = $2';
      params.push(date);
    }

    query += ' ORDER BY aa.timestamp DESC';

    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get attendance analytics for the current user
router.get("/attendance-analytics", authenticateJWT, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Get attendance data for the last 5 weeks (including current week)
    const query = `
      WITH last_5_weeks AS (
        SELECT 
          generate_series(
            DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '4 weeks',
            DATE_TRUNC('week', CURRENT_DATE),
            '1 week'
          )::date as week_start
      ),
      user_attendance AS (
        SELECT 
          DATE_TRUNC('week', timestamp)::date as week_start,
          event_type,
          timestamp
        FROM auto_attendance 
        WHERE user_id = $1 
          AND timestamp >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '4 weeks'
          AND timestamp < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
          AND event_type IN ('clock_in', 'clock_out')
      ),
      weekly_averages AS (
        SELECT 
          lw.week_start,
          ROUND(AVG(CASE WHEN ua.event_type = 'clock_in' THEN EXTRACT(EPOCH FROM (ua.timestamp::time - '00:00:00'::time))/3600 END), 2) as avg_clock_in_hour,
          ROUND(AVG(CASE WHEN ua.event_type = 'clock_out' THEN EXTRACT(EPOCH FROM (ua.timestamp::time - '00:00:00'::time))/3600 END), 2) as avg_clock_out_hour
        FROM last_5_weeks lw
        LEFT JOIN user_attendance ua ON lw.week_start = ua.week_start
        GROUP BY lw.week_start
      ),
      weekly_counts AS (
        SELECT 
          DATE_TRUNC('week', timestamp)::date as week_start,
          COUNT(*) as clock_ins_outs_count
        FROM auto_attendance 
        WHERE user_id = $1 
          AND timestamp >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '4 weeks'
          AND timestamp < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
          AND event_type IN ('clock_in', 'clock_out')
        GROUP BY DATE_TRUNC('week', timestamp)::date
      )
      SELECT 
        wa.week_start,
        wa.avg_clock_in_hour,
        wa.avg_clock_out_hour,
        COALESCE(wc.clock_ins_outs_count, 0) as clock_ins_outs_count
      FROM weekly_averages wa
      LEFT JOIN weekly_counts wc ON wa.week_start = wc.week_start
      ORDER BY wa.week_start;
    `;
    
    const result = await req.pool.query(query, [userId]);
    
    // Format the data for the frontend
    const formattedData = result.rows.map(row => {
      // Convert decimal hour values back to time format for display
      const formatHourToTime = (hourDecimal) => {
        if (hourDecimal === null || hourDecimal === undefined) return null;
        
        const hours = Math.floor(hourDecimal);
        const minutes = Math.floor((hourDecimal - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
      
      return {
        week_start: row.week_start,
        avg_clock_in: formatHourToTime(row.avg_clock_in_hour),
        avg_clock_out: formatHourToTime(row.avg_clock_out_hour),
        clock_ins_outs_count: row.clock_ins_outs_count
      };
    });
    
    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching attendance analytics:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to handle automatic attendance based on location events
async function handleAutomaticAttendance(pool, userId, locationId, eventType, locationEventId) {
  try {
    // Get location details
    const locationResult = await pool.query('SELECT name FROM locations WHERE id = $1', [locationId]);
    if (locationResult.rows.length === 0) return;

    const locationName = locationResult.rows[0].name;
    let attendanceType = null;

    if (eventType === 'entry') {
      // Check if user was previously clocked out (no recent clock_in without clock_out)
      const lastAttendance = await pool.query(
        'SELECT event_type FROM auto_attendance WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [userId]
      );

      if (lastAttendance.rows.length === 0 || lastAttendance.rows[0].event_type === 'clock_out') {
        attendanceType = 'clock_in';
      }
    } else if (eventType === 'exit') {
      // Check if user was previously clocked in (has clock_in without clock_out)
      const lastAttendance = await pool.query(
        'SELECT event_type FROM auto_attendance WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [userId]
      );

      if (lastAttendance.rows.length > 0 && lastAttendance.rows[0].event_type === 'clock_in') {
        attendanceType = 'clock_out';
      }
    }

    if (attendanceType) {
      await pool.query(
        'INSERT INTO auto_attendance (user_id, location_event_id, event_type, notes) VALUES ($1, $2, $3, $4)',
        [userId, locationEventId, attendanceType, `Auto ${attendanceType} at ${locationName}`]
      );
    }
  } catch (err) {
    console.error('Error handling automatic attendance:', err);
  }
}

// Helper function to check if user is within any geofence (global or user locations)
async function checkUserInGeofence(pool, userId, userLat, userLng) {
  try {
    // Check global locations
    const globalLocations = await pool.query('SELECT id, name, latitude, longitude, radius_meters FROM locations WHERE is_active = true');

    for (const location of globalLocations.rows) {
      const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);

      if (distance <= location.radius_meters) {
        return {
          isInGeofence: true,
          locationId: location.id,
          locationName: location.name,
          distance: distance,
          locationType: 'global'
        };
      }
    }

    // Check user locations
    const userLocations = await pool.query('SELECT id, name, latitude, longitude, radius_meters FROM locations WHERE created_by = $1 AND is_active = true', [userId]);

    for (const location of userLocations.rows) {
      const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);

      if (distance <= location.radius_meters) {
        return {
          isInGeofence: true,
          locationId: location.id,
          locationName: location.name,
          distance: distance,
          locationType: 'user'
        };
      }
    }

    // Find nearest location (check both global and user locations)
    let nearestLocation = null;
    let minDistance = Infinity;

    // Check global locations for nearest
    for (const location of globalLocations.rows) {
      const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = {
          id: location.id,
          name: location.name,
          distance: distance,
          type: 'global'
        };
      }
    }

    // Check user locations for nearest
    for (const location of userLocations.rows) {
      const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = {
          id: location.id,
          name: location.name,
          distance: distance,
          type: 'user'
        };
      }
    }

    return {
      isInGeofence: false,
      nearestLocation: nearestLocation
    };
  } catch (err) {
    console.error(`[GEOFENCE-CHECK] Error checking geofence for user ${userId}:`, {
      error: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      position: err.position,
      internalPosition: err.internalPosition,
      internalQuery: err.internalQuery,
      where: err.where,
      schema: err.schema,
      table: err.table,
      column: err.column,
      dataType: err.dataType,
      constraint: err.constraint,
      file: err.file,
      line: err.line,
      routine: err.routine
    });
    return { isInGeofence: false };
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;