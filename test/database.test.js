import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { query } from './helpers/database.js';

const db = await import('../src/db.js');
const store = await import('../src/store.js');
const { importJsonStore } = await import('../src/import-json.js');

const hex = (bytes) => crypto.randomBytes(bytes).toString('hex');
const wipe = () => query('TRUNCATE clients CASCADE');

test('migrations apply once and are safe to run again, even concurrently', async () => {
  const { rows } = await query('SELECT name FROM schema_migrations ORDER BY name');
  assert.deepEqual(rows.map((row) => row.name), ['001_init.sql']);
  const again = await Promise.all([db.migrate(), db.migrate(), db.migrate()]);
  assert.deepEqual(again, [[], [], []]);
});

test('the database itself refuses an overdrawn balance or usage beyond quota', async () => {
  await store.createClient('constraint-user', 'a long enough password', 100);
  await assert.rejects(query("UPDATE clients SET balance_micros = -1 WHERE username = 'constraint-user'"), /check constraint/);
  await assert.rejects(query("UPDATE clients SET used_bytes = 101 WHERE username = 'constraint-user'"), /clients_usage_within_quota/);
});

test('a webhook delivered many times at once credits the wallet exactly once', async () => {
  const account = await store.createAccount('race-pay@example.com', 'long enough password');
  const before = (await store.getClient(account.username)).balanceMicros;
  const pending = await store.createPendingPayment(account.username, { id: 'topup-10', micros: 10_000_000, cents: 1000, currency: 'usd' });
  await store.bindPaymentSession(pending.purchaseId, 'npinv_race1');
  const event = { eventId: 'nppay_race1', purchaseId: pending.purchaseId, sessionId: 'npinv_race1', amountTotal: 1000, currency: 'usd' };

  const results = await Promise.all(Array.from({ length: 8 }, () => store.completePayment(event)));
  assert.equal(results.filter((result) => result.credited).length, 1);
  assert.equal(results.filter((result) => result.duplicate).length, 7);
  assert.equal((await store.getClient(account.username)).balanceMicros, before + 10_000_000);
});

test('two signups racing for one email create one account', async () => {
  const attempts = await Promise.allSettled(Array.from({ length: 5 }, () => store.createAccount('race-signup@example.com', 'long enough password')));
  assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  for (const attempt of attempts.filter((entry) => entry.status === 'rejected')) assert.equal(attempt.reason.code, 'EMAIL_TAKEN');
});

test('concurrent traffic reservations never spend more than the wallet holds', async () => {
  const account = await store.createAccount('race-traffic@example.com', 'long enough password');
  const balance = (await store.getClient(account.username)).balanceMicros; // $1 signup credit
  const pricePerGbMicros = 2_000_000;
  const affordable = Math.floor((balance * 1024 ** 3) / pricePerGbMicros);
  const grants = await Promise.all(Array.from({ length: 20 }, () => store.reserveTraffic(account.username, 64 * 1024 * 1024, { pricePerGbMicros })));
  const granted = grants.reduce((sum, grant) => sum + grant.walletBytes, 0);
  assert.ok(granted > 0 && granted <= affordable, `${granted} of ${affordable}`);
  assert.ok((await store.getClient(account.username)).balanceMicros >= 0);
});

test('hostile identifiers are rejected without reaching the database', async () => {
  const nul = String.fromCharCode(0);
  assert.equal(await store.authenticate(`bad${nul}name`, 'whatever password'), null);
  assert.equal(await store.getClient("x'; DROP TABLE clients; --"), null);
  assert.equal(await store.findUsername(`a${nul}@example.com`), null);
  await assert.rejects(store.createAccount(`a${nul}@example.com`, 'long enough password'), { code: 'INVALID_EMAIL' });
  assert.ok((await query('SELECT count(*)::int AS count FROM clients')).rows[0].count > 0);
});

test('the JSON store imports with its journal replayed, and never over existing data', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-import-'));
  const file = path.join(directory, 'store.json');
  const tokenHash = hex(32);
  const keyHash = hex(32);
  const purchaseId = crypto.randomUUID();
  const state = {
    version: 3,
    lastUsageSeq: 4,
    clients: {
      pxaaaaaaaaaa: {
        salt: hex(16), hash: hex(64), quotaBytes: 1000, usedBytes: 100, balanceMicros: 5_000_000, enabled: true,
        createdAt: '2026-10-01T10:00:00.000Z', email: 'old@example.com', webSalt: hex(16), webHash: hex(64), emailVerified: true,
      },
      'legacy-admin': { salt: hex(16), hash: hex(64), quotaBytes: 0, usedBytes: 0, enabled: false, createdAt: '2026-09-01T10:00:00.000Z' },
    },
    sessions: { [tokenHash]: { username: 'pxaaaaaaaaaa', expiresAt: Date.now() + 60_000 } },
    apiKeys: { [keyHash]: { id: `key_${hex(8)}`, username: 'pxaaaaaaaaaa', name: 'scraper', prefix: 'vy_live_abcd', createdAt: '2026-10-02T10:00:00.000Z' } },
    pendingPayments: {
      [purchaseId]: {
        purchaseId, username: 'pxaaaaaaaaaa', packageId: 'topup-10', bytes: 0, micros: 10_000_000, cents: 1000, currency: 'usd',
        createdAt: '2026-11-10T10:00:00.000Z', expiresAt: Date.now() + 60_000, sessionId: 'npinv_1',
      },
    },
    processedPayments: {
      nppay_1: {
        eventId: 'nppay_1', purchaseId: crypto.randomUUID(), sessionId: 'npinv_0', username: 'pxaaaaaaaaaa',
        packageId: 'one-gb', bytes: 1000, processedAt: '2026-10-03T10:00:00.000Z',
      },
    },
  };
  try {
    await writeFile(file, JSON.stringify(state));
    // Seq 4 is already in the snapshot; 5 and 6 happened after it.
    await writeFile(`${file}.usage.log`, [
      { seq: 4, username: 'pxaaaaaaaaaa', delta: 999 },
      { seq: 5, username: 'pxaaaaaaaaaa', delta: 50 },
      { seq: 6, username: 'pxaaaaaaaaaa', delta: -800, unit: 'micros' },
    ].map((record) => JSON.stringify(record)).join('\n') + '\n');

    await assert.rejects(importJsonStore(file), /already has accounts/);

    await wipe();
    const summary = await importJsonStore(file);
    assert.deepEqual(summary, { clients: 2, sessions: 1, apiKeys: 1, pendingPayments: 1, processedPayments: 1, totalBalanceMicros: 4_999_200 });

    const client = await store.getClient('pxaaaaaaaaaa');
    assert.equal(client.usedBytes, 150);
    assert.equal(client.balanceMicros, 4_999_200);
    assert.equal(client.emailVerified, true);
    assert.equal(client.createdAt, '2026-10-01T10:00:00.000Z');
    assert.equal((await store.getClient('legacy-admin')).enabled, false);
    assert.equal((await store.listApiKeys('pxaaaaaaaaaa'))[0].name, 'scraper');

    // The imported pending purchase can still be paid, exactly once.
    const paid = await store.completePayment({ eventId: 'nppay_2', purchaseId, sessionId: 'npinv_1', amountTotal: 1000, currency: 'usd' });
    assert.equal(paid.credited, true);
    assert.equal((await store.getClient('pxaaaaaaaaaa')).balanceMicros, 14_999_200);

    // A corrupt journal aborts the import and leaves the database empty.
    await wipe();
    await writeFile(`${file}.usage.log`, `${JSON.stringify({ seq: 9, username: 'pxaaaaaaaaaa', delta: 1 })}\n`);
    await assert.rejects(importJsonStore(file), /Invalid usage journal record/);
    assert.equal((await query('SELECT count(*)::int AS count FROM clients')).rows[0].count, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
