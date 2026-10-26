import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

function request(port, { path: requestPath, body = '', headers = {}, method = 'POST' }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: requestPath, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString(), headers: res.headers }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('checkout and webhook enforce authorization, binding, signature, and replay safety', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-payment-'));
  process.env.DATA_FILE = path.join(directory, 'state.json');
  process.env.PACKAGES = 'one-gb:1000:200:usd';
  process.env.PROCESSED_PAYMENT_HISTORY_LIMIT = '20';

  const webhookSecret = 'whsec_test_only_not_live';
  const stripeKey = 'sk_test_only_not_live';
  let capturedCheckout;
  const fetchImpl = async (url, options) => {
    capturedCheckout = { url, options, form: new URLSearchParams(options.body) };
    return new Response(JSON.stringify({
      id: 'cs_test_session',
      url: 'https://checkout.stripe.com/c/pay_test',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  let server;
  try {
    const store = await import('../src/store.js');
    const { createPaymentServer } = await import('../src/payments.js');
    const username = 'payment-test';
    const password = 'payment test password';
    await store.createClient(username, password, 100);
    const config = {
      stripeKey,
      webhookSecret,
      authAttemptsPerMinute: 30,
      maxConcurrentAuth: 4,
      maxBodyBytes: 32_768,
      stripeTimeoutMs: 1_000,
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
      requestTimeoutMs: 1_000,
    };
    server = createPaymentServer(config, { fetchImpl });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const denied = await request(port, {
      path: '/checkout',
      body: JSON.stringify({ packageId: 'one-gb' }),
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(JSON.stringify({ packageId: 'one-gb' })) },
    });
    assert.equal(denied.status, 401);

    const checkoutBody = JSON.stringify({ packageId: 'one-gb' });
    const checkout = await request(port, {
      path: '/checkout',
      body: checkoutBody,
      headers: {
        authorization: auth,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(checkoutBody),
      },
    });
    assert.equal(checkout.status, 200);
    assert.equal(JSON.parse(checkout.body).checkoutUrl, 'https://checkout.stripe.com/c/pay_test');
    const stripeHeaders = new Headers(capturedCheckout.options.headers);
    assert.equal(stripeHeaders.get('authorization'), `Bearer ${stripeKey}`);
    assert.ok(stripeHeaders.get('idempotency-key'));
    const purchaseId = capturedCheckout.form.get('client_reference_id');
    assert.ok(purchaseId);
    assert.equal(capturedCheckout.form.get('metadata[purchase_id]'), purchaseId);

    const event = {
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: { object: {
        id: 'cs_test_session',
        client_reference_id: purchaseId,
        amount_total: 200,
        currency: 'usd',
        payment_status: 'paid',
        metadata: { purchase_id: purchaseId },
      } },
    };
    const webhookBody = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${webhookBody}`)
      .digest('hex');
    const webhookHeaders = {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(webhookBody),
    };

    const amountTamperedEvent = structuredClone(event);
    amountTamperedEvent.id = 'evt_test_wrong_amount';
    amountTamperedEvent.data.object.amount_total = 201;
    const amountTamperedBody = JSON.stringify(amountTamperedEvent);
    const amountTamperedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${amountTamperedBody}`)
      .digest('hex');
    const amountTampered = await request(port, {
      path: '/stripe/webhook',
      body: amountTamperedBody,
      headers: {
        ...webhookHeaders,
        'stripe-signature': `t=${timestamp},v1=${amountTamperedSignature}`,
        'content-length': Buffer.byteLength(amountTamperedBody),
      },
    });
    assert.equal(amountTampered.status, 400);
    assert.equal((await store.getClient(username)).quotaBytes, 100);

    const accepted = await request(port, { path: '/stripe/webhook', body: webhookBody, headers: webhookHeaders });
    assert.equal(accepted.status, 200);
    assert.equal((await store.getClient(username)).quotaBytes, 1100);

    const replay = await request(port, { path: '/stripe/webhook', body: webhookBody, headers: webhookHeaders });
    assert.equal(replay.status, 200);
    assert.equal((await store.getClient(username)).quotaBytes, 1100);

    const replayWithNewEvent = structuredClone(event);
    replayWithNewEvent.id = 'evt_test_reissued';
    const replayWithNewEventBody = JSON.stringify(replayWithNewEvent);
    const replayWithNewEventSignature = crypto.createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${replayWithNewEventBody}`)
      .digest('hex');
    const rejectedReissue = await request(port, {
      path: '/stripe/webhook',
      body: replayWithNewEventBody,
      headers: {
        ...webhookHeaders,
        'stripe-signature': `t=${timestamp},v1=${replayWithNewEventSignature}`,
        'content-length': Buffer.byteLength(replayWithNewEventBody),
      },
    });
    assert.equal(rejectedReissue.status, 400);
    assert.equal((await store.getClient(username)).quotaBytes, 1100);

    const tamperedBody = webhookBody.replace('200', '201');
    const tampered = await request(port, {
      path: '/stripe/webhook',
      body: tamperedBody,
      headers: { ...webhookHeaders, 'content-length': Buffer.byteLength(tamperedBody) },
    });
    assert.equal(tampered.status, 400);
    assert.equal((await store.getClient(username)).quotaBytes, 1100);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test('landing page serves only allowlisted assets with browser security headers', async () => {
  process.env.PACKAGES = 'one-gb:1073741824:200:usd';
  const { createPaymentServer } = await import('../src/payments.js');
  const server = createPaymentServer({
    stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 30, maxConcurrentAuth: 4,
    maxBodyBytes: 32_768, stripeTimeoutMs: 1_000,
    successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/cancel',
    requestTimeoutMs: 1_000,
  });
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const page = await request(port, { method: 'GET', path: '/' });
    assert.equal(page.status, 200);
    assert.match(page.headers['content-type'], /^text\/html/);
    assert.match(page.headers['content-security-policy'], /default-src 'none'/);
    assert.match(page.headers['content-security-policy'], /script-src 'self';/);
    assert.equal(page.headers['x-frame-options'], 'DENY');
    assert.match(page.body, /<title>Proxora \|/);
    assert.match(page.body, /<script src="app\.js" defer><\/script>/);
    assert.doesNotMatch(page.body, /<script>/);

    const stylesheet = await request(port, { method: 'GET', path: '/styles.css' });
    assert.equal(stylesheet.status, 200);
    assert.match(stylesheet.headers['content-type'], /^text\/css/);

    const script = await request(port, { method: 'GET', path: '/app.js' });
    assert.equal(script.status, 200);
    assert.match(script.headers['content-type'], /^text\/javascript/);

    const traversal = await request(port, { method: 'GET', path: '/../src/config.js' });
    assert.equal(traversal.status, 404);
    assert.doesNotMatch(traversal.body, /PACKAGES/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
