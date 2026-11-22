import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { query } from './helpers/database.js';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-delivery-'));
process.env.DATA_FILE = path.join(directory, 'state.json');
const { createPaymentServer } = await import('../src/payments.js');
const { createSubscription, activateSubscription } = await import('../src/feeds-store.js');
const { openSecret } = await import('../src/secret-box.js');

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

test('another account cannot read or change a subscription\'s delivery', async () => {
  await withServer(async (port) => {
    const { sub } = await signedInWithFeed(port, 'owner@example.com');
    await request(port, { path: '/api/signup', body: { email: 'other@example.com', password: 'long enough password' } });
    const cookie = await sessionCookie(port, 'other@example.com');
    const attempt = await request(port, { path: `/api/subscriptions/${sub.id}/delivery-config`, headers: { cookie }, body: { method: 'api' } });
    assert.equal(attempt.status, 404);
  });
});
