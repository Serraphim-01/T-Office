import express from 'express';
import { authenticateJWT } from './auth.js';
import csv from 'csv-parser';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// Get all products with provider information
router.get('/products', authenticateJWT, async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT p.id, p.name, p.part_number, p.product_type, 
              pr.id as provider_id, 
              pr.name as provider_name
       FROM products p
       LEFT JOIN providers pr ON p.provider_id = pr.id
       ORDER BY p.name`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all providers
router.get('/providers', authenticateJWT, async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT id, name, email, phone, address,
              official_contact_name, official_contact_email, official_contact_phone,
              organization_contact_name, organization_contact_email, organization_contact_phone
       FROM providers ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products by provider ID (only those with inbound transactions)
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
    
    // Get products associated with this provider
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

// Get all products for a specific provider (regardless of transactions)
router.get('/providers/:providerId/all-products', authenticateJWT, async (req, res) => {
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
    
    // Get all products for this provider
    const result = await req.pool.query(
      `SELECT p.id, p.name, p.part_number, p.default_unit_price, p.default_markup_percentage
       FROM products p
       WHERE p.provider_id = $1
       ORDER BY p.name`,
      [providerId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all products by provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific product by ID
router.get('/products/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(
      `SELECT p.id, p.name, p.part_number, p.product_type, p.created_at, p.updated_at, p.default_unit_price, p.default_markup_percentage,
              pr.id as provider_id, pr.name as provider_name
       FROM products p
       LEFT JOIN providers pr ON p.provider_id = pr.id
       WHERE p.id = $1`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new product
router.post('/products', authenticateJWT, async (req, res) => {
  const { name, part_number, product_type, provider_id, default_unit_price, default_markup_percentage } = req.body;
  
  // Validate input
  if (!name || !part_number || !product_type || !provider_id) {
    return res.status(400).json({ error: 'Name, part number, product type, and provider are required' });
  }
  
  try {
    // Verify provider exists
    const providerCheck = await req.pool.query(
      'SELECT id FROM providers WHERE id = $1',
      [provider_id]
    );
    
    if (providerCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid provider ID' });
    }
    
    const result = await req.pool.query(
      'INSERT INTO products (name, part_number, product_type, provider_id, default_unit_price, default_markup_percentage) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, part_number, product_type, default_unit_price, default_markup_percentage',
      [name, part_number, product_type, provider_id, default_unit_price || 0.00, default_markup_percentage || 0.00]
    );
    
    // Send notification to users with inventory/products or inventory/inbound access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify (both inventory/products and inventory/inbound users)
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who created the product
        // Convert both IDs to strings for comparison
        if (notifyUserId.toString() != req.user.userId.toString()) {
          await sendNotification(notifyUserId, {
            type: 'inventory_product_created',
            title: 'New Product Created',
            message: `A new product "${name}" has been created in the inventory system.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending product creation notifications:', notificationError);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding product:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'A product with this part number already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update a product
router.put('/products/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, part_number, product_type, provider_id, default_unit_price, default_markup_percentage } = req.body;
  
  // Validate input
  if (!name || !part_number || !product_type || !provider_id) {
    return res.status(400).json({ error: 'Name, part number, product type, and provider are required' });
  }
  
  try {
    // Verify provider exists
    const providerCheck = await req.pool.query(
      'SELECT id FROM providers WHERE id = $1',
      [provider_id]
    );
    
    if (providerCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid provider ID' });
    }
    
    const result = await req.pool.query(
      'UPDATE products SET name = $1, part_number = $2, product_type = $3, provider_id = $4, default_unit_price = $5, default_markup_percentage = $6, updated_at = NOW() WHERE id = $7 RETURNING id, name, part_number, product_type, default_unit_price, default_markup_percentage',
      [name, part_number, product_type, provider_id, default_unit_price || 0.00, default_markup_percentage || 0.00, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'A product with this part number already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a product
router.delete('/products/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query('DELETE FROM products WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import products from CSV
router.post('/products/import', authenticateJWT, upload.single('file'), async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Process each row
        for (const row of results) {
          try {
            // Extract required fields (case insensitive)
            const impName = row.name || row.Name || row['Product Name'] || '';
            const impPartNumber = row.part_number || row.partNumber || row['Part Number'] || row['part number'] || '';
            const impProductType = row.product_type || row.productType || row['Product Type'] || row['product type'] || 'Electronics';
            const impProviderName = row.provider || row.Provider || '';
            const impDefaultPrice = parseFloat(row.default_unit_price || row['Default Unit Price'] || '0.00');
            
            // Provider contact information (for new providers)
            const impProviderEmail = row.provider_email || row['Provider Email'] || '';
            const impProviderPhone = row.provider_phone || row['Provider Phone'] || '';
            const impProviderAddress = row.provider_address || row['Provider Address'] || '';
            const impOfficialContactName = row.official_contact_name || row['Official Contact Name'] || '';
            const impOfficialContactEmail = row.official_contact_email || row['Official Contact Email'] || '';
            const impOfficialContactPhone = row.official_contact_phone || row['Official Contact Phone'] || '';
            const impOrgContactName = row.organization_contact_name || row['Organization Contact Name'] || '';
            const impOrgContactEmail = row.organization_contact_email || row['Organization Contact Email'] || '';
            const impOrgContactPhone = row.organization_contact_phone || row['Organization Contact Phone'] || '';

            let impProviderId = null;
            
            if (impProviderName) {
              // Check if provider already exists
              const existingProvider = await req.pool.query(
                'SELECT id FROM providers WHERE name = $1',
                [impProviderName]
              );
              
              if (existingProvider.rowCount > 0) {
                // Use existing provider
                impProviderId = existingProvider.rows[0].id;
              } else {
                // Create new provider with full details if provided
                if (impOfficialContactName && impOfficialContactEmail && impOfficialContactPhone) {
                  // Create provider with full details
                  const providerResult = await req.pool.query(
                    `INSERT INTO providers 
                    (name, email, phone, address, 
                     official_contact_name, official_contact_email, official_contact_phone,
                     organization_contact_name, organization_contact_email, organization_contact_phone) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                    ON CONFLICT (name) DO UPDATE SET name = $1 
                    RETURNING id`,
                    [impProviderName, impProviderEmail, impProviderPhone, impProviderAddress,
                     impOfficialContactName, impOfficialContactEmail, impOfficialContactPhone,
                     impOrgContactName, impOrgContactEmail, impOrgContactPhone]
                  );
                  impProviderId = providerResult.rows[0].id;
                } else {
                  // Create provider with just name
                  const providerResult = await req.pool.query(
                    'INSERT INTO providers (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
                    [impProviderName]
                  );
                  impProviderId = providerResult.rows[0].id;
                }
              }
            }

            // Validate required fields - provider is now optional
            if (!impName || !impPartNumber) {
              errorCount++;
              errors.push(`Row missing required fields (Name: ${impName || 'N/A'}, Part Number: ${impPartNumber || 'N/A'})`);
              continue;
            }

            // Insert product into database
            await req.pool.query(
              'INSERT INTO products (name, part_number, product_type, provider_id, default_unit_price) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (part_number) DO UPDATE SET name = $1, product_type = $3, provider_id = $4, default_unit_price = $5',
              [impName, impPartNumber, impProductType, impProviderId, impDefaultPrice]
            );
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Error processing row: ${error.message}`);
          }
        }

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        // Send notification to users with inventory/products access
        try {
          // Import the sendNotification function and helper functions
          const { sendNotification } = await import('../index.js');
          const { getUsersToNotifyOnInventoryProducts } = await import('../utils/helpers.js');
          
          // Get users to notify
          const usersToNotify = await getUsersToNotifyOnInventoryProducts(req.pool);
          
          // Send notification to each user
          for (const notifyUserId of usersToNotify) {
            // Don't notify the user who performed the import
            if (notifyUserId != req.user.userId) {
              await sendNotification(notifyUserId, {
                type: 'inventory_import_completed',
                title: 'CSV Import Completed',
                message: `CSV import completed with ${successCount} successful imports and ${errorCount} errors.`,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (notificationError) {
          console.error('Error sending import completion notifications:', notificationError);
        }

        // Return results
        res.json({
          message: 'CSV import completed',
          successCount,
          errorCount,
          errors: errorCount > 0 ? errors : undefined
        });
      })
      .on('error', (error) => {
        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        console.error('Error parsing CSV:', error);
        res.status(400).json({ error: 'Error parsing CSV file', details: error.message });
      });
  } catch (error) {
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Internal server error during CSV import' });
  }
});

// Comprehensive import for products, inbound, stored, and outbound data from CSV
router.post('/comprehensive-import', authenticateJWT, upload.single('file'), async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const results = [];
  let successCount = {
    products: 0,
    inbound: 0,
    stored: 0,
    outbound: 0
  };
  let errorCount = {
    products: 0,
    inbound: 0,
    stored: 0,
    outbound: 0
  };
  const errors = [];

  try {
    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Start database transaction
        await req.pool.query('BEGIN');

        try {
          // Process each row
          for (const row of results) {
            try {
              // Determine the type of record based on the 'type' column
              const recordType = row.type || row.Type || row['Record Type'] || '';

              switch (recordType.toLowerCase()) {
                case 'product':
                  // Process product record
                  const prodName = row.name || row.Name || row['Product Name'] || '';
                  const prodPartNumber = row.part_number || row.partNumber || row['Part Number'] || row['part number'] || '';
                  const prodType = row.product_type || row.productType || row['Product Type'] || row['product type'] || 'Electronics';
                  const prodProviderName = row.provider || row.Provider || '';
                  const prodDefaultPrice = parseFloat(row.default_unit_price || row['Default Unit Price'] || '0.00');
                  
                  // Provider contact information (for new providers)
                  const prodProviderEmail = row.provider_email || row['Provider Email'] || '';
                  const prodProviderPhone = row.provider_phone || row['Provider Phone'] || '';
                  const prodProviderAddress = row.provider_address || row['Provider Address'] || '';
                  const prodOfficialContactName = row.official_contact_name || row['Official Contact Name'] || '';
                  const prodOfficialContactEmail = row.official_contact_email || row['Official Contact Email'] || '';
                  const prodOfficialContactPhone = row.official_contact_phone || row['Official Contact Phone'] || '';
                  const prodOrgContactName = row.organization_contact_name || row['Organization Contact Name'] || '';
                  const prodOrgContactEmail = row.organization_contact_email || row['Organization Contact Email'] || '';
                  const prodOrgContactPhone = row.organization_contact_phone || row['Organization Contact Phone'] || '';

                  // Validate required fields - provider is now optional
                  if (!prodName || !prodPartNumber) {
                    errorCount.products++;
                    errors.push(`Product row missing required fields (Name: ${prodName || 'N/A'}, Part Number: ${prodPartNumber || 'N/A'})`);
                    continue;
                  }

                  let prodProviderId = null;
                  if (prodProviderName) {
                    // Check if provider already exists
                    const existingProvider = await req.pool.query(
                      'SELECT id FROM providers WHERE name = $1',
                      [prodProviderName]
                    );
                    
                    if (existingProvider.rowCount > 0) {
                      // Use existing provider
                      prodProviderId = existingProvider.rows[0].id;
                    } else {
                      // Create new provider with full details if provided
                      if (prodOfficialContactName && prodOfficialContactEmail && prodOfficialContactPhone) {
                        // Create provider with full details
                        const providerResult = await req.pool.query(
                          `INSERT INTO providers 
                          (name, email, phone, address, 
                           official_contact_name, official_contact_email, official_contact_phone,
                           organization_contact_name, organization_contact_email, organization_contact_phone) 
                          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                          ON CONFLICT (name) DO UPDATE SET name = $1 
                          RETURNING id`,
                          [prodProviderName, prodProviderEmail, prodProviderPhone, prodProviderAddress,
                           prodOfficialContactName, prodOfficialContactEmail, prodOfficialContactPhone,
                           prodOrgContactName, prodOrgContactEmail, prodOrgContactPhone]
                        );
                        prodProviderId = providerResult.rows[0].id;
                      } else {
                        // Create provider with just name
                        const providerResult = await req.pool.query(
                          'INSERT INTO providers (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
                          [prodProviderName]
                        );
                        prodProviderId = providerResult.rows[0].id;
                      }
                    }
                  }

                  await req.pool.query(
                    'INSERT INTO products (name, part_number, product_type, provider_id, default_unit_price) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (part_number) DO UPDATE SET name = $1, product_type = $3, provider_id = $4, default_unit_price = $5',
                    [prodName, prodPartNumber, prodType, prodProviderId, prodDefaultPrice]
                  );
                  successCount.products++;
                  break;

                case 'inbound':
                  // Process inbound transaction record
                  const inboundPartNumber = row.product_part_number || row['Product Part Number'] || '';
                  const inboundQuantity = parseInt(row.quantity || row.Quantity || '0');
                  const providerName = row.provider || row.Provider || '';
                  const expectedArrivalStart = row.expected_arrival_start || row['Expected Arrival Start'] || '';
                  const expectedArrivalEnd = row.expected_arrival_end || row['Expected Arrival End'] || '';
                  const inboundSerialNumbers = row.serial_numbers || row['Serial Numbers'] || '';

                  // Validate required fields
                  if (!inboundPartNumber || !inboundQuantity || !providerName || !expectedArrivalStart || !expectedArrivalEnd) {
                    errorCount.inbound++;
                    errors.push(`Inbound row missing required fields`);
                    continue;
                  }

                  // Get or create provider
                  let providerId = null;
                  if (providerName) {
                    // Check if provider already exists
                    const existingProvider = await req.pool.query(
                      'SELECT id FROM providers WHERE name = $1',
                      [providerName]
                    );
                    
                    if (existingProvider.rowCount > 0) {
                      // Use existing provider
                      providerId = existingProvider.rows[0].id;
                    } else {
                      // Create new provider with just name for inbound transactions
                      const providerResult = await req.pool.query(
                        'INSERT INTO providers (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
                        [providerName]
                      );
                      providerId = providerResult.rows[0].id;
                    }
                  }

                  // Get product ID by part number
                  const inboundProductResult = await req.pool.query(
                    'SELECT id FROM products WHERE part_number = $1',
                    [inboundPartNumber]
                  );

                  if (inboundProductResult.rowCount === 0) {
                    errorCount.inbound++;
                    errors.push(`Product with part number ${inboundPartNumber} not found for inbound transaction`);
                    continue;
                  }

                  const inboundProductId = inboundProductResult.rows[0].id;

                  // Generate automatic batch number: BATCH-{product_id}-{timestamp}
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                  const autoBatchNumber = `BATCH-${inboundProductId}-${timestamp}`;

                  // Insert inbound transaction with auto-generated batch number
                  const inboundResult = await req.pool.query(
                    `INSERT INTO inbound_transactions 
                    (product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, status, batch_number) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7) 
                    RETURNING id`,
                    [inboundProductId, inboundQuantity, providerId, expectedArrivalStart, expectedArrivalEnd, 'Incoming', autoBatchNumber]
                  );

                  const inboundId = inboundResult.rows[0].id;

                  // Insert serial numbers if provided
                  if (inboundSerialNumbers) {
                    const serials = inboundSerialNumbers.split('|').map(s => s.trim());
                    for (const serial of serials) {
                      if (serial) {
                        await req.pool.query(
                          'INSERT INTO inbound_serial_numbers (transaction_id, serial_number) VALUES ($1, $2)',
                          [inboundId, serial]
                        );
                      }
                    }
                  }

                  successCount.inbound++;
                  break;

                case 'stored':
                  // Process stored transaction record
                  const storedPartNumber = row.product_part_number || row['Product Part Number'] || '';
                  const storedQuantity = parseInt(row.quantity || row.Quantity || '0');
                  const storedProviderName = row.provider || row.Provider || '';
                  const expectedArrivalStartStored = row.expected_arrival_start || row['Expected Arrival Start'] || '';
                  const expectedArrivalEndStored = row.expected_arrival_end || row['Expected Arrival End'] || '';
                  const arrivalDate = row.arrival_date || row['Arrival Date'] || '';
                  const storedSerialNumbers = row.serial_numbers || row['Serial Numbers'] || '';

                  // Validate required fields
                  if (!storedPartNumber || !storedQuantity || !storedProviderName || !expectedArrivalStartStored || !expectedArrivalEndStored || !arrivalDate) {
                    errorCount.stored++;
                    errors.push(`Stored row missing required fields`);
                    continue;
                  }

                  // Get or create provider
                  let storedProviderId = null;
                  if (storedProviderName) {
                    // Check if provider already exists
                    const existingProvider = await req.pool.query(
                      'SELECT id FROM providers WHERE name = $1',
                      [storedProviderName]
                    );
                    
                    if (existingProvider.rowCount > 0) {
                      // Use existing provider
                      storedProviderId = existingProvider.rows[0].id;
                    } else {
                      // Create new provider with just name for stored transactions
                      const providerResult = await req.pool.query(
                        'INSERT INTO providers (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
                        [storedProviderName]
                      );
                      storedProviderId = providerResult.rows[0].id;
                    }
                  }

                  // Get product ID by part number
                  const storedProductResult = await req.pool.query(
                    'SELECT id FROM products WHERE part_number = $1',
                    [storedPartNumber]
                  );

                  if (storedProductResult.rowCount === 0) {
                    errorCount.stored++;
                    errors.push(`Product with part number ${storedPartNumber} not found for stored transaction`);
                    continue;
                  }

                  const storedProductId = storedProductResult.rows[0].id;

                  // Generate automatic batch number: BATCH-{product_id}-{timestamp}
                  const storedTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                  const autoBatchNumberStored = `BATCH-${storedProductId}-${storedTimestamp}`;

                  // Insert stored transaction with auto-generated batch number
                  const storedResult = await req.pool.query(
                    `INSERT INTO inbound_transactions 
                    (product_id, quantity, provider_id, expected_arrival_start, expected_arrival_end, arrival_date, status, batch_number) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                    RETURNING id`,
                    [storedProductId, storedQuantity, storedProviderId, expectedArrivalStartStored, expectedArrivalEndStored, arrivalDate, 'Stored', autoBatchNumberStored]
                  );

                  const storedId = storedResult.rows[0].id;

                  // Insert serial numbers if provided
                  if (storedSerialNumbers) {
                    const serials = storedSerialNumbers.split('|').map(s => s.trim());
                    for (const serial of serials) {
                      if (serial) {
                        await req.pool.query(
                          'INSERT INTO inbound_serial_numbers (transaction_id, serial_number) VALUES ($1, $2)',
                          [storedId, serial]
                        );
                      }
                    }
                  }

                  successCount.stored++;
                  break;

                case 'outbound':
                  // Process outbound transaction record
                  const outboundPartNumber = row.product_part_number || row['Product Part Number'] || '';
                  const outboundQuantity = parseInt(row.quantity || row.Quantity || '0');
                  const receiverAddress = row.receiver_address || row['Receiver Address'] || '';
                  const receiverEmail = row.receiver_email || row['Receiver Email'] || '';
                  const receiverPhone = row.receiver_phone || row['Receiver Phone'] || '';
                  const dispatchDatetime = row.dispatch_datetime || row['Dispatch Datetime'] || '';
                  const deliveryDatetime = row.delivery_datetime || row['Delivery Datetime'] || '';
                  const outboundSerialNumbers = row.serial_numbers || row['Serial Numbers'] || '';
                  const outboundPrice = parseFloat(row.outbound_price || row['Outbound Price'] || '0.00');

                  // Validate required fields
                  if (!outboundPartNumber || !outboundQuantity || !receiverAddress || !receiverEmail || !receiverPhone || !dispatchDatetime || !deliveryDatetime || !outboundSerialNumbers) {
                    errorCount.outbound++;
                    errors.push(`Outbound row missing required fields`);
                    continue;
                  }

                  // Get the inbound transaction ID by product part number
                  const outboundInboundResult = await req.pool.query(
                    `SELECT i.id, p.default_unit_price FROM inbound_transactions i
                    JOIN products p ON i.product_id = p.id
                    WHERE p.part_number = $1 AND i.status = 'Stored'
                    LIMIT 1`,
                    [outboundPartNumber]
                  );

                  if (outboundInboundResult.rowCount === 0) {
                    errorCount.outbound++;
                    errors.push(`Stored transaction for product with part number ${outboundPartNumber} not found for outbound transaction`);
                    continue;
                  }

                  const outboundInboundId = outboundInboundResult.rows[0].id;
                  const inboundPrice = outboundInboundResult.rows[0].default_unit_price || 0.00;

                  // Insert outbound transaction
                  const outboundResult = await req.pool.query(
                    `INSERT INTO outbound_transactions 
                    (inbound_transaction_id, quantity, receiver_address, receiver_email, receiver_phone, dispatch_datetime, delivery_datetime, status, inbound_price, outbound_price) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                    RETURNING id`,
                    [outboundInboundId, outboundQuantity, receiverAddress, receiverEmail, receiverPhone, dispatchDatetime, deliveryDatetime, 'Outgoing', inboundPrice, outboundPrice]
                  );

                  const outboundId = outboundResult.rows[0].id;

                  // Insert serial numbers
                  const outboundSerials = outboundSerialNumbers.split('|').map(s => s.trim());
                  for (const serial of outboundSerials) {
                    if (serial) {
                      await req.pool.query(
                        'INSERT INTO outbound_serial_numbers (outbound_transaction_id, serial_number) VALUES ($1, $2)',
                        [outboundId, serial]
                      );
                    }
                  }

                  // Update inbound transaction status to Outbound
                  await req.pool.query(
                    'UPDATE inbound_transactions SET status = $1 WHERE id = $2',
                    ['Outbound', outboundInboundId]
                  );

                  successCount.outbound++;
                  break;

                default:
                  // If no type is specified or type is unknown, treat as product (for backward compatibility)
                  if (row.name || row.part_number) {
                    const defName = row.name || row.Name || row['Product Name'] || '';
                    const defPartNumber = row.part_number || row.partNumber || row['Part Number'] || row['part number'] || '';
                    const defProductType = row.product_type || row.productType || row['Product Type'] || row['product type'] || 'Electronics';
                    const defProviderName = row.provider || row.Provider || '';
                    const defDefaultPrice = parseFloat(row.default_unit_price || row['Default Unit Price'] || '0.00');
                    const defMarkupPercentage = parseFloat(row.default_markup_percentage || row['Default Markup Percentage'] || '0.00');
                    
                    // Provider contact information (for new providers)
                    const defProviderEmail = row.provider_email || row['Provider Email'] || '';
                    const defProviderPhone = row.provider_phone || row['Provider Phone'] || '';
                    const defProviderAddress = row.provider_address || row['Provider Address'] || '';
                    const defOfficialContactName = row.official_contact_name || row['Official Contact Name'] || '';
                    const defOfficialContactEmail = row.official_contact_email || row['Official Contact Email'] || '';
                    const defOfficialContactPhone = row.official_contact_phone || row['Official Contact Phone'] || '';
                    const defOrgContactName = row.organization_contact_name || row['Organization Contact Name'] || '';
                    const defOrgContactEmail = row.organization_contact_email || row['Organization Contact Email'] || '';
                    const defOrgContactPhone = row.organization_contact_phone || row['Organization Contact Phone'] || '';

                    let defProviderId = null;
                    if (defProviderName) {
                      // Check if provider already exists
                      const existingProvider = await req.pool.query(
                        'SELECT id FROM providers WHERE name = $1',
                        [defProviderName]
                      );
                      
                      if (existingProvider.rowCount > 0) {
                        // Use existing provider
                        defProviderId = existingProvider.rows[0].id;
                      } else {
                        // Create new provider with full details if provided
                        if (defOfficialContactName && defOfficialContactEmail && defOfficialContactPhone) {
                          // Create provider with full details
                          const providerResult = await req.pool.query(
                            `INSERT INTO providers 
                            (name, email, phone, address, 
                             official_contact_name, official_contact_email, official_contact_phone,
                             organization_contact_name, organization_contact_email, organization_contact_phone) 
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
                            ON CONFLICT (name) DO UPDATE SET name = $1 
                            RETURNING id`,
                            [defProviderName, defProviderEmail, defProviderPhone, defProviderAddress,
                             defOfficialContactName, defOfficialContactEmail, defOfficialContactPhone,
                             defOrgContactName, defOrgContactEmail, defOrgContactPhone]
                          );
                          defProviderId = providerResult.rows[0].id;
                        } else {
                          // Create provider with just name
                          const providerResult = await req.pool.query(
                            'INSERT INTO providers (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id',
                            [defProviderName]
                          );
                          defProviderId = providerResult.rows[0].id;
                        }
                      }
                    }

                    // Validate required fields - provider is now optional
                    if (defName && defPartNumber) {
                      await req.pool.query(
                        'INSERT INTO products (name, part_number, product_type, provider_id, default_unit_price, default_markup_percentage) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (part_number) DO UPDATE SET name = $1, product_type = $3, provider_id = $4, default_unit_price = $5, default_markup_percentage = $6',
                        [defName, defPartNumber, defProductType, defProviderId, defDefaultPrice, defMarkupPercentage]
                      );
                      successCount.products++;
                    } else {
                      errorCount.products++;
                      errors.push(`Row missing required fields (Name: ${defName || 'N/A'}, Part Number: ${defPartNumber || 'N/A'})`);
                    }
                  }
                  break;
              }
            } catch (error) {
              // Determine which counter to increment based on record type
              const recordType = row.type || row.Type || row['Record Type'] || '';
              switch (recordType.toLowerCase()) {
                case 'inbound':
                  errorCount.inbound++;
                  break;
                case 'stored':
                  errorCount.stored++;
                  break;
                case 'outbound':
                  errorCount.outbound++;
                  break;
                default:
                  errorCount.products++;
                  break;
              }
              errors.push(`Error processing row: ${error.message}`);
            }
          }

          // Commit transaction
          await req.pool.query('COMMIT');

          // Clean up uploaded file
          fs.unlinkSync(filePath);

          // Send notification to users with inventory/products access
          try {
            // Import the sendNotification function and helper functions
            const { sendNotification } = await import('../index.js');
            const { getUsersToNotifyOnInventoryProducts } = await import('../utils/helpers.js');
            
            // Get users to notify
            const usersToNotify = await getUsersToNotifyOnInventoryProducts(req.pool);
            
            const totalSuccess = successCount.products + successCount.inbound + 
                                successCount.stored + successCount.outbound;
            const totalErrors = errorCount.products + errorCount.inbound + 
                               errorCount.stored + errorCount.outbound;
            
            // Send notification to each user
            for (const notifyUserId of usersToNotify) {
              // Don't notify the user who performed the import
              if (notifyUserId != req.user.userId) {
                await sendNotification(notifyUserId, {
                  type: 'inventory_comprehensive_import_completed',
                  title: 'Comprehensive CSV Import Completed',
                  message: `Comprehensive CSV import completed with ${totalSuccess} successful imports and ${totalErrors} errors.`,
                  timestamp: new Date().toISOString()
                });
              }
            }
          } catch (notificationError) {
            console.error('Error sending comprehensive import completion notifications:', notificationError);
          }

          // Return results
          res.json({
            message: 'Comprehensive CSV import completed',
            successCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined
          });
        } catch (transactionError) {
          // Rollback transaction on error
          await req.pool.query('ROLLBACK');
          
          // Clean up uploaded file
          fs.unlinkSync(filePath);
          
          console.error('Error during comprehensive import:', transactionError);
          res.status(500).json({ error: 'Internal server error during import', details: transactionError.message });
        }
      })
      .on('error', (error) => {
        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        console.error('Error parsing CSV:', error);
        res.status(400).json({ error: 'Error parsing CSV file', details: error.message });
      });
  } catch (error) {
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Error importing comprehensive CSV:', error);
    res.status(500).json({ error: 'Internal server error during comprehensive CSV import' });
  }
});

// Export inventory data
router.get('/export/:type', authenticateJWT, async (req, res) => {
  const { type } = req.params;
  const { format = 'csv' } = req.query;

  try {
    let data = [];
    let filename = '';

    switch (type) {
      case 'providers-products':
        // Export providers with their products in the import format
        const providersProductsResult = await req.pool.query(`
          SELECT 
            'product' as type,
            p.name,
            p.part_number,
            p.product_type,
            pr.name as provider,
            pr.email as provider_email,
            pr.phone as provider_phone,
            pr.address as provider_address,
            pr.official_contact_name,
            pr.official_contact_email,
            pr.official_contact_phone,
            pr.organization_contact_name,
            pr.organization_contact_email,
            pr.organization_contact_phone,
            p.default_unit_price,
            p.default_markup_percentage,
            NULL as quantity,
            NULL as expected_arrival_start,
            NULL as expected_arrival_end,
            NULL as arrival_date,
            NULL as serial_numbers,
            NULL as receiver_address,
            NULL as receiver_email,
            NULL as receiver_phone,
            NULL as dispatch_datetime,
            NULL as delivery_datetime,
            NULL as outbound_price
          FROM products p
          LEFT JOIN providers pr ON p.provider_id = pr.id
          ORDER BY pr.name, p.name
        `);
        data = providersProductsResult.rows;
        filename = 'providers_products_export.csv';
        
        // Send notification to users with inventory/products access
        try {
          // Import the sendNotification function and helper functions
          const { sendNotification } = await import('../../index.js');
          const { getUsersToNotifyOnInventoryProducts } = await import('../../utils/helpers.js');
          
          // Get users to notify
          const usersToNotify = await getUsersToNotifyOnInventoryProducts(req.pool);
          
          // Send notification to each user
          for (const notifyUserId of usersToNotify) {
            // Don't notify the user who performed the export
            if (notifyUserId != req.user.userId) {
              await sendNotification(notifyUserId, {
                type: 'inventory_export_completed',
                title: 'Providers & Products Export Completed',
                message: 'Providers and products export has been completed.',
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (notificationError) {
          console.error('Error sending export completion notifications:', notificationError);
        }
        break;

      case 'comprehensive':
        // Export all data in the import format
        const comprehensiveResult = await req.pool.query(`
          WITH product_data AS (
            SELECT 
              'product' as type,
              p.name,
              p.part_number,
              p.product_type,
              pr.name as provider,
              pr.email as provider_email,
              pr.phone as provider_phone,
              pr.address as provider_address,
              pr.official_contact_name,
              pr.official_contact_email,
              pr.official_contact_phone,
              pr.organization_contact_name,
              pr.organization_contact_email,
              pr.organization_contact_phone,
              p.default_unit_price,
              p.default_markup_percentage,
              NULL as quantity,
              NULL as expected_arrival_start,
              NULL as expected_arrival_end,
              NULL as arrival_date,
              NULL as serial_numbers,
              NULL as receiver_address,
              NULL as receiver_email,
              NULL as receiver_phone,
              NULL as dispatch_datetime,
              NULL as delivery_datetime,
              NULL as outbound_price
            FROM products p
            LEFT JOIN providers pr ON p.provider_id = pr.id
          ),
          inbound_data AS (
            SELECT 
              'inbound' as type,
              NULL as name,
              p.part_number,
              NULL as product_type,
              pr.name as provider,
              NULL as provider_email,
              NULL as provider_phone,
              NULL as provider_address,
              NULL as official_contact_name,
              NULL as official_contact_email,
              NULL as official_contact_phone,
              NULL as organization_contact_name,
              NULL as organization_contact_email,
              NULL as organization_contact_phone,
              NULL as default_unit_price,
              i.quantity,
              TO_CHAR(i.expected_arrival_start, 'YYYY-MM-DD') as expected_arrival_start,
              TO_CHAR(i.expected_arrival_end, 'YYYY-MM-DD') as expected_arrival_end,
              NULL as arrival_date,
              ARRAY_TO_STRING(ARRAY_AGG(isn.serial_number), '|') as serial_numbers,
              NULL as receiver_address,
              NULL as receiver_email,
              NULL as receiver_phone,
              NULL as dispatch_datetime,
              NULL as delivery_datetime,
              NULL as outbound_price
            FROM inbound_transactions i
            JOIN products p ON i.product_id = p.id
            JOIN providers pr ON i.provider_id = pr.id
            LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
            WHERE i.status = 'Incoming'
            GROUP BY i.id, p.part_number, pr.name, i.quantity, i.expected_arrival_start, i.expected_arrival_end
          ),
          stored_data AS (
            SELECT 
              'stored' as type,
              NULL as name,
              p.part_number,
              NULL as product_type,
              pr.name as provider,
              NULL as provider_email,
              NULL as provider_phone,
              NULL as provider_address,
              NULL as official_contact_name,
              NULL as official_contact_email,
              NULL as official_contact_phone,
              NULL as organization_contact_name,
              NULL as organization_contact_email,
              NULL as organization_contact_phone,
              NULL as default_unit_price,
              i.quantity,
              TO_CHAR(i.expected_arrival_start, 'YYYY-MM-DD') as expected_arrival_start,
              TO_CHAR(i.expected_arrival_end, 'YYYY-MM-DD') as expected_arrival_end,
              TO_CHAR(i.arrival_date, 'YYYY-MM-DD') as arrival_date,
              ARRAY_TO_STRING(ARRAY_AGG(isn.serial_number), '|') as serial_numbers,
              NULL as receiver_address,
              NULL as receiver_email,
              NULL as receiver_phone,
              NULL as dispatch_datetime,
              NULL as delivery_datetime,
              NULL as outbound_price
            FROM inbound_transactions i
            JOIN products p ON i.product_id = p.id
            JOIN providers pr ON i.provider_id = pr.id
            LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
            WHERE i.status = 'Stored'
            GROUP BY i.id, p.part_number, pr.name, i.quantity, i.expected_arrival_start, i.expected_arrival_end, i.arrival_date
          ),
          outbound_data AS (
            SELECT 
              'outbound' as type,
              NULL as name,
              p.part_number,
              NULL as product_type,
              NULL as provider,
              NULL as provider_email,
              NULL as provider_phone,
              NULL as provider_address,
              NULL as official_contact_name,
              NULL as official_contact_email,
              NULL as official_contact_phone,
              NULL as organization_contact_name,
              NULL as organization_contact_email,
              NULL as organization_contact_phone,
              NULL as default_unit_price,
              o.quantity,
              NULL as expected_arrival_start,
              NULL as expected_arrival_end,
              NULL as arrival_date,
              ARRAY_TO_STRING(ARRAY_AGG(osn.serial_number), '|') as serial_numbers,
              o.receiver_address,
              o.receiver_email,
              o.receiver_phone,
              TO_CHAR(o.dispatch_datetime, 'YYYY-MM-DD"T"HH24:MI:SS') as dispatch_datetime,
              TO_CHAR(o.delivery_datetime, 'YYYY-MM-DD"T"HH24:MI:SS') as delivery_datetime,
              NULL as outbound_price
            FROM outbound_transactions o
            JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
            JOIN products p ON i.product_id = p.id
            LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
            GROUP BY o.id, p.part_number, o.quantity, o.receiver_address, o.receiver_email, o.receiver_phone, o.dispatch_datetime, o.delivery_datetime
          )
          SELECT * FROM product_data
          UNION ALL
          SELECT * FROM inbound_data
          UNION ALL
          SELECT * FROM stored_data
          UNION ALL
          SELECT * FROM outbound_data
          ORDER BY type, provider, name, part_number
        `);
        data = comprehensiveResult.rows;
        filename = 'comprehensive_export.csv';
        
        // Send notification to users with inventory/products access
        try {
          // Import the sendNotification function and helper functions
          const { sendNotification } = await import('../../index.js');
          const { getUsersToNotifyOnInventoryProducts } = await import('../../utils/helpers.js');
          
          // Get users to notify
          const usersToNotify = await getUsersToNotifyOnInventoryProducts(req.pool);
          
          // Send notification to each user
          for (const notifyUserId of usersToNotify) {
            // Don't notify the user who performed the export
            if (notifyUserId != req.user.userId) {
              await sendNotification(notifyUserId, {
                type: 'inventory_export_completed',
                title: 'Comprehensive Export Completed',
                message: 'Comprehensive export has been completed.',
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (notificationError) {
          console.error('Error sending export completion notifications:', notificationError);
        }
        break;

      case 'products':
        const productsResult = await req.pool.query(
          'SELECT id, name, part_number, product_type, created_at, updated_at FROM products ORDER BY name'
        );
        data = productsResult.rows;
        filename = 'products_export.csv';
        break;

      case 'inbound':
        const inboundResult = await req.pool.query(`
          SELECT 
            i.id,
            p.name as product_name,
            p.part_number as product_part_number,
            i.quantity,
            pr.name as provider,
            i.expected_arrival_start,
            i.expected_arrival_end,
            i.status,
            i.created_at,
            i.batch_number,
            ARRAY_TO_STRING(ARRAY_AGG(isn.serial_number), ', ') as serial_numbers
          FROM inbound_transactions i
          JOIN products p ON i.product_id = p.id
          LEFT JOIN providers pr ON i.provider_id = pr.id
          LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
          WHERE i.status = 'Incoming'
          GROUP BY i.id, p.name, p.part_number, pr.name
          ORDER BY i.created_at DESC
        `);
        data = inboundResult.rows;
        filename = 'inbound_transactions_export.csv';
        
        // Send notification to users with inventory/inbound or inventory/products access
        try {
          // Import the sendNotification function and helper functions
          const { sendNotification } = await import('../../index.js');
          const { getUsersToNotifyOnInventoryInbound } = await import('../../utils/helpers.js');
          
          // Get users to notify
          const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
          
          // Send notification to each user
          for (const notifyUserId of usersToNotify) {
            // Don't notify the user who performed the export
            if (notifyUserId != req.user.userId) {
              await sendNotification(notifyUserId, {
                type: 'inventory_export_completed',
                title: 'Inbound Transactions Export Completed',
                message: 'Inbound transactions export has been completed.',
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (notificationError) {
          console.error('Error sending export completion notifications:', notificationError);
        }
        break;

      case 'stored':
        const storedResult = await req.pool.query(`
          SELECT 
            i.id,
            p.name as product_name,
            p.part_number as product_part_number,
            i.quantity,
            pr.name as provider,
            i.arrival_date,
            i.status,
            i.created_at,
            i.batch_number,
            ARRAY_TO_STRING(ARRAY_AGG(isn.serial_number), ', ') as serial_numbers
          FROM inbound_transactions i
          JOIN products p ON i.product_id = p.id
          LEFT JOIN providers pr ON i.provider_id = pr.id
          LEFT JOIN inbound_serial_numbers isn ON i.id = isn.transaction_id
          WHERE i.status = 'Stored'
          GROUP BY i.id, p.name, p.part_number, pr.name
          ORDER BY i.arrival_date DESC
        `);
        data = storedResult.rows;
        filename = 'stored_transactions_export.csv';
        break;

      case 'outbound':
        const outboundResult = await req.pool.query(`
          SELECT 
            o.id,
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
            ARRAY_TO_STRING(ARRAY_AGG(osn.serial_number), ', ') as serial_numbers
          FROM outbound_transactions o
          JOIN inbound_transactions i ON o.inbound_transaction_id = i.id
          JOIN products p ON i.product_id = p.id
          LEFT JOIN outbound_serial_numbers osn ON o.id = osn.outbound_transaction_id
          GROUP BY o.id, p.name, p.part_number, o.inbound_price, o.outbound_price
          ORDER BY o.created_at DESC
        `);
        data = outboundResult.rows;
        filename = 'outbound_transactions_export.csv';
        break;

      default:
        return res.status(400).json({ error: 'Invalid export type. Supported types: providers-products, comprehensive, products, inbound, stored, outbound' });
    }

    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        // Handle empty data case
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send('');
      }

      const json2csvParser = new Parser();
      const csvData = json2csvParser.parse(data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvData);
    } else {
      // Default to JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace('.csv', '.json')}"`);
      res.status(200).json(data);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Internal server error during export' });
  }
});

// Add a new provider
router.post('/providers', authenticateJWT, async (req, res) => {
  const { name, email, phone, address, 
          official_contact_name, official_contact_email, official_contact_phone,
          organization_contact_name, organization_contact_email, organization_contact_phone } = req.body;
  
  // Validate input
  if (!name) {
    return res.status(400).json({ error: 'Provider name is required' });
  }
  
  // Validate official contact (required fields)
  if (!official_contact_name || !official_contact_email || !official_contact_phone) {
    return res.status(400).json({ error: 'Official contact name, email, and phone are required' });
  }
  
  try {
    const result = await req.pool.query(
      `INSERT INTO providers (name, email, phone, address,
                             official_contact_name, official_contact_email, official_contact_phone,
                             organization_contact_name, organization_contact_email, organization_contact_phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id, name, email, phone, address,
                 official_contact_name, official_contact_email, official_contact_phone,
                 organization_contact_name, organization_contact_email, organization_contact_phone`,
      [name, email, phone, address,
       official_contact_name, official_contact_email, official_contact_phone,
       organization_contact_name, organization_contact_email, organization_contact_phone]
    );
    
    const newProvider = result.rows[0];
    
    // Send notification to users with inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryProducts } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryProducts(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who created the provider
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_provider_created',
            title: 'New Provider Created',
            message: `A new provider "${name}" has been created in the inventory system.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending provider creation notifications:', notificationError);
    }
    
    res.status(201).json(newProvider);
  } catch (error) {
    console.error('Error adding provider:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'A provider with this name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update a provider
router.put('/providers/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address,
          official_contact_name, official_contact_email, official_contact_phone,
          organization_contact_name, organization_contact_email, organization_contact_phone } = req.body;
  
  // Validate input
  if (!name) {
    return res.status(400).json({ error: 'Provider name is required' });
  }
  
  // Validate official contact (required fields)
  if (!official_contact_name || !official_contact_email || !official_contact_phone) {
    return res.status(400).json({ error: 'Official contact name, email, and phone are required' });
  }
  
  try {
    const result = await req.pool.query(
      `UPDATE providers 
       SET name = $1, email = $2, phone = $3, address = $4,
           official_contact_name = $5, official_contact_email = $6, official_contact_phone = $7,
           organization_contact_name = $8, organization_contact_email = $9, organization_contact_phone = $10,
           updated_at = NOW() 
       WHERE id = $11 
       RETURNING id, name, email, phone, address,
                 official_contact_name, official_contact_email, official_contact_phone,
                 organization_contact_name, organization_contact_email, organization_contact_phone`,
      [name, email, phone, address,
       official_contact_name, official_contact_email, official_contact_phone,
       organization_contact_name, organization_contact_email, organization_contact_phone,
       id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    // Send notification to users with inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryProducts } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryProducts(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who updated the provider
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_provider_updated',
            title: 'Provider Updated',
            message: `Provider "${name}" has been updated in the inventory system.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending provider update notifications:', notificationError);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating provider:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'A provider with this name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a provider
router.delete('/providers/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get provider name before deletion for notification
    const providerResult = await req.pool.query('SELECT name FROM providers WHERE id = $1', [id]);
    const providerName = providerResult.rowCount > 0 ? providerResult.rows[0].name : 'Unknown Provider';
    
    // Check if provider has any associated inbound transactions
    const checkResult = await req.pool.query(
      'SELECT COUNT(*) as count FROM inbound_transactions WHERE provider_id = $1',
      [id]
    );
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete provider with existing transactions. Please delete or reassign transactions first.' });
    }
    
    const result = await req.pool.query('DELETE FROM providers WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    // Send notification to users with inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryProducts } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryProducts(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who deleted the provider
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_provider_deleted',
            title: 'Provider Deleted',
            message: `Provider "${providerName}" has been deleted from the inventory system.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending provider deletion notifications:', notificationError);
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific provider by ID
router.get('/providers/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(
      `SELECT id, name, email, phone, address, created_at, updated_at,
              official_contact_name, official_contact_email, official_contact_phone,
              organization_contact_name, organization_contact_email, organization_contact_phone
       FROM providers WHERE id = $1`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a product to a specific provider
router.post('/providers/:providerId/products', authenticateJWT, async (req, res) => {
  const { providerId } = req.params;
  const { name, part_number, product_type, default_unit_price } = req.body;
  
  // Validate input
  if (!name || !part_number || !product_type) {
    return res.status(400).json({ error: 'Name, part number, and product type are required' });
  }
  
  try {
    // Check if provider exists
    const providerCheck = await req.pool.query(
      'SELECT id, name FROM providers WHERE id = $1',
      [providerId]
    );
    
    if (providerCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    const provider = providerCheck.rows[0];
    
    // Insert product with provider_id
    const productResult = await req.pool.query(
      'INSERT INTO products (name, part_number, product_type, provider_id, default_unit_price) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, part_number, product_type, default_unit_price',
      [name, part_number, product_type, providerId, default_unit_price || 0.00]
    );
    
    const product = productResult.rows[0];
    
    // Send notification to users with inventory/products access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryProducts } = await import('../utils/helpers.js');
      
      // Get users to notify
      const usersToNotify = await getUsersToNotifyOnInventoryProducts(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who created the product
        if (notifyUserId != req.user.userId) {
          await sendNotification(notifyUserId, {
            type: 'inventory_product_created',
            title: 'New Product Created',
            message: `A new product "${name}" has been created under provider "${provider.name}" in the inventory system.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending product creation notifications:', notificationError);
    }
    
    // Return the created product with provider info
    res.status(201).json({
      ...product,
      provider_id: provider.id,
      provider_name: provider.name
    });
  } catch (error) {
    console.error('Error adding product to provider:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'A product with this part number already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Add user to provider assignment
router.post('/providers/:providerId/assign-user', authenticateJWT, async (req, res) => {
  const { providerId } = req.params;
  const { userId, assignmentType = 'attached_staff' } = req.body;
  
  try {
    // Check if provider exists
    const providerCheck = await req.pool.query(
      'SELECT id, name FROM providers WHERE id = $1',
      [providerId]
    );
    
    if (providerCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    const providerName = providerCheck.rows[0].name;
    
    // Check if user exists
    const userCheck = await req.pool.query(
      'SELECT id, full_name FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userName = userCheck.rows[0].full_name;
    
    // Create assignment
    const result = await req.pool.query(
      `INSERT INTO provider_user_assignments (provider_id, user_id, assignment_type) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (provider_id, user_id, assignment_type) 
       DO UPDATE SET updated_at = NOW()
       RETURNING id, provider_id, user_id, assignment_type, created_at, updated_at`,
      [providerId, userId, assignmentType]
    );
    
    // Send notification to the assigned user
    try {
      // Import the sendNotification function
      const { sendNotification } = await import('../index.js');
      
      // Don't notify the user who performed the assignment if it's the same user
      if (userId != req.user.userId) {
        await sendNotification(userId, {
          type: 'inventory_provider_assigned',
          title: 'Assigned to Provider',
          message: `You have been assigned to provider "${providerName}".`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Get the support staff for the assigned user and notify them
      const { getSupportStaffForUser } = await import('../utils/helpers.js');
      const supportStaffId = await getSupportStaffForUser(req.pool, userId);
      
      if (supportStaffId && supportStaffId != req.user.userId) {
        await sendNotification(supportStaffId, {
          type: 'inventory_provider_assigned_support',
          title: 'User Assigned to Provider',
          message: `User "${userName}" has been assigned to provider "${providerName}".`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (notificationError) {
      console.error('Error sending provider assignment notifications:', notificationError);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning user to provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove user from provider assignment
router.delete('/providers/:providerId/unassign-user/:userId', authenticateJWT, async (req, res) => {
  const { providerId, userId } = req.params;
  const { assignmentType = 'attached_staff' } = req.query;
  
  try {
    const result = await req.pool.query(
      'DELETE FROM provider_user_assignments WHERE provider_id = $1 AND user_id = $2 AND assignment_type = $3',
      [providerId, userId, assignmentType]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error unassigning user from provider:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users assigned to a provider
router.get('/providers/:providerId/assigned-users', authenticateJWT, async (req, res) => {
  const { providerId } = req.params;
  
  try {
    const result = await req.pool.query(
      `SELECT pua.id, pua.assignment_type, pua.created_at, pua.updated_at,
              u.id as user_id, u.full_name, u.email, u.department
       FROM provider_user_assignments pua
       JOIN users u ON pua.user_id = u.id
       WHERE pua.provider_id = $1
       ORDER BY pua.assignment_type, u.full_name`,
      [providerId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assigned users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific product by ID
router.get('/products/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.pool.query(
      `SELECT id, name, part_number, product_type, default_unit_price, created_at, updated_at,
              provider_id
       FROM products WHERE id = $1`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'A product with this part number already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update a product
router.put('/products/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, part_number, product_type, provider_id, default_unit_price, default_markup_percentage } = req.body;
  
  // Validate input
  if (!name || !part_number || !product_type || !provider_id) {
    return res.status(400).json({ error: 'Name, part number, product type, and provider are required' });
  }
  
  try {
    // Verify provider exists
    const providerCheck = await req.pool.query(
      'SELECT id FROM providers WHERE id = $1',
      [provider_id]
    );
    
    if (providerCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid provider ID' });
    }
    
    const result = await req.pool.query(
      'UPDATE products SET name = $1, part_number = $2, product_type = $3, provider_id = $4, default_unit_price = $5, default_markup_percentage = $6, updated_at = NOW() WHERE id = $7 RETURNING id, name, part_number, product_type, default_unit_price, default_markup_percentage',
      [name, part_number, product_type, provider_id, default_unit_price || 0.00, default_markup_percentage || 0.00, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Send notification to users with inventory/products or inventory/inbound access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify (both inventory/products and inventory/inbound users)
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who updated the product
        // Convert both IDs to strings for comparison
        if (notifyUserId.toString() != req.user.userId.toString()) {
          await sendNotification(notifyUserId, {
            type: 'inventory_product_updated',
            title: 'Product Updated',
            message: `Product "${name}" has been updated in the inventory system.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending product update notifications:', notificationError);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'A product with this part number already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a product
router.delete('/products/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get product name before deletion for notification
    const productResult = await req.pool.query('SELECT name FROM products WHERE id = $1', [id]);
    const productName = productResult.rowCount > 0 ? productResult.rows[0].name : 'Unknown Product';
    
    const result = await req.pool.query('DELETE FROM products WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Send notification to users with inventory/products or inventory/inbound access
    try {
      // Import the sendNotification function and helper functions
      const { sendNotification } = await import('../index.js');
      const { getUsersToNotifyOnInventoryInbound } = await import('../utils/helpers.js');
      
      // Get users to notify (both inventory/products and inventory/inbound users)
      const usersToNotify = await getUsersToNotifyOnInventoryInbound(req.pool);
      
      // Send notification to each user
      for (const notifyUserId of usersToNotify) {
        // Don't notify the user who deleted the product
        // Convert both IDs to strings for comparison
        if (notifyUserId.toString() != req.user.userId.toString()) {
          await sendNotification(notifyUserId, {
            type: 'inventory_product_deleted',
            title: 'Product Deleted',
            message: `Product "${productName}" has been deleted from the inventory system.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending product deletion notifications:', notificationError);
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;