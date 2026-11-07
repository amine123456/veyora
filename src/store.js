import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { dataFile, processedPaymentHistoryLimit } from "./config.js";

const scrypt = promisify(crypto.scrypt);
const file = dataFile();
const usageJournal = `${file}.usage.log`;
const processedPaymentLimit = processedPaymentHistoryLimit();
const DUMMY_SALT = "d93b866614ee2f90a3f8782cc561566b";
const DUMMY_HASH = "4a343291b084137d2a38a2f9b09386740818e9fa5510fe9470fe5f8c202fa6d73db6af0ba6671d6976000c15d0fc00852f170bd3507105d2326b7d329263542c";
const MAX_PENDING_PAYMENTS = 10_000;
const MAX_PENDING_PAYMENTS_PER_CLIENT = 10;
const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS_PER_CLIENT = 10;

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

let statePromise;
let mutationQueue = Promise.resolve();

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function blankState() {
  return {
    version: 3,
    clients: {},
    processedPayments: {},
    pendingPayments: {},
    sessions: {},
    lastUsageSeq: 0,
  };
}

function validEmail(value) {
  return typeof value === "string"
    && value.length <= 254
    && value === value.trim().toLowerCase()
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return validEmail(email) ? email : null;
}

function sessionKey(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function validTimestamp(value) {
  return typeof value === "string"
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
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

function validPackageInfo(value) {
  return isRecord(value)
    && typeof value.id === "string"
    && /^[A-Za-z0-9_-]{1,40}$/.test(value.id)
    && Number.isSafeInteger(value.bytes)
    && value.bytes > 0
    && Number.isSafeInteger(value.cents)
    && value.cents >= 50
    && typeof value.currency === "string"
    && /^[a-zA-Z]{3}$/.test(value.currency);
}

function pruneProcessedPayments(payments, limit = processedPaymentLimit) {
  const entries = Object.entries(payments);
  if (entries.length <= limit) return { ...payments };
  entries.sort(([leftId, left], [rightId, right]) => {
    const timestampOrder = Date.parse(right.processedAt) - Date.parse(left.processedAt);
    return timestampOrder || rightId.localeCompare(leftId);
  });
  return Object.fromEntries(entries.slice(0, limit));
}

function normalizeState(parsed) {
  if (!isRecord(parsed) || (parsed.version !== 2 && parsed.version !== 3)) throw new Error("Invalid or unsupported state file");
  // Version 2 predates web accounts; it upgrades by gaining an empty session table.
  if (parsed.version === 2) parsed = { ...parsed, version: 3, sessions: {} };
  if (!isRecord(parsed.clients) || !isRecord(parsed.processedPayments) || !isRecord(parsed.pendingPayments)
    || !isRecord(parsed.sessions)) {
    throw new Error("Invalid state collections");
  }
  if (!Number.isSafeInteger(parsed.lastUsageSeq) || parsed.lastUsageSeq < 0) {
    throw new Error("Invalid usage sequence");
  }

  const emails = new Set();
  for (const [username, client] of Object.entries(parsed.clients)) {
    const valid = /^[A-Za-z0-9._-]{3,64}$/.test(username)
      && isRecord(client)
      && /^[0-9a-f]{32}$/i.test(client.salt)
      && /^[0-9a-f]{128}$/i.test(client.hash)
      && Number.isSafeInteger(client.quotaBytes)
      && client.quotaBytes >= 0
      && Number.isSafeInteger(client.usedBytes)
      && client.usedBytes >= 0
      && client.usedBytes <= client.quotaBytes
      && typeof client.enabled === "boolean"
      && validTimestamp(client.createdAt)
      && (client.balanceMicros === undefined
        || (Number.isSafeInteger(client.balanceMicros) && client.balanceMicros >= 0))
      && (client.email === undefined
        || (validEmail(client.email)
          && /^[0-9a-f]{32}$/i.test(client.webSalt)
          && /^[0-9a-f]{128}$/i.test(client.webHash)));
    if (!valid) throw new Error(`Invalid client record: ${username}`);
    if (client.email !== undefined) {
      if (emails.has(client.email)) throw new Error(`Duplicate account email: ${username}`);
      emails.add(client.email);
    }
  }

  for (const [key, session] of Object.entries(parsed.sessions)) {
    const valid = /^[0-9a-f]{64}$/.test(key)
      && isRecord(session)
      && typeof session.username === "string"
      && hasOwn(parsed.clients, session.username)
      && Number.isSafeInteger(session.expiresAt)
      && session.expiresAt > 0;
    if (!valid) throw new Error("Invalid session record");
  }


  for (const [purchaseId, payment] of Object.entries(parsed.pendingPayments)) {
    const valid = validPurchaseId(purchaseId)
      && isRecord(payment)
      && payment.purchaseId === purchaseId
      && typeof payment.username === "string"
      && hasOwn(parsed.clients, payment.username)
      && /^[A-Za-z0-9_-]{1,40}$/.test(payment.packageId)
      && Number.isSafeInteger(payment.bytes)
      && payment.bytes > 0
      && Number.isSafeInteger(payment.cents)
      && payment.cents >= 50
      && /^[a-z]{3}$/.test(payment.currency)
      && validTimestamp(payment.createdAt)
      && Number.isSafeInteger(payment.expiresAt)
      && payment.expiresAt > 0
      && (payment.sessionId === null || validPaymentRef(payment.sessionId, "session"));
    if (!valid) throw new Error(`Invalid pending payment record: ${purchaseId}`);
  }

  for (const [eventId, payment] of Object.entries(parsed.processedPayments)) {
    const valid = validPaymentRef(eventId, "event")
      && isRecord(payment)
      && payment.eventId === eventId
      && validPurchaseId(payment.purchaseId)
      && validPaymentRef(payment.sessionId, "session")
      && typeof payment.username === "string"
      && hasOwn(parsed.clients, payment.username)
      && /^[A-Za-z0-9_-]{1,40}$/.test(payment.packageId)
      && Number.isSafeInteger(payment.bytes)
      && payment.bytes > 0
      && validTimestamp(payment.processedAt);
    if (!valid) throw new Error(`Invalid processed payment record: ${eventId}`);
  }

  return {
    version: 3,
    clients: { ...parsed.clients },
    processedPayments: pruneProcessedPayments(parsed.processedPayments),
    pendingPayments: { ...parsed.pendingPayments },
    sessions: { ...parsed.sessions },
    lastUsageSeq: parsed.lastUsageSeq,
  };
}

async function loadState() {
  await fs.mkdir(path.dirname(file), { recursive: true });
  let state;
  try {
    state = normalizeState(JSON.parse(await fs.readFile(file, "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    state = blankState();
  }

  try {
    const records = (await fs.readFile(usageJournal, "utf8")).split("\n").filter(Boolean);
    for (const line of records) {
      const record = JSON.parse(line);
      if (!Number.isSafeInteger(record.seq) || record.seq <= state.lastUsageSeq) continue;
      if (record.seq !== state.lastUsageSeq + 1
        || typeof record.username !== "string"
        || !hasOwn(state.clients, record.username)
        || !Number.isSafeInteger(record.delta)
        || record.delta === 0
        || (record.unit !== undefined && record.unit !== "micros")) {
        throw new Error("Invalid usage journal record");
      }
      const client = state.clients[record.username];
      if (record.unit === "micros") {
        // Wallet movement: delta is added to the USD balance (micro-dollars).
        const nextBalance = (client.balanceMicros ?? 0) + record.delta;
        if (!Number.isSafeInteger(nextBalance) || nextBalance < 0) {
          throw new Error("Usage journal drives a wallet below zero");
        }
        client.balanceMicros = nextBalance;
        state.lastUsageSeq = record.seq;
        continue;
      }
      const nextUsage = client.usedBytes + record.delta;
      if (!Number.isSafeInteger(nextUsage) || nextUsage < 0 || nextUsage > client.quotaBytes) {
        throw new Error("Usage journal exceeds client quota bounds");
      }
      client.usedBytes = nextUsage;
      state.lastUsageSeq = record.seq;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return state;
}

function getState() {
  statePromise ??= loadState();
  return statePromise;
}

async function readState() {
  await mutationQueue;
  return getState();
}

function mutate(operation) {
  const result = mutationQueue.then(async () => {
    const draft = structuredClone(await getState());
    const value = await operation(draft);
    statePromise = Promise.resolve(draft);
    return value;
  });
  mutationQueue = result.catch(() => {});
  return result;
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const result = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: result.toString("hex") };
}

async function saveSnapshot(state) {
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  let handle;
  try {
    handle = await fs.open(temp, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(state, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temp, file);
    await syncDataDirectory();
    await fs.chmod(file, 0o600).catch(() => {});
    // The snapshot already contains every applied journal sequence. Leaving an
    // old journal behind is safe because replay skips those sequence numbers.
    await fs.rm(usageJournal, { force: true });
    await syncDataDirectory();
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

async function syncDataDirectory() {
  let handle;
  try {
    handle = await fs.open(path.dirname(file), "r");
    await handle.sync();
  } catch (error) {
    const unsupportedOnWindows = process.platform === "win32"
      && ["EINVAL", "EPERM", "EISDIR", "EBADF"].includes(error?.code);
    if (!unsupportedOnWindows) throw error;
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function appendUsage(state, username, delta, unit) {
  state.lastUsageSeq += 1;
  const record = { seq: state.lastUsageSeq, username, delta, at: new Date().toISOString() };
  if (unit) record.unit = unit;
  const handle = await fs.open(usageJournal, "a", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(record)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function publicClient(username, client) {
  return {
    username,
    quotaBytes: client.quotaBytes,
    usedBytes: client.usedBytes ?? 0,
    remainingBytes: Math.max(0, client.quotaBytes - (client.usedBytes ?? 0)),
    balanceMicros: client.balanceMicros ?? 0,
    enabled: client.enabled !== false,
    createdAt: client.createdAt,
    email: client.email ?? null,
  };
}

export async function createClient(username, password, quotaBytes) {
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(username)) throw new Error("Username must be 3-64 safe characters");
  if (typeof password !== "string" || password.length < 16 || password.length > 256) {
    throw new Error("Password must be 16-256 characters");
  }
  if (!Number.isSafeInteger(quotaBytes) || quotaBytes < 0) throw new Error("Quota must be a non-negative integer");
  const passwordRecord = await hashPassword(password);
  return mutate(async (state) => {
    if (hasOwn(state.clients, username)) throw new Error("Client already exists");
    state.clients[username] = {
      ...passwordRecord,
      quotaBytes,
      usedBytes: 0,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await saveSnapshot(state);
    return publicClient(username, state.clients[username]);
  });
}

// Cheap check against recently verified credentials: the client, or null on a miss.
// A miss says nothing about the password; call authenticate for the full check.
export async function authenticateCached(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return null;
  const digest = credentialDigest(username, password);
  const cached = verifiedCredentials.get(digest);
  if (!cached) return null;
  const clients = (await readState()).clients;
  const current = hasOwn(clients, username) ? clients[username] : undefined;
  if (cached.expiresAt > Date.now() && cached.username === username
    && current && current.enabled !== false && current.hash === cached.hash) {
    return publicClient(username, current);
  }
  verifiedCredentials.delete(digest);
  return null;
}

export async function authenticate(username, password) {
  const fast = await authenticateCached(username, password);
  if (fast) return fast;
  const digest = credentialDigest(username, password);

  const state = await readState();
  const candidate = hasOwn(state.clients, username) ? state.clients[username] : undefined;
  const salt = candidate?.salt ?? DUMMY_SALT;
  const expectedHex = candidate?.hash ?? DUMMY_HASH;
  const actual = await hashPassword(password, salt);
  const expected = Buffer.from(expectedHex, "hex");
  const supplied = Buffer.from(actual.hash, "hex");
  const valid = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  if (!valid || !candidate || candidate.enabled === false) return null;

  const latest = await readState();
  const current = hasOwn(latest.clients, username) ? latest.clients[username] : undefined;
  if (!current
    || current.enabled === false
    || current.salt !== salt
    || current.hash !== expectedHex) return null;
  rememberCredentials(digest, username, current.hash);
  return publicClient(username, current);
}

export async function getClient(username) {
  const clients = (await readState()).clients;
  const client = hasOwn(clients, username) ? clients[username] : undefined;
  return client ? publicClient(username, client) : null;
}

export async function reserveUsage(username, requestedBytes) {
  if (!Number.isSafeInteger(requestedBytes) || requestedBytes <= 0) return 0;
  return mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client || client.enabled === false) return 0;
    const granted = Math.min(requestedBytes, Math.max(0, client.quotaBytes - client.usedBytes));
    if (granted === 0) return 0;
    client.usedBytes += granted;
    await appendUsage(state, username, granted);
    return granted;
  });
}

export async function releaseUsage(username, bytes) {
  if (!Number.isSafeInteger(bytes) || bytes <= 0) return;
  return mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client) return;
    const released = Math.min(bytes, client.usedBytes);
    if (released === 0) return;
    client.usedBytes -= released;
    await appendUsage(state, username, -released);
  });
}

export async function credit(username, bytes) {
  if (!Number.isSafeInteger(bytes) || bytes <= 0) throw new Error("Credit must be a positive integer");
  return mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client) throw new Error("Unknown client");
    if (!Number.isSafeInteger(client.quotaBytes + bytes)) throw new Error("Quota is too large");
    client.quotaBytes += bytes;
    await saveSnapshot(state);
    return publicClient(username, client);
  });
}

// ---- USD wallet ---------------------------------------------------------------
// Balances are integer micro-dollars (1 USD = 1,000,000) so prices like $0.0008 per
// request stay exact. Credits are snapshotted; per-request debits and releases go
// through the fsynced usage journal like traffic does, so a crash never loses them.
export const MICROS_PER_USD = 1_000_000;
const GIB = 1024 ** 3;

function walletClient(state, username) {
  const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
  return client && client.enabled !== false ? client : undefined;
}

export async function creditWallet(username, micros) {
  if (!Number.isSafeInteger(micros) || micros <= 0) throw new Error("Credit must be a positive integer");
  return mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client) throw new Error("Unknown client");
    const next = (client.balanceMicros ?? 0) + micros;
    if (!Number.isSafeInteger(next)) throw new Error("Balance is too large");
    client.balanceMicros = next;
    await saveSnapshot(state);
    return publicClient(username, client);
  });
}

// All-or-nothing hold for a fixed price (one unlocker request). Returns true when the
// whole amount was taken from the balance.
export async function reserveFunds(username, micros) {
  if (!Number.isSafeInteger(micros) || micros <= 0) return false;
  return mutate(async (state) => {
    const client = walletClient(state, username);
    if (!client || (client.balanceMicros ?? 0) < micros) return false;
    client.balanceMicros -= micros;
    await appendUsage(state, username, -micros, "micros");
    return true;
  });
}

export async function releaseFunds(username, micros) {
  if (!Number.isSafeInteger(micros) || micros <= 0) return;
  return mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client) return;
    client.balanceMicros = (client.balanceMicros ?? 0) + micros;
    await appendUsage(state, username, micros, "micros");
  });
}

const trafficCost = (bytes, pricePerGbMicros) => Math.ceil((bytes * pricePerGbMicros) / GIB);

// Reserves proxy traffic: prepaid GB (legacy quota) first when allowed, then the wallet
// at pricePerGbMicros. Returns how many bytes came from each source so the unused part
// can be returned to the same place.
export async function reserveTraffic(username, requestedBytes, { pricePerGbMicros = 0, allowQuota = true } = {}) {
  const none = { bytes: 0, quotaBytes: 0, walletBytes: 0 };
  if (!Number.isSafeInteger(requestedBytes) || requestedBytes <= 0) return none;
  return mutate(async (state) => {
    const client = walletClient(state, username);
    if (!client) return none;
    let quotaBytes = 0;
    if (allowQuota) {
      quotaBytes = Math.min(requestedBytes, Math.max(0, client.quotaBytes - client.usedBytes));
      if (quotaBytes > 0) {
        client.usedBytes += quotaBytes;
        await appendUsage(state, username, quotaBytes);
      }
    }
    let walletBytes = 0;
    const wanted = requestedBytes - quotaBytes;
    if (wanted > 0 && pricePerGbMicros > 0) {
      const balance = client.balanceMicros ?? 0;
      walletBytes = Math.min(wanted, Math.floor((balance * GIB) / pricePerGbMicros));
      const cost = trafficCost(walletBytes, pricePerGbMicros);
      if (walletBytes > 0 && cost > 0 && cost <= balance) {
        client.balanceMicros = balance - cost;
        await appendUsage(state, username, -cost, "micros");
      } else {
        walletBytes = 0;
      }
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
  return mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client) throw new Error("Unknown client");
    client.enabled = Boolean(enabled);
    await saveSnapshot(state);
    return publicClient(username, client);
  });
}

export async function listClients() {
  const state = await readState();
  return Object.entries(state.clients).map(([username, client]) => publicClient(username, client));
}

function accountError(code, message) {
  return Object.assign(new Error(message), { code });
}

function findByEmail(state, email) {
  return Object.entries(state.clients).find(([, client]) => client.email === email) ?? null;
}

// Accepts a proxy username or an account email; returns the username or null.
export async function findUsername(identifier) {
  if (typeof identifier !== "string") return null;
  const state = await readState();
  if (identifier.includes("@")) {
    const email = normalizeEmail(identifier);
    const found = email ? findByEmail(state, email) : null;
    return found ? found[0] : null;
  }
  return hasOwn(state.clients, identifier) ? identifier : null;
}

function newProxyUsername(state) {
  for (;;) {
    const username = `px${crypto.randomBytes(5).toString("hex")}`;
    if (!hasOwn(state.clients, username)) return username;
  }
}

function pruneSessions(state, now) {
  for (const [key, session] of Object.entries(state.sessions)) {
    if (session.expiresAt <= now || !hasOwn(state.clients, session.username)) delete state.sessions[key];
  }
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
  return mutate(async (state) => {
    if (findByEmail(state, normalized)) throw accountError("EMAIL_TAKEN", "An account with this email already exists");
    const username = newProxyUsername(state);
    state.clients[username] = {
      ...proxyRecord,
      quotaBytes: 0,
      usedBytes: 0,
      enabled: true,
      createdAt: new Date().toISOString(),
      email: normalized,
      webSalt: webRecord.salt,
      webHash: webRecord.hash,
    };
    await saveSnapshot(state);
    return publicClient(username, state.clients[username]);
  });
}

export async function verifyAccount(email, password) {
  if (typeof password !== "string" || password.length > 256) return null;
  const normalized = normalizeEmail(email);
  const found = normalized ? findByEmail(await readState(), normalized) : null;
  const client = found?.[1];
  // Unknown emails still pay for a hash so response time does not reveal which emails exist.
  const expectedHex = client?.webHash ?? DUMMY_HASH;
  const actual = await hashPassword(password, client?.webSalt ?? DUMMY_SALT);
  const valid = crypto.timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(actual.hash, "hex"));
  if (!valid || !client || client.enabled === false) return null;
  return publicClient(found[0], client);
}

export async function createSession(username) {
  const token = crypto.randomBytes(32).toString("base64url");
  await mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client || client.enabled === false) throw new Error("Unknown client");
    const now = Date.now();
    pruneSessions(state, now);
    const own = Object.entries(state.sessions)
      .filter(([, session]) => session.username === username)
      .sort(([, left], [, right]) => left.expiresAt - right.expiresAt);
    // Signing in on one device too many signs out the oldest session.
    while (own.length >= MAX_SESSIONS_PER_CLIENT) delete state.sessions[own.shift()[0]];
    state.sessions[sessionKey(token)] = { username, expiresAt: now + SESSION_TTL_MS };
    await saveSnapshot(state);
  });
  return { token, maxAgeSeconds: SESSION_TTL_MS / 1000 };
}

export async function getSessionClient(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const state = await readState();
  const key = sessionKey(token);
  const session = hasOwn(state.sessions, key) ? state.sessions[key] : undefined;
  if (!session || session.expiresAt <= Date.now()) return null;
  const client = hasOwn(state.clients, session.username) ? state.clients[session.username] : undefined;
  if (!client || client.enabled === false) return null;
  return publicClient(session.username, client);
}

// Returns the new proxy password once; only its hash is kept, so it cannot be shown again.
export async function regenerateProxyPassword(username) {
  const password = crypto.randomBytes(24).toString("base64url");
  const record = await hashPassword(password);
  await mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client || client.enabled === false) throw new Error("Unknown client");
    client.salt = record.salt;
    client.hash = record.hash;
    await saveSnapshot(state);
  });
  return password;
}

export async function deleteSession(token) {
  if (typeof token !== "string") return;
  const key = sessionKey(token);
  return mutate(async (state) => {
    if (!hasOwn(state.sessions, key)) return;
    delete state.sessions[key];
    await saveSnapshot(state);
  });
}

export async function createPendingPayment(username, packageInfo) {
  if (!validPackageInfo(packageInfo)) throw new Error("Invalid package");
  return mutate(async (state) => {
    const client = hasOwn(state.clients, username) ? state.clients[username] : undefined;
    if (!client || client.enabled === false) throw new Error("Unknown client");
    const now = Date.now();
    for (const [pendingId, pending] of Object.entries(state.pendingPayments)) {
      if (pending.expiresAt <= now) delete state.pendingPayments[pendingId];
    }
    const pending = Object.values(state.pendingPayments);
    if (pending.length >= MAX_PENDING_PAYMENTS
      || pending.filter((payment) => payment.username === username).length >= MAX_PENDING_PAYMENTS_PER_CLIENT) {
      throw new Error("Too many pending purchases");
    }
    const purchaseId = crypto.randomUUID();
    state.pendingPayments[purchaseId] = {
      purchaseId,
      username,
      packageId: packageInfo.id,
      bytes: packageInfo.bytes,
      cents: packageInfo.cents,
      currency: packageInfo.currency.toLowerCase(),
      createdAt: new Date(now).toISOString(),
      expiresAt: now + PENDING_PAYMENT_TTL_MS,
      sessionId: null,
    };
    await saveSnapshot(state);
    return { ...state.pendingPayments[purchaseId] };
  });
}

export async function bindPaymentSession(purchaseId, sessionId) {
  if (!validPurchaseId(purchaseId) || !validPaymentRef(sessionId, "session")) {
    throw new Error("Invalid payment session");
  }
  return mutate(async (state) => {
    const pending = hasOwn(state.pendingPayments, purchaseId) ? state.pendingPayments[purchaseId] : undefined;
    if (!pending || pending.sessionId) throw new Error("Unknown purchase");
    pending.sessionId = sessionId;
    await saveSnapshot(state);
  });
}

export async function cancelPendingPayment(purchaseId) {
  if (!validPurchaseId(purchaseId)) throw new Error("Invalid purchase");
  return mutate(async (state) => {
    if (!hasOwn(state.pendingPayments, purchaseId)) return;
    delete state.pendingPayments[purchaseId];
    await saveSnapshot(state);
  });
}

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
  return mutate(async (state) => {
    if (hasOwn(state.processedPayments, eventId)) return { credited: false, duplicate: true };
    const pending = hasOwn(state.pendingPayments, purchaseId) ? state.pendingPayments[purchaseId] : undefined;
    if (!pending || pending.expiresAt < Date.now()) throw new Error("Unknown or expired purchase");
    if (!pending.sessionId || pending.sessionId !== sessionId) throw new Error("Payment session mismatch");
    if (pending.cents !== amountTotal || pending.currency !== String(currency).toLowerCase()) {
      throw new Error("Payment amount mismatch");
    }
    const client = hasOwn(state.clients, pending.username) ? state.clients[pending.username] : undefined;
    if (!client) throw new Error("Unknown client");
    if (!Number.isSafeInteger(client.quotaBytes + pending.bytes)) throw new Error("Quota is too large");
    client.quotaBytes += pending.bytes;
    state.processedPayments = pruneProcessedPayments(
      state.processedPayments,
      Math.max(0, processedPaymentLimit - 1),
    );
    state.processedPayments[eventId] = {
      eventId,
      purchaseId,
      sessionId,
      username: pending.username,
      packageId: pending.packageId,
      bytes: pending.bytes,
      processedAt: new Date().toISOString(),
    };
    delete state.pendingPayments[purchaseId];
    await saveSnapshot(state);
    return { credited: true, username: pending.username, bytes: pending.bytes };
  });
}
