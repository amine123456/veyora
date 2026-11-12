// Import this first in any test that touches the store. Each test file runs in its own
// process and gets its own throwaway schema in the test database, dropped at the end.
//   npm run db:test:up     starts the local test Postgres (Docker)
import crypto from 'node:crypto';
import { after } from 'node:test';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  ?? 'postgres://postgres:veyora_test@127.0.0.1:54329/veyora_test';
process.env.DB_SCHEMA = `t_${crypto.randomBytes(8).toString('hex')}`;

const db = await import('../../src/db.js');
try {
  await db.migrate();
} catch (error) {
  throw new Error(`Test database unavailable (${error.message}). Start it with: npm run db:test:up`);
}

export const query = db.query;

// Everything stored, as one string: for asserting that a secret never reaches the database.
export async function databaseDump() {
  const tables = ['clients', 'sessions', 'api_keys', 'pending_payments', 'processed_payments'];
  const rows = await Promise.all(tables.map((table) => db.query(`SELECT * FROM ${table}`).then((result) => result.rows)));
  return JSON.stringify(rows);
}

after(async () => {
  await db.drain();
  await db.query(`DROP SCHEMA IF EXISTS ${process.env.DB_SCHEMA} CASCADE`);
  await db.closeDatabase();
});
