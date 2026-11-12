// One-time move from the old JSON store (store.json plus its usage journal) to Postgres.
// Everything is inserted in one transaction and checked against the source before commit.
import fs from "node:fs/promises";
import { transaction } from "./db.js";
import { canonicalEmail } from "./email-policy.js";

async function readJson(file) {
  const state = JSON.parse(await fs.readFile(file, "utf8"));
  if (![2, 3].includes(state?.version)) throw new Error("Unsupported state file version");
  state.sessions ??= {};
  state.apiKeys ??= {};

  // Debits made since the last snapshot live only in the journal: replay them.
  let journal = "";
  try {
    journal = await fs.readFile(`${file}.usage.log`, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const line of journal.split("\n").filter(Boolean)) {
    const record = JSON.parse(line);
    if (record.seq <= state.lastUsageSeq) continue;
    const client = state.clients[record.username];
    if (record.seq !== state.lastUsageSeq + 1 || !client || !Number.isSafeInteger(record.delta)) {
      throw new Error("Invalid usage journal record");
    }
    if (record.unit === "micros") client.balanceMicros = (client.balanceMicros ?? 0) + record.delta;
    else client.usedBytes += record.delta;
    state.lastUsageSeq = record.seq;
  }
  return state;
}

const date = (value) => new Date(value);

export async function importJsonStore(file) {
  const state = await readJson(file);
  const clients = Object.entries(state.clients);
  const sessions = Object.entries(state.sessions);
  const apiKeys = Object.entries(state.apiKeys);
  const pending = Object.values(state.pendingPayments);
  const processed = Object.values(state.processedPayments);

  return transaction(async (db) => {
    const { rows: [{ count }] } = await db.query("SELECT count(*)::int AS count FROM clients");
    if (count > 0) throw new Error("The database already has accounts; refusing to import over them");

    for (const [username, client] of clients) {
      await db.query(
        `INSERT INTO clients (username, salt, hash, quota_bytes, used_bytes, balance_micros, enabled, created_at,
           email, web_salt, web_hash, email_verified, verification_token, verification_expires_at, email_canonical)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          username, client.salt.toLowerCase(), client.hash.toLowerCase(), client.quotaBytes, client.usedBytes,
          client.balanceMicros ?? 0, client.enabled !== false, date(client.createdAt),
          client.email ?? null, client.webSalt?.toLowerCase() ?? null, client.webHash?.toLowerCase() ?? null,
          client.emailVerified === true, client.verificationToken ?? null,
          client.verificationExpiresAt ? date(client.verificationExpiresAt) : null,
          client.email ? canonicalEmail(client.email) : null,
        ],
      );
    }
    for (const [tokenHash, session] of sessions) {
      await db.query("INSERT INTO sessions (token_hash, username, expires_at) VALUES ($1, $2, $3)",
        [tokenHash, session.username, date(session.expiresAt)]);
    }
    // Insert in creation order so the listing order is unchanged.
    for (const [keyHash, key] of apiKeys.sort(([, a], [, b]) => a.createdAt.localeCompare(b.createdAt))) {
      await db.query("INSERT INTO api_keys (key_hash, id, username, name, prefix, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [keyHash, key.id, key.username, key.name, key.prefix, date(key.createdAt)]);
    }
    for (const payment of pending) {
      await db.query(
        `INSERT INTO pending_payments (purchase_id, username, package_id, bytes, micros, cents, currency, created_at, expires_at, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [payment.purchaseId, payment.username, payment.packageId, payment.micros ? 0 : payment.bytes, payment.micros ?? 0,
          payment.cents, payment.currency, date(payment.createdAt), date(payment.expiresAt), payment.sessionId],
      );
    }
    for (const payment of processed) {
      await db.query(
        `INSERT INTO processed_payments (event_id, purchase_id, session_id, username, package_id, bytes, micros, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [payment.eventId, payment.purchaseId, payment.sessionId, payment.username, payment.packageId,
          payment.bytes ?? 0, payment.micros ?? 0, date(payment.processedAt)],
      );
    }

    // Compare what landed with the source, account by account, before committing.
    const { rows } = await db.query("SELECT username, quota_bytes, used_bytes, balance_micros, enabled, email FROM clients");
    const stored = new Map(rows.map((row) => [row.username, row]));
    for (const [username, client] of clients) {
      const row = stored.get(username);
      if (!row
        || row.quota_bytes !== client.quotaBytes
        || row.used_bytes !== client.usedBytes
        || row.balance_micros !== (client.balanceMicros ?? 0)
        || row.enabled !== (client.enabled !== false)
        || row.email !== (client.email ?? null)) {
        throw new Error(`Imported account does not match its source: ${username}`);
      }
    }
    const counts = { clients: clients.length, sessions: sessions.length, apiKeys: apiKeys.length, pendingPayments: pending.length, processedPayments: processed.length };
    const tables = { clients: "clients", sessions: "sessions", apiKeys: "api_keys", pendingPayments: "pending_payments", processedPayments: "processed_payments" };
    for (const [name, table] of Object.entries(tables)) {
      const { rows: [{ count: actual }] } = await db.query(`SELECT count(*)::int AS count FROM ${table}`);
      if (actual !== counts[name]) throw new Error(`Imported ${actual} ${name}, expected ${counts[name]}`);
    }
    return {
      ...counts,
      totalBalanceMicros: clients.reduce((sum, [, client]) => sum + (client.balanceMicros ?? 0), 0),
    };
  });
}
