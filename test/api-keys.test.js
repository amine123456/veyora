import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-api-keys-'));
process.env.DATA_FILE = path.join(directory, 'state.json');
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
        let json = null;
        try { json = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, json });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

async function withServer(run) {
  const server = createPaymentServer({
    stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 30, maxConcurrentAuth: 4,
    maxBodyBytes: 32_768, stripeTimeoutMs: 1_000, requestTimeoutMs: 5_000,
    successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/cancel',
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function signedUp(port, email) {
  const signup = await request(port, { path: '/api/signup', body: { email, password: 'long enough password' } });
  assert.equal(signup.status, 201);
  return { cookie: signup.headers['set-cookie'][0].split(';')[0], username: signup.json.username };
}

test.after(() => rm(directory, { recursive: true, force: true }));

test('a key is shown once, stored only as a hash, and authenticates its account', async () => {
  const account = await store.createAccount('keys-a@example.com', 'long enough password');
  const created = await store.createApiKey(account.username, 'scraper');
  assert.match(created.key, /^vy_live_[A-Za-z0-9_-]{43}$/);
  assert.match(created.id, /^key_[0-9a-f]{16}$/);
  assert.equal(created.prefix, created.key.slice(0, 12));
  assert.equal(created.name, 'scraper');

  const listed = await store.listApiKeys(account.username);
  assert.deepEqual(listed, [{ id: created.id, name: 'scraper', prefix: created.prefix, createdAt: created.createdAt }]);
  const disk = await readFile(process.env.DATA_FILE, 'utf8');
  assert.equal(disk.includes(created.key), false);

  const found = await store.authenticateApiKey(created.key);
  assert.equal(found.username, account.username);
  assert.equal(found.apiKeyId, created.id);
  const last = created.key.at(-1) === 'x' ? 'y' : 'x';
  assert.equal(await store.authenticateApiKey(`${created.key.slice(0, -1)}${last}`), null);
  assert.equal(await store.authenticateApiKey('vy_live_short'), null);
  assert.equal(await store.authenticateApiKey(undefined), null);
});

test('revoked keys and disabled accounts stop authenticating', async () => {
  const account = await store.createAccount('keys-b@example.com', 'long enough password');
  const first = await store.createApiKey(account.username);
  const second = await store.createApiKey(account.username);
  assert.equal(await store.revokeApiKey(account.username, first.id), true);
  assert.equal(await store.revokeApiKey(account.username, first.id), false);
  assert.equal(await store.authenticateApiKey(first.key), null);
  assert.ok(await store.authenticateApiKey(second.key));

  // A different account cannot revoke this key.
  const other = await store.createAccount('keys-c@example.com', 'long enough password');
  assert.equal(await store.revokeApiKey(other.username, second.id), false);
  assert.ok(await store.authenticateApiKey(second.key));

  await store.setEnabled(account.username, false);
  assert.equal(await store.authenticateApiKey(second.key), null);
  await assert.rejects(store.createApiKey(account.username), /Unknown client/);
});

test('each account is capped at 10 keys and names are validated', async () => {
  const account = await store.createAccount('keys-d@example.com', 'long enough password');
  await assert.rejects(store.createApiKey(account.username, 'x'.repeat(41)), (error) => error.code === 'INVALID_NAME');
  await assert.rejects(store.createApiKey(account.username, 'bad\nname'), (error) => error.code === 'INVALID_NAME');
  for (let index = 0; index < 10; index += 1) await store.createApiKey(account.username, `k${index}`);
  await assert.rejects(store.createApiKey(account.username), (error) => error.code === 'TOO_MANY_KEYS');
  assert.equal((await store.listApiKeys(account.username)).length, 10);
});

test('keys survive a restart', async () => {
  const account = await store.createAccount('keys-e@example.com', 'long enough password');
  const created = await store.createApiKey(account.username, 'persisted');
  const reloaded = await import(`../src/store.js?reload=${Date.now()}`);
  assert.equal((await reloaded.authenticateApiKey(created.key)).username, account.username);
});

test('the dashboard issues, lists and revokes keys for the signed-in account only', async () => {
  await withServer(async (port) => {
    assert.equal((await request(port, { path: '/api/keys', method: 'GET' })).status, 401);
    assert.equal((await request(port, { path: '/api/keys', body: {} })).status, 401);

    const { cookie, username } = await signedUp(port, 'dash-keys@example.com');
    const crossSite = await request(port, { path: '/api/keys', body: { name: 'x' }, headers: { cookie, origin: 'https://evil.example' } });
    assert.equal(crossSite.status, 403);
    const wrongType = await request(port, { path: '/api/keys', method: 'POST', headers: { cookie, 'content-type': 'text/plain' } });
    assert.equal(wrongType.status, 415);

    const created = await request(port, { path: '/api/keys', body: { name: 'prod' }, headers: { cookie } });
    assert.equal(created.status, 201);
    assert.equal(created.headers['cache-control'], 'no-store');
    assert.match(created.json.key, /^vy_live_/);
    assert.equal((await store.authenticateApiKey(created.json.key)).username, username);

    const listed = await request(port, { path: '/api/keys', method: 'GET', headers: { cookie } });
    assert.equal(listed.status, 200);
    assert.equal(listed.json.keys.length, 1);
    assert.equal(listed.json.keys[0].key, undefined); // the secret is never listed

    const invalid = await request(port, { path: '/api/keys', body: { name: 'y'.repeat(41) }, headers: { cookie } });
    assert.equal(invalid.status, 400);

    // Another signed-in user cannot revoke it.
    const intruder = await signedUp(port, 'intruder-keys@example.com');
    const stolen = await request(port, { path: '/api/keys/revoke', body: { id: created.json.id }, headers: { cookie: intruder.cookie } });
    assert.equal(stolen.status, 404);

    const revoked = await request(port, { path: '/api/keys/revoke', body: { id: created.json.id }, headers: { cookie } });
    assert.equal(revoked.status, 200);
    assert.equal(await store.authenticateApiKey(created.json.key), null);
    assert.equal((await request(port, { path: '/api/keys/revoke', method: 'GET', headers: { cookie } })).status, 405);

    const me = await request(port, { path: '/api/me', method: 'GET', headers: { cookie } });
    assert.equal(me.json.balanceMicros, 0);
    assert.deepEqual([me.json.prices, me.json.mobile, me.json.unlocker], [null, false, false]); // nothing configured here
  });
});
