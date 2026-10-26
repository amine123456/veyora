import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-nowpayments-'));
process.env.DATA_FILE = path.join(directory, 'state.json');
process.env.PACKAGES = 'gb1:1073741824:200:usd,gb5:5368709120:1000:usd';
const store = await import('../src/store.js');
const { createPaymentServer } = await import('../src/payments.js');
const { finishedPayment, signIpn, validIpnSignature } = await import('../src/nowpayments.js');

const IPN_SECRET = 'test-ipn-secret-not-live';

function request(port, { path: requestPath, body, headers = {}, method = 'POST', raw }) {
  const payload = raw ?? (body === undefined ? '' : JSON.stringify(body));
  const finalHeaders = body === undefined && raw === undefined ? headers : { 'content-type': 'application/json', ...headers };
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

const cookieOf = (response) => response.headers['set-cookie']?.[0]?.split(';')[0];

async function withServer({ nowpayments = { apiKey: 'np-test-key', ipnSecret: IPN_SECRET, sandbox: true, payCurrency: 'usdttrc20' }, invoiceResponse } = {}, run) {
  const invoices = [];
  let nextInvoiceId = 5500;
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    invoices.push({ url, headers: options.headers, body });
    const id = nextInvoiceId++;
    const payload = invoiceResponse ? invoiceResponse(id, body) : { id, order_id: body.order_id, invoice_url: `https://sandbox.nowpayments.io/payment/?iid=${id}` };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const server = createPaymentServer({
    stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 30, maxConcurrentAuth: 4,
    maxBodyBytes: 32_768, stripeTimeoutMs: 1_000, requestTimeoutMs: 5_000,
    successUrl: 'https://proxora.example.test/account?paid=1', cancelUrl: 'https://proxora.example.test/account',
    nowpayments,
  }, { fetchImpl });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(server.address().port, invoices);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function signedUp(port, email) {
  const signup = await request(port, { path: '/api/signup', body: { email, password: 'buyer password 123' } });
  assert.equal(signup.status, 201);
  return { cookie: cookieOf(signup), username: signup.json.username };
}

function ipn(port, body, secret = IPN_SECRET) {
  return request(port, { path: '/nowpayments/ipn', raw: JSON.stringify(body), headers: { 'x-nowpayments-sig': signIpn(body, secret) } });
}

test.after(() => rm(directory, { recursive: true, force: true }));

test('IPN signatures sort keys at every level and reject tampering', () => {
  const body = { payment_status: 'finished', price_amount: 2, fee: { currency: 'usdttrc20', depositFee: 0.1 }, order_id: 'x' };
  const signature = signIpn(body, IPN_SECRET);
  // Same data, different key order (top level and nested): same signature.
  assert.equal(signIpn({ order_id: 'x', fee: { depositFee: 0.1, currency: 'usdttrc20' }, price_amount: 2, payment_status: 'finished' }, IPN_SECRET), signature);
  assert.equal(validIpnSignature(body, signature, IPN_SECRET), true);
  assert.equal(validIpnSignature({ ...body, price_amount: 200 }, signature, IPN_SECRET), false);
  assert.equal(validIpnSignature(body, signature, 'wrong-secret'), false);
  assert.equal(validIpnSignature(body, 'not-hex', IPN_SECRET), false);
  assert.equal(validIpnSignature(body, undefined, IPN_SECRET), false);
});

test('only finished payments are treated as paid', () => {
  const base = { payment_id: 11, invoice_id: 22, order_id: 'o', price_amount: 10, price_currency: 'USD' };
  assert.deepEqual(finishedPayment({ ...base, payment_status: 'finished' }), {
    eventId: 'nppay_11', sessionId: 'npinv_22', purchaseId: 'o', amountTotal: 1000, currency: 'usd',
  });
  for (const status of ['waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'failed', 'expired', 'refunded']) {
    assert.equal(finishedPayment({ ...base, payment_status: status }), null, status);
  }
  assert.equal(finishedPayment({ ...base, payment_status: 'finished', invoice_id: undefined }), null);
});

test('checkout needs a session and configured payments', async () => {
  await withServer({}, async (port) => {
    assert.equal((await request(port, { path: '/api/checkout', body: { packageId: 'gb1' } })).status, 401);
    const { cookie } = await signedUp(port, 'nocsrf@example.com');
    const crossSite = await request(port, { path: '/api/checkout', body: { packageId: 'gb1' }, headers: { cookie, origin: 'https://evil.example' } });
    assert.equal(crossSite.status, 403);
    assert.equal((await request(port, { path: '/api/checkout', body: { packageId: 'nope' }, headers: { cookie } })).status, 400);
  });
  await withServer({ nowpayments: null }, async (port) => {
    const { cookie } = await signedUp(port, 'unconfigured@example.com');
    const response = await request(port, { path: '/api/checkout', body: { packageId: 'gb1' }, headers: { cookie } });
    assert.equal(response.status, 503);
    assert.equal(response.json.error, 'Online payment is not set up yet');
  });
});

test('a finished USDT payment credits the pack exactly once', async () => {
  await withServer({}, async (port, invoices) => {
    const { cookie, username } = await signedUp(port, 'buyer@example.com');
    const checkout = await request(port, { path: '/api/checkout', body: { packageId: 'gb5' }, headers: { cookie } });
    assert.equal(checkout.status, 200);
    assert.match(checkout.json.checkoutUrl, /^https:\/\/sandbox\.nowpayments\.io\//);

    const sent = invoices.at(-1);
    assert.equal(sent.url, 'https://api-sandbox.nowpayments.io/v1/invoice');
    assert.equal(sent.headers['x-api-key'], 'np-test-key');
    assert.equal(sent.body.price_amount, 10);
    assert.equal(sent.body.price_currency, 'usd');
    assert.equal(sent.body.pay_currency, 'usdttrc20');
    assert.equal(sent.body.ipn_callback_url, 'https://proxora.example.test/nowpayments/ipn');
    assert.equal(sent.body.success_url, 'https://proxora.example.test/account?paid=1');
    const purchaseId = sent.body.order_id;
    const invoiceId = 5500;
    const paidBody = {
      payment_id: 9001, invoice_id: invoiceId, order_id: purchaseId, payment_status: 'finished',
      price_amount: 10, price_currency: 'usd', pay_amount: 10.02, actually_paid: 10.02, pay_currency: 'usdttrc20',
    };

    // Unsigned or forged notices are refused and credit nothing.
    const forged = await request(port, { path: '/nowpayments/ipn', raw: JSON.stringify(paidBody), headers: { 'x-nowpayments-sig': signIpn(paidBody, 'attacker-secret') } });
    assert.equal(forged.status, 401);
    assert.equal((await store.getClient(username)).quotaBytes, 0);

    // Partial payment: acknowledged, not credited.
    const partial = await ipn(port, { ...paidBody, payment_id: 9000, payment_status: 'partially_paid', actually_paid: 4 });
    assert.deepEqual(partial.json, { received: true, credited: false });
    assert.equal((await store.getClient(username)).quotaBytes, 0);

    // Signed but for a different amount: not credited.
    const wrongAmount = await ipn(port, { ...paidBody, payment_id: 8999, price_amount: 2 });
    assert.deepEqual(wrongAmount.json, { received: true, credited: false });
    assert.equal((await store.getClient(username)).quotaBytes, 0);

    // The real one credits 5 GB.
    const paid = await ipn(port, paidBody);
    assert.deepEqual(paid.json, { received: true, credited: true });
    assert.equal((await store.getClient(username)).quotaBytes, 5368709120);

    // Replays and a second payment on the same invoice do not credit again.
    assert.equal((await ipn(port, paidBody)).json.credited, false);
    assert.equal((await ipn(port, { ...paidBody, payment_id: 9002 })).json.credited, false);
    assert.equal((await store.getClient(username)).quotaBytes, 5368709120);
  });
});

test('an invoice link pointing anywhere but NOWPayments is refused', async () => {
  await withServer({ invoiceResponse: (id) => ({ id, invoice_url: 'https://evil.example/pay' }) }, async (port) => {
    const { cookie } = await signedUp(port, 'phish@example.com');
    const response = await request(port, { path: '/api/checkout', body: { packageId: 'gb1' }, headers: { cookie } });
    assert.equal(response.status, 502);
    // The failed checkout does not leave a pending purchase behind.
    for (let index = 0; index < 10; index += 1) {
      assert.equal((await request(port, { path: '/api/checkout', body: { packageId: 'gb1' }, headers: { cookie } })).status, 502);
    }
  });
});
