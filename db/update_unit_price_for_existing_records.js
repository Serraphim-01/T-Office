/**
 * Script to update existing inbound transactions that may be missing unit_price values
 * This can happen if transactions were created before the unit_price column was added
 */
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/office',
});

async function updateExistingRecords() {
  try {
    console.log('Updating existing inbound transactions with unit_price from product default_unit_price...');
    
    // Update inbound transactions that have NULL or 0 unit_price with the product's default_unit_price
    const result = await pool.query(`
      UPDATE inbound_transactions 
      SET unit_price = COALESCE(p.default_unit_price, 0.00)
      FROM products p
      WHERE inbound_transactions.product_id = p.id
      AND (inbound_transactions.unit_price IS NULL OR inbound_transactions.unit_price = 0.00)
      AND p.default_unit_price IS NOT NULL
      RETURNING inbound_transactions.id, inbound_transactions.unit_price, p.default_unit_price
    `);
    
    console.log(`Updated ${result.rowCount} inbound transactions with unit_price from product defaults.`);
    
    if (result.rowCount > 0) {
      console.log('Sample updated records:', result.rows.slice(0, 5)); // Show first 5 updated records
    }
    
    console.log('Update completed successfully!');
  } catch (error) {
    console.error('Error updating existing records:', error);
  } finally {
    await pool.end();
  }
}

updateExistingRecords();