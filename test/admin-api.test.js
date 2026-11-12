import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import './helpers/database.js';

const run = promisify(execFile);
const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-admin-'));
process.env.DATA_FILE = path.join(directory, 'state.json');
const store = await import('../src/store.js');
const { createAdminServer } = await import('../src/admin-api.js');

const token = 'test-admin-token-0123456789abcdefghij';
const adminScript = fileURLToPath(new URL('../src/admin.js', import.meta.url));

async function withAdmin(runTest) {
  const server = createAdminServer({ token });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, route, body, auth = token) => {
    const response = await fetch(base + route, {
      method,
      headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, json: await response.json() };
  };
  try {
    await runTest(call, server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test.after(() => rm(directory, { recursive: true, force: true }));

test('admin API refuses short tokens and unauthenticated calls', async () => {
  assert.throws(() => createAdminServer({ token: 'short' }), /at least 32/);
  await withAdmin(async (call) => {
    assert.equal((await call('GET', '/clients', undefined, 'wrong-token-wrong-token-wrong-token')).status, 401);
    assert.equal((await call('GET', '/clients', undefined, '')).status, 401);
  });
});

test('admin API creates, credits by username or email, and disables clients', async () => {
  await withAdmin(async (call) => {
    const created = await call('POST', '/clients', { username: 'friend-one', bytes: 100 });
    assert.equal(created.status, 201);
    assert.match(created.json.password, /^[A-Za-z0-9_-]{32}$/);
    assert.equal((await store.authenticate('friend-one', created.json.password)).quotaBytes, 100);

    const byName = await call('POST', '/clients/friend-one/credit', { bytes: 50 });
    assert.equal(byName.json.quotaBytes, 150);

    const account = await store.createAccount('Buyer@Example.com', 'buyer password 1');
    const byEmail = await call('POST', `/clients/${encodeURIComponent('buyer@example.com')}/credit`, { bytes: 1024 });
    assert.equal(byEmail.status, 200);
    assert.equal(byEmail.json.username, account.username);
    assert.equal(byEmail.json.remainingBytes, 1024);

    assert.equal((await call('POST', '/clients/friend-one/disable', {})).json.enabled, false);
    assert.equal((await call('POST', '/clients/friend-one/enable', {})).json.enabled, true);
    assert.equal((await call('POST', '/clients/nobody/credit', { bytes: 1 })).status, 404);
    assert.equal((await call('POST', '/clients/friend-one/credit', { bytes: -5 })).status, 400);

    const list = await call('GET', '/clients');
    assert.deepEqual(list.json.map((client) => client.username).sort(), [account.username, 'friend-one'].sort());
  });
});

test('the admin CLI goes through the running server instead of the store file', async () => {
  await withAdmin(async (call, port) => {
    await call('POST', '/clients', { username: 'cli-target', bytes: 0 });
    const env = {
      ...process.env,
      ADMIN_TOKEN: token,
      ADMIN_PORT: String(port),
      // A path the CLI could not use: success proves it never opened the store itself.
      DATA_FILE: path.join(directory, 'missing-dir', 'nope', 'state.json'),
    };
    const { stdout } = await run(process.execPath, [adminScript, 'credit', 'cli-target', '0.5'], { env });
    assert.match(stdout, /Credited 0\.5 GB to cli-target/);
    assert.equal((await store.getClient('cli-target')).quotaBytes, Math.round(0.5 * 1024 ** 3));

    await store.reserveUsage('cli-target', 1024);
    const listed = await run(process.execPath, [adminScript, 'list'], { env });
    assert.match(listed.stdout, /1\.00 KB/);
  });
});
