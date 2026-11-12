import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import './helpers/database.js';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-verify-'));
const dataFile = path.join(directory, 'state.json');
process.env.DATA_FILE = dataFile;
process.env.RESEND_API_KEY = 'test_key_for_verification';
process.env.VERIFICATION_FROM_EMAIL = 'Veyora <noreply@veyora.pro>';
process.env.PACKAGES = 'one-gb:1000:200:usd';
const { createPaymentServer } = await import('../src/payments.js');

const sentEmails = [];

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
        resolve({ status: res.statusCode, headers: res.headers, json, text });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

const cookieOf = (response) => response.headers['set-cookie']?.[0]?.split(';')[0];

function extractToken(emailHtml) {
  const match = emailHtml.match(/[?&]token=([A-Za-z0-9_-]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function withServer(run) {
  sentEmails.length = 0;
  const fakeFetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    sentEmails.push({ url, to: body.to, subject: body.subject, html: body.html });
    return { ok: true, json: async () => ({ id: 'test-email-id' }) };
  };
  const server = createPaymentServer({
    stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 100, maxConcurrentAuth: 10,
    maxBodyBytes: 32_768, stripeTimeoutMs: 1_000, requestTimeoutMs: 5_000,
    successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/cancel',
    proxyEndpoint: { scheme: 'https', host: 'gate.example.test', port: 8443 },
    resendApiKey: 'test_key_for_verification',
    verificationFromEmail: 'Veyora <noreply@veyora.pro>',
  }, { fetchImpl: fakeFetch });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test.after(() => rm(directory, { recursive: true, force: true }));

test('signup with mailer sends verification email and blocks login until verified', async () => {
  await withServer(async (port) => {
    const signup = await request(port, { path: '/api/signup', body: { email: 'verify@example.com', password: 'long enough password' } });
    assert.equal(signup.status, 201);
    assert.equal(signup.json.needsVerification, true);
    assert.equal(signup.json.email, 'verify@example.com');
    assert.equal(signup.headers['set-cookie'], undefined, 'no session cookie on signup when verification required');

    assert.equal(sentEmails.length, 1);
    assert.deepEqual(sentEmails[0].to, ['verify@example.com']);
    assert.match(sentEmails[0].subject, /Verify/);

    const login = await request(port, { path: '/api/login', body: { email: 'verify@example.com', password: 'long enough password' } });
    assert.equal(login.status, 403);
    assert.equal(login.json.needsVerification, true);
    assert.equal(login.headers['set-cookie'], undefined);

    const token = extractToken(sentEmails[0].html);
    assert.ok(token, 'verification link contains a token');

    const verify = await request(port, { path: '/api/verify-email', body: { token } });
    assert.equal(verify.status, 200);
    assert.equal(verify.json.verified, true);
    assert.ok(cookieOf(verify), 'verify-email sets a session cookie');

    const me = await request(port, { path: '/api/me', method: 'GET', headers: { cookie: cookieOf(verify) } });
    assert.equal(me.status, 200);

    const loginAfter = await request(port, { path: '/api/login', body: { email: 'verify@example.com', password: 'long enough password' } });
    assert.equal(loginAfter.status, 200);
    assert.ok(cookieOf(loginAfter));
  });
});

test('verify-email rejects invalid and expired tokens', async () => {
  await withServer(async (port) => {
    const noToken = await request(port, { path: '/api/verify-email', body: {} });
    assert.equal(noToken.status, 400);

    const badToken = await request(port, { path: '/api/verify-email', body: { token: 'not-a-real-token' } });
    assert.equal(badToken.status, 400);
    assert.match(badToken.json.error, /invalid|expired/i);
  });
});

test('resend-verification sends a new email', async () => {
  await withServer(async (port) => {
    await request(port, { path: '/api/signup', body: { email: 'resend@example.com', password: 'long enough password' } });
    assert.equal(sentEmails.length, 1);

    const resend = await request(port, { path: '/api/resend-verification', body: { email: 'resend@example.com', password: 'long enough password' } });
    assert.equal(resend.status, 200);
    assert.equal(resend.json.sent, true);
    assert.equal(sentEmails.length, 2);

    const token = extractToken(sentEmails[1].html);
    const verify = await request(port, { path: '/api/verify-email', body: { token } });
    assert.equal(verify.status, 200);
    assert.equal(verify.json.verified, true);

    const resendAfter = await request(port, { path: '/api/resend-verification', body: { email: 'resend@example.com', password: 'long enough password' } });
    assert.equal(resendAfter.status, 200);
    assert.equal(resendAfter.json.alreadyVerified, true);
  });
});

test('resend-verification rejects wrong password', async () => {
  await withServer(async (port) => {
    await request(port, { path: '/api/signup', body: { email: 'wrongpw@example.com', password: 'long enough password' } });
    const resend = await request(port, { path: '/api/resend-verification', body: { email: 'wrongpw@example.com', password: 'wrong password here' } });
    assert.equal(resend.status, 401);
  });
});
