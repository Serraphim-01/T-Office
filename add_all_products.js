import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/office',
});

async function addAllProducts() {
  const client = await pool.connect();
  try {
    console.log('Adding all products with container and type...');

    // Read the SQL file
    const sqlContent = fs.readFileSync('clear_and_add_products.sql', 'utf8');

    // Split into statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }

    console.log('All products added successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

addAllProducts();
