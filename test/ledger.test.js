import assert from 'node:assert/strict';
import { appendFile, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createLedger } from '../src/ledger.js';

const quiet = { warn() {}, error() {} };
const entry = (site, { billed = true, price = 800, cost = 10 } = {}) => ({
  at: '2026-11-07T00:00:00.000Z', site, billed, priceMicros: billed ? price : 0, costMicros: cost, wireBytes: 500, attempts: 1,
});

async function folder() {
  return mkdtemp(path.join(os.tmpdir(), 'proxy-ledger-'));
}

const open = (file, options = {}) => createLedger(file, { log: quiet, snapshotIntervalMs: 0, ...options });
const totals = (ledger, site) => ledger.stats().find((row) => row.site === site);

test('rotates by size, keeps the newest archives, and totals survive a restart', async () => {
  const directory = await folder();
  try {
    const file = path.join(directory, 'unlocker-ledger.jsonl');
    const ledger = open(file, { maxBytes: 600, keep: 2 });
    for (let index = 0; index < 20; index += 1) await ledger.record(entry(index % 2 ? 'a.example' : 'b.example'));
    await ledger.close();

    const names = await readdir(directory);
    const archives = names.filter((name) => /^unlocker-ledger-\d{4}-\d{2}-\d{2}(\.\d+)?\.jsonl$/.test(name));
    assert.equal(archives.length, 2); // older ones pruned
    assert.ok(names.includes('unlocker-ledger.stats.json'));
    assert.ok((await readFile(file, 'utf8')).length <= 600);

    const reloaded = open(file, { maxBytes: 600, keep: 2 });
    await reloaded.load();
    assert.equal(totals(reloaded, 'a.example').requests, 10);
    assert.equal(totals(reloaded, 'b.example').requests, 10);
    assert.equal(totals(reloaded, 'a.example').revenueMicros, 8_000);
    await reloaded.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rotates when the UTC day changes', async () => {
  const directory = await folder();
  try {
    const file = path.join(directory, 'unlocker-ledger.jsonl');
    let clock = Date.parse('2026-11-07T23:59:00Z');
    const ledger = open(file, { now: () => clock });
    await ledger.record(entry('a.example'));
    clock = Date.parse('2026-11-08T00:01:00Z');
    await ledger.record(entry('a.example'));
    await ledger.close();
    const names = await readdir(directory);
    assert.ok(names.includes('unlocker-ledger-2026-11-07.jsonl'));
    assert.equal((await readFile(file, 'utf8')).trim().split('\n').length, 1);
    const reloaded = open(file, { now: () => clock });
    await reloaded.load();
    assert.equal(totals(reloaded, 'a.example').requests, 2);
    await reloaded.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a snapshot plus the lines after it are counted exactly once', async () => {
  const directory = await folder();
  try {
    const file = path.join(directory, 'unlocker-ledger.jsonl');
    const ledger = open(file, { snapshotEvery: 3 });
    for (let index = 0; index < 5; index += 1) await ledger.record(entry('a.example'));
    // No close(): the snapshot covers 3 lines and the other 2 are only in the file,
    // like after a crash.
    const snapshot = JSON.parse(await readFile(path.join(directory, 'unlocker-ledger.stats.json'), 'utf8'));
    assert.equal(snapshot.sites['a.example'].requests, 3);

    const reloaded = open(file);
    await reloaded.load();
    assert.equal(totals(reloaded, 'a.example').requests, 5);

    // Recording before load still counts the file once and the new line once.
    const lazy = open(file);
    await lazy.record(entry('a.example'));
    assert.equal(totals(lazy, 'a.example').requests, 6);
    await lazy.close();
    const final = open(file);
    await final.load();
    assert.equal(totals(final, 'a.example').requests, 6);
    await final.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a torn last line is skipped and a replaced file is replayed from the start', async () => {
  const directory = await folder();
  try {
    const file = path.join(directory, 'unlocker-ledger.jsonl');
    const ledger = open(file, { snapshotEvery: 1 });
    await ledger.record(entry('a.example'));
    await ledger.record(entry('a.example'));
    await appendFile(file, '{"site":"a.exa'); // crash mid-write

    const afterCrash = open(file);
    await afterCrash.record(entry('a.example'));
    await afterCrash.close();
    const lines = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
    assert.equal(JSON.parse(lines.at(-1)).site, 'a.example'); // the new line is intact
    const check = open(file);
    await check.load();
    assert.equal(totals(check, 'a.example').requests, 3);
    await check.close();

    // Someone replaces the active file with a shorter one: its lines are replayed in full.
    await writeFile(file, `${JSON.stringify(entry('b.example'))}\n`);
    const replaced = open(file);
    await replaced.load();
    assert.equal(totals(replaced, 'b.example').requests, 1);
    await replaced.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a ledger from before snapshots is replayed in full, with no size limit', async () => {
  const directory = await folder();
  try {
    const file = path.join(directory, 'unlocker-ledger.jsonl');
    await writeFile(file, Array.from({ length: 50 }, () => JSON.stringify(entry('old.example'))).join('\n') + '\n');
    const ledger = open(file);
    await ledger.load();
    assert.equal(totals(ledger, 'old.example').requests, 50);
    await ledger.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a snapshot is fsynced before its rename and the directory after it', async () => {
  const directory = await folder();
  try {
    const file = path.join(directory, 'unlocker-ledger.jsonl');
    const { open: realOpen } = await import('node:fs/promises');
    const events = [];
    const openFile = async (target, ...rest) => {
      const handle = await realOpen(target, ...rest);
      const label = target === directory ? 'directory' : path.basename(target).endsWith('.tmp') ? 'temp' : 'other';
      const sync = handle.sync.bind(handle);
      handle.sync = async () => {
        events.push(label);
        return sync();
      };
      return handle;
    };
    const ledger = open(file, { snapshotEvery: 1, openFile });
    await ledger.record(entry('a.example'));
    await ledger.close();
    assert.deepEqual(events.slice(0, 2), ['temp', 'directory']);
    assert.equal(events.filter((label) => label === 'temp').length, events.filter((label) => label === 'directory').length);
    const names = await readdir(directory);
    assert.ok(names.includes('unlocker-ledger.stats.json'));
    assert.ok(!names.some((name) => name.endsWith('.tmp')));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
