import crypto from "node:crypto";
import { promisify } from "node:util";
import { query, transaction } from "./db.js";

export { drain } from "./db.js";

const scrypt = promisify(crypto.scrypt);
const DUMMY_SALT = "d93b866614ee2f90a3f8782cc561566b";
const DUMMY_HASH = "4a343291b084137d2a38a2f9b09386740818e9fa5510fe9470fe5f8c202fa6d73db6af0ba6671d6976000c15d0fc00852f170bd3507105d2326b7d329263542c";
const MAX_PENDING_PAYMENTS = 10_000;
const MAX_PENDING_PAYMENTS_PER_CLIENT = 10;
const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS_PER_CLIENT = 10;
const MAX_API_KEYS_PER_CLIENT = 10;
const API_KEY_NAME_MAX = 40;
const API_KEY_PATTERN = /^vy_live_[A-Za-z0-9_-]{43}$/;
const UNIQUE_VIOLATION = "23505";

// Proxy clients send their password on every request, and scrypt costs tens of
// milliseconds of CPU. Remember credentials that verified recently, keyed by an HMAC
// with a per-process key so the plaintext is never held. An entry is only honoured
// while the client's stored hash is unchanged and the account is enabled, so a new
// proxy password or a disable takes effect immediately.
const AUTH_CACHE_TTL_MS = 5 * 60 * 1000;
const AUTH_CACHE_MAX_ENTRIES = 10_000;
const authCacheKey = crypto.randomBytes(32);
const verifiedCredentials = new Map();

function credentialDigest(username, password) {
  return crypto.createHmac("sha256", authCacheKey).update(`${username}\0${password}`).digest("base64url");
}

function rememberCredentials(digest, username, hash) {
  verifiedCredentials.delete(digest);
  if (verifiedCredentials.size >= AUTH_CACHE_MAX_ENTRIES) {
    verifiedCredentials.delete(verifiedCredentials.keys().next().value);
  }
  verifiedCredentials.set(digest, { username, hash, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validEmail(value) {
  return typeof value === "string"
    && value.length <= 254
    && value === value.trim().toLowerCase()
    && !value.includes(String.fromCharCode(0))
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return validEmail(email) ? email : null;
}

function sessionKey(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Payment references from each provider: a checkout session (or invoice) and the
// event (or payment) that completed it.
const PAYMENT_REF_PREFIXES = {
  session: ["cs_", "npinv_"],
  event: ["evt_", "nppay_"],
};

function validPaymentRef(value, kind) {
  return PAYMENT_REF_PREFIXES[kind].some((prefix) => validProviderId(value, prefix));
}

function validProviderId(value, prefix) {
  return typeof value === "string"
    && value.startsWith(prefix)
    && value.length > prefix.length
    && value.length <= 255
    && /^[A-Za-z0-9_]+$/.test(value);
}

function validPurchaseId(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// A purchase credits either prepaid GB (bytes) or the USD wallet (micros), never both.
function validCredit(bytes, micros) {
  const wallet = micros !== undefined && micros !== 0;
  return wallet
    ? Number.isSafeInteger(micros) && micros > 0 && (bytes === undefined || bytes === 0)
    : Number.isSafeInteger(bytes) && bytes > 0;
}

function validPackageInfo(value) {
  return isRecord(value)
    && typeof value.id === "string"
    && /^[A-Za-z0-9_-]{1,40}$/.test(value.id)
    && validCredit(value.bytes, value.micros)
    && Number.isSafeInteger(value.cents)
    && value.cents >= 50
    && typeof value.currency === "string"
    && /^[a-zA-Z]{3}$/.test(value.currency);
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const result = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: result.toString("hex") };
}

function publicClient(row) {
  return {
    username: row.username,
    quotaBytes: row.quota_bytes,
    usedBytes: row.used_bytes,
    remainingBytes: Math.max(0, row.quota_bytes - row.used_bytes),
    balanceMicros: row.balance_micros,
    enabled: row.enabled,
    createdAt: row.created_at.toISOString(),
    email: row.email ?? null,
    emailVerified: row.email_verified,
  };
}

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,64}$/;

async function findClient(username) {
  if (typeof username !== "string" || !USERNAME_PATTERN.test(username)) return undefined;
  return (await query("SELECT * FROM clients WHERE username = $1", [username])).rows[0];
}

// Row lock: concurrent changes to one account run one after another.
async function lockClient(db, username) {
  if (typeof username !== "string" || !USERNAME_PATTERN.test(username)) return undefined;
  return (await db.query("SELECT * FROM clients WHERE username = $1 FOR UPDATE", [username])).rows[0];
}

export async function createClient(username, password, quotaBytes) {
  if (typeof username !== "string" || !USERNAME_PATTERN.test(username)) throw new Error("Username must be 3-64 safe characters");
  if (typeof password !== "string" || password.length < 16 || password.length > 256) {
    throw new Error("Password must be 16-256 characters");
  }
  if (!Number.isSafeInteger(quotaBytes) || quotaBytes < 0) throw new Error("Quota must be a non-negative integer");
  const record = await hashPassword(password);
  try {
    const { rows } = await query(
      "INSERT INTO clients (username, salt, hash, quota_bytes, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [username, record.salt, record.hash, quotaBytes, new Date()],
    );
    return publicClient(rows[0]);
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error("Client already exists");
    throw error;
  }
}

// Cheap check against recently verified credentials: the client, or null on a miss.
// A miss says nothing about the password; call authenticate for the full check.
export async function authenticateCached(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return null;
  const digest = credentialDigest(username, password);
  const cached = verifiedCredentials.get(digest);
  if (!cached) return null;
  const current = await findClient(username);
  if (cached.expiresAt > Date.now() && cached.username === username
    && current && current.enabled && current.hash === cached.hash) {
    return publicClient(current);
  }
  verifiedCredentials.delete(digest);
  return null;
}

export async function authenticate(username, password) {
  const fast = await authenticateCached(username, password);
  if (fast) return fast;
  if (typeof username !== "string" || typeof password !== "string") return null;
  const digest = credentialDigest(username, password);

  const candidate = await findClient(username);
  const salt = candidate?.salt ?? DUMMY_SALT;
  const expectedHex = candidate?.hash ?? DUMMY_HASH;
  const actual = await hashPassword(password, salt);
  const expected = Buffer.from(expectedHex, "hex");
  const supplied = Buffer.from(actual.hash, "hex");
  const valid = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  if (!valid || !candidate || !candidate.enabled) return null;

  // The hash took a while: make sure the password was not replaced meanwhile.
  const current = await findClient(username);
  if (!current || !current.enabled || current.salt !== salt || current.hash !== expectedHex) return null;
  rememberCredentials(digest, username, current.hash);
  return publicClient(current);
}

export async function getClient(username) {
  const client = await findClient(username);
  return client ? publicClient(client) : null;
}

export async function reserveUsage(username, requestedBytes) {
  if (!Number.isSafeInteger(requestedBytes) || requestedBytes <= 0) return 0;
  const { rows } = await query(
    `WITH locked AS (
       SELECT username, LEAST($2::bigint, quota_bytes - used_bytes) AS granted
       FROM clients WHERE username = $1 AND enabled FOR UPDATE
     )
     UPDATE clients c SET used_bytes = c.used_bytes + locked.granted
     FROM locked WHERE c.username = locked.username AND locked.granted > 0
     RETURNING locked.granted`,
    [username, requestedBytes],
  );
  return rows[0]?.granted ?? 0;
}

export async function releaseUsage(username, bytes) {
  if (!Number.isSafeInteger(bytes) || bytes <= 0) return;
  await query("UPDATE clients SET used_bytes = GREATEST(0, used_bytes - $2::bigint) WHERE username = $1", [username, bytes]);
}

export async function credit(username, bytes) {
  if (!Number.isSafeInteger(bytes) || bytes <= 0) throw new Error("Credit must be a positive integer");
  return transaction(async (db) => {
    const client = await lockClient(db, username);
    if (!client) throw new Error("Unknown client");
    if (!Number.isSafeInteger(client.quota_bytes + bytes)) throw new Error("Quota is too large");
    const { rows } = await db.query("UPDATE clients SET quota_bytes = quota_bytes + $2::bigint WHERE username = $1 RETURNING *", [username, bytes]);
    return publicClient(rows[0]);
  });
}

// ---- USD wallet ---------------------------------------------------------------
// Balances are integer micro-dollars (1 USD = 1,000,000) so prices like $0.0008 per
// request stay exact. Every debit is a conditional UPDATE or runs under the account's
// row lock, so concurrent requests can never spend the same funds twice.
export const MICROS_PER_USD = 1_000_000;
const GIB = 1024 ** 3;

export async function creditWallet(username, micros) {
  if (!Number.isSafeInteger(micros) || micros <= 0) throw new Error("Credit must be a positive integer");
  return transaction(async (db) => {
    const client = await lockClient(db, username);
    if (!client) throw new Error("Unknown client");
    if (!Number.isSafeInteger(client.balance_micros + micros)) throw new Error("Balance is too large");
    const { rows } = await db.query("UPDATE clients SET balance_micros = balance_micros + $2::bigint WHERE username = $1 RETURNING *", [username, micros]);
    return publicClient(rows[0]);
  });
}

// All-or-nothing hold for a fixed price (one unlocker request). Returns true when the
// whole amount was taken from the balance.
export async function reserveFunds(username, micros) {
  if (!Number.isSafeInteger(micros) || micros <= 0) return false;
  const result = await query(
    "UPDATE clients SET balance_micros = balance_micros - $2::bigint WHERE username = $1 AND enabled AND balance_micros >= $2::bigint",
    [username, micros],
  );
  return result.rowCount === 1;
}

export async function releaseFunds(username, micros) {
  if (!Number.isSafeInteger(micros) || micros <= 0) return;
  await query("UPDATE clients SET balance_micros = balance_micros + $2::bigint WHERE username = $1", [username, micros]);
}

const trafficCost = (bytes, pricePerGbMicros) => Math.ceil((bytes * pricePerGbMicros) / GIB);

// Reserves proxy traffic: prepaid GB (legacy quota) first when allowed, then the wallet
// at pricePerGbMicros. Returns how many bytes came from each source so the unused part
// can be returned to the same place.
export async function reserveTraffic(username, requestedBytes, { pricePerGbMicros = 0, allowQuota = true } = {}) {
  const none = { bytes: 0, quotaBytes: 0, walletBytes: 0 };
  if (!Number.isSafeInteger(requestedBytes) || requestedBytes <= 0) return none;
  return transaction(async (db) => {
    const client = await lockClient(db, username);
    if (!client || !client.enabled) return none;
    const quotaBytes = allowQuota
      ? Math.min(requestedBytes, Math.max(0, client.quota_bytes - client.used_bytes))
      : 0;
    let walletBytes = 0;
    let cost = 0;
    const wanted = requestedBytes - quotaBytes;
    if (wanted > 0 && pricePerGbMicros > 0) {
      const balance = client.balance_micros;
      walletBytes = Math.min(wanted, Math.floor((balance * GIB) / pricePerGbMicros));
      cost = trafficCost(walletBytes, pricePerGbMicros);
      if (!(walletBytes > 0 && cost > 0 && cost <= balance)) {
        walletBytes = 0;
        cost = 0;
      }
    }
    if (quotaBytes > 0 || cost > 0) {
      await db.query(
        "UPDATE clients SET used_bytes = used_bytes + $2::bigint, balance_micros = balance_micros - $3::bigint WHERE username = $1",
        [username, quotaBytes, cost],
      );
    }
    return { bytes: quotaBytes + walletBytes, quotaBytes, walletBytes };
  });
}

// Returns unused reserved traffic. Wallet refunds round down, so a customer is never
// credited more than was charged.
export async function releaseTraffic(username, { quotaBytes = 0, walletBytes = 0, pricePerGbMicros = 0 } = {}) {
  if (quotaBytes > 0) await releaseUsage(username, quotaBytes);
  if (walletBytes > 0 && pricePerGbMicros > 0) {
    const refund = Math.floor((walletBytes * pricePerGbMicros) / GIB);
    if (refund > 0) await releaseFunds(username, refund);
  }
}

export async function setEnabled(username, enabled) {
  const { rows } = await query("UPDATE clients SET enabled = $2 WHERE username = $1 RETURNING *", [username, Boolean(enabled)]);
  if (!rows[0]) throw new Error("Unknown client");
  return publicClient(rows[0]);
}

export async function listClients() {
  const { rows } = await query("SELECT * FROM clients ORDER BY created_at, username");
  return rows.map(publicClient);
}

function accountError(code, message) {
  return Object.assign(new Error(message), { code });
}

async function findByEmail(email) {
  return (await query("SELECT * FROM clients WHERE email = $1", [email])).rows[0];
}

// Accepts a proxy username or an account email; returns the username or null.
export async function findUsername(identifier) {
  if (typeof identifier !== "string") return null;
  if (identifier.includes("@")) {
    const email = normalizeEmail(identifier);
    return (email ? await findByEmail(email) : undefined)?.username ?? null;
  }
  return (await findClient(identifier))?.username ?? null;
}

// A web account is a client record with an email and a separate web password.
// Its proxy password is random and never shown; the dashboard will issue a new one.
export async function createAccount(email, password) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw accountError("INVALID_EMAIL", "Enter a valid email address");
  if (typeof password !== "string" || password.length < 10 || password.length > 256) {
    throw accountError("WEAK_PASSWORD", "Password must be 10-256 characters");
  }
  const [webRecord, proxyRecord] = await Promise.all([
    hashPassword(password),
    hashPassword(crypto.randomBytes(24).toString("base64url")),
  ]);
  for (;;) {
    const username = `px${crypto.randomBytes(5).toString("hex")}`;
    try {
      const { rows } = await query(
        `INSERT INTO clients (username, salt, hash, balance_micros, created_at, email, web_salt, web_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [username, proxyRecord.salt, proxyRecord.hash, 1_000_000, new Date(), normalized, webRecord.salt, webRecord.hash],
      );
      return publicClient(rows[0]);
    } catch (error) {
      if (error.code !== UNIQUE_VIOLATION) throw error;
      if (error.constraint === "clients_email_key") {
        throw accountError("EMAIL_TAKEN", "An account with this email already exists");
      }
      // The random proxy username collided: draw another.
    }
  }
}

// Returns a new token, or null when one was issued less than cooldownMs ago (that earlier
// link keeps working, so repeated logins cannot flood the inbox).
export async function createVerificationToken(username, { cooldownMs = 0 } = {}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const result = await query(
    `UPDATE clients SET verification_token = $2, verification_expires_at = $3
     WHERE username = $1 AND (verification_expires_at IS NULL OR verification_expires_at <= $4)`,
    [username, sessionKey(token), new Date(now + VERIFICATION_TOKEN_TTL_MS), new Date(now + VERIFICATION_TOKEN_TTL_MS - cooldownMs)],
  );
  if (result.rowCount === 1) return token;
  if (!(await findClient(username))) throw new Error("Unknown client");
  return null;
}

export async function confirmEmail(token) {
  if (typeof token !== "string" || !token) return null;
  const { rows } = await query(
    `UPDATE clients SET email_verified = true, verification_token = NULL, verification_expires_at = NULL
     WHERE verification_token = $1 AND verification_expires_at > $2 RETURNING *`,
    [sessionKey(token), new Date()],
  );
  return rows[0] ? publicClient(rows[0]) : null;
}

export async function verifyAccount(email, password) {
  if (typeof password !== "string" || password.length > 256) return null;
  const normalized = normalizeEmail(email);
  const client = normalized ? await findByEmail(normalized) : undefined;
  // Unknown emails still pay for a hash so response time does not reveal which emails exist.
  const expectedHex = client?.web_hash ?? DUMMY_HASH;
  const actual = await hashPassword(password, client?.web_salt ?? DUMMY_SALT);
  const valid = crypto.timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(actual.hash, "hex"));
  if (!valid || !client || !client.enabled) return null;
  return publicClient(client);
}

export async function createSession(username) {
  const token = crypto.randomBytes(32).toString("base64url");
  await transaction(async (db) => {
    const client = await lockClient(db, username);
    if (!client || !client.enabled) throw new Error("Unknown client");
    const now = Date.now();
    await db.query("DELETE FROM sessions WHERE expires_at <= $1", [new Date(now)]);
    // Signing in on one device too many signs out the oldest session.
    await db.query(
      `DELETE FROM sessions WHERE token_hash IN (
         SELECT token_hash FROM sessions WHERE username = $1
         ORDER BY expires_at DESC, token_hash OFFSET $2
       )`,
      [username, MAX_SESSIONS_PER_CLIENT - 1],
    );
    await db.query(
      "INSERT INTO sessions (token_hash, username, expires_at) VALUES ($1, $2, $3)",
      [sessionKey(token), username, new Date(now + SESSION_TTL_MS)],
    );
  });
  return { token, maxAgeSeconds: SESSION_TTL_MS / 1000 };
}

export async function getSessionClient(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { rows } = await query(
    `SELECT c.* FROM sessions s JOIN clients c ON c.username = s.username
     WHERE s.token_hash = $1 AND s.expires_at > $2 AND c.enabled`,
    [sessionKey(token), new Date()],
  );
  return rows[0] ? publicClient(rows[0]) : null;
}

// Returns the new proxy password once; only its hash is kept, so it cannot be shown again.
export async function regenerateProxyPassword(username) {
  const password = crypto.randomBytes(24).toString("base64url");
  const record = await hashPassword(password);
  const result = await query(
    "UPDATE clients SET salt = $2, hash = $3 WHERE username = $1 AND enabled",
    [username, record.salt, record.hash],
  );
  if (result.rowCount !== 1) throw new Error("Unknown client");
  return password;
}

export async function deleteSession(token) {
  if (typeof token !== "string") return;
  await query("DELETE FROM sessions WHERE token_hash = $1", [sessionKey(token)]);
}

// API keys authenticate the unlocker API. The key itself is 256 random bits, so a
// SHA-256 digest is enough to store it (no slow hash needed, unlike passwords); it is
// shown once at creation and never again.
function apiKeyView(row) {
  return { id: row.id, name: row.name, prefix: row.prefix, createdAt: row.created_at.toISOString() };
}

export async function createApiKey(username, name = "") {
  const label = String(name ?? "").trim();
  if (label.length > API_KEY_NAME_MAX || /[\u0000-\u001f\u007f]/.test(label)) {
    throw accountError("INVALID_NAME", `Key name must be at most ${API_KEY_NAME_MAX} printable characters`);
  }
  const key = `vy_live_${crypto.randomBytes(32).toString("base64url")}`;
  return transaction(async (db) => {
    const client = await lockClient(db, username);
    if (!client || !client.enabled) throw new Error("Unknown client");
    const { rows: [{ count }] } = await db.query("SELECT count(*)::int AS count FROM api_keys WHERE username = $1", [username]);
    if (count >= MAX_API_KEYS_PER_CLIENT) {
      throw accountError("TOO_MANY_KEYS", `At most ${MAX_API_KEYS_PER_CLIENT} API keys per account. Revoke one first.`);
    }
    const { rows } = await db.query(
      "INSERT INTO api_keys (key_hash, id, username, name, prefix, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [sessionKey(key), `key_${crypto.randomBytes(8).toString("hex")}`, username, label, key.slice(0, 12), new Date()],
    );
    return { ...apiKeyView(rows[0]), key };
  });
}

export async function listApiKeys(username) {
  const { rows } = await query("SELECT * FROM api_keys WHERE username = $1 ORDER BY created_at, seq", [username]);
  return rows.map(apiKeyView);
}

export async function revokeApiKey(username, id) {
  if (typeof id !== "string") return false;
  const result = await query("DELETE FROM api_keys WHERE id = $1 AND username = $2", [id, username]);
  return result.rowCount === 1;
}

// Returns the account behind a key, or null for unknown, revoked or disabled.
export async function authenticateApiKey(key) {
  if (typeof key !== "string" || !API_KEY_PATTERN.test(key)) return null;
  const { rows } = await query(
    `SELECT c.*, k.id AS api_key_id FROM api_keys k JOIN clients c ON c.username = k.username
     WHERE k.key_hash = $1 AND c.enabled`,
    [sessionKey(key)],
  );
  return rows[0] ? { ...publicClient(rows[0]), apiKeyId: rows[0].api_key_id } : null;
}

function pendingView(row) {
  return {
    purchaseId: row.purchase_id,
    username: row.username,
    packageId: row.package_id,
    bytes: row.bytes,
    ...(row.micros ? { micros: row.micros } : {}),
    cents: row.cents,
    currency: row.currency,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.getTime(),
    sessionId: row.session_id,
  };
}

export async function createPendingPayment(username, packageInfo) {
  if (!validPackageInfo(packageInfo)) throw new Error("Invalid package");
  return transaction(async (db) => {
    const client = await lockClient(db, username);
    if (!client || !client.enabled) throw new Error("Unknown client");
    const now = Date.now();
    await db.query("DELETE FROM pending_payments WHERE expires_at <= $1", [new Date(now)]);
    const { rows: [counts] } = await db.query(
      "SELECT count(*)::int AS total, (count(*) FILTER (WHERE username = $1))::int AS own FROM pending_payments",
      [username],
    );
    if (counts.total >= MAX_PENDING_PAYMENTS || counts.own >= MAX_PENDING_PAYMENTS_PER_CLIENT) {
      throw new Error("Too many pending purchases");
    }
    const { rows } = await db.query(
      `INSERT INTO pending_payments (purchase_id, username, package_id, bytes, micros, cents, currency, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        crypto.randomUUID(), username, packageInfo.id,
        packageInfo.micros ? 0 : packageInfo.bytes, packageInfo.micros || 0,
        packageInfo.cents, packageInfo.currency.toLowerCase(),
        new Date(now), new Date(now + PENDING_PAYMENT_TTL_MS),
      ],
    );
    return pendingView(rows[0]);
  });
}

export async function bindPaymentSession(purchaseId, sessionId) {
  if (!validPurchaseId(purchaseId) || !validPaymentRef(sessionId, "session")) {
    throw new Error("Invalid payment session");
  }
  const result = await query(
    "UPDATE pending_payments SET session_id = $2 WHERE purchase_id = $1 AND session_id IS NULL",
    [purchaseId, sessionId],
  );
  if (result.rowCount !== 1) throw new Error("Unknown purchase");
}

export async function cancelPendingPayment(purchaseId) {
  if (!validPurchaseId(purchaseId)) throw new Error("Invalid purchase");
  await query("DELETE FROM pending_payments WHERE purchase_id = $1", [purchaseId]);
}

// Credits a paid purchase exactly once. The whole check-credit-record sequence is one
// transaction under the account's row lock, and the event id is a primary key, so a
// replayed or concurrent webhook for the same event can never credit twice.
export async function completePayment({ eventId, purchaseId, sessionId, amountTotal, currency }) {
  if (!validPaymentRef(eventId, "event")
    || !validPurchaseId(purchaseId)
    || !validPaymentRef(sessionId, "session")
    || !Number.isSafeInteger(amountTotal)
    || amountTotal <= 0
    || typeof currency !== "string"
    || !/^[a-zA-Z]{3}$/.test(currency)) {
    throw new Error("Invalid payment event");
  }
  const duplicate = { credited: false, duplicate: true };
  return transaction(async (db) => {
    const processed = (id) => db.query("SELECT 1 FROM processed_payments WHERE event_id = $1", [id]).then((r) => r.rowCount > 0);
    if (await processed(eventId)) return duplicate;

    // Lock order is always account first, then purchase.
    const owner = (await db.query("SELECT username FROM pending_payments WHERE purchase_id = $1", [purchaseId])).rows[0];
    const client = owner ? await lockClient(db, owner.username) : undefined;
    const pending = client
      ? (await db.query("SELECT * FROM pending_payments WHERE purchase_id = $1 FOR UPDATE", [purchaseId])).rows[0]
      : undefined;
    if (!pending) {
      // A concurrent delivery of the same event may have just finished.
      if (await processed(eventId)) return duplicate;
      throw new Error("Unknown or expired purchase");
    }
    if (pending.expires_at.getTime() < Date.now()) throw new Error("Unknown or expired purchase");
    if (!pending.session_id || pending.session_id !== sessionId) throw new Error("Payment session mismatch");
    if (pending.cents !== amountTotal || pending.currency !== currency.toLowerCase()) {
      throw new Error("Payment amount mismatch");
    }
    if (pending.micros) {
      if (!Number.isSafeInteger(client.balance_micros + pending.micros)) throw new Error("Balance is too large");
      await db.query("UPDATE clients SET balance_micros = balance_micros + $2::bigint WHERE username = $1", [client.username, pending.micros]);
    } else {
      if (!Number.isSafeInteger(client.quota_bytes + pending.bytes)) throw new Error("Quota is too large");
      await db.query("UPDATE clients SET quota_bytes = quota_bytes + $2::bigint WHERE username = $1", [client.username, pending.bytes]);
    }
    await db.query(
      `INSERT INTO processed_payments (event_id, purchase_id, session_id, username, package_id, bytes, micros, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [eventId, purchaseId, sessionId, client.username, pending.package_id, pending.bytes, pending.micros, new Date()],
    );
    await db.query("DELETE FROM pending_payments WHERE purchase_id = $1", [purchaseId]);
    return { credited: true, username: client.username, bytes: pending.bytes, micros: pending.micros };
  });
}
