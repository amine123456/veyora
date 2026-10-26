import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-accounts-'));
const dataFile = path.join(directory, 'state.json');
process.env.DATA_FILE = dataFile;
process.env.PACKAGES = 'one-gb:1000:200:usd';
const store = await import('../src/store.js');
const { createPaymentServer } = await import('../src/payments.js');

function request(port, { path: requestPath, body, headers = {}, method = 'POST' }) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const finalHeaders = body === undefined ? headers : { 'content-type': 'application/json', ...headers };
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: requestPath, headers: finalHeaders }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let json = null;
        try { json = JSON.parse(text); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, json });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

const cookieOf = (response) => response.headers['set-cookie']?.[0]?.split(';')[0];

async function withServer(run) {
  const server = createPaymentServer({
    stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 30, maxConcurrentAuth: 4,
    maxBodyBytes: 32_768, stripeTimeoutMs: 1_000, requestTimeoutMs: 5_000,
    successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/cancel',
    proxyEndpoint: { scheme: 'https', host: 'gate.example.test', port: 8443 },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test.after(() => rm(directory, { recursive: true, force: true }));

test('signup creates an account with its own proxy user and a hardened session cookie', async () => {
  await withServer(async (port) => {
    const signup = await request(port, { path: '/api/signup', body: { email: ' Ada@Example.com ', password: 'long enough password' } });
    assert.equal(signup.status, 201);
    assert.equal(signup.json.email, 'ada@example.com');
    assert.match(signup.json.username, /^px[0-9a-f]{10}$/);
    assert.equal(signup.json.remainingBytes, 0);

    const raw = signup.headers['set-cookie'][0];
    assert.match(raw, /^__Host-proxora_session=[A-Za-z0-9_-]{43};/);
    for (const attribute of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax']) assert.ok(raw.includes(attribute), attribute);

    const me = await request(port, { path: '/api/me', method: 'GET', headers: { cookie: cookieOf(signup) } });
    assert.equal(me.status, 200);
    assert.equal(me.json.username, signup.json.username);

    // The session token itself is never written to disk, only its hash.
    const state = JSON.parse(await readFile(process.env.DATA_FILE, 'utf8'));
    const token = cookieOf(signup).split('=')[1];
    assert.ok(!JSON.stringify(state).includes(token));
    assert.equal(state.clients[signup.json.username].email, 'ada@example.com');

    const duplicate = await request(port, { path: '/api/signup', body: { email: 'ADA@example.com', password: 'another long password' } });
    assert.equal(duplicate.status, 409);
    const weak = await request(port, { path: '/api/signup', body: { email: 'weak@example.com', password: 'short' } });
    assert.equal(weak.status, 400);
    const badEmail = await request(port, { path: '/api/signup', body: { email: 'not-an-email', password: 'long enough password' } });
    assert.equal(badEmail.status, 400);
  });
});

test('login, me and logout manage the session', async () => {
  await withServer(async (port) => {
    await request(port, { path: '/api/signup', body: { email: 'grace@example.com', password: 'grace password 123' } });

    const wrong = await request(port, { path: '/api/login', body: { email: 'grace@example.com', password: 'not the password' } });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers['set-cookie'], undefined);
    const unknown = await request(port, { path: '/api/login', body: { email: 'nobody@example.com', password: 'grace password 123' } });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.json.error, wrong.json.error);

    const login = await request(port, { path: '/api/login', body: { email: 'GRACE@example.com', password: 'grace password 123' } });
    assert.equal(login.status, 200);
    const cookie = cookieOf(login);
    assert.equal((await request(port, { path: '/api/me', method: 'GET', headers: { cookie } })).status, 200);

    const logout = await request(port, { path: '/api/logout', body: {}, headers: { cookie } });
    assert.equal(logout.status, 200);
    assert.match(logout.headers['set-cookie'][0], /Max-Age=0/);
    assert.equal((await request(port, { path: '/api/me', method: 'GET', headers: { cookie } })).status, 401);
    assert.equal((await request(port, { path: '/api/me', method: 'GET' })).status, 401);
  });
});

test('account pages redirect by session state', async () => {
  await withServer(async (port) => {
    const guestAccount = await request(port, { path: '/account', method: 'GET' });
    assert.equal(guestAccount.status, 302);
    assert.equal(guestAccount.headers.location, '/login');
    assert.equal((await request(port, { path: '/login', method: 'GET' })).status, 200);
    assert.equal((await request(port, { path: '/signup', method: 'GET' })).status, 200);

    const signup = await request(port, { path: '/api/signup', body: { email: 'linus@example.com', password: 'linus password 1' } });
    const cookie = cookieOf(signup);
    assert.equal((await request(port, { path: '/account', method: 'GET', headers: { cookie } })).status, 200);
    // Query strings (payment return, tracking links) must not break page lookup.
    assert.equal((await request(port, { path: '/account?paid=1', method: 'GET', headers: { cookie } })).status, 200);
    assert.equal((await request(port, { path: '/?utm_source=test', method: 'GET' })).status, 200);
    const signedInLogin = await request(port, { path: '/login', method: 'GET', headers: { cookie } });
    assert.equal(signedInLogin.status, 302);
    assert.equal(signedInLogin.headers.location, '/account');
  });
});

test('account endpoints reject cross-site and non-JSON requests', async () => {
  await withServer(async (port) => {
    const crossSite = await request(port, {
      path: '/api/signup',
      body: { email: 'mallory@example.com', password: 'mallory password' },
      headers: { origin: 'https://evil.example' },
    });
    assert.equal(crossSite.status, 403);
    const sameSite = await request(port, {
      path: '/api/signup',
      body: { email: 'alice@example.com', password: 'alice password 1' },
      headers: { origin: `http://127.0.0.1:${port}` },
    });
    assert.equal(sameSite.status, 201);

    const form = await request(port, { path: '/api/login', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.equal(form.status, 415);
  });
});

test('signups are capped per address per minute', async () => {
  await withServer(async (port) => {
    const statuses = [];
    for (let index = 0; index < 6; index += 1) {
      statuses.push((await request(port, { path: '/api/signup', body: { email: `burst${index}@example.com`, password: 'burst password 1' } })).status);
    }
    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429]);
  });
});

test('version 2 state files upgrade with an empty session table', async () => {
  const legacyDirectory = await mkdtemp(path.join(os.tmpdir(), 'proxy-legacy-'));
  const legacyFile = path.join(legacyDirectory, 'state.json');
  try {
    await writeFile(legacyFile, JSON.stringify({ version: 2, clients: {}, processedPayments: {}, pendingPayments: {}, lastUsageSeq: 0 }));
    process.env.DATA_FILE = legacyFile;
    const legacyStore = await import(`../src/store.js?legacy=${Date.now()}`);
    const account = await legacyStore.createAccount('legacy@example.com', 'legacy password 1');
    const saved = JSON.parse(await readFile(legacyFile, 'utf8'));
    assert.equal(saved.version, 3);
    assert.deepEqual(saved.sessions, {});
    assert.equal(saved.clients[account.username].email, 'legacy@example.com');
  } finally {
    process.env.DATA_FILE = dataFile;
    await rm(legacyDirectory, { recursive: true, force: true });
  }
});

test('dashboard data includes the public proxy endpoint', async () => {
  await withServer(async (port) => {
    const signup = await request(port, { path: '/api/signup', body: { email: 'endpoint@example.com', password: 'endpoint password' } });
    assert.deepEqual(signup.json.proxy, { scheme: 'https', host: 'gate.example.test', port: 8443 });
    const me = await request(port, { path: '/api/me', method: 'GET', headers: { cookie: cookieOf(signup) } });
    assert.deepEqual(me.json.proxy, { scheme: 'https', host: 'gate.example.test', port: 8443 });
  });
});

test('regenerating the proxy password shows it once and retires the old one', async () => {
  await withServer(async (port) => {
    const signup = await request(port, { path: '/api/signup', body: { email: 'rotate@example.com', password: 'rotate password 1' } });
    const cookie = cookieOf(signup);
    const { username } = signup.json;

    assert.equal((await request(port, { path: '/api/proxy-password', body: {} })).status, 401);
    const crossSite = await request(port, { path: '/api/proxy-password', body: {}, headers: { cookie, origin: 'https://evil.example' } });
    assert.equal(crossSite.status, 403);

    const first = await request(port, { path: '/api/proxy-password', body: {}, headers: { cookie } });
    assert.equal(first.status, 200);
    assert.match(first.json.password, /^[A-Za-z0-9_-]{32}$/);
    assert.equal(first.headers['cache-control'], 'no-store');
    assert.equal((await store.authenticate(username, first.json.password)).username, username);

    const second = await request(port, { path: '/api/proxy-password', body: {}, headers: { cookie } });
    assert.notEqual(second.json.password, first.json.password);
    assert.equal(await store.authenticate(username, first.json.password), null);
    assert.equal((await store.authenticate(username, second.json.password)).username, username);

    const state = JSON.parse(await readFile(process.env.DATA_FILE, 'utf8'));
    assert.ok(!JSON.stringify(state).includes(second.json.password));
  });
});

test('PUBLIC_PROXY_URL sets the endpoint shown to customers', async () => {
  const { paymentConfig } = await import('../src/config.js');
  const saved = { ...process.env };
  try {
    process.env.PUBLIC_PROXY_URL = 'https://gate.proxora.test:8443';
    assert.deepEqual({ ...paymentConfig().proxyEndpoint }, { scheme: 'https', host: 'gate.proxora.test', port: 8443 });

    delete process.env.PUBLIC_PROXY_URL;
    process.env.PROXY_HOST = '127.0.0.1';
    process.env.PROXY_PORT = '9090';
    delete process.env.PROXY_TLS_CERT_FILE;
    assert.deepEqual({ ...paymentConfig().proxyEndpoint }, { scheme: 'http', host: '127.0.0.1', port: 9090 });

    for (const bad of ['https://user:pw@gate.test:1', 'socks5://gate.test:1080', 'https://gate.test/path']) {
      process.env.PUBLIC_PROXY_URL = bad;
      assert.throws(() => paymentConfig(), /PUBLIC_PROXY_URL/, bad);
    }
  } finally {
    for (const key of ['PUBLIC_PROXY_URL', 'PROXY_HOST', 'PROXY_PORT', 'PROXY_TLS_CERT_FILE']) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  }
});

test('admin-created clients keep working without an email', async () => {
  await store.createClient('admin-made', 'admin made client password', 5);
  const client = await store.getClient('admin-made');
  assert.equal(client.email, null);
  assert.equal(await store.verifyAccount('admin-made', 'admin made client password'), null);
});
