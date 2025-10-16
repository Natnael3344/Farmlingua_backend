import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable for PostgreSQL connection.');
}

const pool = new Pool({
  connectionString,
  ssl: {

    rejectUnauthorized: false 
  }
});

/**
 * Executes a raw SQL query against the database using a pooled connection.
 * @param {string} text - The SQL query text.
 * @param {Array<any>} [params=[]] - Parameters to be safely injected into the query.
 * @returns {Promise<import('pg').QueryResult>} The query result object.
 */
export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  try {
 
    await query('SELECT NOW()'); 
    


    console.log('Database connection successful using native pg client. ✅');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

export default pool;