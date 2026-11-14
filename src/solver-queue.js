import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { upstreamAuthorization, upstreamEndpoint } from './auth.js';

const SWEEP_INTERVAL_MS = 30_000;

export function createSolverQueue({ gateway, ttlMs = 300_000, maxPending = 50, cookieTtlMs = 1_800_000, keepaliveImpl = null, log = console }) {
  const emitter = new EventEmitter();
  const tasks = new Map();
  const cookieCache = new Map();
  let solved = 0;
  let expired = 0;

  function sweep() {
    const now = Date.now();
    for (const [id, task] of tasks) {
      if (task.status === 'solved') {
        tasks.delete(id);
        continue;
      }
      if (now - task.createdAt > ttlMs) {
        task.status = 'expired';
        expired += 1;
        tasks.delete(id);
      }
    }
    for (const [site, entry] of cookieCache) {
      if (now > entry.expiresAt) cookieCache.delete(site);
    }
  }

  const timer = setInterval(sweep, SWEEP_INTERVAL_MS);
  timer.unref();

  function push({ site, url, exitInfo, markers }) {
    let pendingCount = 0;
    for (const task of tasks.values()) {
      if (task.status === 'pending' || task.status === 'claimed') pendingCount += 1;
    }
    if (pendingCount >= maxPending) return null;
    const id = crypto.randomBytes(12).toString('hex');
    const task = { id, site, url: url.href ?? url, exitInfo, markers, createdAt: Date.now(), claimedAt: null, status: 'pending' };
    tasks.set(id, task);
    const summary = { id, site, url: task.url, createdAt: task.createdAt };
    emitter.emit('task', summary);
    log.info?.(`Solver queue: new task ${id} for ${site}`);
    return id;
  }

  function pending() {
    const result = [];
    for (const task of tasks.values()) {
      if (task.status === 'pending') {
        result.push({ id: task.id, site: task.site, url: task.url, createdAt: task.createdAt });
      }
    }
    return result;
  }

  function claim(id) {
    const task = tasks.get(id);
    if (!task || task.status !== 'pending') return null;
    task.status = 'claimed';
    task.claimedAt = Date.now();
    const endpoint = upstreamEndpoint(gateway, task.exitInfo.pool);
    const auth = upstreamAuthorization(gateway, { session: task.exitInfo.sid, pool: task.exitInfo.pool });
    const decoded = Buffer.from(auth.replace('Basic ', ''), 'base64').toString('utf8');
    const colon = decoded.indexOf(':');
    const upstream = {
      host: endpoint.host,
      port: endpoint.port,
      username: decoded.slice(0, colon),
      password: decoded.slice(colon + 1),
    };
    return { task: { id: task.id, site: task.site, url: task.url }, upstream };
  }

  // Session keepalive: periodically ping the upstream proxy session so the IP stays
  // allocated. Without this, the session expires after UPSTREAM_SESSION_TTL_SECONDS
  // (default 10 min) and the solver cookies become useless because the IP changes.
  const keepaliveTimers = new Map();
  const KEEPALIVE_INTERVAL_MS = 4 * 60_000; // every 4 min, well within the 10-min TTL

  function startKeepalive(site, exitInfo, siteUrl) {
    stopKeepalive(site);
    if (!keepaliveImpl) return;
    const endpoint = upstreamEndpoint(gateway, exitInfo.pool);
    const auth = upstreamAuthorization(gateway, { session: exitInfo.sid, pool: exitInfo.pool });
    const tick = async () => {
      const entry = cookieCache.get(site);
      if (!entry || Date.now() > entry.expiresAt) { stopKeepalive(site); return; }
      try {
        await keepaliveImpl({ url: new URL(siteUrl), proxy: { host: endpoint.host, port: endpoint.port, tls: gateway.upstreamTls, authorization: auth }, timeoutMs: 10_000, maxBytes: 64 * 1024, cookie: "", referer: "" });
      } catch {}
    };
    const timer = setInterval(tick, KEEPALIVE_INTERVAL_MS);
    timer.unref();
    keepaliveTimers.set(site, timer);
  }

  function stopKeepalive(site) {
    const timer = keepaliveTimers.get(site);
    if (timer) { clearInterval(timer); keepaliveTimers.delete(site); }
  }

  function resolve(id, cookies) {
    const task = tasks.get(id);
    if (!task || (task.status !== 'claimed' && task.status !== 'pending')) return false;
    task.status = 'solved';
    solved += 1;
    const setCookieHeaders = cookies.map((c) => {
      let header = `${c.name}=${c.value}`;
      if (c.domain) header += `; Domain=${c.domain}`;
      if (c.path) header += `; Path=${c.path}`;
      return header;
    });
    cookieCache.set(task.site, {
      cookies: setCookieHeaders,
      exitInfo: task.exitInfo,
      expiresAt: Date.now() + cookieTtlMs,
    });
    startKeepalive(task.site, task.exitInfo, task.url);
    log.info?.(`Solver queue: task ${id} solved for ${task.site}, ${cookies.length} cookies cached`);
    return true;
  }

  function cookiesFor(site) {
    const entry = cookieCache.get(site);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cookieCache.delete(site);
      return null;
    }
    return { cookies: entry.cookies, exitInfo: entry.exitInfo };
  }

  function stats() {
    let pendingCount = 0;
    let claimedCount = 0;
    for (const task of tasks.values()) {
      if (task.status === 'pending') pendingCount += 1;
      else if (task.status === 'claimed') claimedCount += 1;
    }
    return { pending: pendingCount, claimed: claimedCount, solved, cached: cookieCache.size, expired };
  }

  function destroy() {
    clearInterval(timer);
    for (const t of keepaliveTimers.values()) clearInterval(t);
    keepaliveTimers.clear();
    tasks.clear();
    cookieCache.clear();
  }

  return { push, pending, claim, resolve, cookiesFor, stats, destroy, emitter };
}
