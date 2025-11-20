import express from "express";
import { authenticateJWT, requireHR } from "./auth.js";

const router = express.Router();

// Get user profile
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const result = await req.pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.department, u.created_at,
        ud.certifications, ud.cv, ud.portfolio, ud.job_description, ud.contract,
        ud.query_count, ud.attendance, ud.other_details
      FROM users u
      LEFT JOIN user_details ud ON u.id = ud.user_id
      WHERE u.id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    const responseData = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      department: user.department,
      created_at: user.created_at,
      certifications: user.certifications || [],
      cv: user.cv,
      portfolio: user.portfolio,
      job_description: user.job_description,
      contract: user.contract,
      query_count: user.query_count || 0,
      attendance: user.attendance || [],
      other_details: user.other_details || {}
    };

    res.json(responseData);
  } catch (err) {
    console.error('[PROFILE API] Error fetching profile:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
router.put("/", authenticateJWT, async (req, res) => {
  const { certifications, cv, portfolio, job_description, contract, other_details } = req.body;

  try {
    await req.pool.query(`
      UPDATE user_details
      SET certifications = $1, cv = $2, portfolio = $3, job_description = $4,
          contract = $5, other_details = $6, updated_at = NOW()
      WHERE user_id = $7
    `, [certifications, cv, portfolio, job_description, contract, other_details, req.user.userId]);

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add certification to user profile
router.post("/certifications", authenticateJWT, async (req, res) => {
  const { title, issuer, file_data, file_name, file_type, expiry_date, has_expiry } = req.body;

  console.log('[CERT-ADD] Starting certification addition for user:', req.user.userId);
  console.log('[CERT-ADD] Request body keys:', Object.keys(req.body));

  if (!title || !issuer) {
    return res.status(400).json({ error: "Title and issuer are required" });
  }

  try {
    // Check if user_details row exists
    const userDetailsCheck = await req.pool.query(
      'SELECT id FROM user_details WHERE user_id = $1',
      [req.user.userId]
    );

    console.log('[CERT-ADD] User details check result:', userDetailsCheck.rows);

    if (userDetailsCheck.rows.length === 0) {
      console.log('[CERT-ADD] No user_details row found, creating one...');
      await req.pool.query(
        'INSERT INTO user_details (user_id) VALUES ($1)',
        [req.user.userId]
      );
      console.log('[CERT-ADD] Created user_details row');
    }

    // Get current certifications
    const currentResult = await req.pool.query(
      'SELECT certifications FROM user_details WHERE user_id = $1',
      [req.user.userId]
    );

    console.log('[CERT-ADD] Current certifications query result:', currentResult.rows);

    const currentCerts = currentResult.rows[0]?.certifications || [];
    console.log('[CERT-ADD] Current certifications:', currentCerts);

    const newCert = {
      id: Date.now().toString(),
      title,
      issuer,
      file_data: file_data || null, // Base64 encoded file data
      file_name: file_name || null,
      file_type: file_type || null,
      expiry_date: has_expiry ? expiry_date : null,
      has_expiry,
      status: 'pending', // Pending approval
      created_at: new Date().toISOString()
    };

    console.log('[CERT-ADD] New certification object created');

    const updatedCerts = [...currentCerts, newCert];
    console.log('[CERT-ADD] Updated certifications array length:', updatedCerts.length);

    const updateResult = await req.pool.query(
      'UPDATE user_details SET certifications = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(updatedCerts), req.user.userId]
    );

    console.log('[CERT-ADD] Update query result:', updateResult.rowCount, 'rows affected');

    console.log('[CERT-ADD] Certification added successfully');
    res.status(201).json(newCert);
  } catch (err) {
    console.error('[CERT-ADD] Error adding certification:', err);
    console.error('[CERT-ADD] Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete certification from user profile
router.delete("/certifications/:certId", authenticateJWT, async (req, res) => {
  const { certId } = req.params;

  try {
    // Get current certifications
    const currentResult = await req.pool.query(
      'SELECT certifications FROM user_details WHERE user_id = $1',
      [req.user.userId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "User details not found" });
    }

    const currentCerts = currentResult.rows[0]?.certifications || [];
    const certIndex = currentCerts.findIndex(cert => cert.id === certId);

    if (certIndex === -1) {
      return res.status(404).json({ error: "Certification not found" });
    }

    // Remove the certification from the array
    currentCerts.splice(certIndex, 1);

    await req.pool.query(
      'UPDATE user_details SET certifications = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(currentCerts), req.user.userId]
    );

    res.json({ message: "Certification deleted successfully" });
  } catch (err) {
    console.error('Error deleting certification:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update certification status (Admin/HR only)
router.put("/certifications/:certId", authenticateJWT, requireHR, async (req, res) => {
  const { certId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  try {
    // Get current certifications for all users (since we need to find which user has this cert)
    const allUsersResult = await req.pool.query('SELECT user_id, certifications FROM user_details');

    for (const userRow of allUsersResult.rows) {
      const certs = userRow.certifications || [];
      const certIndex = certs.findIndex(cert => cert.id === certId);

      if (certIndex !== -1) {
        certs[certIndex].status = status;
        certs[certIndex].approved_at = status === 'approved' ? new Date().toISOString() : null;

        await req.pool.query(
          'UPDATE user_details SET certifications = $1, updated_at = NOW() WHERE user_id = $2',
          [JSON.stringify(certs), userRow.user_id]
        );

        return res.json({ message: `Certification ${status} successfully` });
      }
    }

    res.status(404).json({ error: "Certification not found" });
  } catch (err) {
    console.error('Error updating certification status:', err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;