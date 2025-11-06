import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clearAndAddFilteredProducts() {
  const client = await pool.connect();
  try {
    console.log('Starting clear and filter operation...');

    // Query products that have both container and type
    const result = await client.query(
      'SELECT name, serial_number, part_number, quantity, state, container, type, created_at FROM products WHERE container IS NOT NULL AND type IS NOT NULL'
    );

    const filteredProducts = result.rows;
    console.log(`Found ${filteredProducts.length} products with container and type`);

    // Clear all products
    await client.query('DELETE FROM products');
    console.log('Cleared all products');

    // Add back the filtered products
    for (const product of filteredProducts) {
      await client.query(
        'INSERT INTO products (name, serial_number, part_number, quantity, state, container, type, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          product.name,
          product.serial_number,
          product.part_number,
          product.quantity,
          product.state,
          product.container,
          product.type,
          product.created_at,
        ]
      );
    }

    console.log(`Added back ${filteredProducts.length} filtered products`);
    console.log('Operation completed successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

clearAndAddFilteredProducts();
