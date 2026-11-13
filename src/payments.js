import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTH_BUSY, createClientAuthParser } from './auth.js';
import { packages, topups } from './config.js';
import { createInvoice, finishedPayment, validIpnSignature } from './nowpayments.js';
import {
  bindPaymentSession,
  cancelPendingPayment,
  completePayment,
  confirmEmail,
  createAccount,
  createApiKey,
  createPendingPayment,
  createSession,
  createVerificationToken,
  deleteSession,
  getPaymentHistory,
  getSessionClient,
  getUsageEvents,
  getUsageSummary,
  listApiKeys,
  regenerateProxyPassword,
  revokeApiKey,
  verifyAccount,
} from './store.js';
import { createMailer } from './resend.js';

const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const html = 'text/html; charset=utf-8';
// session: 'required' redirects guests to /login; 'guest' sends signed-in users to /account.
const publicFiles = new Map([
  ['/', { file: 'index.html', type: html }],
  ['/styles.css', { file: 'styles.css', type: 'text/css; charset=utf-8' }],
  ['/app.js', { file: 'app.js', type: 'text/javascript; charset=utf-8' }],
  ['/login', { file: 'login.html', type: html, session: 'guest' }],
  ['/signup', { file: 'signup.html', type: html, session: 'guest' }],
  ['/account', { file: 'account.html', type: html, session: 'required' }],
  ['/auth.css', { file: 'auth.css', type: 'text/css; charset=utf-8' }],
  ['/dashboard.css', { file: 'dashboard.css', type: 'text/css; charset=utf-8' }],
  ['/auth.js', { file: 'auth.js', type: 'text/javascript; charset=utf-8' }],
  ['/trust.css', { file: 'trust.css', type: 'text/css; charset=utf-8' }],
  ['/support.js', { file: 'support.js', type: 'text/javascript; charset=utf-8' }],
  ['/about', { file: 'about.html', type: html }],
  ['/support', { file: 'support.html', type: html }],
  ['/privacy', { file: 'privacy.html', type: html }],
  ['/terms', { file: 'terms.html', type: html }],
  ['/acceptable-use', { file: 'acceptable-use.html', type: html }],
  ['/refund-policy', { file: 'refund-policy.html', type: html }],
  ['/favicon.svg', { file: 'favicon.svg', type: 'image/svg+xml' }],
  ['/favicon.ico', { file: 'favicon.svg', type: 'image/svg+xml' }],
  ['/docs', { file: 'docs.html', type: html }],
  ['/verify-email', { file: 'verify-email.html', type: html }],
  ['/verify-email.js', { file: 'verify-email.js', type: 'text/javascript; charset=utf-8' }],
  ['/nav.js', { file: 'nav.js', type: 'text/javascript; charset=utf-8' }],
  ['/docs.css', { file: 'docs.css', type: 'text/css; charset=utf-8' }],
]);

// Inline scripts are blocked. A page built by Next.js carries a few inline bootstrap
// scripts, so that page's policy also lists their exact hashes (from csp-hashes.json).
function contentSecurityPolicy(scriptHashes = []) {
  const hashes = scriptHashes.map((hash) => ` '${hash}'`).join('');
  return `default-src 'none'; style-src 'self' https://fonts.googleapis.com; style-src-elem 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src https://fonts.gstatic.com; script-src 'self'${hashes} https://challenges.cloudflare.com; img-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
}

// The site is the static pages in public/, or a Next.js export (web/out) when SITE_DIR is set.
function loadSite(directory) {
  if (!directory) return { directory: publicDirectory, scriptHashes: {}, exported: false };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(directory, 'csp-hashes.json'), 'utf8'));
  } catch {
    throw new Error(`SITE_DIR has no csp-hashes.json: build the site first (npm --prefix web run build)`);
  }
  for (const [page, hashes] of Object.entries(manifest)) {
    if (!Array.isArray(hashes) || hashes.some((hash) => !/^sha256-[A-Za-z0-9+/]{43}=$/.test(hash))) {
      throw new Error(`Invalid script hashes for ${page} in csp-hashes.json`);
    }
  }
  return { directory, scriptHashes: manifest, exported: true };
}

async function staticFile(response, site, asset, headOnly = false) {
  const body = await readFile(path.join(site.directory, asset.file));
  response.writeHead(200, {
    'Content-Type': asset.type,
    'Content-Length': body.length,
    // Assets are not fingerprinted, so a long max-age would keep serving stale
    // app.js/styles.css after a deploy.
    'Cache-Control': 'no-cache',
    'Content-Security-Policy': contentSecurityPolicy(site.scriptHashes[asset.file]),
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  response.end(headOnly ? undefined : body);
}

const NEXT_ASSET_TYPES = new Map([
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.woff2', 'font/woff2'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
]);

// Next.js build output under /_next/static/. File names contain a content hash, so they
// are cached forever. Only plain path segments are accepted: no dots-only segments, no
// encoded characters, nothing that could leave the static directory.
async function nextAsset(response, site, pathname, headOnly) {
  const relative = pathname.slice('/_next/static/'.length);
  const type = NEXT_ASSET_TYPES.get(path.posix.extname(relative));
  const safe = /^[A-Za-z0-9_~-][A-Za-z0-9._~-]*(\/[A-Za-z0-9_~-][A-Za-z0-9._~-]*)*$/.test(relative) && !relative.includes('..');
  if (!type || !safe) return json(response, 404, { error: 'Not found' });
  let body;
  try {
    body = await readFile(path.join(site.directory, '_next', 'static', ...relative.split('/')));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return json(response, 404, { error: 'Not found' });
    throw error;
  }
  response.writeHead(200, {
    'Content-Type': type,
    'Content-Length': body.length,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(headOnly ? undefined : body);
}

class PublicError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(response, status, value) {
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) {
    response.end();
    return;
  }
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

async function verifyTurnstile(secret, token, remoteip, fetchImpl) {
  try {
    const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}&remoteip=${encodeURIComponent(remoteip)}`,
    });
    const result = await response.json();
    return result.success === true;
  } catch {
    return false;
  }
}

function authLimiter(maxPerMinute) {
  const attempts = new Map();
  const windowMs = 60_000;
  const maxTrackedAddresses = 10_000;
  const keyFor = (address) => address ?? 'unknown';
  const cleanup = (now) => {
    for (const [key, value] of attempts) {
      if (now - value.startedAt >= windowMs) attempts.delete(key);
    }
  };
  const canTrack = (key, now) => {
    if (attempts.has(key)) return true;
    if (attempts.size >= maxTrackedAddresses) cleanup(now);
    return attempts.size < maxTrackedAddresses;
  };
  return {
    allowed(address) {
      const now = Date.now();
      const key = keyFor(address);
      const bucket = attempts.get(key);
      if (!bucket || now - bucket.startedAt >= windowMs) {
        return canTrack(key, now);
      }
      return bucket.failures < maxPerMinute;
    },
    fail(address) {
      const now = Date.now();
      const key = keyFor(address);
      const bucket = attempts.get(key);
      if (!bucket || now - bucket.startedAt >= windowMs) {
        if (!canTrack(key, now)) return;
        attempts.set(key, { startedAt: now, failures: 1 });
      } else {
        bucket.failures += 1;
      }
    },
  };
}

async function readBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new PublicError(413, 'Request body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function stripeSignatures(header) {
  if (typeof header !== 'string') return { timestamp: null, signatures: [] };
  const values = new Map();
  for (const part of header.split(',')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    const current = values.get(key) ?? [];
    current.push(value);
    values.set(key, current);
  }
  return {
    timestamp: values.get('t')?.[0] ?? null,
    signatures: values.get('v1') ?? [],
  };
}

function validStripeSignature(payload, header, secret) {
  if (!secret) return false;
  const { timestamp, signatures } = stripeSignatures(header);
  if (!/^\d{1,16}$/.test(timestamp ?? '')) return false;
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > 300) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), payload]))
    .digest();
  return signatures.some((signature) => {
    if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
    const supplied = Buffer.from(signature, 'hex');
    return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
  });
}

function validStripeIdentifier(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(prefix)
    && value.length > prefix.length
    && value.length <= 255
    && /^[A-Za-z0-9_]+$/.test(value);
}

async function createStripeCheckout(config, form, purchaseId, fetchImpl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.stripeTimeoutMs);
  timeout.unref?.();
  try {
    const stripeResponse = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `checkout-${purchaseId}`,
      },
      body: form,
      signal: controller.signal,
      redirect: 'error',
    });
    const session = await stripeResponse.json().catch(() => null);
    if (!stripeResponse.ok
      || !validStripeIdentifier(session?.id, 'cs_')
      || typeof session?.url !== 'string'
      || !session.url.startsWith('https://checkout.stripe.com/')) {
      throw new PublicError(502, 'Payment provider unavailable');
    }
    return session;
  } catch (error) {
    if (error instanceof PublicError) throw error;
    throw new PublicError(502, 'Payment provider unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(payload) {
  try {
    return JSON.parse(payload.toString('utf8'));
  } catch {
    throw new PublicError(400, 'Invalid JSON');
  }
}

const SESSION_COOKIE = '__Host-proxora_session';
const SIGNUPS_PER_MINUTE = 5;

function sessionToken(request) {
  for (const part of String(request.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === SESSION_COOKIE) return part.slice(separator + 1).trim();
  }
  return null;
}

function sessionCookie(token, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

// Browsers attach Origin to cross-site POSTs; a mismatch means another site is submitting.
function assertSameOrigin(request) {
  const origin = request.headers.origin;
  if (origin === undefined) return;
  let host = null;
  try { host = new URL(origin).host; } catch { /* malformed Origin is treated as foreign */ }
  if (host !== request.headers.host) throw new PublicError(403, 'Cross-site request blocked');
}

// PAYMENTS_HOST must be loopback, so in production every connection comes from the
// nginx reverse proxy and the socket address is always 127.0.0.1. Rate limits keyed on
// it would be shared by every visitor. Trust the forwarded client address only from a
// loopback peer: X-Real-IP if nginx sets it, else the last X-Forwarded-For entry, which
// is the one nginx appended (earlier entries come from the client and can be forged).
const LOOPBACK_PEERS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function clientAddress(request) {
  const peer = request.socket.remoteAddress ?? 'unknown';
  if (!LOOPBACK_PEERS.has(peer)) return peer;
  const realIp = String(request.headers['x-real-ip'] ?? '').trim();
  if (net.isIP(realIp)) return realIp;
  const forwarded = String(request.headers['x-forwarded-for'] ?? '').split(',').pop().trim();
  return net.isIP(forwarded) ? forwarded : peer;
}

function concurrencyLimit(max) {
  let active = 0;
  return async (work) => {
    if (active >= max) throw new PublicError(503, 'Server busy, try again');
    active += 1;
    try {
      return await work();
    } finally {
      active -= 1;
    }
  };
}

function accountView(client, proxyEndpoint, stickySessionSeconds, offer = {}) {
  return {
    email: client.email,
    username: client.username,
    quotaBytes: client.quotaBytes,
    usedBytes: client.usedBytes,
    remainingBytes: client.remainingBytes,
    balanceMicros: client.balanceMicros ?? 0,
    proxy: proxyEndpoint ?? null,
    stickySessionSeconds: stickySessionSeconds ?? 600,
    prices: offer.prices ?? null,
    mobile: Boolean(offer.mobile),
    unlocker: Boolean(offer.unlocker),
  };
}

function redirect(response, location) {
  response.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
  response.end();
}

export function createPaymentServer(config, { fetchImpl = globalThis.fetch, unlocker = null, pricing = null, mobile = false } = {}) {
  // What the dashboard shows: list prices in micro-dollars and which products are on.
  const offer = {
    prices: pricing ? {
      residentialPerGbMicros: pricing.residentialPerGbMicros,
      mobilePerGbMicros: pricing.mobilePerGbMicros,
      unlockerPerRequestMicros: pricing.unlockerPerRequestMicros,
    } : null,
    mobile,
    unlocker: Boolean(unlocker),
  };
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  const site = loadSite(config.siteDirectory);
  // At most one link a minute per account; a failed send is logged, never shown to the visitor.
  async function sendVerification(client) {
    try {
      const token = await createVerificationToken(client.username, { cooldownMs: 60_000 });
      if (token) await mailer.verificationEmail(client.email, token);
    } catch (error) {
      console.error(`Verification email to ${client.username} failed: ${error.message}`);
    }
  }
  const mailer = createMailer({
    apiKey: config.resendApiKey,
    fromAddress: config.verificationFromEmail,
    baseUrl: config.siteUrl || (config.proxyEndpoint ? `https://${config.proxyEndpoint.host}` : ''),
    fetchImpl,
  });
  const availablePackages = packages();
  // Crypto checkout sells USD wallet top-ups; the optional Stripe path keeps GB packs.
  const availableTopups = topups();
  const authAttempts = authLimiter(config.authAttemptsPerMinute);
  const parseClientAuth = createClientAuthParser(config.maxConcurrentAuth);
  const accountAttempts = authLimiter(config.authAttemptsPerMinute);
  const signupAttempts = authLimiter(SIGNUPS_PER_MINUTE);
  const supportAttempts = authLimiter(5);
  const hashing = concurrencyLimit(config.maxConcurrentAuth);
  const server = http.createServer(async (request, response) => {
    try {
      // The unlocker API lives under /v1/ on the same host; it authenticates by API key.
      if (unlocker && request.url.startsWith('/v1/')) return await unlocker.handle(request, response, clientAddress(request));

      // Pages are looked up by path alone, so /account?paid=1 and /?utm_source=x still resolve.
      const { pathname } = new URL(request.url, 'http://local');
      const asset = publicFiles.get(pathname);
      if ((request.method === 'GET' || request.method === 'HEAD') && site.exported && pathname.startsWith('/_next/static/')) {
        return await nextAsset(response, site, pathname, request.method === 'HEAD');
      }
      if ((request.method === 'GET' || request.method === 'HEAD') && asset) {
        if (asset.session) {
          const signedIn = Boolean(await getSessionClient(sessionToken(request)));
          if (asset.session === 'required' && !signedIn) return redirect(response, '/login');
          if (asset.session === 'guest' && signedIn) return redirect(response, '/account');
        }
        return await staticFile(response, site, asset, request.method === 'HEAD');
      }

      if (request.method === 'GET' && request.url === '/api/captcha') {
        return json(response, 200, { siteKey: config.turnstileSiteKey || null });
      }

      if (request.method === 'POST' && request.url === '/api/verify-email') {
        assertSameOrigin(request);
        const input = parseJson(await readBody(request, config.maxBodyBytes));
        const token = input?.token;
        if (!token || typeof token !== 'string') return json(response, 400, { error: 'Missing token' });
        const client = await confirmEmail(token);
        if (!client) return json(response, 400, { error: 'Invalid or expired verification link. Request a new one.' });
        const session = await createSession(client.username);
        response.setHeader('Set-Cookie', sessionCookie(session.token, session.maxAgeSeconds));
        return json(response, 200, { verified: true });
      }

      if (request.method === 'POST' && request.url === '/api/resend-verification') {
        assertSameOrigin(request);
        const key = clientAddress(request);
        if (!signupAttempts.allowed(key)) return json(response, 429, { error: 'Too many attempts. Wait a minute and try again.' });
        signupAttempts.fail(key);
        const input = parseJson(await readBody(request, config.maxBodyBytes));
        const email = input?.email;
        if (!email || typeof email !== 'string') return json(response, 400, { error: 'Missing email' });
        const client = await hashing(() => verifyAccount(email, input?.password));
        if (!client) return json(response, 401, { error: 'Wrong email or password' });
        if (client.emailVerified) return json(response, 200, { sent: false, alreadyVerified: true });
        if (!mailer) return json(response, 200, { sent: false });
        const token = await createVerificationToken(client.username);
        await mailer.verificationEmail(client.email, token);
        return json(response, 200, { sent: true });
      }

      if (request.method === 'POST' && request.url === '/api/support') {
        assertSameOrigin(request);
        if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
          throw new PublicError(415, 'Content-Type must be application/json');
        }
        const key = clientAddress(request);
        if (!supportAttempts.allowed(key)) return json(response, 429, { error: 'Too many requests. Wait a minute and try again.' });
        supportAttempts.fail(key);
        const input = parseJson(await readBody(request, config.maxBodyBytes));
        const name = String(input?.name ?? '').trim();
        const email = String(input?.email ?? '').trim().toLowerCase();
        const topic = String(input?.topic ?? 'general');
        const message = String(input?.message ?? '').trim();
        const topics = new Set(['general', 'account', 'billing', 'technical', 'abuse']);
        if (name.length > 80) throw new PublicError(400, 'Name is too long');
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PublicError(400, 'Enter a valid email address');
        if (!topics.has(topic)) throw new PublicError(400, 'Choose a valid topic');
        if (message.length < 20 || message.length > 4000) throw new PublicError(400, 'Message must be between 20 and 4000 characters');
        const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), name, email, topic, message };
        const supportFile = path.resolve(config.supportFile ?? './data/support-requests.jsonl');
        await mkdir(path.dirname(supportFile), { recursive: true });
        await appendFile(supportFile, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
        return json(response, 201, { ok: true, id: record.id });
      }

      if (request.method === 'POST' && ['/api/signup', '/api/login', '/api/logout', '/api/proxy-password'].includes(request.url)) {
        assertSameOrigin(request);
        if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
          throw new PublicError(415, 'Content-Type must be application/json');
        }
        if (request.url === '/api/logout') {
          await deleteSession(sessionToken(request));
          response.setHeader('Set-Cookie', sessionCookie('', 0));
          return json(response, 200, { ok: true });
        }
        if (request.url === '/api/proxy-password') {
          const client = await getSessionClient(sessionToken(request));
          if (!client) return json(response, 401, { error: 'Not signed in' });
          const password = await hashing(() => regenerateProxyPassword(client.username));
          return json(response, 200, { password });
        }

        const signup = request.url === '/api/signup';
        const limiter = signup ? signupAttempts : accountAttempts;
        const key = clientAddress(request);
        if (!limiter.allowed(key)) return json(response, 429, { error: 'Too many attempts. Wait a minute and try again.' });
        const input = parseJson(await readBody(request, config.maxBodyBytes));
        let client;
        if (signup) {
          limiter.fail(key); // every signup counts toward the per-minute cap, not only failed ones
          if (config.turnstileSecret) {
            const token = input?.turnstileToken;
            if (!token || typeof token !== 'string') throw new PublicError(400, 'Complete the verification challenge');
            const verified = await verifyTurnstile(config.turnstileSecret, token, clientAddress(request), fetchImpl);
            if (!verified) throw new PublicError(403, 'Verification failed. Reload the page and try again.');
          }
          try {
            client = await hashing(() => createAccount(input?.email, input?.password));
          } catch (error) {
            if (error.code) throw new PublicError(error.code === 'EMAIL_TAKEN' ? 409 : 400, error.message);
            throw error;
          }
          if (mailer && client.email) {
            await sendVerification(client);
            return json(response, 201, { needsVerification: true, email: client.email });
          }
        } else {
          client = await hashing(() => verifyAccount(input?.email, input?.password));
          if (!client) {
            limiter.fail(key);
            return json(response, 401, { error: 'Wrong email or password' });
          }
          if (mailer && !client.emailVerified) {
            // Accounts made before verification existed never got a link: send one now.
            await sendVerification(client);
            return json(response, 403, { error: 'Please verify your email before signing in. Check your inbox.', needsVerification: true, email: client.email });
          }
        }
        const session = await createSession(client.username);
        response.setHeader('Set-Cookie', sessionCookie(session.token, session.maxAgeSeconds));
        return json(response, signup ? 201 : 200, accountView(client, config.proxyEndpoint, config.stickySessionSeconds, offer));
      }

      if (request.method === 'GET' && request.url === '/api/me') {
        const client = await getSessionClient(sessionToken(request));
        if (!client) return json(response, 401, { error: 'Not signed in' });
        return json(response, 200, accountView(client, config.proxyEndpoint, config.stickySessionSeconds, offer));
      }

      if (request.url === '/api/keys' || request.url === '/api/keys/revoke') {
        const post = request.method === 'POST';
        if (!post && !(request.method === 'GET' && request.url === '/api/keys')) {
          return json(response, 405, { error: 'Method not allowed' });
        }
        if (post) {
          assertSameOrigin(request);
          if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
            throw new PublicError(415, 'Content-Type must be application/json');
          }
        }
        const client = await getSessionClient(sessionToken(request));
        if (!client) return json(response, 401, { error: 'Not signed in' });
        if (!post) return json(response, 200, { keys: await listApiKeys(client.username) });
        const input = parseJson(await readBody(request, config.maxBodyBytes));
        if (request.url === '/api/keys/revoke') {
          if (!(await revokeApiKey(client.username, input?.id))) return json(response, 404, { error: 'Unknown API key' });
          return json(response, 200, { ok: true });
        }
        try {
          return json(response, 201, await createApiKey(client.username, input?.name));
        } catch (error) {
          if (error.code) throw new PublicError(error.code === 'TOO_MANY_KEYS' ? 409 : 400, error.message);
          throw error;
        }
      }

      if (request.method === 'GET' && request.url.startsWith('/api/usage')) {
        const client = await getSessionClient(sessionToken(request));
        if (!client) return json(response, 401, { error: 'Not signed in' });
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname === '/api/usage/events') {
          const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
          const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 20));
          const events = await getUsageEvents(client.username, { limit, offset: (page - 1) * limit });
          return json(response, 200, { events, page, limit });
        }
        if (url.pathname === '/api/usage/summary') {
          const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days')) || 30));
          const summary = await getUsageSummary(client.username, days);
          return json(response, 200, { summary, days });
        }
        return json(response, 404, { error: 'Not found' });
      }

      if (request.method === 'GET' && request.url.startsWith('/api/payments')) {
        const client = await getSessionClient(sessionToken(request));
        if (!client) return json(response, 401, { error: 'Not signed in' });
        const url = new URL(request.url, 'http://localhost');
        const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit')) || 20));
        const payments = await getPaymentHistory(client.username, { limit, offset: (page - 1) * limit });
        return json(response, 200, { payments, page, limit });
      }

      if (request.method === 'POST' && request.url === '/api/checkout') {
        assertSameOrigin(request);
        if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
          throw new PublicError(415, 'Content-Type must be application/json');
        }
        const client = await getSessionClient(sessionToken(request));
        if (!client) return json(response, 401, { error: 'Not signed in' });
        if (!config.nowpayments) return json(response, 503, { error: 'Online payment is not set up yet' });
        const input = parseJson(await readBody(request, config.maxBodyBytes));
        const selected = availableTopups.get(input?.topupId ?? input?.packageId);
        if (!selected) throw new PublicError(400, 'Unknown top-up');

        let pending;
        try {
          pending = await createPendingPayment(client.username, selected);
        } catch (error) {
          if (error.message === 'Too many pending purchases') throw new PublicError(429, 'Too many unpaid checkouts. Finish or wait for one to expire.');
          throw error;
        }
        const invoice = await createInvoice(config.nowpayments, {
          purchaseId: pending.purchaseId,
          pkg: selected,
          ipnUrl: new URL('/nowpayments/ipn', config.successUrl).toString(),
          successUrl: config.successUrl,
          cancelUrl: config.cancelUrl,
        }, { fetchImpl, timeoutMs: config.stripeTimeoutMs });
        if (!invoice) {
          await cancelPendingPayment(pending.purchaseId).catch(() => {});
          throw new PublicError(502, 'Payment provider unavailable. Try again in a minute.');
        }
        await bindPaymentSession(pending.purchaseId, invoice.invoiceRef);
        return json(response, 200, { checkoutUrl: invoice.invoiceUrl });
      }

      if (request.method === 'POST' && request.url === '/nowpayments/ipn') {
        if (!config.nowpayments) return json(response, 503, { error: 'Payments are not configured' });
        const raw = await readBody(request, config.maxBodyBytes);
        const body = parseJson(raw);
        if (!validIpnSignature(body, request.headers['x-nowpayments-sig'], config.nowpayments.ipnSecret)) {
          throw new PublicError(401, 'Invalid signature');
        }
        const paid = finishedPayment(body);
        // Only fully paid invoices credit traffic. Other statuses (waiting, confirming,
        // partially_paid, expired...) are acknowledged so the provider stops retrying.
        if (!paid) {
          if (body?.payment_status === 'partially_paid') {
            console.error(`NOWPayments partial payment for order ${String(body.order_id).slice(0, 64)}: needs manual review`);
          }
          return json(response, 200, { received: true, credited: false });
        }
        try {
          const result = await completePayment(paid);
          return json(response, 200, { received: true, credited: result.credited });
        } catch (error) {
          // A signed "finished" payment we cannot match (amount, expired purchase...) is
          // real money: keep a log line for manual handling instead of failing silently.
          console.error(`NOWPayments payment ${paid.eventId} for order ${paid.purchaseId.slice(0, 64)} not credited: ${error.message}`);
          return json(response, 200, { received: true, credited: false });
        }
      }

      if (request.method === 'GET' && request.url === '/health') {
        return json(response, 200, { ok: true });
      }

      if (request.method === 'GET' && request.url === '/packages') {
        return json(response, 200, [...availableTopups.values()].map(({ id, cents, currency, bonusPercent, micros }) => ({
          id, cents, currency, bonusPercent, creditMicros: micros,
        })));
      }

      if (request.method === 'POST' && request.url === '/checkout') {
        if (!config.stripeKey || !config.webhookSecret) {
          return json(response, 503, { error: 'Payments are not configured' });
        }
        if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
          throw new PublicError(415, 'Content-Type must be application/json');
        }

        const authKey = clientAddress(request);
        if (!authAttempts.allowed(authKey)) {
          return json(response, 429, { error: 'Too many authentication attempts' });
        }
        const client = await parseClientAuth(request.headers.authorization);
        if (client === AUTH_BUSY) throw new PublicError(503, 'Server busy, try again');
        if (!client) {
          authAttempts.fail(authKey);
          response.setHeader('WWW-Authenticate', 'Basic realm="proxy-payments", charset="UTF-8"');
          return json(response, 401, { error: 'Invalid client credentials' });
        }

        const input = parseJson(await readBody(request, config.maxBodyBytes));
        const selected = availablePackages.get(input?.packageId);
        if (!selected) throw new PublicError(400, 'Unknown package');

        const pending = await createPendingPayment(client.username, selected);
        try {
          const form = new URLSearchParams({
            mode: 'payment',
            success_url: config.successUrl,
            cancel_url: config.cancelUrl,
            client_reference_id: pending.purchaseId,
            'line_items[0][quantity]': '1',
            'line_items[0][price_data][currency]': selected.currency,
            'line_items[0][price_data][unit_amount]': String(selected.cents),
            'line_items[0][price_data][product_data][name]': `${selected.id} proxy traffic`,
            'metadata[purchase_id]': pending.purchaseId,
          });
          const session = await createStripeCheckout(config, form, pending.purchaseId, fetchImpl);
          await bindPaymentSession(pending.purchaseId, session.id);
          return json(response, 200, { checkoutUrl: session.url });
        } catch (error) {
          await cancelPendingPayment(pending.purchaseId).catch(() => {});
          throw error;
        }
      }

      if (request.method === 'POST' && request.url === '/stripe/webhook') {
        if (!config.webhookSecret) return json(response, 503, { error: 'Payments are not configured' });
        const raw = await readBody(request, config.maxBodyBytes);
        if (!validStripeSignature(raw, request.headers['stripe-signature'], config.webhookSecret)) {
          throw new PublicError(400, 'Invalid signature');
        }

        const event = parseJson(raw);
        if (!validStripeIdentifier(event?.id, 'evt_') || typeof event?.type !== 'string') {
          throw new PublicError(400, 'Invalid event');
        }

        if (event.type === 'checkout.session.completed' && event.data?.object?.payment_status === 'paid') {
          const session = event.data.object;
          const purchaseId = session.client_reference_id;
          if (!validStripeIdentifier(session.id, 'cs_')
            || typeof purchaseId !== 'string'
            || purchaseId !== session.metadata?.purchase_id
            || !Number.isSafeInteger(session.amount_total)
            || typeof session.currency !== 'string') {
            throw new PublicError(400, 'Invalid payment');
          }
          try {
            await completePayment({
              eventId: event.id,
              purchaseId,
              sessionId: session.id,
              amountTotal: session.amount_total,
              currency: session.currency,
            });
          } catch {
            throw new PublicError(400, 'Invalid payment');
          }
        }
        return json(response, 200, { received: true });
      }

      return json(response, 404, { error: 'Not found' });
    } catch (error) {
      const status = error instanceof PublicError ? error.status : 500;
      const message = error instanceof PublicError ? error.message : 'Internal server error';
      if (status === 413 && !response.headersSent) response.setHeader('Connection', 'close');
      return json(response, status, { error: message });
    }
  });

  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = config.requestTimeoutMs;
  server.keepAliveTimeout = Math.min(5_000, config.requestTimeoutMs);
  server.maxHeadersCount = 50;
  server.on('clientError', (error, socket) => {
    // An idle connection timing out has nothing to answer. Writing a 400 there can land
    // on a request the browser just sent, hiding a response that already succeeded.
    if (error.code === 'ECONNRESET' || !socket.writable) return;
    if (error.code === 'ERR_HTTP_REQUEST_TIMEOUT') {
      socket.destroy();
      return;
    }
    if (!socket.destroyed && !socket.writableEnded) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    }
  });
  return server;
}
