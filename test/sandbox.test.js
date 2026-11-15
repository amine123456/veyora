import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { close, fakeUpstream, listen, publicLookup, targetCert, tlsTarget } from './helpers/fake-upstream.js';
import { query } from './helpers/database.js';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-sandbox-'));
process.env.DATA_FILE = path.join(directory, 'state.json');
const store = await import('../src/store.js');
const { createUnlocker } = await import('../src/unlocker.js');
const { SCENARIOS } = await import('../src/sandbox.js');
const { createPaymentServer } = await import('../src/payments.js');

test.after(() => rm(directory, { recursive: true, force: true }));

const PAGE = `<html><head><title>Shop</title></head><body>${'product '.repeat(200)}</body></html>`;
const pricing = { unlockerPerRequestMicros: 800, premiumDomains: new Map(), costResidentialPerGbMicros: 150_000, costMobilePerGbMicros: 290_000 };
const settings = (overrides = {}) => ({
  enabled: true, maxAttempts: 2, attemptTimeoutMs: 5_000, totalTimeoutMs: 20_000,
  maxResponseBytes: 2 * 1024 * 1024, minBodyBytes: 512, requestsPerMinutePerKey: 1_000,
  maxConcurrentPerAccount: 10, maxConcurrent: 100, flagMinRequests: 20, blockedDomains: new Set(['ticketmaster.com']),
  solverSurchargeMicros: 5_000,
  sandboxEnabled: true, sandboxHost: 'sandbox.veyora.pro', sandboxLiveDaily: 3, sandboxLiveGlobalDaily: 1_000, sandboxMaxConcurrentPerAccount: 2,
  ledgerFile: path.join(directory, `ledger-${Math.random().toString(16).slice(2)}.jsonl`),
  ...overrides,
});

let accounts = 0;
async function customer({ usd = 0 } = {}) {
  accounts += 1;
  const account = await store.createAccount(`sandbox-${accounts}@example.com`, 'long enough password');
  // New accounts start with a $1 signup credit: set the wallet to exactly `usd`.
  await store.reserveFunds(account.username, 1_000_000);
  if (usd > 0) await store.creditWallet(account.username, Math.round(usd * 1_000_000));
  const live = await store.createApiKey(account.username, 'live');
  const sandbox = await store.createApiKey(account.username, 'sandbox', { mode: 'test' });
  return { username: account.username, email: `sandbox-${accounts}@example.com`, liveKey: live.key, testKey: sandbox.key };
}
const balance = async (username) => (await store.getClient(username)).balanceMicros;

function send(port, { path: requestPath = '/v1/unlock', method = 'POST', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, method, path: requestPath, headers: { 'content-type': 'application/json', ...headers } }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        let json = null;
        try { json = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* not JSON */ }
        resolve({ status: response.statusCode, headers: response.headers, json });
      });
    });
    request.on('error', reject);
    request.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

async function harness(handler, config, run) {
  const target = await tlsTarget(handler);
  const upstream = await fakeUpstream({ 'shop.example:443': target.port });
  const gateway = {
    upstreamHost: '127.0.0.1', upstreamPort: upstream.port, upstreamUsername: 'res-user', upstreamPassword: 'r',
    upstreamTls: false, upstreamSessionTtlSeconds: 600, dnsTimeoutMs: 1_000, upstreamMobile: null,
  };
  const unlocker = createUnlocker({ gateway, pricing, config: settings(config), lookup: publicLookup, tlsOptions: { ca: targetCert }, log: { info() {}, warn() {}, error() {} } });
  const server = http.createServer((request, response) => unlocker.handle(request, response, request.socket.remoteAddress));
  const port = await listen(server);
  const call = (body, key) => send(port, { headers: { authorization: `Bearer ${key}` }, body });
  try {
    await run({ call, upstream, unlocker, port });
  } finally {
    await close(server);
    await upstream.close();
    await target.close();
  }
}

test('sandbox keys are marked as such and are told apart from live keys', async () => {
  const user = await customer();
  assert.match(user.testKey, /^vy_test_[A-Za-z0-9_-]{43}$/);
  assert.equal((await store.authenticateApiKey(user.testKey)).keyMode, 'test');
  assert.equal((await store.authenticateApiKey(user.liveKey)).keyMode, 'live');
  assert.deepEqual((await store.listApiKeys(user.username)).map((key) => key.mode), ['live', 'test']);
  await assert.rejects(store.createApiKey(user.username, 'x', { mode: 'admin' }), /live or test/);
});

test('every simulated scenario answers in the shape of the real API and costs nothing', async () => {
  let reached = 0;
  await harness((req, res) => { reached += 1; res.end(PAGE); }, {}, async ({ call }) => {
    const user = await customer({ usd: 1 });
    for (const key of [user.testKey, user.liveKey]) {
      for (const scenario of SCENARIOS) {
        const fast = ['/slow', '/hard', '/blocked', '/timeout'].includes(scenario.path) ? '?ms=0' : '';
        const response = await call({ url: `https://sandbox.veyora.pro${scenario.path}${fast}`, country: 'de', session: 'job1' }, key);
        assert.ok([200, 402, 429, 502, 503, 504].includes(response.status), `${scenario.path}: ${response.status}`);
        if (response.json.success !== undefined) {
          assert.equal(response.json.billedMicros, 0);
          assert.match(response.json.requestId, /^unl_test_[0-9a-f]{16}$/);
          assert.ok(Array.isArray(response.json.attempts) && response.json.attempts.length > 0);
        }
        assert.equal(response.json.sandbox.mode, 'simulated');
        assert.equal(response.json.sandbox.scenario, scenario.path);
      }
    }
    assert.equal(await balance(user.username), 1_000_000);
    assert.equal(reached, 0, 'sandbox URLs must never be fetched');

    const ok = await call({ url: 'https://sandbox.veyora.pro/ok', country: 'de' }, user.testKey);
    assert.equal(ok.json.success, true);
    assert.equal(ok.json.status, 200);
    assert.match(ok.json.body, /Exit country: de/);
    assert.equal(ok.json.sandbox.wouldBillMicros, 800);
    assert.equal((await call({ url: 'https://sandbox.veyora.pro/' }, user.testKey)).json.sandbox.scenario, '/ok');

    const hard = await call({ url: 'https://sandbox.veyora.pro/hard?ms=0' }, user.testKey);
    assert.equal(hard.json.sandbox.wouldBillMicros, 5_800);
    assert.equal(hard.json.attempts.at(-1).solver, true);

    const binary = await call({ url: 'https://sandbox.veyora.pro/binary' }, user.testKey);
    assert.equal(binary.json.encoding, 'base64');
    assert.equal(Buffer.from(binary.json.body, 'base64').subarray(1, 4).toString(), 'PNG');

    const blocked = await call({ url: 'https://sandbox.veyora.pro/blocked?ms=0' }, user.testKey);
    assert.deepEqual([blocked.status, blocked.json.success, blocked.json.sandbox.wouldBillMicros], [502, false, 0]);
    assert.equal((await call({ url: 'https://sandbox.veyora.pro/timeout?ms=0' }, user.testKey)).status, 504);
    const limited = await call({ url: 'https://sandbox.veyora.pro/rate-limited' }, user.testKey);
    assert.deepEqual([limited.status, limited.headers['retry-after']], [429, '60']);
    assert.equal((await call({ url: 'https://sandbox.veyora.pro/insufficient-balance' }, user.testKey)).status, 402);
    const notFound = await call({ url: 'https://sandbox.veyora.pro/not-found' }, user.testKey);
    assert.deepEqual([notFound.status, notFound.json.status, notFound.json.success], [200, 404, true]);
    const unknown = await call({ url: 'https://sandbox.veyora.pro/nope' }, user.testKey);
    assert.equal(unknown.status, 404);
    assert.match(unknown.json.error, /sandbox\.veyora\.pro\/ok/);
  });
});

test('a sandbox key fetches real pages for free until the daily allowance runs out', async () => {
  await harness((req, res) => res.end(PAGE), {}, async ({ call }) => {
    const user = await customer(); // empty wallet
    for (let remaining = 2; remaining >= 0; remaining -= 1) {
      const response = await call({ url: 'https://shop.example/' }, user.testKey);
      assert.equal(response.status, 200);
      assert.equal(response.json.success, true);
      assert.equal(response.json.billedMicros, 0);
      assert.match(response.json.body, /product/);
      assert.deepEqual(response.json.sandbox, { mode: 'live', wouldBillMicros: 800, liveRemaining: remaining, liveDailyLimit: 3 });
    }
    const over = await call({ url: 'https://shop.example/' }, user.testKey);
    assert.equal(over.status, 429);
    assert.match(over.json.error, /Sandbox allowance used up \(3 live test requests per day\)/);
    // Simulated pages stay available, and the live key is unaffected (and still needs funds).
    assert.equal((await call({ url: 'https://sandbox.veyora.pro/ok' }, user.testKey)).status, 200);
    assert.equal((await call({ url: 'https://shop.example/' }, user.liveKey)).status, 402);
    assert.equal(await balance(user.username), 0);

    const { rows } = await query("SELECT kind, billed, cost_micros FROM usage_events WHERE username = $1", [user.username]);
    assert.equal(rows.length, 3);
    assert.ok(rows.every((row) => row.kind === 'sandbox' && row.billed === false && Number(row.cost_micros) === 0));
  });
});

test('a failed sandbox fetch does not use up the allowance; blocked sites and SSRF stay refused', async () => {
  await harness((req, res) => { res.statusCode = 403; res.end('denied'); }, {}, async ({ call }) => {
    const user = await customer();
    const blocked = await call({ url: 'https://shop.example/' }, user.testKey);
    assert.equal(blocked.status, 502);
    assert.equal(blocked.json.sandbox.liveRemaining, 3);
    assert.equal(await store.sandboxLiveUsed(user.username), 0);
    assert.equal((await call({ url: 'https://www.ticketmaster.com/' }, user.testKey)).status, 403);
    assert.equal((await call({ url: 'http://127.0.0.1/' }, user.testKey)).status, 403);
    assert.equal((await call({ url: 'http://169.254.169.254/latest/meta-data' }, user.testKey)).status, 403);
  });
});

test('the service-wide daily cap stops live sandbox fetches for everyone', async () => {
  await harness((req, res) => res.end(PAGE), { sandboxLiveGlobalDaily: 0 }, async ({ call }) => {
    const user = await customer();
    assert.equal((await call({ url: 'https://shop.example/' }, user.testKey)).status, 429);
  });
});

test('with the sandbox off, test keys are refused and the sandbox host is an ordinary URL', async () => {
  await harness((req, res) => res.end(PAGE), { sandboxEnabled: false }, async ({ call }) => {
    const user = await customer({ usd: 1 });
    assert.equal((await call({ url: 'https://shop.example/' }, user.testKey)).status, 403);
    assert.equal((await call({ url: 'https://shop.example/' }, user.liveKey)).status, 200);
    assert.equal(await balance(user.username), 1_000_000 - 800);
  });
});

test('a live request is not charged when the caller hangs up before the page is ready', async () => {
  let release;
  const arrived = new Promise((resolve) => { release = resolve; });
  let finish;
  await harness((req, res) => { release(); finish = () => res.end(PAGE); }, {}, async ({ port, unlocker }) => {
    const user = await customer({ usd: 1 });
    const request = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/v1/unlock', headers: { 'content-type': 'application/json', authorization: `Bearer ${user.liveKey}` } });
    request.on('error', () => {});
    request.end(JSON.stringify({ url: 'https://shop.example/' }));
    await arrived;
    request.destroy();
    await new Promise((resolve) => setTimeout(resolve, 100));
    finish();
    for (let tries = 0; tries < 50 && unlocker.memory().inFlight > 0; tries += 1) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(unlocker.memory().inFlight, 0);
    assert.equal(await balance(user.username), 1_000_000);
  });
});

test('dashboard playground: session only, same-origin, shares the allowance, creates sandbox keys', async () => {
  const target = await tlsTarget((req, res) => res.end(PAGE));
  const upstream = await fakeUpstream({ 'shop.example:443': target.port });
  const gateway = { upstreamHost: '127.0.0.1', upstreamPort: upstream.port, upstreamUsername: 'res-user', upstreamPassword: 'r', upstreamTls: false, upstreamSessionTtlSeconds: 600, dnsTimeoutMs: 1_000, upstreamMobile: null };
  const unlocker = createUnlocker({ gateway, pricing, config: settings(), lookup: publicLookup, tlsOptions: { ca: targetCert }, log: { info() {}, warn() {}, error() {} } });
  const server = createPaymentServer({ authAttemptsPerMinute: 30, maxConcurrentAuth: 4, maxBodyBytes: 32_768, requestTimeoutMs: 5_000 }, { unlocker, pricing });
  const port = await listen(server);
  const origin = { origin: `http://127.0.0.1:${port}`, host: `127.0.0.1:${port}` };
  try {
    const user = await customer();
    assert.equal((await send(port, { path: '/api/sandbox', method: 'GET' })).status, 401);
    assert.equal((await send(port, { path: '/api/sandbox/unlock', headers: origin, body: { url: 'https://sandbox.veyora.pro/ok' } })).status, 401);

    const login = await send(port, { path: '/api/login', headers: origin, body: { email: user.email, password: 'long enough password' } });
    assert.equal(login.status, 200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];

    const status = await send(port, { path: '/api/sandbox', method: 'GET', headers: { cookie } });
    assert.equal(status.status, 200);
    assert.deepEqual([status.json.enabled, status.json.host, status.json.liveDailyLimit, status.json.liveUsed], [true, 'sandbox.veyora.pro', 3, 0]);
    assert.equal(status.json.scenarios.length, SCENARIOS.length);

    const foreign = await send(port, { path: '/api/sandbox/unlock', headers: { cookie, origin: 'https://evil.example', host: origin.host }, body: { url: 'https://sandbox.veyora.pro/ok' } });
    assert.equal(foreign.status, 403);

    const simulated = await send(port, { path: '/api/sandbox/unlock', headers: { cookie, ...origin }, body: { url: 'https://sandbox.veyora.pro/ok' } });
    assert.deepEqual([simulated.status, simulated.json.success, simulated.json.sandbox.mode], [200, true, 'simulated']);

    const live = await send(port, { path: '/api/sandbox/unlock', headers: { cookie, ...origin }, body: { url: 'https://shop.example/' } });
    assert.deepEqual([live.status, live.json.success, live.json.billedMicros, live.json.sandbox.liveRemaining], [200, true, 0, 2]);
    assert.equal((await send(port, { path: '/api/sandbox', method: 'GET', headers: { cookie } })).json.liveUsed, 1);

    const created = await send(port, { path: '/api/keys', headers: { cookie, ...origin }, body: { name: 'ci', mode: 'test' } });
    assert.equal(created.status, 201);
    assert.match(created.json.key, /^vy_test_/);
    assert.equal(created.json.mode, 'test');
  } finally {
    await close(server);
    await upstream.close();
    await target.close();
  }
});
