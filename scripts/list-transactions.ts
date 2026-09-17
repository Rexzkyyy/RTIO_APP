import { Pool } from 'pg';
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, "buyerName", status FROM "Transaction" ORDER BY "createdAt" DESC LIMIT 10');
    console.log(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
