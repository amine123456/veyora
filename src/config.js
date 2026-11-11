import net from 'node:net';
import path from 'node:path';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function integer(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function boolean(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

function csv(name) {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function ports(name, fallback = '80,443') {
  const values = (process.env[name] ?? fallback).split(',').map((value) => Number(value.trim()));
  if (values.length === 0 || values.some((value) => !Number.isInteger(value) || value < 1 || value > 65535)) {
    throw new Error(`${name} must be a comma-separated list of ports`);
  }
  return new Set(values);
}

function loopback(host) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, '');
  return ['127.0.0.1', '::1', 'localhost'].includes(normalized);
}

function checkoutUrl(name, fallback) {
  const raw = process.env[name]?.trim() || fallback;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${name} must not contain credentials`);
  }
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback(parsed.hostname))) {
    throw new Error(`${name} must use HTTPS unless it targets loopback`);
  }
  return parsed.toString();
}

// The address customers type into their tools. It differs from PROXY_HOST when the
// gateway sits behind a public hostname, so it can be set explicitly.
function proxyEndpoint() {
  let raw = process.env.PUBLIC_PROXY_URL?.trim();
  if (!raw) {
    const host = process.env.PROXY_HOST?.trim() || '127.0.0.1';
    const scheme = process.env.PROXY_TLS_CERT_FILE?.trim() ? 'https' : 'http';
    raw = `${scheme}://${net.isIPv6(host) ? `[${host}]` : host}:${process.env.PROXY_PORT?.trim() || '8080'}`;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('PUBLIC_PROXY_URL must be a valid absolute URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password
      || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('PUBLIC_PROXY_URL must look like https://host:port with no credentials or path');
  }
  const scheme = parsed.protocol.slice(0, -1);
  return Object.freeze({
    scheme,
    host: parsed.hostname,
    port: Number(parsed.port || (scheme === 'https' ? 443 : 80)),
  });
}

// Optional second upstream account for mobile IPs. Same provider format as the
// residential one; host and port default to the residential endpoint.
function mobileUpstream() {
  const username = process.env.UPSTREAM_MOBILE_USERNAME?.trim();
  if (!username) return null;
  return {
    username,
    password: required('UPSTREAM_MOBILE_PASSWORD'),
    host: process.env.UPSTREAM_MOBILE_HOST?.trim() || required('UPSTREAM_PROXY_HOST'),
    port: process.env.UPSTREAM_MOBILE_PORT ? integer('UPSTREAM_MOBILE_PORT', 0, { max: 65535 }) : null,
  };
}

function usdMicros(name, fallback, { min = 0, max = 1000 } = {}) {
  const raw = process.env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a USD amount between ${min} and ${max}`);
  }
  return Math.round(value * 1_000_000);
}

// Prices and upstream costs, all in integer micro-dollars (1 USD = 1,000,000).
export function pricingConfig() {
  const premiumDomains = new Map();
  for (const entry of csv('UNLOCKER_PREMIUM_DOMAINS')) {
    const [domain, multiplierRaw] = entry.split(':');
    const multiplier = Number(multiplierRaw);
    if (!/^[a-z0-9.-]+$/.test(domain ?? '') || !Number.isFinite(multiplier) || multiplier < 1 || multiplier > 20) {
      throw new Error(`Invalid UNLOCKER_PREMIUM_DOMAINS entry: ${entry}`);
    }
    premiumDomains.set(domain, multiplier);
  }
  return {
    residentialPerGbMicros: usdMicros('PRICE_RESIDENTIAL_PER_GB', 1.5, { min: 0.01 }),
    mobilePerGbMicros: usdMicros('PRICE_MOBILE_PER_GB', 2.5, { min: 0.01 }),
    unlockerPerRequestMicros: Math.round(usdMicros('PRICE_UNLOCKER_PER_1K', 0.8, { min: 0.01 }) / 1000),
    costResidentialPerGbMicros: usdMicros('COST_RESIDENTIAL_PER_GB', 0.15),
    costMobilePerGbMicros: usdMicros('COST_MOBILE_PER_GB', 0.29),
    premiumDomains,
  };
}

export function gatewayConfig() {
  const billingMode = process.env.BILLING_MODE ?? 'total';
  if (!['total', 'download'].includes(billingMode)) {
    throw new Error('BILLING_MODE must be total or download');
  }

  const host = process.env.PROXY_HOST?.trim() || '127.0.0.1';
  const tlsCertFile = process.env.PROXY_TLS_CERT_FILE?.trim() || '';
  const tlsKeyFile = process.env.PROXY_TLS_KEY_FILE?.trim() || '';
  if (Boolean(tlsCertFile) !== Boolean(tlsKeyFile)) {
    throw new Error('PROXY_TLS_CERT_FILE and PROXY_TLS_KEY_FILE must be configured together');
  }
  if (!loopback(host) && (!tlsCertFile || !tlsKeyFile)) {
    throw new Error('A public proxy listener requires PROXY_TLS_CERT_FILE and PROXY_TLS_KEY_FILE');
  }

  const allowInsecureUpstream = boolean('ALLOW_INSECURE_UPSTREAM', false);
  return {
    host,
    port: integer('PROXY_PORT', 8080, { max: 65535 }),
    tlsCertFile: tlsCertFile ? path.resolve(tlsCertFile) : '',
    tlsKeyFile: tlsKeyFile ? path.resolve(tlsKeyFile) : '',
    upstreamHost: required('UPSTREAM_PROXY_HOST'),
    upstreamPort: integer('UPSTREAM_PROXY_PORT', allowInsecureUpstream ? 8080 : 443, { max: 65535 }),
    upstreamUsername: required('UPSTREAM_PROXY_USERNAME'),
    upstreamPassword: required('UPSTREAM_PROXY_PASSWORD'),
    upstreamTls: !allowInsecureUpstream,
    upstreamMobile: mobileUpstream(),
    upstreamSessionTtlSeconds: integer('UPSTREAM_SESSION_TTL_SECONDS', 600, { min: 60, max: 86_400 }),
    billingMode,
    destinationAllowlist: csv('DESTINATION_ALLOWLIST'),
    destinationPorts: ports('DESTINATION_PORTS'),
    requestTimeoutMs: integer('PROXY_REQUEST_TIMEOUT_MS', 30_000, { max: 300_000 }),
    idleTimeoutMs: integer('PROXY_IDLE_TIMEOUT_MS', 60_000, { max: 600_000 }),
    maxTunnelLifetimeMs: integer('PROXY_MAX_TUNNEL_LIFETIME_MS', 3_600_000, { max: 86_400_000 }),
    connectHandshakeMaxBytes: integer('CONNECT_HANDSHAKE_MAX_BYTES', 64 * 1024, { max: 1024 * 1024 }),
    maxConnectionsPerClient: integer('MAX_CONNECTIONS_PER_CLIENT', 10, { max: 1000 }),
    maxConnectionsGlobal: integer('MAX_CONNECTIONS_GLOBAL', 200, { max: 100_000 }),
    authAttemptsPerMinute: integer('AUTH_ATTEMPTS_PER_MINUTE', 60, { max: 100_000 }),
    maxConcurrentAuth: integer('MAX_CONCURRENT_AUTH', 16, { max: 256 }),
    dnsTimeoutMs: integer('DNS_TIMEOUT_MS', 3_000, { max: 30_000 }),
    quotaReservationBytes: integer('QUOTA_RESERVATION_BYTES', 1024 * 1024, { max: 64 * 1024 * 1024 }),
  };
}

// Ticket resale, sneaker launches and the upstream provider itself are refused by
// default (see the acceptable-use policy). UNLOCKER_BLOCKED_DOMAINS adds more.
const DEFAULT_UNLOCKER_BLOCKLIST = [
  'ticketmaster.com', 'livenation.com', 'axs.com', 'seatgeek.com', 'stubhub.com',
  'viagogo.com', 'vividseats.com', 'tickets.com', 'nike.com', 'snkrs.com',
  'footlocker.com', 'proxi.st',
];

export function unlockerConfig() {
  const blocked = new Set([...DEFAULT_UNLOCKER_BLOCKLIST, ...csv('UNLOCKER_BLOCKED_DOMAINS')]);
  for (const domain of blocked) {
    if (!/^[a-z0-9.-]+$/.test(domain)) throw new Error(`Invalid UNLOCKER_BLOCKED_DOMAINS entry: ${domain}`);
  }
  const maxResponseBytes = integer('UNLOCKER_MAX_RESPONSE_BYTES', 5 * 1024 * 1024, { min: 64 * 1024, max: 50 * 1024 * 1024 });
  // Response bodies the unlocker may hold at once; each request books twice the cap.
  const memoryBudgetBytes = integer('UNLOCKER_MEMORY_BUDGET_BYTES', 256 * 1024 * 1024, { min: 16 * 1024 * 1024, max: 64 * 1024 ** 3 });
  if (memoryBudgetBytes < 2 * maxResponseBytes) {
    throw new Error('UNLOCKER_MEMORY_BUDGET_BYTES must be at least twice UNLOCKER_MAX_RESPONSE_BYTES');
  }
  return {
    enabled: boolean('UNLOCKER_ENABLED', true),
    browserEnabled: boolean('UNLOCKER_BROWSER_ENABLED', true),
    browserMaxConcurrent: integer('UNLOCKER_BROWSER_MAX_CONCURRENT', 2, { max: 10 }),
    browserTimeoutMs: integer('UNLOCKER_BROWSER_TIMEOUT_MS', 45_000, { min: 5_000, max: 120_000 }),
    maxAttempts: integer('UNLOCKER_MAX_ATTEMPTS', 8, { max: 16 }),
    attemptTimeoutMs: integer('UNLOCKER_ATTEMPT_TIMEOUT_MS', 30_000, { min: 1_000, max: 120_000 }),
    totalTimeoutMs: integer('UNLOCKER_TOTAL_TIMEOUT_MS', 120_000, { min: 1_000, max: 300_000 }),
    maxResponseBytes,
    minBodyBytes: integer('UNLOCKER_MIN_BODY_BYTES', 512, { min: 0, max: 64 * 1024 }),
    requestsPerMinutePerKey: integer('UNLOCKER_REQUESTS_PER_MINUTE', 300, { max: 100_000 }),
    maxConcurrentPerAccount: integer('UNLOCKER_MAX_CONCURRENT_PER_ACCOUNT', 10, { max: 1_000 }),
    maxConcurrent: integer('UNLOCKER_MAX_CONCURRENT', 30, { max: 10_000 }),
    memoryBudgetBytes,
    flagMinRequests: integer('UNLOCKER_FLAG_MIN_REQUESTS', 20, { max: 1_000_000 }),
    blockedDomains: blocked,
    ledgerMaxBytes: integer('UNLOCKER_LEDGER_MAX_BYTES', 50 * 1024 * 1024, { min: 64 * 1024, max: 1024 * 1024 * 1024 }),
    ledgerKeep: integer('UNLOCKER_LEDGER_KEEP', 30, { max: 3650 }),
    ledgerFile: path.resolve(process.env.UNLOCKER_LEDGER_FILE?.trim() || path.join(path.dirname(dataFile()), 'unlocker-ledger.jsonl')),
  };
}

export function adminConfig() {
  const token = process.env.ADMIN_TOKEN?.trim() || '';
  if (token && token.length < 32) throw new Error('ADMIN_TOKEN must be at least 32 characters');
  return { token, port: integer('ADMIN_PORT', 3101, { max: 65535 }) };
}

export function dataFile() {
  return path.resolve(process.env.DATA_FILE ?? './data/store.json');
}

export function processedPaymentHistoryLimit() {
  return integer('PROCESSED_PAYMENT_HISTORY_LIMIT', 10_000, { max: 1_000_000 });
}

export function paymentConfig() {
  const host = process.env.PAYMENTS_HOST?.trim() || '127.0.0.1';
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';
  if (!loopback(host)) {
    throw new Error('PAYMENTS_HOST must be loopback; expose it through a TLS reverse proxy');
  }
  if (Boolean(stripeKey) !== Boolean(webhookSecret)) {
    throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be configured together');
  }
  const nowpaymentsApiKey = process.env.NOWPAYMENTS_API_KEY?.trim() || '';
  const nowpaymentsIpnSecret = process.env.NOWPAYMENTS_IPN_SECRET?.trim() || '';
  if (Boolean(nowpaymentsApiKey) !== Boolean(nowpaymentsIpnSecret)) {
    throw new Error('NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET must be configured together');
  }
  const payCurrency = (process.env.NOWPAYMENTS_PAY_CURRENCY?.trim() || 'usdtbsc').toLowerCase();
  if (!/^[a-z0-9]{2,20}$/.test(payCurrency)) throw new Error('NOWPAYMENTS_PAY_CURRENCY is not a valid currency code');
  return {
    host,
    port: integer('PAYMENTS_PORT', 3000, { max: 65535 }),
    stripeKey,
    webhookSecret,
    successUrl: checkoutUrl('CHECKOUT_SUCCESS_URL', 'http://localhost:3000/success'),
    cancelUrl: checkoutUrl('CHECKOUT_CANCEL_URL', 'http://localhost:3000/cancel'),
    authAttemptsPerMinute: integer('PAYMENT_AUTH_ATTEMPTS_PER_MINUTE', 120, { max: 100_000 }),
    maxConcurrentAuth: integer('PAYMENT_MAX_CONCURRENT_AUTH', 8, { max: 128 }),
    requestTimeoutMs: integer('PAYMENT_REQUEST_TIMEOUT_MS', 15_000, { max: 120_000 }),
    stripeTimeoutMs: integer('STRIPE_TIMEOUT_MS', 10_000, { max: 120_000 }),
    nowpayments: nowpaymentsApiKey ? {
      apiKey: nowpaymentsApiKey,
      ipnSecret: nowpaymentsIpnSecret,
      // The sandbox takes fake payments, for testing the whole flow end to end.
      sandbox: boolean('NOWPAYMENTS_SANDBOX', false),
      payCurrency,
    } : null,
    maxBodyBytes: integer('PAYMENT_MAX_BODY_BYTES', 1024 * 1024, { max: 10 * 1024 * 1024 }),
      supportFile: path.resolve(process.env.SUPPORT_FILE ?? './data/support-requests.jsonl'),
    proxyEndpoint: proxyEndpoint(),
    stickySessionSeconds: integer('UPSTREAM_SESSION_TTL_SECONDS', 600, { min: 60, max: 86_400 }),
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY?.trim() || '',
    turnstileSecret: process.env.TURNSTILE_SECRET?.trim() || '',
    resendApiKey: process.env.RESEND_API_KEY?.trim() || '',
    verificationFromEmail: process.env.VERIFICATION_FROM_EMAIL?.trim() || 'Veyora <noreply@veyora.pro>',
  };
}

// USD wallet top-ups: id:cents[:bonusPercent]. usd100:10000:5 charges $100 and credits $105.
export function topups() {
  const raw = process.env.TOPUPS ?? 'usd10:1000,usd25:2500,usd50:5000,usd100:10000:5,usd500:50000:10';
  const configured = new Map();
  for (const rawEntry of raw.split(',')) {
    const entry = rawEntry.trim();
    const [id, centsRaw, bonusRaw = '0', extra] = entry.split(':').map((value) => value.trim());
    const cents = Number(centsRaw);
    const bonusPercent = Number(bonusRaw);
    if (extra !== undefined
        || !/^[a-zA-Z0-9_-]{1,40}$/.test(id ?? '')
        || !Number.isSafeInteger(cents) || cents < 100
        || !Number.isFinite(bonusPercent) || bonusPercent < 0 || bonusPercent > 50) {
      throw new Error(`Invalid top-up definition: ${entry}`);
    }
    if (configured.has(id)) throw new Error(`Duplicate top-up id: ${id}`);
    const micros = Math.round((cents * 10_000 * (100 + bonusPercent)) / 100);
    configured.set(id, Object.freeze({ id, cents, currency: 'usd', bonusPercent, micros, bytes: 0 }));
  }
  return configured;
}

export function packages() {
  const raw = process.env.PACKAGES ?? 'gb1:1073741824:200';
  const configured = new Map();
  for (const rawEntry of raw.split(',')) {
    const entry = rawEntry.trim();
    const [id, bytesRaw, centsRaw, currencyRaw = 'usd', extra] = entry.split(':').map((value) => value.trim());
    const bytes = Number(bytesRaw);
    const cents = Number(centsRaw);
    const currency = currencyRaw.toLowerCase();
    if (extra !== undefined
        || !/^[a-zA-Z0-9_-]{1,40}$/.test(id ?? '')
        || !Number.isSafeInteger(bytes) || bytes < 1
        || !Number.isSafeInteger(cents) || cents < 50
        || !/^[a-z]{3}$/.test(currency)) {
      throw new Error(`Invalid package definition: ${entry}`);
    }
    if (configured.has(id)) throw new Error(`Duplicate package id: ${id}`);
    configured.set(id, Object.freeze({ id, bytes, cents, currency }));
  }
  return configured;
}
