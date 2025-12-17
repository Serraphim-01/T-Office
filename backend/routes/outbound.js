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
        pr.name as provider_name,
        i.batch_number,
        ARRAY_AGG(osn.serial_number) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers
      FROM outbound_transactions o
      JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
      WHERE o.quantity > 0
      GROUP BY o.id, i.product_id, p.name, p.part_number, pr.name, i.batch_number
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching outbound transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get outbound transactions for a specific product
router.get('/product/:productId', authenticateJWT, async (req, res) => {
  const { productId } = req.params;
  
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
        o.inbound_price,
        o.outbound_price,
        pr.name as provider_name,
        i.batch_number,
        ARRAY_AGG(osn.serial_number) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers
      FROM outbound_transactions o
      JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
      WHERE i.product_id = $1 AND o.quantity > 0
      GROUP BY o.id, i.product_id, p.name, p.part_number, pr.name, i.batch_number
      ORDER BY o.created_at DESC
    `, [productId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product outbound transactions:', error);
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
    delivery_datetime,
    inbound_price,
    outbound_price
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
    
    // Get the inbound transaction with product price
    const inboundResult = await req.pool.query(`
      SELECT i.id, p.default_unit_price 
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      WHERE i.id = $1`,
      [inbound_transaction_id]
    );
    
    if (inboundResult.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Inbound transaction not found' });
    }
    
    const defaultPrice = inboundResult.rows[0].default_unit_price || 0.00;
    const actualInboundPrice = inbound_price !== undefined ? parseFloat(inbound_price) : defaultPrice;
    const actualOutboundPrice = outbound_price !== undefined ? parseFloat(outbound_price) : defaultPrice;
    
    // Insert outbound transaction
    const result = await req.pool.query(`
      INSERT INTO outbound_transactions 
      (inbound_transaction_id, quantity, receiver_address, receiver_email, receiver_phone, dispatch_datetime, delivery_datetime, status, inbound_price, outbound_price) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING id`,
      [inbound_transaction_id, quantity, receiver_address, receiver_email, receiver_phone, dispatch_datetime, delivery_datetime, 'Outgoing', actualInboundPrice, actualOutboundPrice]
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

// Create a new outbound transaction from multiple stored transactions
router.post('/multi', authenticateJWT, async (req, res) => {
  const { 
    product_id,
    quantity, 
    serial_numbers, 
    receiver_address, 
    receiver_email, 
    receiver_phone, 
    dispatch_datetime, 
    delivery_datetime,
    inbound_price,
    outbound_price
  } = req.body;
  
  // Validate input
  if (!product_id || !quantity || !serial_numbers || !Array.isArray(serial_numbers) || 
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
    
    // Get product default price and markup percentage
    const productResult = await req.pool.query(
      'SELECT default_unit_price, default_markup_percentage FROM products WHERE id = $1',
      [product_id]
    );
    
    if (productResult.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const defaultPrice = productResult.rows[0].default_unit_price || 0.00;
    const markupPercentage = productResult.rows[0].default_markup_percentage || 0.00;
    const calculatedOutboundPrice = defaultPrice * (1 + (markupPercentage / 100));
    const actualInboundPrice = inbound_price !== undefined ? parseFloat(inbound_price) : defaultPrice;
    const actualOutboundPrice = outbound_price !== undefined ? parseFloat(outbound_price) : calculatedOutboundPrice;
    
    // Find one of the inbound transactions that contains these serial numbers to use as the link
    let inboundTransactionId = null;
    if (serial_numbers.length > 0) {
      // Find any transaction that contains one of our serial numbers
      const transactionResult = await req.pool.query(`
        SELECT DISTINCT i.id as transaction_id
        FROM inbound_transactions i
        JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
        WHERE isn.serial_number = ANY($1) AND i.status = 'Stored'
        LIMIT 1`,
        [serial_numbers.map(s => s.trim())]
      );
      
      if (transactionResult.rowCount > 0) {
        inboundTransactionId = transactionResult.rows[0].transaction_id;
      }
    }
    
    // If we couldn't find a transaction, create a dummy one
    if (!inboundTransactionId) {
      const inboundResult = await req.pool.query(`
        INSERT INTO inbound_transactions 
        (product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, arrival_date, status) 
        SELECT $1, $2, provider_id, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 'Outbound'
        FROM products 
        WHERE id = $1
        RETURNING id`,
        [product_id, quantity]
      );
      
      inboundTransactionId = inboundResult.rows[0].id;
    }
    
    // Insert outbound transaction
    const result = await req.pool.query(`
      INSERT INTO outbound_transactions 
      (inbound_transaction_id, quantity, receiver_address, receiver_email, receiver_phone, dispatch_datetime, delivery_datetime, status, inbound_price, outbound_price) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING id`,
      [inboundTransactionId, quantity, receiver_address, receiver_email, receiver_phone, dispatch_datetime, delivery_datetime, 'Outgoing', actualInboundPrice, actualOutboundPrice]
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
    
    // Find and update the stored transactions that contained these serial numbers
    // We need to remove the used serial numbers from their respective stored transactions
    // Track which transactions we've processed to avoid duplicate updates
    const processedTransactions = new Set();
    
    for (const serial of serial_numbers) {
      if (serial && serial.trim() !== '') {
        // Find the inbound transaction that contains this serial number
        const transactionResult = await req.pool.query(`
          SELECT i.id as transaction_id
          FROM inbound_transactions i
          JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
          WHERE isn.serial_number = $1 AND i.status = 'Stored'`,
          [serial.trim()]
        );
        
        if (transactionResult.rowCount > 0) {
          const transactionId = transactionResult.rows[0].transaction_id;
          
          // Only process each transaction once
          if (!processedTransactions.has(transactionId)) {
            processedTransactions.add(transactionId);
            
            // Count how many of our serial numbers are in this transaction
            const serialCountResult = await req.pool.query(
              `SELECT COUNT(*) as count 
               FROM inbound_serial_numbers 
               WHERE transaction_id = $1 AND serial_number = ANY($2)`,
              [transactionId, serial_numbers.map(s => s.trim())]
            );
            
            const serialsInTransaction = parseInt(serialCountResult.rows[0].count);
            
            // Delete all our serial numbers from this transaction
            await req.pool.query(
              'DELETE FROM inbound_serial_numbers WHERE transaction_id = $1 AND serial_number = ANY($2)',
              [transactionId, serial_numbers.map(s => s.trim())]
            );
            
            // Check if the transaction has any serial numbers left
            const totalCountResult = await req.pool.query(
              'SELECT COUNT(*) as count FROM inbound_serial_numbers WHERE transaction_id = $1',
              [transactionId]
            );
            
            const totalSerialsLeft = parseInt(totalCountResult.rows[0].count);
            
            // If no serial numbers left, update the transaction status to Outbound
            if (totalSerialsLeft === 0) {
              await req.pool.query('UPDATE inbound_transactions SET status = $1, quantity = 0 WHERE id = $2', ['Outbound', transactionId]);
            } else {
              // Update the quantity of the transaction
              await req.pool.query(
                'UPDATE inbound_transactions SET quantity = quantity - $1 WHERE id = $2',
                [serialsInTransaction, transactionId]
              );
            }
          }
        }
      }
    }
    
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
        o.inbound_price,
        o.outbound_price,
        pr.name as provider_name,
        ARRAY_AGG(osn.serial_number) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers
      FROM outbound_transactions o
      JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
      WHERE o.id = $1 AND o.quantity > 0
      GROUP BY o.id, i.product_id, p.name, p.part_number, pr.name
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