import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import './helpers/database.js';

function request(port, { path: requestPath, method = 'GET', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: requestPath, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.end(body);
    else req.end();
  });
}

function post(port, path, body, headers = {}) {
  return request(port, {
    path,
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://localhost', ...headers },
    body: JSON.stringify(body),
  });
}

function extractCookie(res) {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map(c => c.split(';')[0]).join('; ');
}

test('usage and payment API endpoints', async (t) => {
  const store = await import('../src/store.js');
  const { createPaymentServer } = await import('../src/payments.js');

  const username = 'usage-test-user';
  const password = 'test-password-long-enough';
  await store.createClient(username, password, 0);

  const config = {
    authAttemptsPerMinute: 30,
    maxConcurrentAuth: 4,
    maxBodyBytes: 32_768,
    requestTimeoutMs: 5_000,
  };

  const server = createPaymentServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  t.after(() => new Promise((resolve) => server.close(resolve)));

  // Log in to get a session cookie
  const loginRes = await post(port, '/api/login', { email: username, password });
  assert.equal(loginRes.status, 200);
  const cookie = extractCookie(loginRes);
  assert.ok(cookie, 'login should set a session cookie');

  await t.test('GET /api/usage/events returns empty array for new user', async () => {
    const res = await request(port, { path: '/api/usage/events', headers: { cookie } });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.events));
    assert.equal(res.data.events.length, 0);
  });

  await t.test('GET /api/usage/summary returns empty array for new user', async () => {
    const res = await request(port, { path: '/api/usage/summary', headers: { cookie } });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.summary));
    assert.equal(res.data.summary.length, 0);
  });

  await t.test('GET /api/payments returns empty array for new user', async () => {
    const res = await request(port, { path: '/api/payments', headers: { cookie } });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.payments));
    assert.equal(res.data.payments.length, 0);
  });

  await t.test('usage endpoints require auth', async () => {
    const r1 = await request(port, { path: '/api/usage/events' });
    assert.equal(r1.status, 401);
    const r2 = await request(port, { path: '/api/usage/summary' });
    assert.equal(r2.status, 401);
    const r3 = await request(port, { path: '/api/payments' });
    assert.equal(r3.status, 401);
  });

  await t.test('insert usage event and retrieve it', async () => {
    await store.insertUsageEvent({
      username,
      kind: 'proxy',
      pool: 'residential',
      domain: 'example.com',
      status: 200,
      outcome: 'ok',
      bytes: 4096,
      costMicros: 500,
      billed: true,
      durationMs: 150,
    });

    const res = await request(port, { path: '/api/usage/events', headers: { cookie } });
    assert.equal(res.status, 200);
    assert.equal(res.data.events.length, 1);
    const event = res.data.events[0];
    assert.equal(event.kind, 'proxy');
    assert.equal(event.domain, 'example.com');
    assert.equal(event.status, 200);
    assert.equal(event.bytes, 4096);
    assert.equal(event.costMicros, 500);
    assert.equal(event.billed, true);
  });

  await t.test('usage summary aggregates the inserted event', async () => {
    const res = await request(port, { path: '/api/usage/summary?days=30', headers: { cookie } });
    assert.equal(res.status, 200);
    assert.ok(res.data.summary.length >= 1);
    const today = res.data.summary[res.data.summary.length - 1];
    assert.ok(today.requests >= 1);
    assert.ok(today.bytes >= 4096);
  });

  await t.test('pagination works', async () => {
    const res = await request(port, { path: '/api/usage/events?limit=1&page=1', headers: { cookie } });
    assert.equal(res.status, 200);
    assert.equal(res.data.events.length, 1);
    assert.equal(res.data.page, 1);
    assert.equal(res.data.limit, 1);
  });
});
