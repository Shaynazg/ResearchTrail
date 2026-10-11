import { Pool } from "pg";

// One shared connection pool. In development Next.js reloads files often,
// so the pool is kept on globalThis to avoid opening new connections each time.
const pool =
  globalThis.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalThis.pgPool = pool;

// Run one query and return its rows. Always pass values as params ($1, $2 ...),
// never by joining strings, so user input cannot change the SQL.
export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

// Run several queries as one transaction: all succeed or all are undone.
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}