import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-wallet-'));
const dataFile = path.join(directory, 'state.json');
process.env.DATA_FILE = dataFile;
const store = await import('../src/store.js');

const GIB = 1024 ** 3;
const password = 'wallet test password 1';

test.after(() => rm(directory, { recursive: true, force: true }));

test('credits and fixed-price holds are exact and all-or-nothing', async () => {
  await store.createClient('wallet-a', password, 0);
  assert.equal((await store.getClient('wallet-a')).balanceMicros, 0);
  assert.equal((await store.creditWallet('wallet-a', 2_000)).balanceMicros, 2_000);

  assert.equal(await store.reserveFunds('wallet-a', 800), true);
  assert.equal(await store.reserveFunds('wallet-a', 800), true);
  // 400 left: a third 800 hold must fail without touching the balance.
  assert.equal(await store.reserveFunds('wallet-a', 800), false);
  assert.equal((await store.getClient('wallet-a')).balanceMicros, 400);

  await store.releaseFunds('wallet-a', 800);
  assert.equal((await store.getClient('wallet-a')).balanceMicros, 1_200);
  await assert.rejects(store.creditWallet('wallet-a', 0), /positive integer/);
  await assert.rejects(store.creditWallet('nobody', 5), /Unknown client/);
});

test('concurrent holds never overspend the balance', async () => {
  await store.createClient('wallet-b', password, 0);
  await store.creditWallet('wallet-b', 10_000);
  const results = await Promise.all(Array.from({ length: 50 }, () => store.reserveFunds('wallet-b', 800)));
  assert.equal(results.filter(Boolean).length, 12);
  assert.equal((await store.getClient('wallet-b')).balanceMicros, 10_000 - 12 * 800);
});

test('disabled accounts cannot spend', async () => {
  await store.createClient('wallet-c', password, GIB);
  await store.creditWallet('wallet-c', 5_000);
  await store.setEnabled('wallet-c', false);
  assert.equal(await store.reserveFunds('wallet-c', 800), false);
  assert.deepEqual(await store.reserveTraffic('wallet-c', 1_000, { pricePerGbMicros: 1_500_000 }), { bytes: 0, quotaBytes: 0, walletBytes: 0 });
});

test('traffic uses prepaid GB first, then the wallet at the per-GB price', async () => {
  await store.createClient('wallet-d', password, 1_000);
  await store.creditWallet('wallet-d', 1_500_000); // $1.50 = exactly 1 GiB at $1.50/GB
  const price = 1_500_000;

  const first = await store.reserveTraffic('wallet-d', 4_000, { pricePerGbMicros: price });
  assert.deepEqual(first, { bytes: 4_000, quotaBytes: 1_000, walletBytes: 3_000 });
  const client = await store.getClient('wallet-d');
  assert.equal(client.remainingBytes, 0);
  assert.equal(client.balanceMicros, 1_500_000 - Math.ceil((3_000 * price) / GIB));

  // Returning the unused part goes back to the same sources; refunds round down.
  await store.releaseTraffic('wallet-d', { quotaBytes: 1_000, walletBytes: 3_000, pricePerGbMicros: price });
  const after = await store.getClient('wallet-d');
  assert.equal(after.remainingBytes, 1_000);
  assert.ok(after.balanceMicros <= 1_500_000 && after.balanceMicros >= 1_500_000 - 1);
});

test('mobile traffic can be kept off prepaid residential GB', async () => {
  await store.createClient('wallet-e', password, 10_000);
  await store.creditWallet('wallet-e', 2_500_000);
  const reserved = await store.reserveTraffic('wallet-e', 2_000, { pricePerGbMicros: 2_500_000, allowQuota: false });
  assert.deepEqual(reserved, { bytes: 2_000, quotaBytes: 0, walletBytes: 2_000 });
  assert.equal((await store.getClient('wallet-e')).remainingBytes, 10_000);
});

test('traffic stops when both prepaid GB and wallet are empty', async () => {
  await store.createClient('wallet-f', password, 0);
  assert.deepEqual(await store.reserveTraffic('wallet-f', 5_000, { pricePerGbMicros: 1_500_000 }), { bytes: 0, quotaBytes: 0, walletBytes: 0 });
  // A balance too small for a single byte buys nothing rather than going negative.
  await store.creditWallet('wallet-f', 1);
  const tiny = await store.reserveTraffic('wallet-f', 5_000, { pricePerGbMicros: 1_500_000 });
  assert.equal(tiny.walletBytes <= 715, true); // 1 micro buys at most ~715 bytes at $1.50/GiB
  assert.ok((await store.getClient('wallet-f')).balanceMicros >= 0);
});

test('wallet debits survive a restart through the journal', async () => {
  await store.createClient('wallet-g', password, 0);
  await store.creditWallet('wallet-g', 9_000);
  await store.reserveFunds('wallet-g', 800);
  await store.reserveFunds('wallet-g', 800);
  await store.releaseFunds('wallet-g', 800);
  // A fresh module instance reloads the snapshot and replays the journal from disk.
  const reloaded = await import(`../src/store.js?reload=${Date.now()}`);
  assert.equal((await reloaded.getClient('wallet-g')).balanceMicros, 9_000 - 800);
});
