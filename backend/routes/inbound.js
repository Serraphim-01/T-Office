import express from 'express';
import { authenticateJWT } from './auth.js';

const router = express.Router();

// Get all inbound transactions (only Incoming status)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const result = await req.pool.query(`
      SELECT 
        i.id,
        i.product_id,
        p.name as product_name,
        p.part_number as product_part_number,
        i.quantity,
        pr.name as provider_name,
        i.expected_arrival_start,
        i.expected_arrival_end,
        i.status,
        i.created_at,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.status = $1
      GROUP BY i.id, p.name, p.part_number, pr.name
      ORDER BY i.created_at DESC
    `, ['Incoming']);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inbound transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all stored transactions (only Stored status)
router.get('/store', authenticateJWT, async (req, res) => {
  try {
    const result = await req.pool.query(`
      SELECT 
        i.id,
        i.product_id,
        p.name as product_name,
        p.part_number as product_part_number,
        i.quantity,
        pr.name as provider_name,
        i.arrival_date,
        i.status,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.status = $1
      GROUP BY i.id, p.name, p.part_number, pr.name
      ORDER BY i.arrival_date DESC
    `, ['Stored']);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stored transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new inbound transaction
router.post('/', authenticateJWT, async (req, res) => {
  const { product_id, quantity, serial_numbers, provider_id, expected_arrival_start, expected_arrival_end } = req.body;
  
  // Validate input
  if (!product_id || !quantity || !provider_id || !expected_arrival_start || !expected_arrival_end) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Verify provider exists
    const providerCheck = await req.pool.query(
      'SELECT id FROM providers WHERE id = $1',
      [provider_id]
    );
    
    if (providerCheck.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid provider ID' });
    }
    
    // Insert inbound transaction
    const result = await req.pool.query(`
      INSERT INTO inbound_transactions 
      (product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, status) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id`,
      [product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, 'Incoming']
    );
    
    const transactionId = result.rows[0].id;
    
    // Insert serial numbers if provided
    if (serial_numbers && Array.isArray(serial_numbers) && serial_numbers.length > 0) {
      for (const serial of serial_numbers) {
        if (serial && serial.trim() !== '') {
          await req.pool.query(
            'INSERT INTO inbound_serial_numbers (transaction_id, serial_number) VALUES ($1, $2)',
            [transactionId, serial.trim()]
          );
        }
      }
    }
    
    // Commit transaction
    await req.pool.query('COMMIT');
    
    res.status(201).json({ id: transactionId, message: 'Inbound transaction created successfully' });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error adding inbound transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific inbound transaction by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(`
      SELECT 
        i.id,
        i.product_id,
        p.name as product_name,
        p.part_number as product_part_number,
        i.quantity,
        pr.name as provider_name,
        i.expected_arrival_start,
        i.expected_arrival_end,
        i.status,
        i.created_at,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.id = $1
      GROUP BY i.id, p.name, p.part_number, pr.name
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an inbound transaction
router.put('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { product_id, quantity, serial_numbers, provider_id, expected_arrival_start, expected_arrival_end } = req.body;
  
  // Validate input
  if (!product_id || !quantity || !provider_id || !expected_arrival_start || !expected_arrival_end) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Verify provider exists
    const providerCheck = await req.pool.query(
      'SELECT id FROM providers WHERE id = $1',
      [provider_id]
    );
    
    if (providerCheck.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid provider ID' });
    }
    
    // Update inbound transaction
    const result = await req.pool.query(`
      UPDATE inbound_transactions 
      SET product_id = $1, quantity = $2, provider_id = $3, expected_arrival_start = $4, expected_arrival_end = $5, updated_at = NOW()
      WHERE id = $6 AND status = 'Incoming'
      RETURNING id`,
      [product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, id]
    );
    
    if (result.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found or already stored' });
    }
    
    // Delete existing serial numbers
    await req.pool.query('DELETE FROM inbound_serial_numbers WHERE transaction_id = $1', [id]);
    
    // Insert new serial numbers if provided
    if (serial_numbers && Array.isArray(serial_numbers) && serial_numbers.length > 0) {
      for (const serial of serial_numbers) {
        if (serial && serial.trim() !== '') {
          await req.pool.query(
            'INSERT INTO inbound_serial_numbers (transaction_id, serial_number) VALUES ($1, $2)',
            [id, serial.trim()]
          );
        }
      }
    }
    
    // Commit transaction
    await req.pool.query('COMMIT');
    
    res.json({ message: 'Inbound transaction updated successfully' });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error updating inbound transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an inbound transaction
router.delete('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if transaction is in Incoming status
    const checkResult = await req.pool.query(
      'SELECT id FROM inbound_transactions WHERE id = $1 AND status = $2',
      [id, 'Incoming']
    );
    
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found or already stored' });
    }
    
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Delete serial numbers first (due to foreign key constraint)
    await req.pool.query('DELETE FROM inbound_serial_numbers WHERE transaction_id = $1', [id]);
    
    // Delete the transaction
    const result = await req.pool.query('DELETE FROM inbound_transactions WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Commit transaction
    await req.pool.query('COMMIT');
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark transaction as stored
router.post('/:id/store', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // First, get the transaction to determine the arrival date
    const transactionResult = await req.pool.query(
      'SELECT expected_arrival_start, expected_arrival_end FROM inbound_transactions WHERE id = $1 AND status = $2',
      [id, 'Incoming']
    );
    
    if (transactionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found or already stored' });
    }
    
    // Use the end of the expected arrival range as the arrival date
    const arrivalDate = transactionResult.rows[0].expected_arrival_end;
    
    // Update the transaction status to Stored and set arrival date
    const result = await req.pool.query(
      `UPDATE inbound_transactions 
       SET status = $1, arrival_date = $2::DATE, updated_at = NOW() 
       WHERE id = $3 AND status = $4
       RETURNING id`,
      ['Stored', arrivalDate, id, 'Incoming']
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found or already stored' });
    }
    
    res.json({ message: 'Transaction marked as stored' });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inbound transactions for a specific product
router.get('/product/:productId', authenticateJWT, async (req, res) => {
  const { productId } = req.params;
  
  try {
    const result = await req.pool.query(`
      SELECT 
        i.id,
        i.product_id,
        p.name as product_name,
        p.part_number as product_part_number,
        i.quantity,
        pr.name as provider,
        i.expected_arrival_start,
        i.expected_arrival_end,
        i.status,
        i.created_at,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.product_id = $1
      GROUP BY i.id, p.name, p.part_number, pr.name
      ORDER BY i.created_at DESC
    `, [productId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product inbound transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stored transactions for a specific product
router.get('/store/product/:productId', authenticateJWT, async (req, res) => {
  const { productId } = req.params;
  
  try {
    const result = await req.pool.query(`
      SELECT 
        i.id,
        i.product_id,
        p.name as product_name,
        p.part_number as product_part_number,
        i.quantity,
        pr.name as provider_name,
        i.arrival_date,
        i.status,
        i.created_at,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.product_id = $1 AND i.status = $2
      GROUP BY i.id, p.name, p.part_number, pr.name
      ORDER BY i.arrival_date DESC
    `, [productId, 'Stored']);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product stored transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific stored transaction by ID
router.get('/store/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(`
      SELECT 
        i.id,
        i.product_id,
        p.name as product_name,
        p.part_number as product_part_number,
        i.quantity,
        pr.name as provider_name,
        i.arrival_date,
        i.status,
        i.created_at,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.id = $1 AND i.status = $2
      GROUP BY i.id, p.name, p.part_number, pr.name
    `, [id, 'Stored']);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Stored transaction not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching stored transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get serial numbers for a specific product grouped by provider
router.get('/store/product/:productId/serials', authenticateJWT, async (req, res) => {
  const { productId } = req.params;
  
  try {
    const result = await req.pool.query(`
      SELECT 
        i.id as transaction_id,
        pr.name as provider_name,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.product_id = $1 AND i.status = $2
      GROUP BY i.id, pr.name
      ORDER BY pr.name
    `, [productId, 'Stored']);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product serial numbers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products by provider ID
router.get('/providers/:providerId/products', authenticateJWT, async (req, res) => {
  const { providerId } = req.params;
  
  try {
    // First verify the provider exists
    const providerCheck = await req.pool.query(
      'SELECT id FROM providers WHERE id = $1',
      [providerId]
    );
    
    if (providerCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    // Get products associated with this provider through inbound transactions
    const result = await req.pool.query(
      `SELECT DISTINCT p.id, p.name, p.part_number
       FROM products p
       JOIN inbound_transactions it ON p.id = it.product_id
       WHERE it.provider_id = $1
       ORDER BY p.name`,
      [providerId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products by provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set stored transaction as outbound
router.post('/store/:id/outbound', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // For now, we'll just mark it as outbound in a future implementation
    // This would typically move the transaction to an outbound table
    const result = await req.pool.query(
      `UPDATE inbound_transactions 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND status = $3
       RETURNING id`,
      ['Outbound', id, 'Stored']
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Stored transaction not found' });
    }
    
    res.json({ message: 'Transaction set as outbound' });
  } catch (error) {
    console.error('Error setting transaction as outbound:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a stored transaction
router.delete('/store/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if transaction is in Stored status
    const checkResult = await req.pool.query(
      'SELECT id FROM inbound_transactions WHERE id = $1 AND status = $2',
      [id, 'Stored']
    );
    
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Stored transaction not found' });
    }
    
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Delete serial numbers first (due to foreign key constraint)
    await req.pool.query('DELETE FROM inbound_serial_numbers WHERE transaction_id = $1', [id]);
    
    // Delete the transaction
    const result = await req.pool.query('DELETE FROM inbound_transactions WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Commit transaction
    await req.pool.query('COMMIT');
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;