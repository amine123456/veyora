import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { query } from './helpers/database.js';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-delivery-'));
process.env.DATA_FILE = path.join(directory, 'state.json');
const { createPaymentServer } = await import('../src/payments.js');
const { createSubscription, activateSubscription } = await import('../src/feeds-store.js');
const { openSecret } = await import('../src/secret-box.js');
const { downloadSignature } = await import('../src/feed-downloads.js');
const { createApiKey } = await import('../src/store.js');

const key = crypto.randomBytes(32);

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
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

async function withServer(run, overrides = {}) {
  const server = createPaymentServer({
    stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 30, maxConcurrentAuth: 4,
    maxBodyBytes: 32_768, stripeTimeoutMs: 1_000, requestTimeoutMs: 5_000,
    successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/cancel',
    proxyEndpoint: { scheme: 'https', host: 'gate.example.test', port: 8443 },
    deliverySecretKey: key, deliveryExportDir: path.join(directory, 'exports'),
    ...overrides,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await run(server.address().port); } finally { await new Promise((resolve) => server.close(resolve)); }
}

async function signedInWithFeed(port, email) {
  const signup = await request(port, { path: '/api/signup', body: { email, password: 'long enough password' } });
  const sub = await createSubscription(signup.json.username, 'mobilede', { frequency: 'daily', deliveryMethod: 'sftp', priceCents: 35000, currency: 'eur' });
  await activateSubscription(sub.id);
  return { sub };
}

function sessionCookie(port, email) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ email, password: 'long enough password' });
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/api/login', headers: { 'content-type': 'application/json' } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.headers['set-cookie'][0].split(';')[0]));
    });
    req.on('error', reject);
    req.end(payload);
  });
}

test.after(() => rm(directory, { recursive: true, force: true }));

test('bucket credentials are stored encrypted and never returned to the browser', async () => {
  await withServer(async (port) => {
    const { sub } = await signedInWithFeed(port, 'ines@example.com');
    const cookie = await sessionCookie(port, 'ines@example.com');
    const save = await request(port, {
      path: `/api/subscriptions/${sub.id}/delivery-config`, headers: { cookie },
      body: { method: 's3', format: 'csv', bucket: 'acme-data', bucket_region: 'eu-west-1', access_key_id: 'AKIAABCDEFGHIJKLMNOP', secret_access_key: 'top-secret-value' },
    });
    assert.equal(save.status, 200, save.text);
    assert.deepEqual([save.json.method, save.json.format], ['s3', 'csv']);

    const { rows } = await query('SELECT * FROM delivery_configs WHERE subscription_id = $1', [sub.id]);
    assert.match(rows[0].secret_access_key, /^v1:/);
    assert.ok(!JSON.stringify(rows).includes('top-secret-value'));
    assert.equal(openSecret(key, rows[0].secret_access_key), 'top-secret-value');

    const list = await request(port, { path: '/api/subscriptions', method: 'GET', headers: { cookie } });
    const listed = JSON.stringify(list.json);
    assert.ok(!listed.includes('top-secret-value') && !listed.includes(rows[0].secret_access_key));
    const dc = list.json.subscriptions[0].delivery_config;
    assert.deepEqual([dc.method, dc.bucket, dc.has_secret_access_key], ['s3', 'acme-data', true]);

    // Editing without re-entering the secret keeps it.
    const edit = await request(port, {
      path: `/api/subscriptions/${sub.id}/delivery-config`, headers: { cookie },
      body: { method: 's3', bucket: 'acme-data', bucket_prefix: 'daily', bucket_region: 'eu-west-1', access_key_id: 'AKIAABCDEFGHIJKLMNOP' },
    });
    assert.equal(edit.status, 200, edit.text);
    const after = await query('SELECT secret_access_key, bucket_prefix FROM delivery_configs WHERE subscription_id = $1', [sub.id]);
    assert.equal(after.rows[0].secret_access_key, rows[0].secret_access_key);
    assert.equal(after.rows[0].bucket_prefix, 'daily');
  });
});

test('delivery settings are validated and need the encryption key for secrets', async () => {
  await withServer(async (port) => {
    const { sub } = await signedInWithFeed(port, 'omar@example.com');
    const cookie = await sessionCookie(port, 'omar@example.com');
    const save = (body) => request(port, { path: `/api/subscriptions/${sub.id}/delivery-config`, headers: { cookie }, body });
    assert.equal((await save({ method: 'webhook', webhook_url: 'https://10.0.0.5/hook' })).status, 400);
    assert.equal((await save({ method: 's3', bucket: 'acme-data', access_key_id: 'AKIAABCDEFGHIJKLMNOP' })).status, 400);
    assert.equal((await save({ method: 'carrier-pigeon' })).status, 400);
    assert.equal((await save({ method: 'api', format: 'parquet' })).status, 200);
  });
  await withServer(async (port) => {
    const { sub } = await signedInWithFeed(port, 'lena@example.com');
    const cookie = await sessionCookie(port, 'lena@example.com');
    const noKey = await request(port, {
      path: `/api/subscriptions/${sub.id}/delivery-config`, headers: { cookie },
      body: { method: 's3', bucket: 'acme-data', access_key_id: 'AKIAABCDEFGHIJKLMNOP', secret_access_key: 's' },
    });
    assert.equal(noKey.status, 503);
    const { rows } = await query('SELECT 1 FROM delivery_configs WHERE subscription_id = $1', [sub.id]);
    assert.equal(rows.length, 0);
  }, { deliverySecretKey: null });
});

async function deliveredExport(sub, contents, { exportPath } = {}) {
  const file = exportPath ?? path.join(directory, 'exports', 'mobilede', '2026-11-21', 'mobilede_20261121.csv');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
  const { rows } = await query(
    `INSERT INTO delivery_logs (subscription_id, feed_id, snapshot_date, status, format, export_path, sha256, completed_at)
     VALUES ($1, 'mobilede', '2026-11-21', 'delivered', 'csv', $2, 'abc123', now()) RETURNING id`,
    [sub.id, file],
  );
  return rows[0].id;
}

test('API pull serves the latest export only to the subscription owner\'s keys', async () => {
  await withServer(async (port) => {
    const { sub } = await signedInWithFeed(port, 'puller@example.com');
    const [{ username }] = (await query("SELECT username FROM clients WHERE email = 'puller@example.com'")).rows;
    const { key } = await createApiKey(username, 'pull');
    const latest = (headers = {}) => request(port, { path: `/v1/feeds/${sub.id}/latest`, method: 'GET', headers });

    assert.equal((await latest()).status, 401);
    assert.equal((await latest({ authorization: 'Bearer vy_live_not-a-real-key' })).status, 401);
    assert.equal((await latest({ authorization: `Bearer ${key}` })).status, 404);

    await deliveredExport(sub, 'id,make\n1,BMW\n');
    const ok = await latest({ authorization: `Bearer ${key}` });
    assert.equal(ok.status, 200);
    assert.equal(ok.text, 'id,make\n1,BMW\n');

    await request(port, { path: '/api/signup', body: { email: 'stranger@example.com', password: 'long enough password' } });
    const [{ username: stranger }] = (await query("SELECT username FROM clients WHERE email = 'stranger@example.com'")).rows;
    const { key: strangerKey } = await createApiKey(stranger, 'other');
    assert.equal((await latest({ authorization: `Bearer ${strangerKey}` })).status, 404);
  });
});

test('signed download links work until they expire and refuse tampering or stray paths', async () => {
  await withServer(async (port) => {
    const { sub } = await signedInWithFeed(port, 'hooked@example.com');
    const logId = await deliveredExport(sub, 'records');
    const link = (expires, sig = downloadSignature(key, sub.id, logId, expires)) =>
      request(port, { path: `/v1/feeds/${sub.id}/deliveries/${logId}/file?expires=${expires}&sig=${sig}`, method: 'GET' });
    const future = Math.floor(Date.now() / 1000) + 3600;
    const ok = await link(future);
    assert.equal(ok.status, 200);
    assert.equal(ok.text, 'records');
    assert.equal((await link(future, '0'.repeat(64))).status, 403);
    assert.equal((await link(future + 1, downloadSignature(key, sub.id, logId, future))).status, 403);
    assert.equal((await link(Math.floor(Date.now() / 1000) - 60)).status, 410);

    const outside = await deliveredExport(sub, 'secret', { exportPath: path.join(directory, 'not-exports.txt') });
    const sig = downloadSignature(key, sub.id, outside, future);
    const stray = await request(port, { path: `/v1/feeds/${sub.id}/deliveries/${outside}/file?expires=${future}&sig=${sig}`, method: 'GET' });
    assert.equal(stray.status, 404);
  });
});

test('Test connection runs the tester and records its result', async () => {
  const calls = [];
  await withServer(async (port) => {
    const { sub } = await signedInWithFeed(port, 'tester@example.com');
    const cookie = await sessionCookie(port, 'tester@example.com');
    const run = () => request(port, { path: `/api/subscriptions/${sub.id}/delivery-test`, headers: { cookie }, body: {} });
    assert.equal((await run()).status, 400);
    await request(port, { path: `/api/subscriptions/${sub.id}/delivery-config`, headers: { cookie }, body: { method: 'api' } });
    const result = await run();
    assert.deepEqual(result.json, { ok: false, error: 'The bucket refused these keys (access denied)' });
    assert.deepEqual(calls, [sub.id]);
    const { rows } = await query('SELECT last_test_ok, last_test_error FROM delivery_configs WHERE subscription_id = $1', [sub.id]);
    assert.deepEqual(rows[0], { last_test_ok: false, last_test_error: 'The bucket refused these keys (access denied)' });
  }, { deliveryTester: async (id) => { calls.push(id); return { ok: false, error: 'The bucket refused these keys (access denied)' }; } });
});

test('another account cannot read or change a subscription\'s delivery', async () => {
  await withServer(async (port) => {
    const { sub } = await signedInWithFeed(port, 'owner@example.com');
    await request(port, { path: '/api/signup', body: { email: 'other@example.com', password: 'long enough password' } });
    const cookie = await sessionCookie(port, 'other@example.com');
    const attempt = await request(port, { path: `/api/subscriptions/${sub.id}/delivery-config`, headers: { cookie }, body: { method: 'api' } });
    assert.equal(attempt.status, 404);
  });
});
