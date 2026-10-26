import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-store-'));
process.env.DATA_FILE = path.join(directory, 'store.json');
const store = await import('../src/store.js');

test('creates, authenticates, meters, releases, and credits a client', async () => {
  const password = 'correct horse battery staple';
  await store.createClient('cousin', password, 1000);

  assert.equal(await store.authenticate('cousin', 'wrong password value'), null);
  assert.equal((await store.authenticate('cousin', password)).remainingBytes, 1000);
  assert.equal(await store.reserveUsage('cousin', 400), 400);
  assert.equal((await store.getClient('cousin')).remainingBytes, 600);

  await store.releaseUsage('cousin', 100);
  assert.equal((await store.getClient('cousin')).remainingBytes, 700);
  assert.equal((await store.credit('cousin', 500)).remainingBytes, 1200);
});

test('serializes concurrent reservations so quota cannot be overspent', async () => {
  const username = 'parallel-client';
  await store.createClient(username, 'another strong test password', 1000);

  const grants = await Promise.all(Array.from({ length: 8 }, () => store.reserveUsage(username, 250)));
  assert.equal(grants.reduce((sum, value) => sum + value, 0), 1000);
  assert.equal((await store.getClient(username)).remainingBytes, 0);
});

test('credits only an exact locally-created payment once', async () => {
  const username = 'payment-client';
  await store.createClient(username, 'payment client test password', 1000);
  const pending = await store.createPendingPayment(username, {
    id: 'gb1', bytes: 1000, cents: 200, currency: 'usd',
  });
  await store.bindPaymentSession(pending.purchaseId, 'cs_test_session');

  const payment = {
    eventId: 'evt_test_payment',
    purchaseId: pending.purchaseId,
    sessionId: 'cs_test_session',
    amountTotal: 200,
    currency: 'usd',
  };
  assert.equal((await store.completePayment(payment)).credited, true);
  assert.equal((await store.completePayment(payment)).duplicate, true);
  assert.equal((await store.getClient(username)).remainingBytes, 2000);
});

test('rejects payment events whose session, amount, or currency was tampered with', async () => {
  const username = 'tamper-client';
  await store.createClient(username, 'tamper resistant test password', 1000);
  const pending = await store.createPendingPayment(username, {
    id: 'gb2', bytes: 2000, cents: 400, currency: 'usd',
  });
  await store.bindPaymentSession(pending.purchaseId, 'cs_tamper_session');

  const base = {
    eventId: 'evt_tamper_payment',
    purchaseId: pending.purchaseId,
    sessionId: 'cs_tamper_session',
    amountTotal: 400,
    currency: 'usd',
  };
  await assert.rejects(
    store.completePayment({ ...base, sessionId: 'cs_wrong_session' }),
    /session mismatch/,
  );
  await assert.rejects(
    store.completePayment({ ...base, amountTotal: 399 }),
    /amount mismatch/,
  );
  await assert.rejects(
    store.completePayment({ ...base, currency: 'eur' }),
    /amount mismatch/,
  );
  assert.equal((await store.getClient(username)).remainingBytes, 1000);

  assert.equal((await store.completePayment(base)).credited, true);
  assert.equal((await store.getClient(username)).remainingBytes, 3000);
});

test('caps outstanding checkout creation per client', async () => {
  const username = 'checkout-limit-client';
  await store.createClient(username, 'checkout limiter test password', 0);
  const packageInfo = { id: 'gb1', bytes: 1000, cents: 200, currency: 'usd' };

  const pending = [];
  for (let index = 0; index < 10; index += 1) {
    pending.push(await store.createPendingPayment(username, packageInfo));
  }
  await assert.rejects(
    store.createPendingPayment(username, packageInfo),
    /Too many pending purchases/,
  );

  await store.cancelPendingPayment(pending[0].purchaseId);
  assert.ok(await store.createPendingPayment(username, packageInfo));
});
