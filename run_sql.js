import { readFileSync } from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgres://postgres:password@localhost:5433/office',
});

async function runSQL(filePath) {
  try {
    const sql = readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log('SQL executed successfully');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await pool.end();
  }
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node run_sql.js <sql_file>');
  process.exit(1);
}

runSQL(filePath);
