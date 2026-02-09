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
        o.inbound_price,
        o.outbound_price,
        pr.name as provider_name,
        CASE 
          WHEN i.batch_number LIKE 'B-%' THEN CONCAT('BO', SUBSTRING(i.batch_number, 2))
          ELSE i.batch_number
        END as batch_number,
        ARRAY_AGG(json_build_object('serial_number', osn.serial_number, 'inbound_price', osn.inbound_price)) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers_with_prices
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
        CASE 
          WHEN i.batch_number LIKE 'B-%' THEN CONCAT('BO', SUBSTRING(i.batch_number, 2))
          ELSE i.batch_number
        END as batch_number,
        ARRAY_AGG(json_build_object('serial_number', osn.serial_number, 'inbound_price', osn.inbound_price)) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers_with_prices
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
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who created the transaction
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_outbound_created',
            title: 'New Outbound Transaction Created',
            message: `A new outbound transaction has been created.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending outbound transaction creation notifications:', notificationError);
    }
    
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
    outbound_price,
    serial_number_prices, // Optional array of prices for each serial number
    markup_percentage // Optional custom markup percentage
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
  
  // Validate serial_number_prices if provided
  if (serial_number_prices && Array.isArray(serial_number_prices)) {
    if (serial_number_prices.length !== serial_numbers.length) {
      return res.status(400).json({ error: 'Number of serial number prices must match number of serial numbers' });
    }
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
    const defaultMarkupPercentage = productResult.rows[0].default_markup_percentage || 0.00;
    
    // Use custom markup if provided, otherwise use product default
    const markupPercentage = markup_percentage !== undefined ? parseFloat(markup_percentage) : defaultMarkupPercentage;
    const calculatedOutboundPrice = defaultPrice * (1 + (markupPercentage / 100));
    
    // Determine inbound and outbound prices
    // If serial_number_prices is provided, use the average or the first value
    let actualInboundPrice = inbound_price !== undefined ? parseFloat(inbound_price) : defaultPrice;
    let actualOutboundPrice = outbound_price !== undefined ? parseFloat(outbound_price) : calculatedOutboundPrice;
    
    // If we have individual serial number prices, we'll handle them separately in the outbound_serial_numbers table
    if (serial_number_prices && Array.isArray(serial_number_prices) && serial_number_prices.length > 0) {
      // Calculate average for the overall transaction if not specified
      if (inbound_price === undefined) {
        const avgInboundPrice = serial_number_prices.reduce((sum, price) => sum + price, 0) / serial_number_prices.length;
        actualInboundPrice = avgInboundPrice;
      }
    }
    
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
      // Generate a proper batch number for the new inbound transaction
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
      const year = String(now.getFullYear()).slice(-2);
      const datePart = `${day}${month}${year}`;
      
      // Get the transaction number for the day by counting transactions created today
      const countResult = await req.pool.query(
        `SELECT COUNT(*) as count FROM inbound_transactions 
         WHERE DATE(created_at) = DATE($1) AND product_id = $2`,
        [now, product_id]
      );
      
      let transactionNumber = parseInt(countResult.rows[0].count) + 1;
      let batch_number = `B-${datePart}-${transactionNumber}`;
      
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
          batch_number = `B-${datePart}-${transactionNumber + attempt}`;
        }
      }
      
      // Get provider ID from product or use a default
      const productInfo = await req.pool.query(
        `SELECT p.default_provider_id, pr.id as provider_id
         FROM products p
         LEFT JOIN providers pr ON p.default_provider_id = pr.id
         WHERE p.id = $1`,
        [product_id]
      );
      
      const providerId = productInfo.rows[0]?.provider_id || 1; // Use default provider if not found
      
      const inboundResult = await req.pool.query(
        `INSERT INTO inbound_transactions 
        (product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, arrival_date, status, unit_price, batch_number) 
        VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 'Outbound', $4, $5)
        RETURNING id`,
        [product_id, quantity, providerId, actualInboundPrice, batch_number]
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
    
    // Insert serial numbers with their individual prices if available
    for (let i = 0; i < serial_numbers.length; i++) {
      const serial = serial_numbers[i];
      if (serial && serial.trim() !== '') {
        // Get the inbound price for this specific serial number from its original transaction
        let serialInboundPrice = actualInboundPrice;
        
        // Query the original inbound transaction that contains this serial number to get its unit price
        const originalTransactionResult = await req.pool.query(
          `SELECT i.unit_price
           FROM inbound_transactions i
           JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
           WHERE isn.serial_number = $1 AND i.status = 'Stored'`,
          [serial.trim()]
        );
        
        if (originalTransactionResult.rowCount > 0) {
          // Use the original transaction's unit price
          serialInboundPrice = originalTransactionResult.rows[0].unit_price;
        }
        
        // If user provided a specific price for this serial number, use that instead
        if (serial_number_prices && serial_number_prices[i] !== undefined) {
          serialInboundPrice = parseFloat(serial_number_prices[i]);
        }
        
        await req.pool.query(
          'INSERT INTO outbound_serial_numbers (outbound_transaction_id, serial_number, inbound_price) VALUES ($1, $2, $3)',
          [outboundTransactionId, serial.trim(), serialInboundPrice]
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
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who created the transaction
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_outbound_created',
            title: 'New Outbound Transaction Created',
            message: `A new outbound transaction has been created from multiple stored transactions.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending outbound transaction creation notifications:', notificationError);
    }
    
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
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who updated the status
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_outbound_dispatched',
            title: 'Outbound Transaction Dispatched',
            message: `An outbound transaction has been marked as dispatched.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending outbound transaction dispatched notifications:', notificationError);
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
    
    // Send notification to users with inventory/inbound or inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who updated the status
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_outbound_delivered',
            title: 'Outbound Transaction Delivered',
            message: `An outbound transaction has been marked as delivered.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending outbound transaction delivered notifications:', notificationError);
    }
    
    res.json({ message: 'Transaction marked as delivered' });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revert an outbound transaction back to stored status
router.delete('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Start transaction
    await req.pool.query('BEGIN');
    
    // Get the outbound transaction details
    const outboundResult = await req.pool.query(
      `SELECT o.id, o.inbound_transaction_id, o.quantity, 
       ARRAY_AGG(osn.serial_number) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers
       FROM outbound_transactions o
       LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
       WHERE o.id = $1
       GROUP BY o.id, o.inbound_transaction_id`,
      [id]
    );
    
    if (outboundResult.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Outbound transaction not found' });
    }
    
    const { inbound_transaction_id, quantity, serial_numbers } = outboundResult.rows[0];
    
    // Find the original inbound transaction to update
    const inboundTransactionResult = await req.pool.query(
      'SELECT status FROM inbound_transactions WHERE id = $1',
      [inbound_transaction_id]
    );
    
    if (inboundTransactionResult.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Original inbound transaction not found' });
    }
    
    // Update the inbound transaction status back to Stored if it was Outbound
    if (inboundTransactionResult.rows[0].status === 'Outbound') {
      await req.pool.query(
        'UPDATE inbound_transactions SET status = $1, updated_at = NOW() WHERE id = $2',
        ['Stored', inbound_transaction_id]
      );
    }
    
    // Move serial numbers back to their original inbound transactions
    if (serial_numbers && serial_numbers.length > 0) {
      for (const serial of serial_numbers) {
        if (serial) {
          // Find the original inbound transaction that contained this serial number before it was moved to outbound
          const originalTransactionResult = await req.pool.query(
            `SELECT i.id
             FROM inbound_transactions i
             JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
             WHERE isn.serial_number = $1 AND i.status = 'Stored'
             UNION
             SELECT i.id
             FROM inbound_transactions i
             WHERE i.id = $2 AND i.status = 'Outbound' -- If the original transaction was already marked as outbound, use the main inbound_transaction_id
             LIMIT 1`,
            [serial, inbound_transaction_id]
          );
          
          let targetTransactionId = inbound_transaction_id;
          if (originalTransactionResult.rowCount > 0) {
            targetTransactionId = originalTransactionResult.rows[0].id;
          }
          
          // Check if the serial number already exists in the inbound table
          const existingSerial = await req.pool.query(
            'SELECT 1 FROM inbound_serial_numbers WHERE transaction_id = $1 AND serial_number = $2',
            [targetTransactionId, serial]
          );
          
          if (existingSerial.rowCount === 0) {
            // Only insert if it doesn't already exist
            await req.pool.query(
              'INSERT INTO inbound_serial_numbers (transaction_id, serial_number) VALUES ($1, $2)',
              [targetTransactionId, serial]
            );
          }
        }
      }
    }
    
    // Delete serial numbers from outbound_serial_numbers table
    await req.pool.query('DELETE FROM outbound_serial_numbers WHERE outbound_transaction_id = $1', [id]);
    
    // Delete the outbound transaction
    const result = await req.pool.query('DELETE FROM outbound_transactions WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      await req.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Outbound transaction not found' });
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
        // Don't notify the user who reverted the transaction
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_outbound_deleted',
            title: 'Outbound Transaction Reverted',
            message: `An outbound transaction has been reverted back to stored status.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending outbound transaction revert notifications:', notificationError);
    }
    
    res.json({ message: 'Outbound transaction reverted to stored successfully' });
  } catch (error) {
    // Rollback transaction on error
    await req.pool.query('ROLLBACK');
    console.error('Error reverting outbound transaction:', error);
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
        CASE 
          WHEN i.batch_number LIKE 'B-%' THEN CONCAT('BO', SUBSTRING(i.batch_number, 2))
          ELSE i.batch_number
        END as batch_number,
        ARRAY_AGG(json_build_object('serial_number', osn.serial_number, 'inbound_price', osn.inbound_price)) FILTER (WHERE osn.serial_number IS NOT NULL) as serial_numbers_with_prices
      FROM outbound_transactions o
      JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
      JOIN products p ON i.product_id = p.id
      LEFT JOIN providers pr ON i.provider_id = pr.id
      LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
      WHERE o.id = $1 AND o.quantity > 0
      GROUP BY o.id, i.product_id, p.name, p.part_number, pr.name, i.batch_number
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