import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createShutdown } from '../src/shutdown.js';
import { listen } from './helpers/fake-upstream.js';

const quiet = { warn() {}, error() {} };

test('shutdown closes the listeners, drains in order, and snapshots the ledger last', async () => {
  const servers = [http.createServer(), http.createServer()];
  for (const server of servers) await listen(server);
  const order = [];
  const unlocker = {
    async stop() { order.push('unlocker'); },
    ledger: { async close() { order.push('ledger'); } },
  };
  const stop = createShutdown({ servers: [...servers, null], unlocker, drainStore: async () => { order.push('store'); }, log: quiet });
  assert.equal(await stop(), 'drained');
  assert.equal(await stop(), 'drained'); // a second signal reuses the first run
  assert.deepEqual(order, ['unlocker', 'store', 'ledger']);
  for (const server of servers) assert.equal(server.listening, false);
});

test('shutdown gives up after the timeout but still snapshots the ledger', async () => {
  const warnings = [];
  let snapshotted = false;
  const unlocker = {
    stop: () => new Promise(() => {}), // a request that never finishes
    ledger: { async close() { snapshotted = true; } },
  };
  const started = Date.now();
  const stop = createShutdown({ unlocker, drainStore: async () => {}, timeoutMs: 100, log: { warn: (line) => warnings.push(line), error() {} } });
  assert.equal(await stop(), 'timeout');
  assert.ok(Date.now() - started < 2_000);
  assert.equal(snapshotted, true);
  assert.match(warnings[0], /still pending after 100 ms/);
});

test('shutdown without the unlocker only drains the store', async () => {
  let drained = false;
  const stop = createShutdown({ drainStore: async () => { drained = true; }, log: quiet });
  assert.equal(await stop(), 'drained');
  assert.equal(drained, true);
});
