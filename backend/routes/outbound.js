import express from 'express';
import { authenticateJWT } from './auth.js';

const router = express.Router();

// Get all outbound transactions
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const result = await req.pool.query(`
      SELECT 
        o.id,
        o.inbound_transaction_id,
        i.product_id,
        p.name as product_name,
        p.part_number as product_part_number,
        o.quantity,
        o.receiver_address,
        o.receiver_email,
        o.receiver_phone,
        o.dispatch_datetime,
        o.delivery_datetime,
        o.status,
        o.created_at,
        ARRAY_AGG(osn.serial_number) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers
      FROM outbound_transactions o
      JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      JOIN products p ON i.product_id = p.id
      LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
      GROUP BY o.id, i.product_id, p.name, p.part_number
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching outbound transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new outbound transaction
router.post('/', authenticateJWT, async (req, res) => {
  const { 
    inbound_transaction_id, 
    quantity, 
    serial_numbers, 
    receiver_address, 
    receiver_email, 
    receiver_phone, 
    dispatch_datetime, 
    delivery_datetime 
  } = req.body;
  
  // Validate input
  if (!inbound_transaction_id || !quantity || !serial_numbers || !Array.isArray(serial_numbers) || 
      serial_numbers.length === 0 || !receiver_address || !receiver_email || !receiver_phone || 
      !dispatch_datetime || !delivery_datetime) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Validate that the number of serial numbers matches the quantity
  if (serial_numbers.length !== quantity) {
    return res.status(400).json({ error: 'Number of serial numbers must match quantity' });
  }
  
  try {
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Insert outbound transaction
    const result = await req.pool.query(`
      INSERT INTO outbound_transactions 
      (inbound_transaction_id, quantity, receiver_address, receiver_email, receiver_phone, dispatch_datetime, delivery_datetime, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id`,
      [inbound_transaction_id, quantity, receiver_address, receiver_email, receiver_phone, dispatch_datetime, delivery_datetime, 'Outgoing']
    );
    
    const outboundTransactionId = result.rows[0].id;
    
    // Insert serial numbers
    for (const serial of serial_numbers) {
      if (serial && serial.trim() !== '') {
        await req.pool.query(
          'INSERT INTO outbound_serial_numbers (outbound_transaction_id, serial_number) VALUES ($1, $2)',
          [outboundTransactionId, serial.trim()]
        );
      }
    }
    
    // Update the inbound transaction status to Outbound
    await req.pool.query(
      'UPDATE inbound_transactions SET status = $1, updated_at = NOW() WHERE id = $2',
      ['Outbound', inbound_transaction_id]
    );
    
    // Commit transaction
    await req.pool.query('COMMIT');
    
    res.status(201).json({ id: outboundTransactionId, message: 'Outbound transaction created successfully' });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error adding outbound transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update outbound transaction status to Dispatched
router.post('/:id/dispatched', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(
      `UPDATE outbound_transactions 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND status = $3
       RETURNING id`,
      ['Dispatched', id, 'Outgoing']
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Outbound transaction not found or already dispatched' });
    }
    
    res.json({ message: 'Transaction marked as dispatched' });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update outbound transaction status to Delivered
router.post('/:id/delivered', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(
      `UPDATE outbound_transactions 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND status = $3
       RETURNING id`,
      ['Delivered', id, 'Dispatched']
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Outbound transaction not found or not yet dispatched' });
    }
    
    res.json({ message: 'Transaction marked as delivered' });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an outbound transaction
router.delete('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Get the inbound transaction ID
    const inboundResult = await req.pool.query(
      'SELECT inbound_transaction_id FROM outbound_transactions WHERE id = $1',
      [id]
    );
    
    if (inboundResult.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Outbound transaction not found' });
    }
    
    const inboundTransactionId = inboundResult.rows[0].inbound_transaction_id;
    
    // Delete serial numbers first (due to foreign key constraint)
    await req.pool.query('DELETE FROM outbound_serial_numbers WHERE outbound_transaction_id = $1', [id]);
    
    // Delete the transaction
    const result = await req.pool.query('DELETE FROM outbound_transactions WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Outbound transaction not found' });
    }
    
    // Update the inbound transaction status back to Stored
    await req.pool.query(
      'UPDATE inbound_transactions SET status = $1, updated_at = NOW() WHERE id = $2',
      ['Stored', inboundTransactionId]
    );
    
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

// Get outbound transaction details
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(`
      SELECT 
        o.id,
        o.inbound_transaction_id,
        i.product_id,
        p.name as product_name,
        p.part_number as product_part_number,
        o.quantity,
        o.receiver_address,
        o.receiver_email,
        o.receiver_phone,
        o.dispatch_datetime,
        o.delivery_datetime,
        o.status,
        o.created_at,
        ARRAY_AGG(osn.serial_number) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers
      FROM outbound_transactions o
      JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      JOIN products p ON i.product_id = p.id
      LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
      WHERE o.id = $1
      GROUP BY o.id, i.product_id, p.name, p.part_number
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Outbound transaction not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching outbound transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;