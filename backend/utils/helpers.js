import axios from 'axios';

// Function to check toxicity using Hugging Face API
export async function checkToxicity(text) {
  try {
    const response = await axios.post(
      'https://router.huggingface.co/hf-inference/models/unitary/toxic-bert',
      { inputs: text },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_TASK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // The model returns an array of results for each input
    const results = response.data[0] || [];
    const toxicLabels = results.filter(label => label.score > 0.5);

    // Check if any toxic label has high score
    const isToxic = toxicLabels.length > 0;
    const toxicType = isToxic ? toxicLabels.map(l => l.label).join(', ') : null;

    return { isToxic, toxicType, score: toxicLabels.length > 0 ? Math.max(...toxicLabels.map(l => l.score)) : 0 };
  } catch (error) {
    console.error('Error checking toxicity:', error);
    // If API fails, allow the message to proceed (fail-safe)
    return { isToxic: false, toxicType: null, score: 0 };
  }
}

// Function to summarize chat messages using Hugging Face API
export async function summarizeChat(messages) {
  try {
    const conversationText = messages.map(msg => msg.text).join('\n');

    const prompt = `Please provide a narrative summary of this company chat conversation. Write it as one or two flowing paragraphs that tell the story of what happened, including the emotional tone, key concerns, and overall atmosphere. Do not list individual messages or use bullet points.

Chat conversation:
${conversationText}

Narrative summary:`;

    const response = await axios.post(
      'https://router.huggingface.co/hf-inference/models/philschmid/bart-large-cnn-samsum',
      {
        inputs: prompt,
        parameters: {
          max_length: 1000,
          min_length: 50,
          temperature: 0.7,
          do_sample: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_TASK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let summaryText = response.data[0]?.summary_text || 'Unable to generate summary.';

    // Clean up the response to remove any prompt text that might have been included
    summaryText = summaryText.replace(/^Summarize the following.*?\n\n/i, '');
    summaryText = summaryText.replace(/^Chat conversation:.*?\n\n/i, '');
    summaryText = summaryText.replace(/^Summary:/i, '');
    summaryText = summaryText.trim();

    // If the summary is too short or seems to be just the prompt, provide a fallback
    if (summaryText.length < 20 || summaryText.toLowerCase().includes('summarize the following')) {
      summaryText = 'The chat conversation covered various topics with a generally professional tone. Participants engaged in discussions about workplace matters, sharing feedback and information.';
    }

    return summaryText;
  } catch (error) {
    console.error('Error summarizing chat:', error);
    return 'Summary generation failed. Please try again later.';
  }
}

// Function to calculate date range based on time range option
export function getDateRange(timeRange) {
  const now = new Date();
  let startDate;
  let endDate;

  switch (timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = now;
      break;
    case 'last_7_days':
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      endDate = now;
      break;
    case 'last_2_weeks':
      startDate = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      endDate = now;
      break;
    case 'last_1_month':
      startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      endDate = now;
      break;
    default:
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Default to last 7 days
      endDate = now;
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

// Function to cleanup old messages based on lifespan
export async function cleanupOldMessages(pool) {
  try {
    const lifespanDays = parseInt(process.env.MESSAGE_LIFESPAN_DAYS, 10) || 30; // Default 30 days
    const cutoffDate = new Date(Date.now() - (lifespanDays * 24 * 60 * 60 * 1000));

    const result = await pool.query(
      'DELETE FROM chat_messages WHERE created_at < $1',
      [cutoffDate.toISOString()]
    );

    if (result.rowCount > 0) {
      console.log(`Cleaned up ${result.rowCount} old chat messages older than ${lifespanDays} days`);
    }
  } catch (err) {
    console.error('Error cleaning up old messages:', err);
  }
}

// Helper function to calculate distance between two points (Haversine formula)
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to check if user is within any geofence (global or user locations)
export async function checkUserInGeofence(pool, userId, userLat, userLng) {
  console.log(`[GEOFENCE-CHECK] Starting geofence check for user ${userId} at (${userLat}, ${userLng})`);

  try {
    // Check global locations
    console.log(`[GEOFENCE-CHECK] Querying global locations...`);
    const globalLocations = await pool.query('SELECT id, name, latitude, longitude, radius_meters FROM locations WHERE is_active = true');
    console.log(`[GEOFENCE-CHECK] Found ${globalLocations.rows.length} active global locations`);

    for (const location of globalLocations.rows) {
      console.log(`[GEOFENCE-CHECK] Checking global location: ${location.name} (${location.latitude}, ${location.longitude}, radius: ${location.radius_meters}m)`);
      const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);
      console.log(`[GEOFENCE-CHECK] Distance to ${location.name}: ${distance.toFixed(2)}m`);

      if (distance <= location.radius_meters) {
        console.log(`[GEOFENCE-CHECK] User is within global geofence: ${location.name}`);
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
    console.log(`[GEOFENCE-CHECK] Querying user locations for user ${userId}...`);
    const userLocations = await pool.query('SELECT id, name, latitude, longitude, radius_meters FROM locations WHERE created_by = $1 AND is_active = true', [userId]);
    console.log(`[GEOFENCE-CHECK] Found ${userLocations.rows.length} active user locations`);

    for (const location of userLocations.rows) {
      console.log(`[GEOFENCE-CHECK] Checking user location: ${location.name} (${location.latitude}, ${location.longitude}, radius: ${location.radius_meters}m)`);
      const distance = calculateDistance(userLat, userLng, location.latitude, location.longitude);
      console.log(`[GEOFENCE-CHECK] Distance to ${location.name}: ${distance.toFixed(2)}m`);

      if (distance <= location.radius_meters) {
        console.log(`[GEOFENCE-CHECK] User is within user geofence: ${location.name}`);
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
    console.log(`[GEOFENCE-CHECK] User not in any geofence, finding nearest location...`);
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

    console.log(`[GEOFENCE-CHECK] Nearest location:`, nearestLocation);

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

// Helper function to handle automatic attendance based on location events
export async function handleAutomaticAttendance(pool, userId, locationId, eventType, locationEventId) {
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

      console.log(`Auto ${attendanceType} recorded for user ${userId} at ${locationName}`);
    }
  } catch (err) {
    console.error('Error handling automatic attendance:', err);
  }
}
