import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { close, fakeUpstream, listen, publicLookup, targetCert, tlsTarget } from './helpers/fake-upstream.js';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-unlocker-'));
process.env.DATA_FILE = path.join(directory, 'state.json');
const store = await import('../src/store.js');
const { CookieJar, classify, createLedger, createUnlocker, diagnose } = await import('../src/unlocker.js');
const { createPaymentServer } = await import('../src/payments.js');

test.after(() => rm(directory, { recursive: true, force: true }));

const PAGE = `<html><head><title>Shop</title></head><body>${'product '.repeat(200)}</body></html>`;
const CHALLENGE = '<html><head><title>Just a moment...</title></head><body><script>window._cf_chl_opt={}</script></body></html>';

const pricing = {
  unlockerPerRequestMicros: 800,
  premiumDomains: new Map([['other.example', 2]]),
  costResidentialPerGbMicros: 150_000,
  costMobilePerGbMicros: 290_000,
};

function settings(overrides = {}) {
  return {
    enabled: true, maxAttempts: 4, attemptTimeoutMs: 5_000, totalTimeoutMs: 20_000,
    maxResponseBytes: 1024 * 1024, minBodyBytes: 512, requestsPerMinutePerKey: 1_000,
    maxConcurrentPerAccount: 10, maxConcurrent: 100, flagMinRequests: 20,
    blockedDomains: new Set(['ticketmaster.com']),
    ledgerFile: path.join(directory, `ledger-${Math.random().toString(16).slice(2)}.jsonl`),
    ...overrides,
  };
}

let accounts = 0;
async function customer(usd = 1) {
  accounts += 1;
  const account = await store.createAccount(`unlock-${accounts}@example.com`, 'long enough password');
  if (usd === 0) await store.reserveFunds(account.username, 1_000_000);
  else if (usd > 0) await store.creditWallet(account.username, Math.round(usd * 1_000_000));
  const { key } = await store.createApiKey(account.username, 'test');
  return { username: account.username, key };
}

const balance = async (username) => (await store.getClient(username)).balanceMicros;

// Starts a TLS target (handler), a fake upstream routing shop/other.example to it, and an
// unlocker behind a plain HTTP server. run receives helpers to call /v1/unlock.
async function harness(handler, { config = {}, mobile = true, log = { warn() {}, error() {} } } = {}, run) {
  const target = await tlsTarget(handler);
  const upstream = await fakeUpstream({ 'shop.example:443': target.port, 'other.example:443': target.port });
  const gateway = {
    upstreamHost: '127.0.0.1', upstreamPort: upstream.port, upstreamUsername: 'res-user', upstreamPassword: 'r',
    upstreamTls: false, upstreamSessionTtlSeconds: 600, dnsTimeoutMs: 1_000,
    upstreamMobile: mobile ? { username: 'mob-user', password: 'm', host: '127.0.0.1', port: upstream.port } : null,
  };
  const unlocker = createUnlocker({ gateway, pricing, config: settings(config), lookup: publicLookup, tlsOptions: { ca: targetCert }, log });
  const server = http.createServer((request, response) => unlocker.handle(request, response, request.socket.remoteAddress));
  const port = await listen(server);
  const call = (body, { key, headers = {}, method = 'POST' } = {}) => new Promise((resolve, reject) => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const request = http.request({
      host: '127.0.0.1', port, method, path: '/v1/unlock',
      headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}), ...headers },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        let json = null;
        try { json = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* not JSON */ }
        resolve({ status: response.statusCode, headers: response.headers, json });
      });
    });
    request.on('error', reject);
    request.end(method === 'POST' ? payload : undefined);
  });
  try {
    await run({ call, upstream, unlocker, port });
  } finally {
    await close(server);
    await upstream.close();
    await target.close();
  }
}

const loginParts = (login) => /^(res-user|mob-user)(?:-cc-([a-z]{2}))?-sid-([0-9a-f]{16})-ttl-600$/.exec(login);

test('block detection reads statuses, challenge pages, and suspiciously small HTML', () => {
  const page = (status, body, headers = { 'content-type': 'text/html' }) => ({ status, headers, body: Buffer.from(body) });
  assert.equal(classify(page(200, PAGE), 512), 'ok');
  assert.equal(classify(page(403, PAGE), 512), 'blocked');
  assert.equal(classify(page(429, ''), 512), 'blocked');
  assert.equal(classify(page(503, PAGE), 512), 'blocked');
  assert.equal(classify(page(200, CHALLENGE), 512), 'blocked');
  assert.equal(classify(page(200, PAGE, { 'content-type': 'text/html', 'cf-mitigated': 'challenge' }), 512), 'blocked');
  assert.equal(classify(page(200, '<html><body>captcha</body><iframe src="https://geo.captcha-delivery.com/x"></iframe></html>'), 512), 'blocked');
  // A normal page that loads an anti-bot vendor's script is not a block.
  assert.equal(classify(page(200, `${PAGE}<script src="https://js.datadome.co/tags.js"></script>`), 512), 'ok');
  assert.equal(classify(page(200, '<html>tiny</html>'), 512), 'small');
  assert.equal(classify(page(200, '{"a":1}', { 'content-type': 'application/json' }), 512), 'ok');
  assert.equal(classify(page(404, 'gone'), 512), 'ok');
  assert.equal(classify(page(400, 'bad'), 512), 'final');
  assert.equal(classify(page(502, 'bad gateway'), 512), 'retry');
});

test('the cookie jar keeps per-domain cookies with expiry', () => {
  const jar = new CookieJar();
  const now = 1_000_000;
  jar.store('www.shop.example', ['a=1; Path=/', 'b=2; Domain=.shop.example', 'c=3; Max-Age=0', 'd=4; Domain=evil.example', 'e=5; Max-Age=10'], now);
  assert.equal(jar.header('www.shop.example', now), 'a=1; b=2; e=5');
  assert.equal(jar.header('api.shop.example', now), 'b=2');
  assert.equal(jar.header('www.shop.example', now + 11_000), 'a=1; b=2');
  jar.store('www.shop.example', ['a=; Max-Age=0'], now);
  assert.equal(jar.header('www.shop.example', now), 'b=2'); // a deleted, e already expired
});

test('a successful unlock charges once, hides cookies, and reuses the warm exit', async () => {
  const cookies = [];
  await harness((req, res) => {
    cookies.push(req.headers.cookie ?? '');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'clearance=ok; Path=/' });
    res.end(PAGE);
  }, {}, async ({ call, upstream, unlocker }) => {
    const { username, key } = await customer();
    const first = await call({ url: 'https://shop.example/item?id=1' }, { key });
    assert.equal(first.status, 200, JSON.stringify(first.json));
    assert.equal(first.json.success, true);
    assert.equal(first.json.status, 200);
    assert.equal(first.json.url, 'https://shop.example/item?id=1');
    assert.equal(first.json.body, PAGE);
    assert.equal(first.json.encoding, 'utf8');
    assert.equal(first.json.headers['set-cookie'], undefined);
    assert.equal(first.json.billedMicros, 800);
    assert.deepEqual(first.json.attempts, [{ pool: 'residential', result: 'ok', status: 200 }]);
    assert.equal(await balance(username), 2_000_000 - 800);

    const second = await call({ url: 'https://shop.example/item?id=2' }, { key });
    assert.equal(second.status, 200);
    assert.deepEqual(cookies, ['', 'clearance=ok']);
    assert.equal(upstream.logins[0].login, upstream.logins[1].login); // same exit IP
    assert.ok(loginParts(upstream.logins[0].login));
    assert.equal(await balance(username), 2_000_000 - 1_600);

    await unlocker.ledger.flush();
    const [stats] = unlocker.stats();
    assert.equal(stats.site, 'shop.example');
    assert.equal(stats.requests, 2);
    assert.equal(stats.successes, 2);
    assert.equal(stats.revenueMicros, 1_600);
    assert.ok(stats.costMicros > 0 && stats.wireBytes > 0);
  });
});

test('blocked attempts escalate to new IPs and the site remembers', async () => {
  let served = 0;
  await harness((req, res) => {
    served += 1;
    if (served <= 2) {
      res.writeHead(403, { 'content-type': 'text/html' });
      res.end(CHALLENGE);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE);
  }, { config: { maxAttempts: 4 } }, async ({ call, upstream }) => {
    const { username, key } = await customer();
    const result = await call({ url: 'https://shop.example/', country: 'DE' }, { key });
    assert.equal(result.status, 200, JSON.stringify(result.json));
    assert.deepEqual(result.json.attempts.map((attempt) => [attempt.pool, attempt.result]), [
      ['residential', 'blocked'], ['residential', 'blocked'], ['residential', 'ok'],
    ]);
    const logins = upstream.logins.map((entry) => loginParts(entry.login));
    assert.deepEqual(logins.map((parts) => parts[1]), ['res-user', 'res-user', 'res-user']);
    assert.ok(logins.every((parts) => parts[2] === 'de'));
    assert.equal(new Set(logins.map((parts) => parts[3])).size, 3); // a new IP each time
    assert.equal(await balance(username), 2_000_000 - 800); // charged once
  });
});

test('when every attempt is blocked nothing is charged and the ledger shows it', async () => {
  await harness((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(CHALLENGE);
  }, { mobile: false }, async ({ call, upstream, unlocker }) => {
    const { username, key } = await customer();
    const result = await call({ url: 'https://shop.example/' }, { key });
    assert.equal(result.status, 502);
    assert.equal(result.json.success, false);
    assert.equal(result.json.billedMicros, 0);
    assert.equal(result.json.attempts.length, 4);
    assert.ok(result.json.attempts.every((attempt) => attempt.pool === 'residential' && attempt.result === 'blocked'));
    assert.equal(upstream.logins.length, 4);
    assert.equal(await balance(username), 2_000_000);

    await unlocker.ledger.flush();
    const [stats] = unlocker.stats();
    assert.equal(stats.successes, 0);
    assert.equal(stats.revenueMicros, 0);
  });
});

test('named sessions keep their exit and are private to each customer', async () => {
  await harness((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE);
  }, {}, async ({ call, upstream }) => {
    const alice = await customer();
    const bob = await customer();
    await call({ url: 'https://shop.example/a', session: 'cart1' }, { key: alice.key });
    await call({ url: 'https://other.example/b', session: 'cart1' }, { key: alice.key });
    await call({ url: 'https://shop.example/a', session: 'cart1' }, { key: bob.key });
    const [one, two, three] = upstream.logins.map((entry) => entry.login);
    assert.equal(one, two); // same session, same IP, even across sites
    assert.notEqual(one, three); // another customer with the same session name gets its own
  });
});

test('redirects are followed with cookies, but never to a blocked or private destination', async () => {
  await harness((req, res) => {
    if (req.url === '/start') {
      res.writeHead(302, { location: '/landing', 'set-cookie': 'step=1' });
      return res.end();
    }
    if (req.url === '/landing') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(`${PAGE}<!-- cookie:${req.headers.cookie} referer:${req.headers.referer} -->`);
    }
    if (req.url === '/to-private') {
      res.writeHead(302, { location: 'https://private.example/admin' });
      return res.end();
    }
    res.writeHead(302, { location: 'https://www.ticketmaster.com/' });
    res.end();
  }, {}, async ({ call, upstream }) => {
    const { key } = await customer();
    const followed = await call({ url: 'https://shop.example/start' }, { key });
    assert.equal(followed.json.status, 200);
    assert.equal(followed.json.url, 'https://shop.example/landing');
    assert.match(followed.json.body, /cookie:step=1 referer:https:\/\/shop\.example\/start/);

    const before = upstream.logins.length;
    const privateHop = await call({ url: 'https://shop.example/to-private' }, { key });
    assert.equal(privateHop.json.status, 302);
    assert.equal(privateHop.json.headers.location, 'https://private.example/admin');
    const blockedHop = await call({ url: 'https://shop.example/to-blocked' }, { key });
    assert.equal(blockedHop.json.status, 302);
    assert.equal(upstream.logins.length, before + 2); // neither redirect was followed
  });
});

test('404s are billed, other client errors are returned unbilled, premium sites cost more', async () => {
  await harness((req, res) => {
    if (req.url === '/missing') {
      res.writeHead(404, { 'content-type': 'text/html' });
      return res.end('<html>not found</html>');
    }
    if (req.url === '/bad') {
      res.writeHead(400, { 'content-type': 'text/plain' });
      return res.end('bad request');
    }
    if (req.url === '/tiny') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end('<html>ok</html>');
    }
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  }, {}, async ({ call }) => {
    const { username, key } = await customer();
    const missing = await call({ url: 'https://shop.example/missing' }, { key });
    assert.equal(missing.json.status, 404);
    assert.equal(missing.json.billedMicros, 800);

    const bad = await call({ url: 'https://shop.example/bad' }, { key });
    assert.equal(bad.status, 200);
    assert.equal(bad.json.success, false);
    assert.equal(bad.json.billedMicros, 0);
    assert.equal(bad.json.attempts.length, 1); // another IP would not change a 400

    // Every attempt returned a tiny page: it is really that small, so it is billed.
    const tiny = await call({ url: 'https://shop.example/tiny' }, { key });
    assert.equal(tiny.json.body, '<html>ok</html>');
    assert.equal(tiny.json.attempts.length, 4);
    assert.equal(tiny.json.billedMicros, 800);

    const image = await call({ url: 'https://other.example/logo.png' }, { key });
    assert.equal(image.json.encoding, 'base64');
    assert.equal(Buffer.from(image.json.body, 'base64')[1], 0x50);
    assert.equal(image.json.billedMicros, 1_600); // other.example has a 2x premium
    assert.equal(await balance(username), 2_000_000 - 800 - 800 - 1_600);
  });
});

test('requests are validated, authenticated and paid for before anything is fetched', async () => {
  await harness((req, res) => res.end(PAGE), { config: { requestsPerMinutePerKey: 11 } }, async ({ call, upstream }) => {
    const { key } = await customer();
    const broke = await customer(0);
    assert.equal((await call({ url: 'https://shop.example/' })).status, 401);
    assert.equal((await call({ url: 'https://shop.example/' }, { key: 'vy_live_nope' })).status, 401);
    assert.equal((await call({ url: 'https://shop.example/' }, { key, method: 'GET' })).status, 405);
    assert.equal((await call({ url: 'https://shop.example/' }, { key, headers: { 'content-type': 'text/plain' } })).status, 415);
    assert.equal((await call('not json', { key })).status, 400);
    assert.equal((await call({ url: 'https://shop.example/', method: 'POST' }, { key })).status, 400);
    assert.equal((await call({ url: 'https://shop.example/', render: 'yes' }, { key })).status, 400);
    assert.equal((await call({ url: 'ftp://shop.example/' }, { key })).status, 400);
    assert.equal((await call({ url: 'https://user:pw@shop.example/' }, { key })).status, 400);
    assert.equal((await call({ url: 'https://shop.example:8443/' }, { key })).status, 400);
    assert.equal((await call({ url: 'https://shop.example/', country: 'germany' }, { key })).status, 400);
    assert.equal((await call({ url: 'https://private.example/' }, { key })).status, 403);
    assert.equal((await call({ url: 'https://127.0.0.1/' }, { key })).status, 403);
    assert.equal((await call({ url: 'https://tickets.ticketmaster.com/' }, { key })).status, 403);
    assert.equal((await call({ url: 'https://shop.example/' }, { key: broke.key })).status, 402);
    assert.equal(upstream.logins.length, 0); // nothing above reached the provider

    // The per-key rate limit counts every authenticated request (11 per minute here).
    const limited = await call({ url: 'https://shop.example/' }, { key });
    assert.equal(limited.status, 429);
  });
});

test('repeated bad keys from one address are locked out', async () => {
  await harness((req, res) => res.end(PAGE), {}, async ({ call }) => {
    for (let index = 0; index < 30; index += 1) await call({ url: 'https://shop.example/' }, { key: 'vy_live_wrong' });
    const { key } = await customer();
    assert.equal((await call({ url: 'https://shop.example/' }, { key })).status, 429);
  });
});

test('the ledger flags money-losing sites and rebuilds its totals from disk', async () => {
  const file = path.join(directory, 'flag-ledger.jsonl');
  const warnings = [];
  const ledger = createLedger(file, { flagMinRequests: 2, log: { warn: (message) => warnings.push(message), error() {} } });
  const entry = (billed, costMicros) => ({ site: 'pricey.example', billed, priceMicros: billed ? 800 : 0, costMicros, wireBytes: 1_000, attempts: 1 });
  await ledger.record(entry(true, 100));
  await ledger.record(entry(false, 900)); // 1000 cost against 800 revenue over 2 requests
  assert.equal(ledger.stats()[0].flagged, true);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /pricey\.example is losing money/);

  const reloaded = createLedger(file, { flagMinRequests: 2, log: { warn() {}, error() {} } });
  await reloaded.load();
  const [stats] = reloaded.stats();
  assert.equal(stats.requests, 2);
  assert.equal(stats.marginMicros, -200);
  assert.equal(stats.flagged, true);
  assert.equal((await readFile(file, 'utf8')).trim().split('\n').length, 2);
});

test('the website server answers /v1/unlock when the unlocker is mounted', async () => {
  const handled = [];
  const server = createPaymentServer({
    stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 30, maxConcurrentAuth: 4,
    maxBodyBytes: 32_768, stripeTimeoutMs: 1_000, requestTimeoutMs: 5_000,
    successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/cancel',
  }, { unlocker: { handle: (request, response, address) => { handled.push(address); response.end('{}'); } } });
  const port = await listen(server);
  try {
    await new Promise((resolve, reject) => {
      const request = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/v1/unlock', headers: { 'x-real-ip': '203.0.113.9' } }, (response) => {
        response.resume();
        response.on('end', resolve);
      });
      request.on('error', reject);
      request.end('{}');
    });
    assert.deepEqual(handled, ['203.0.113.9']); // keyed on the real client address from nginx
  } finally {
    await close(server);
  }
});

test('large pages stream back intact: multi-byte text across slices, escapes, binary', async () => {
  // About 600 KB of text whose multi-byte characters straddle the 48 KB slice edges.
  const text = `<html><body>${'é "quoted" \ back\nline € 😀 '.repeat(20_000)}</body></html>`;
  const binary = Buffer.alloc(300_001, 0);
  for (let index = 0; index < binary.length; index += 1) binary[index] = (index * 7) % 256;
  await harness((req, res) => {
    if (req.url === '/bin') {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      return res.end(binary);
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(text);
  }, {}, async ({ call }) => {
    const { key } = await customer();
    const page = await call({ url: 'https://shop.example/big' }, { key });
    assert.equal(page.status, 200);
    assert.equal(page.json.body, text);
    assert.equal(page.json.billedMicros, 800); // metadata fields still present
    const file = await call({ url: 'https://shop.example/bin' }, { key });
    assert.equal(file.json.encoding, 'base64');
    assert.ok(Buffer.from(file.json.body, 'base64').equals(binary));
  });
});

test('the memory budget turns away requests it cannot hold', async () => {
  let releaseFirst;
  const firstArrived = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  let waiting;
  await harness((req, res) => {
    waiting = () => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); };
    releaseFirst();
  }, { config: { maxResponseBytes: 64 * 1024, memoryBudgetBytes: 128 * 1024 } }, async ({ call, unlocker }) => {
    const { username, key } = await customer();
    const first = call({ url: 'https://shop.example/slow' }, { key });
    await firstArrived;
    assert.equal(unlocker.memory().bookedBytes, 128 * 1024); // twice the 64 KB cap
    const second = await call({ url: 'https://shop.example/other' }, { key });
    assert.equal(second.status, 503);
    assert.equal(second.headers['retry-after'], '5');
    waiting();
    assert.equal((await first).status, 200);
    assert.equal(unlocker.memory().bookedBytes, 0);
    assert.equal(await balance(username), 2_000_000 - 800); // the turned-away one cost nothing
  });
});

test('unlocker defaults are sized for a small droplet', async () => {
  const { unlockerConfig } = await import('../src/config.js');
  const saved = { ...process.env };
  try {
    for (const name of ['UNLOCKER_MAX_RESPONSE_BYTES', 'UNLOCKER_MAX_CONCURRENT', 'UNLOCKER_MEMORY_BUDGET_BYTES']) delete process.env[name];
    const defaults = unlockerConfig();
    assert.equal(defaults.maxResponseBytes, 5 * 1024 * 1024);
    assert.equal(defaults.maxConcurrent, 30);
    assert.equal(defaults.memoryBudgetBytes, 256 * 1024 * 1024);
    assert.equal(defaults.ledgerMaxBytes, 50 * 1024 * 1024);
    assert.equal(defaults.ledgerKeep, 30);
    process.env.UNLOCKER_MEMORY_BUDGET_BYTES = String(16 * 1024 * 1024);
    process.env.UNLOCKER_MAX_RESPONSE_BYTES = String(10 * 1024 * 1024);
    assert.throws(() => unlockerConfig(), /at least twice/);
  } finally {
    for (const name of Object.keys(process.env)) if (!(name in saved)) delete process.env[name];
    Object.assign(process.env, saved);
  }
});

test('shutdown refuses new requests, waits for the one in flight, then snapshots the ledger', async () => {
  const { createShutdown } = await import('../src/shutdown.js');
  let arrived;
  const started = new Promise((resolve) => { arrived = resolve; });
  await harness((req, res) => {
    arrived();
    setTimeout(() => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(PAGE);
    }, 300);
  }, {}, async ({ call, unlocker }) => {
    const { username, key } = await customer();
    const slow = call({ url: 'https://shop.example/slow' }, { key });
    await started;

    const stop = createShutdown({ unlocker, drainStore: store.drain, timeoutMs: 5_000, log: { warn() {}, error() {} } });
    const stopping = stop();
    const refused = await call({ url: 'https://shop.example/late' }, { key });
    assert.equal(refused.status, 503);
    assert.equal(refused.headers['retry-after'], '5');

    assert.equal(await stopping, 'drained');
    assert.equal(unlocker.memory().inFlight, 0);
    assert.equal((await slow).status, 200);
    assert.equal(await balance(username), 2_000_000 - 800); // the hold settled before stop resolved
    assert.equal(unlocker.stats()[0].requests, 1);
  });
});

test('a slow reader does not pile up listeners on the response', async () => {
  const page = `<html><body>${'x'.repeat(4 * 1024 * 1024)}</body></html>`;
  const warnings = [];
  const onWarning = (warning) => warnings.push(warning.name);
  process.on('warning', onWarning);
  try {
    await harness((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page);
    }, { config: { maxResponseBytes: 5 * 1024 * 1024 } }, async ({ port }) => {
      const { key } = await customer();
      const received = await new Promise((resolve, reject) => {
        const request = http.request({
          host: '127.0.0.1', port, method: 'POST', path: '/v1/unlock',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        }, (response) => {
          let bytes = 0;
          response.pause();
          // Read one chunk every few milliseconds, so the server waits for 'drain' many times.
          const tick = setInterval(() => {
            let chunk;
            while ((chunk = response.read(16 * 1024)) !== null) bytes += chunk.length;
          }, 2);
          response.on('end', () => { clearInterval(tick); resolve(bytes); });
          response.on('error', reject);
        });
        request.on('error', reject);
        request.end(JSON.stringify({ url: 'https://shop.example/huge' }));
      });
      assert.ok(received > page.length);
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(warnings.filter((name) => name === 'MaxListenersExceededWarning'), []);
  } finally {
    process.off('warning', onWarning);
  }
});

// Akamai's edge block page as it is served: the reference and the edgesuite link are
// written with HTML entities.
const AKAMAI_DENIED = `<HTML><HEAD>
<TITLE>Access Denied</TITLE>
</HEAD><BODY>
<H1>Access Denied</H1>

You don't have permission to access "http&#58;&#47;&#47;www&#46;mobile&#46;de&#47;" on this server.<P>
Reference&#32;&#35;18&#46;5c4b2e17&#46;1762551234&#46;3f0a9b1
<P>https&#58;&#47;&#47;errors&#46;edgesuite&#46;net&#47;18&#46;5c4b2e17&#46;1762551234&#46;3f0a9b1</P>
</BODY>
</HTML>
`;

test('Akamai block pages are detected, entity-encoded or plain, with the markers named', () => {
  const page = (status, body, headers = { 'content-type': 'text/html' }) => ({ status, headers, body: Buffer.from(body) });
  // Served with 200 so only the markers can catch it.
  const encoded = diagnose(page(200, AKAMAI_DENIED), 512);
  assert.equal(encoded.outcome, 'blocked');
  assert.ok(encoded.reasons.includes('marker:akamai-access-denied'), encoded.reasons.join());
  assert.ok(encoded.reasons.includes('marker:akamai-edgesuite'));

  const plain = diagnose(page(200, '<html><head><title>Access Denied</title></head><body>Reference #18.abc.123</body></html>'), 512);
  assert.deepEqual(plain, { outcome: 'blocked', reasons: ['marker:akamai-access-denied', 'marker:access-denied-title'] });
  assert.equal(classify(page(200, '<html><body><a href="https://errors.edgesuite.net/18.1">x</a></body></html>'), 512), 'blocked');

  const ghost = diagnose(page(403, '', { 'content-type': 'text/html', server: 'AkamaiGHost' }), 512);
  assert.deepEqual(ghost, { outcome: 'blocked', reasons: ['status:403', 'server:AkamaiGHost'] });

  // A real page served through Akamai, mentioning "access denied" in its text, is fine.
  const real = diagnose(page(200, `${PAGE}<p>Access denied? Reset your password.</p>`, { 'content-type': 'text/html', server: 'AkamaiGHost' }), 512);
  assert.deepEqual(real, { outcome: 'ok', reasons: ['server:AkamaiGHost'] });
});

test('an issued _abck cookie is logged once per site', async () => {
  const lines = [];
  await harness((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html', 'set-cookie': ['_abck=ABC~-1~YAAQ; Path=/; Secure', 'bm_sz=1; Path=/'] });
    res.end(PAGE);
  }, { log: { info: (line) => lines.push(line), warn() {}, error() {} } }, async ({ call }) => {
    const { key } = await customer();
    assert.equal((await call({ url: 'https://shop.example/a' }, { key })).status, 200);
    assert.equal((await call({ url: 'https://shop.example/b' }, { key })).status, 200);
    const abck = lines.filter((line) => line.includes('_abck'));
    assert.equal(abck.length, 1);
    assert.match(abck[0], /shop\.example issued an _abck cookie \(Akamai Bot Manager\) on a residential exit, status 200/);
  });
});

test('probe tests one rung on a fresh IP, bills nothing and records nothing', async () => {
  await harness((req, res) => {
    if (req.url === '/denied') {
      res.writeHead(403, { 'content-type': 'text/html', server: 'AkamaiGHost' });
      return res.end(AKAMAI_DENIED);
    }
    res.writeHead(200, { 'content-type': 'text/html', 'set-cookie': '_abck=x; Path=/' });
    res.end(PAGE);
  }, {}, async ({ upstream, unlocker }) => {
    assert.deepEqual(unlocker.rungs, ['residential']);
    const ok = await unlocker.probe({ url: 'https://shop.example/', country: 'de', pool: 'residential' });
    assert.equal(ok.outcome, 'ok');
    assert.equal(ok.status, 200);
    assert.equal(ok.bytes, Buffer.byteLength(PAGE));
    assert.ok(ok.wireBytes > 0 && ok.costMicros > 0 && ok.ms >= 0);
    assert.ok(ok.reasons.includes('cookie:_abck'));

    const denied = await unlocker.probe({ url: 'https://shop.example/denied', country: 'de', pool: 'residential' });
    assert.equal(denied.outcome, 'blocked');
    assert.deepEqual(denied.reasons.slice(0, 2), ['status:403', 'server:AkamaiGHost']);
    assert.ok(denied.reasons.includes('marker:akamai-edgesuite'));

    // The same SSRF and blocklist checks as a customer request.
    assert.equal((await unlocker.probe({ url: 'https://private.example/' })).outcome, 'refused');
    assert.equal((await unlocker.probe({ url: 'https://www.ticketmaster.com/' })).outcome, 'refused');
    assert.equal((await unlocker.probe({ url: 'not a url' })).outcome, 'refused');

    await unlocker.ledger.flush();
    assert.deepEqual(unlocker.stats(), []); // nothing recorded
  });
});

test('probe reports a pool that is not configured', async () => {
  await harness((req, res) => res.end(PAGE), { mobile: false }, async ({ unlocker }) => {
    assert.deepEqual(unlocker.rungs, ['residential']);
    const result = await unlocker.probe({ url: 'https://shop.example/', pool: 'mobile' });
    assert.equal(result.outcome, 'refused');
    assert.match(result.error, /mobile pool is not configured/);
  });
});

// Shortened copies of challenge pages seen in production (keys replaced).
const AWS_WAF_CHALLENGE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title></title>
<script type="text/javascript">window.awsWafCookieDomainList = []; window.gokuProps = { "key":"TEST", "iv":"TEST", "context":"TEST" };</script>
<script src="https://1c5c1ecf7303.7a63328c.eu-central-1.token.awswaf.com/1c5c1ecf7303/0ed9a099d7e9/1c0aef3ebb0c/challenge.js"></script></head>
<body><noscript><h1>JavaScript is disabled</h1>In order to continue, we need to verify that you're not a robot. This requires JavaScript. Enable JavaScript and then reload the page.</noscript></body></html>`;
const BOOKING_CHALLENGE = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title></title>
<script src="https://www.booking.com/__challenge_TEST/d8c14d4960ca/a18a4859af9c/challenge.js"></script></head>
<body><noscript><h1>JavaScript is disabled</h1>In order to continue, we need to verify that you're not a robot. This requires JavaScript.</noscript>${' '.repeat(6000)}</body></html>`;
const GOOGLE_ENABLEJS = `<!DOCTYPE html><html lang="de"><head><title>Google Search</title></head><body><noscript><meta content="0;url=/httpservice/retry/enablejs?sei=TEST" http-equiv="refresh"><div>Klicke hier, wenn du nach einigen Sekunden nicht automatisch weitergeleitet wirst.</div></noscript>${'<div>x</div>'.repeat(2000)}</body></html>`;
const MOBILE_DE_DENIED = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Zugriff verweigert / Access denied</title></head><body>${'<p>Leider wurde der Zugriff verweigert.</p>'.repeat(100)}</body></html>`;

test('challenge pages that came back as 200 or 202 are blocked and not billed', () => {
  const page = (status, body, headers = { 'content-type': 'text/html; charset=utf-8', server: 'CloudFront' }) => ({ status, headers, body: Buffer.from(body) });
  const amazon = diagnose(page(202, AWS_WAF_CHALLENGE), 512);
  assert.equal(amazon.outcome, 'blocked');
  assert.ok(amazon.reasons.includes('marker:aws-waf') && amazon.reasons.includes('marker:captcha'), amazon.reasons.join());

  // Booking's variant has no aws-waf marker; the robot text and the 202 still catch it.
  assert.equal(classify(page(202, BOOKING_CHALLENGE), 512), 'blocked');
  assert.equal(classify(page(202, BOOKING_CHALLENGE.replace("verify that you're not a robot", 'wait')), 512), 'blocked'); // 202 alone

  assert.deepEqual(diagnose(page(200, GOOGLE_ENABLEJS, { 'content-type': 'text/html' }), 512), { outcome: 'blocked', reasons: ['marker:google-enablejs'] });
  assert.deepEqual(diagnose(page(200, MOBILE_DE_DENIED, { 'content-type': 'text/html' }), 512), { outcome: 'blocked', reasons: ['marker:access-denied-title'] });

  // Not challenges: a 202 from a JSON API, a large 202 page, and a real page that talks
  // about denied access in its text.
  assert.equal(classify(page(202, '{"queued":true}', { 'content-type': 'application/json' }), 512), 'ok');
  assert.equal(classify(page(202, `<html><body>${'product '.repeat(25_000)}</body></html>`), 512), 'ok');
  assert.equal(classify(page(200, `<html><head><title>Help: access denied errors</title></head><body>${'help '.repeat(200)}</body></html>`, { 'content-type': 'text/html' }), 512), 'ok');
});

// --- Browser fetcher integration ---

test('browser rungs appear in the ladder when a browser fetch is provided', async () => {
  const fake = async () => ({ status: 200, headers: { 'content-type': 'text/html' }, body: Buffer.from(PAGE), wireBytes: 100, protocol: 'browser' });
  const target = await tlsTarget((req, res) => res.end(PAGE));
  const upstream = await fakeUpstream({ 'shop.example:443': target.port });
  const gateway = {
    upstreamHost: '127.0.0.1', upstreamPort: upstream.port, upstreamUsername: 'res-user', upstreamPassword: 'r',
    upstreamTls: false, upstreamSessionTtlSeconds: 600, dnsTimeoutMs: 1_000,
    upstreamMobile: { username: 'mob-user', password: 'm', host: '127.0.0.1', port: upstream.port },
  };
  const unlocker = createUnlocker({
    gateway, pricing, config: settings({ browserEnabled: true }), lookup: publicLookup, tlsOptions: { ca: targetCert },
    browserFetchImpl: fake, log: { warn() {}, error() {} },
  });
  assert.deepEqual(unlocker.rungs, ['residential', 'browser-residential', 'ref-browser-residential']);
  await upstream.close();
  await target.close();
});

test('browser rungs are absent when browserFetchImpl is null', async () => {
  const target = await tlsTarget((req, res) => res.end(PAGE));
  const upstream = await fakeUpstream({ 'shop.example:443': target.port });
  const gateway = {
    upstreamHost: '127.0.0.1', upstreamPort: upstream.port, upstreamUsername: 'res-user', upstreamPassword: 'r',
    upstreamTls: false, upstreamSessionTtlSeconds: 600, dnsTimeoutMs: 1_000,
    upstreamMobile: { username: 'mob-user', password: 'm', host: '127.0.0.1', port: upstream.port },
  };
  const unlocker = createUnlocker({
    gateway, pricing, config: settings(), lookup: publicLookup, tlsOptions: { ca: targetCert },
    browserFetchImpl: null, log: { warn() {}, error() {} },
  });
  assert.deepEqual(unlocker.rungs, ['residential']);
  await upstream.close();
  await target.close();
});

test('escalation reaches the browser rung when HTTP rungs are blocked', async () => {
  let browserCalled = false;
  const browserFetch = async ({ url, proxy }) => {
    browserCalled = true;
    assert.ok(proxy.authorization.startsWith('Basic '));
    return { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Buffer.from(PAGE), wireBytes: 500, protocol: 'browser', url: url instanceof URL ? url : new URL(url) };
  };
  await harness((req, res) => {
    res.writeHead(403, { 'content-type': 'text/html' });
    res.end(CHALLENGE);
  }, {
    config: { maxAttempts: 6, browserEnabled: true },
  }, async ({ upstream, port }) => {
    // Manually create the unlocker with the browser fetch
    const gateway = {
      upstreamHost: '127.0.0.1', upstreamPort: upstream.port, upstreamUsername: 'res-user', upstreamPassword: 'r',
      upstreamTls: false, upstreamSessionTtlSeconds: 600, dnsTimeoutMs: 1_000,
      upstreamMobile: { username: 'mob-user', password: 'm', host: '127.0.0.1', port: upstream.port },
    };
    const unlocker = createUnlocker({
      gateway, pricing, config: settings({ maxAttempts: 8, browserEnabled: true }),
      browserFetchImpl: browserFetch, lookup: publicLookup, tlsOptions: { ca: targetCert }, log: { warn() {}, error() {} },
    });
    const { key } = await customer();
    const result = await unlocker.unlock({ username: `unlock-${accounts}`, url: new URL('https://shop.example/'), country: null, session: null });
    assert.ok(browserCalled, 'browser fetcher should have been called after HTTP rungs failed');
    assert.equal(result.outcome, 'ok');
    assert.ok(result.attempts.some((a) => a.browser), 'at least one attempt should be a browser attempt');
  });
});

test('probe supports browser pool types', async () => {
  const browserFetch = async ({ url }) => ({
    status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: Buffer.from(PAGE), wireBytes: 300, protocol: 'browser',
    url: url instanceof URL ? url : new URL(url),
  });
  const target = await tlsTarget((req, res) => res.end(PAGE));
  const upstream = await fakeUpstream({ 'shop.example:443': target.port });
  const gateway = {
    upstreamHost: '127.0.0.1', upstreamPort: upstream.port, upstreamUsername: 'res-user', upstreamPassword: 'r',
    upstreamTls: false, upstreamSessionTtlSeconds: 600, dnsTimeoutMs: 1_000,
    upstreamMobile: { username: 'mob-user', password: 'm', host: '127.0.0.1', port: upstream.port },
  };
  const unlocker = createUnlocker({
    gateway, pricing, config: settings({ browserEnabled: true }),
    browserFetchImpl: browserFetch, lookup: publicLookup, tlsOptions: { ca: targetCert }, log: { warn() {}, error() {} },
  });
  const result = await unlocker.probe({ url: 'https://shop.example/', pool: 'browser-residential', country: 'de' });
  assert.equal(result.outcome, 'ok');
  assert.equal(result.pool, 'browser-residential');
  assert.equal(result.protocol, 'browser');

  const mobile = await unlocker.probe({ url: 'https://shop.example/', pool: 'browser-mobile' });
  assert.equal(mobile.outcome, 'refused');

  const refRes = await unlocker.probe({ url: 'https://shop.example/', pool: 'ref-browser-residential', country: 'fr' });
  assert.equal(refRes.outcome, 'ok');
  assert.equal(refRes.pool, 'ref-browser-residential');

  const refMob = await unlocker.probe({ url: 'https://shop.example/', pool: 'ref-browser-mobile' });
  assert.equal(refMob.outcome, 'refused');
  await upstream.close();
  await target.close();
});
