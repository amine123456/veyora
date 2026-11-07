import crypto from "node:crypto";
import { authenticate, authenticateCached } from "./store.js";

// Customers add routing options to their username: USER, USER-country-gr,
// USER-session-abc123 or USER-country-gr-session-abc123.
const ROUTED_USERNAME = /^([A-Za-z0-9._-]{3,64}?)(?:-country-([A-Za-z]{2}))?(?:-session-([A-Za-z0-9]{1,32}))?$/;

export function parseRoutedUsername(raw) {
  const match = typeof raw === "string" ? ROUTED_USERNAME.exec(raw) : null;
  if (!match) return null;
  return { username: match[1], country: match[2]?.toUpperCase() ?? null, session: match[3] ?? null };
}

export function decodeCredentials(header) {
  if (typeof header !== "string" || header.length > 1_024) return null;
  const match = /^Basic\s+([A-Za-z0-9+/]+={0,2})$/i.exec(header);
  if (!match) return null;
  try {
    const encoded = match[1];
    const bytes = Buffer.from(encoded, "base64");
    const canonical = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    if (bytes.toString("base64") !== canonical) return null;
    const decoded = bytes.toString("utf8");
    if (!Buffer.from(decoded, "utf8").equals(bytes)) return null;
    const separator = decoded.indexOf(":");
    if (separator < 1) return null;
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (!/^[A-Za-z0-9._-]{3,128}$/.test(username)) return null;
    if (password.length < 16 || password.length > 256) return null;
    return { username, password };
  } catch {
    return null;
  }
}

// Returned instead of null when every password-verification slot is taken. The
// credentials were never checked, so callers must not count it as a failed login.
export const AUTH_BUSY = Object.freeze({ busy: true });

// The concurrency limit guards the expensive scrypt check only. Credentials that
// verified recently are answered from the cache without taking a slot, so a burst of
// requests from a paying customer is never turned away as "busy".
export function createClientAuthParser(
  maxConcurrent = 16,
  authenticateClient = authenticate,
  cachedAuthenticate = authenticateClient === authenticate ? authenticateCached : null,
) {
  if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error("maxConcurrent must be a positive safe integer");
  }
  if (typeof authenticateClient !== "function") {
    throw new Error("authenticateClient must be a function");
  }
  let active = 0;

  return async function parseClientAuth(header) {
    const credentials = decodeCredentials(header);
    if (!credentials) return null;
    const routed = parseRoutedUsername(credentials.username);
    if (!routed) return null;
    const withRouting = (client) => ({ ...client, routing: { country: routed.country, session: routed.session } });
    if (cachedAuthenticate) {
      const cached = await cachedAuthenticate(routed.username, credentials.password).catch(() => null);
      if (cached) return withRouting(cached);
    }
    if (active >= maxConcurrent) return AUTH_BUSY;
    active += 1;
    try {
      const client = await authenticateClient(routed.username, credentials.password);
      return client ? withRouting(client) : null;
    } catch {
      return null;
    } finally {
      active -= 1;
    }
  };
}

export const parseClientAuth = createClientAuthParser();

// Builds the provider login for one request. The format follows the upstream provider:
// BASE-cc-GR picks a country, BASE-sid-ID-ttl-SECONDS keeps the same IP for a while.
// Session IDs are hashed with the customer username so two customers who pick the
// same session name never share an exit IP.
export function upstreamAuthorization(config, { username = "", country = null, session = null } = {}) {
  let login = config.upstreamUsername;
  if (country) login += `-cc-${country}`;
  if (session) {
    const sid = crypto.createHash("sha256").update(`${username}:${session}`).digest("hex").slice(0, 16);
    login += `-sid-${sid}-ttl-${config.upstreamSessionTtlSeconds ?? 600}`;
  }
  return `Basic ${Buffer.from(`${login}:${config.upstreamPassword}`).toString("base64")}`;
}
