import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { databaseConfig } from "./config.js";

// Every bigint column is constrained to the safe-integer range, so Number is exact.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const MIGRATION_LOCK = 7_203_951;

let pool;
let schema;
let active = 0;
let idleWaiters = [];

function getPool() {
  if (pool) return pool;
  const config = databaseConfig();
  schema = config.schema;
  pool = new pg.Pool({
    connectionString: config.url,
    max: config.poolSize,
    options: `-c search_path=${schema}`,
    // Lets short-lived processes (the admin CLI, tests) exit without closing the pool.
    allowExitOnIdle: true,
  });
  // An idle connection dropped by the server must not crash the process.
  pool.on("error", (error) => console.error(`Database connection error: ${error.message}`));
  return pool;
}

async function tracked(operation) {
  active += 1;
  try {
    return await operation();
  } finally {
    active -= 1;
    if (active === 0) {
      const waiters = idleWaiters;
      idleWaiters = [];
      for (const resolve of waiters) resolve();
    }
  }
}

export function query(text, params) {
  return tracked(() => getPool().query(text, params));
}

// Runs operation(client) in one transaction; any throw rolls everything back.
export function transaction(operation) {
  return tracked(async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const value = await operation(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  });
}

// Resolves once no query or transaction is in flight, for a clean shutdown.
export function drain() {
  return active === 0 ? Promise.resolve() : new Promise((resolve) => idleWaiters.push(resolve));
}

export async function closeDatabase() {
  const current = pool;
  pool = undefined;
  await current?.end();
}

// Applies db/migrations/*.sql in name order, each in its own transaction, exactly once.
// A session-level advisory lock keeps two starting processes from racing.
export async function migrate() {
  const files = (await fs.readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();
  const client = await getPool().connect();
  const applied = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK]);
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${pg.escapeIdentifier(schema)}`);
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((row) => row.name));
    for (const name of files) {
      if (done.has(name)) continue;
      const sql = await fs.readFile(path.join(migrationsDirectory, name), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`Migration ${name} failed: ${error.message}`);
      }
      applied.push(name);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK]).catch(() => {});
    client.release();
  }
  return applied;
}
