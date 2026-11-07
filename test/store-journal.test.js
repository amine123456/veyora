import assert from 'node:assert/strict';
import { appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Each case loads a fresh copy of the store module against its own data file, the way
// a restart after a crash would.
async function freshStore(dataFile, tag) {
  process.env.DATA_FILE = dataFile;
  return import(`../src/store.js?journal=${tag}-${Date.now()}-${Math.random()}`);
}

async function seeded(directory) {
  const dataFile = path.join(directory, 'state.json');
  const store = await freshStore(dataFile, 'seed');
  await store.createClient('journal-test', 'journal test password', 0);
  await store.creditWallet('journal-test', 5_000_000);
  assert.equal(await store.reserveFunds('journal-test', 800), true);
  await store.drain();
  return { dataFile, journal: `${dataFile}.usage.log` };
}

test('a torn last journal line is dropped and the file truncated; the server still starts', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-journal-'));
  const warn = console.warn;
  console.warn = () => {};
  try {
    const { dataFile, journal } = await seeded(directory);
    const before = await readFile(journal, 'utf8');
    assert.ok(before.endsWith('\n'));
    await appendFile(journal, '{"seq":99,"username":"journal-te'); // killed mid-append

    const store = await freshStore(dataFile, 'torn');
    const client = await store.getClient('journal-test');
    assert.equal(client.balanceMicros, 5_000_000 - 800);
    assert.equal(await readFile(journal, 'utf8'), before); // back to the last complete line

    // The next append lands on its own line and survives another restart.
    await store.releaseFunds('journal-test', 800);
    await store.drain();
    const again = await freshStore(dataFile, 'after');
    assert.equal((await again.getClient('journal-test')).balanceMicros, 5_000_000);
  } finally {
    console.warn = warn;
    await rm(directory, { recursive: true, force: true });
  }
});

test('a complete last line missing only its newline is kept and terminated', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-journal-'));
  try {
    const { dataFile, journal } = await seeded(directory);
    const lines = (await readFile(journal, 'utf8')).trimEnd().split('\n');
    const last = JSON.parse(lines.at(-1));
    const next = { seq: last.seq + 1, username: 'journal-test', delta: 800, at: last.at, unit: 'micros' };
    await appendFile(journal, JSON.stringify(next)); // no newline

    const store = await freshStore(dataFile, 'unterminated');
    assert.equal((await store.getClient('journal-test')).balanceMicros, 5_000_000);
    assert.ok((await readFile(journal, 'utf8')).endsWith('\n'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a bad line before the end still refuses to start', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-journal-'));
  try {
    const { dataFile, journal } = await seeded(directory);
    const good = await readFile(journal, 'utf8');
    const lines = good.trimEnd().split('\n');
    const last = JSON.parse(lines.at(-1));
    const next = { seq: last.seq + 1, username: 'journal-test', delta: 800, at: last.at, unit: 'micros' };
    await appendFile(journal, `{"seq":broken\n${JSON.stringify(next)}\n`);

    const store = await freshStore(dataFile, 'corrupt');
    await assert.rejects(store.getClient('journal-test'), SyntaxError);
    assert.ok((await readFile(journal, 'utf8')).includes('{"seq":broken')); // left untouched
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
