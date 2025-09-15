import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createPresetUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS preset_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
  `;
  try {
    await pool.query(query);
    console.log("Table 'preset_users' created successfully.");
  } catch (err) {
    console.error("Error creating 'preset_users' table:", err);
  }
};

const seedPresetUsers = async () => {
  const email = "admin@tasksystems.com";
  const password = process.env.PRESET_ADMIN_PASSWORD;
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const query = {
      text: "INSERT INTO preset_users (email, password) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING;",
      values: [email, hashedPassword],
    };
    await pool.query(query);
    console.log("Seeded 'preset_users' table.");
  } catch (err) {
    console.error("Error seeding 'preset_users' table:", err);
  }
};

const initDb = async () => {
  await createPresetUsersTable();
  await seedPresetUsers();
  pool.end();
};

initDb();
