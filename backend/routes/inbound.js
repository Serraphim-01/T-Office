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
        i.batch_number,
        i.unit_price,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.status = $1 AND i.quantity > 0
      GROUP BY i.id, p.name, p.part_number, pr.name, i.product_id, i.quantity, i.status, i.created_at, i.batch_number, i.unit_price
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
        i.batch_number,
        i.unit_price,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.status = $1 AND i.quantity > 0
      GROUP BY i.id, p.name, p.part_number, pr.name, i.product_id, i.quantity, i.status, i.created_at, i.batch_number, i.unit_price
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
  const { product_id, quantity, serial_numbers, provider_id, expected_arrival_start, expected_arrival_end, unit_price } = req.body;
  
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
    
    // Generate automatic batch number: B-ddmmyy-transaction_number
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = String(now.getFullYear()).slice(-2);
    const datePart = `${day}${month}${year}`;
    
    // Get the transaction number for the day by counting transactions created today
    let transactionNumber = 1;
    
    // Loop to find a unique batch number
    let batch_number;
    let batchExists = true;
    let attempt = 0;
    while (batchExists && attempt < 10) { // Prevent infinite loop
      // Get the transaction number for the day by counting transactions created today
      const countResult = await req.pool.query(
        `SELECT COUNT(*) as count FROM inbound_transactions 
         WHERE DATE(created_at) = DATE($1) AND product_id = $2`,
        [now, product_id]
      );
      
      // Calculate the tentative transaction number
      const tentativeTransactionNumber = parseInt(countResult.rows[0].count) + 1 + attempt;
      batch_number = `B-${datePart}-${tentativeTransactionNumber}`;
      
      // Check if this batch number already exists
      const checkResult = await req.pool.query(
        'SELECT 1 FROM inbound_transactions WHERE batch_number = $1',
        [batch_number]
      );
      
      if (checkResult.rowCount === 0) {
        batchExists = false; // Batch number is unique
      } else {
        // Increment the attempt counter and try again
        attempt++;
      }
    }
    
    // Insert inbound transaction with auto-generated batch number
    const result = await req.pool.query(`
      INSERT INTO inbound_transactions 
      (product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, status, batch_number, unit_price) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id`,
      [product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, 'Incoming', batch_number, unit_price || 0.00]
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
    
    res.status(201).json({ id: transactionId, batch_number, message: 'Inbound transaction created successfully' });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error adding inbound transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add multiple inbound transactions with the same batch number
router.post('/bulk', authenticateJWT, async (req, res) => {
  const { transactions, expected_arrival_start, expected_arrival_end } = req.body;
  
  // Validate input
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return res.status(400).json({ error: 'At least one transaction is required' });
  }
  
  if (!expected_arrival_start || !expected_arrival_end) {
    return res.status(400).json({ error: 'Expected arrival dates are required' });
  }
  
  // Validate each transaction
  for (const transaction of transactions) {
    const { product_id, quantity, provider_id } = transaction;
    if (!product_id || !quantity || !provider_id) {
      return res.status(400).json({ error: 'Each transaction must have product_id, quantity, and provider_id' });
    }
  }
  
  try {
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Verify all providers exist
    for (const transaction of transactions) {
      const providerCheck = await req.pool.query(
        'SELECT id FROM providers WHERE id = $1',
        [transaction.provider_id]
      );
      
      if (providerCheck.rowCount === 0) {
        await req.pool.query('ROLLBACK');
        return res.status(400).json({ error: `Invalid provider ID: ${transaction.provider_id}` });
      }
    }
    
    // Generate automatic batch number: B-ddmmyy-transaction_number
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = String(now.getFullYear()).slice(-2);
    const datePart = `${day}${month}${year}`;
    
    // Get the transaction number for the day by counting transactions created today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const countResult = await req.pool.query(
      `SELECT COUNT(*) as count FROM inbound_transactions 
       WHERE DATE(created_at) = DATE($1) AND product_id = $2`,
      [now, transactions[0].product_id]
    );
    
    const baseTransactionNumber = parseInt(countResult.rows[0].count) + 1;
    
    // For bulk creation, each transaction in the batch gets a unique number
    // Generate unique batch numbers for each transaction
    const batch_numbers = [];
    for (let i = 0; i < transactions.length; i++) {
      let batch_number = `B-${datePart}-${baseTransactionNumber + i}`;
      
      // Ensure uniqueness by checking if this batch number already exists
      let batchExists = true;
      let attempt = 0;
      while (batchExists && attempt < 10) { // Prevent infinite loop
        const checkResult = await req.pool.query(
          'SELECT 1 FROM inbound_transactions WHERE batch_number = $1',
          [batch_number]
        );
        
        if (checkResult.rowCount === 0) {
          batchExists = false; // Batch number is unique
        } else {
          // Increment the transaction number and try again
          attempt++;
          batch_number = `B-${datePart}-${baseTransactionNumber + i + attempt}`;
        }
      }
      
      batch_numbers.push(batch_number);
    }
    
    // Insert all transactions with their own unique batch numbers
    const results = [];
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const { product_id, quantity, serial_numbers, provider_id, unit_price } = transaction;
      
      // Use the unique batch number for this transaction
      const batch_number = batch_numbers[i];
      
      // Insert inbound transaction with auto-generated batch number
      const result = await req.pool.query(`
        INSERT INTO inbound_transactions 
        (product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, status, batch_number, unit_price) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING id`,
        [product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, 'Incoming', batch_number, unit_price || 0.00]
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
      
      results.push({ id: transactionId, product_id });
    }
    
    // Commit transaction
    await req.pool.query('COMMIT');
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who created the transactions
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_inbound_created',
            title: 'New Inbound Transactions Created',
            message: `${transactions.length} new inbound transactions have been created with batch numbers ${batch_numbers.join(', ')}.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending inbound transaction creation notifications:', notificationError);
    }
    
    res.status(201).json({ 
      transactions: results, 
      batch_numbers, 
      message: 'Inbound transactions created successfully' 
    });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error adding inbound transactions:', error);
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
        i.batch_number,
        i.unit_price,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.id = $1
      GROUP BY i.id, p.name, p.part_number, pr.name, i.product_id, i.quantity, i.status, i.created_at, i.batch_number, i.unit_price
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
  const { product_id, quantity, serial_numbers, provider_id, expected_arrival_start, expected_arrival_end, unit_price } = req.body;
  
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
    
    // Get the existing batch number
    const existingTransaction = await req.pool.query(
      'SELECT batch_number FROM inbound_transactions WHERE id = $1 AND status = $2',
      [id, 'Incoming']
    );
    
    if (existingTransaction.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found or already stored' });
    }
    
    const batch_number = existingTransaction.rows[0].batch_number;
    
    // Update inbound transaction, keeping the existing batch number
    const result = await req.pool.query(`
      UPDATE inbound_transactions 
      SET product_id = $1, quantity = $2, provider_id = $3, expected_arrival_start = $4, expected_arrival_end = $5, updated_at = NOW(), unit_price = $6
      WHERE id = $7 AND status = 'Incoming'
      RETURNING id`,
      [product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, unit_price || 0.00, id]
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
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who updated the transaction
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_inbound_updated',
            title: 'Inbound Transaction Updated',
            message: `An inbound transaction has been updated with batch number ${batch_number}.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending inbound transaction update notifications:', notificationError);
    }
    
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
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who deleted the transaction
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_inbound_deleted',
            title: 'Inbound Transaction Deleted',
            message: `An inbound transaction has been deleted.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending inbound transaction deletion notifications:', notificationError);
    }
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error deleting transaction:', error);
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
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who deleted the transaction
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_stored_deleted',
            title: 'Stored Transaction Deleted',
            message: `A stored transaction has been deleted.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending stored transaction deletion notifications:', notificationError);
    }
    
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
    // Preserve all existing transaction details including unit_price
    const result = await req.pool.query(
      `UPDATE inbound_transactions 
       SET status = $1, arrival_date = $2::DATE, updated_at = NOW() 
       WHERE id = $3 AND status = $4
       RETURNING id, product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, 
                 arrival_date, status, batch_number, unit_price, created_at`,
      ['Stored', arrivalDate, id, 'Incoming']
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found or already stored' });
    }
    
    // Log the stored transaction details for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Stored transaction details:', result.rows[0]);
    }
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who stored the transaction
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_inbound_stored',
            title: 'Inbound Transaction Stored',
            message: `An inbound transaction has been marked as stored.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending inbound transaction stored notifications:', notificationError);
    }
    
    res.json({ message: 'Transaction marked as stored', transaction: result.rows[0] });
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
        i.unit_price,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.product_id = $1 AND i.status = $2 AND i.quantity > 0
      GROUP BY i.id, p.name, p.part_number, pr.name, i.product_id, i.quantity, i.status, i.created_at, i.unit_price
      ORDER BY i.created_at DESC
    `, [productId, 'Incoming']);
    
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
        i.batch_number,
        i.unit_price,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.product_id = $1 AND i.status = $2 AND i.quantity > 0
      GROUP BY i.id, p.name, p.part_number, pr.name, i.product_id, i.quantity, i.status, i.created_at, i.batch_number, i.unit_price
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
        i.batch_number,
        i.unit_price,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.id = $1 AND i.status = $2 AND i.quantity > 0
      GROUP BY i.id, p.name, p.part_number, pr.name, i.product_id, i.quantity, i.status, i.created_at, i.batch_number, i.unit_price
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
        i.batch_number,
        i.unit_price,
        ARRAY_AGG(isn.serial_number) FILTER (WHERE isn.serial_number IS NOT NULL) as serial_numbers
      FROM inbound_transactions i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
      WHERE i.product_id = $1 AND i.status = $2 AND i.quantity > 0
      GROUP BY i.id, pr.name, i.batch_number, i.unit_price, i.product_id, i.provider_id
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
      `SELECT DISTINCT p.id, p.name, p.part_number, p.default_unit_price
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

// Get details for a specific serial number
router.get('/serials/:serialNumber', authenticateJWT, async (req, res) => {
  const { serialNumber } = req.params;
  
  try {
    // First get the basic serial number information
    const result = await req.pool.query(`
      SELECT 
        isn.id,
        isn.serial_number,
        isn.created_at as serial_created_at,
        i.id as transaction_id,
        i.product_id,
        i.quantity,
        i.provider_id,
        i.expected_arrival_start,
        i.expected_arrival_end,
        i.arrival_date,
        i.status as inbound_status,
        i.batch_number,
        i.unit_price as inbound_price,
        i.created_at as transaction_created_at,
        p.name as product_name,
        p.part_number as product_part_number,
        p.default_unit_price as product_default_unit_price,
        pr.name as provider_name,
        -- Get all serial numbers in the same transaction
        ARRAY_AGG(isn2.serial_number) OVER (PARTITION BY i.id) as all_serial_numbers_in_batch
      FROM inbound_serial_numbers isn
      JOIN inbound_transactions i ON isn.transaction_id = i.id
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      JOIN inbound_serial_numbers isn2 ON isn2.transaction_id = i.id
      WHERE isn.serial_number = $1
      LIMIT 1
    `, [serialNumber]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Serial number not found' });
    }
    
    const serialInfo = result.rows[0];
    
    // Get outbound information for this serial number
    const outboundResult = await req.pool.query(`
      SELECT 
        ot.status as outbound_status,
        ot.outbound_price,
        osn.inbound_price as outbound_inbound_price
      FROM outbound_serial_numbers osn
      JOIN outbound_transactions ot ON osn.outbound_transaction_id = ot.id
      WHERE osn.serial_number = $1
      ORDER BY ot.created_at DESC
      LIMIT 1
    `, [serialNumber]);
    
    // Add outbound information to serialInfo
    if (outboundResult.rowCount > 0) {
      serialInfo.outbound_status = outboundResult.rows[0].outbound_status;
      serialInfo.final_outbound_price = outboundResult.rows[0].outbound_price;
      serialInfo.outbound_inbound_price = outboundResult.rows[0].outbound_inbound_price;
    } else {
      serialInfo.outbound_status = null;
      serialInfo.final_outbound_price = null;
      serialInfo.outbound_inbound_price = null;
    }
    
    // Determine the status based on whether the serial is in outbound transactions
    let finalStatus = serialInfo.inbound_status;
    
    // Map 'Outbound' status to 'Outgoing' for consistency with proper states
    if (finalStatus === 'Outbound') {
      finalStatus = 'Outgoing';
    }
    
    if (serialInfo.outbound_status) {
      finalStatus = serialInfo.outbound_status;
    }
    
    // Determine the price to display based on status
    let displayPrice = serialInfo.inbound_price;
    let priceType = 'inbound';
    
    // Use outbound price for all outbound-related statuses
    const isOutboundStatus = finalStatus === 'Outgoing' || finalStatus === 'Dispatched' || finalStatus === 'Delivered';
    if (isOutboundStatus) {
      displayPrice = serialInfo.final_outbound_price;
      priceType = 'outbound';
    }
    
    // Also get the original inbound price for outbound serials
    let inboundPriceForOutbound = serialInfo.outbound_inbound_price || serialInfo.inbound_price;
    
    // If outbound price is null but we have an outbound-related status, try to get a reasonable default
    if (isOutboundStatus && serialInfo.final_outbound_price === null) {
      // Use the inbound price as fallback if outbound price is not set
      serialInfo.final_outbound_price = serialInfo.outbound_inbound_price || serialInfo.inbound_price;
    }
    
    // Get other transactions with the same product and provider (same batch details)
    const relatedTransactionsResult = await req.pool.query(`
      SELECT 
        i.id as transaction_id,
        i.batch_number,
        i.unit_price,
        i.arrival_date,
        i.status,
        i.quantity,
        ARRAY_AGG(isn3.serial_number) as related_serial_numbers
      FROM inbound_transactions i
      JOIN inbound_serial_numbers isn3 ON i.id = isn3.transaction_id
      WHERE i.product_id = $1 AND i.provider_id = $2 AND i.batch_number = $3 AND i.id != $4
      GROUP BY i.id, i.batch_number, i.unit_price, i.arrival_date, i.status, i.quantity
    `, [serialInfo.product_id, serialInfo.provider_id, serialInfo.batch_number, serialInfo.transaction_id]);
    
    const response = {
      serial_number: serialInfo.serial_number,
      created_at: serialInfo.serial_created_at,
      product: {
        id: serialInfo.product_id,
        name: serialInfo.product_name,
        part_number: serialInfo.product_part_number,
        default_unit_price: serialInfo.product_default_unit_price
      },
      provider: {
        id: serialInfo.provider_id,
        name: serialInfo.provider_name
      },
      transaction: {
        id: serialInfo.transaction_id,
        batch_number: serialInfo.batch_number,
        inbound_price: serialInfo.inbound_price,
        outbound_price: serialInfo.final_outbound_price,
        outbound_inbound_price: serialInfo.outbound_inbound_price,
        quantity: serialInfo.quantity,
        status: finalStatus,
        expected_arrival_start: serialInfo.expected_arrival_start,
        expected_arrival_end: serialInfo.expected_arrival_end,
        arrival_date: serialInfo.arrival_date,
        created_at: serialInfo.transaction_created_at
      },
      price_info: {
        display_price: displayPrice,
        price_type: priceType,
        inbound_price: serialInfo.inbound_price,
        outbound_price: isOutboundStatus ? serialInfo.final_outbound_price : null,
        outbound_inbound_price: inboundPriceForOutbound
      },
      serial_numbers_in_same_batch: Array.from(new Set(serialInfo.all_serial_numbers_in_batch)),
      related_transactions: relatedTransactionsResult.rows
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching serial number details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;