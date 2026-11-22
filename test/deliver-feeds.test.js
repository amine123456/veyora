// Cross-language checks for scripts/deliver-feeds.py: secrets sealed by Node open in Python,
// conversions keep every record and column, and download links verify on both sides.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { sealSecret } from '../src/secret-box.js';
import { downloadSignature } from '../src/feed-downloads.js';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'deliver-feeds.py');
const python = ['python3', 'python'].find((bin) => spawnSync(bin, ['-c', 'import cryptography'], { stdio: 'ignore' }).status === 0);
const skip = python ? false : 'python with the cryptography package is not installed';

function py(code) {
  const loader = `import importlib.util, json, sys\nspec = importlib.util.spec_from_file_location("df", ${JSON.stringify(script)})\ndf = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(df)\n`;
  return execFileSync(python, ['-c', loader + code], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }).trim();
}

test('secrets sealed by Node open in the delivery script', { skip }, () => {
  const key = crypto.randomBytes(32);
  const sealed = sealSecret(key, 'pä$$word with spaces');
  assert.equal(py(`print(df.open_secret(bytes.fromhex(${JSON.stringify(key.toString('hex'))}), ${JSON.stringify(sealed)}))`), 'pä$$word with spaces');
  assert.equal(py('print(df.open_secret(None, "legacy-plain"))'), 'legacy-plain');
});

test('JSON and CSV exports keep every record and every column', { skip }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'deliver-'));
  try {
    const src = path.join(dir, 'in.jsonl');
    await writeFile(src, [
      JSON.stringify({ id: 1, make: 'BMW', price: 47390, tags: ['a', 'b'] }),
      '',
      'not json',
      JSON.stringify({ id: 2, make: 'Ford, "Ka"', mileage_km: 184000 }),
    ].join('\n'));
    const out = JSON.parse(py(`p = df.export_file(${JSON.stringify(src)}, "demo", "2026-11-21", "json", ${JSON.stringify(dir)})\nprint(json.dumps(p))`));
    assert.deepEqual(JSON.parse(await readFile(out, 'utf8')).map((r) => r.id), [1, 2]);
    const csvPath = JSON.parse(py(`p = df.export_file(${JSON.stringify(src)}, "demo", "2026-11-21", "csv", ${JSON.stringify(dir)})\nprint(json.dumps(p))`));
    const lines = (await readFile(csvPath, 'utf8')).trim().split(/\r?\n/);
    assert.equal(lines[0], 'id,make,price,tags,mileage_km');
    assert.equal(lines[1], '1,BMW,47390,"[""a"",""b""]",');
    assert.equal(lines[2], '2,"Ford, ""Ka""",,,184000');
    assert.match(path.basename(csvPath), /^demo_20261121\.csv$/);
    assert.equal(py(`print(df.count_records(${JSON.stringify(src)}))`), '2');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('provider errors are turned into plain sentences', { skip }, () => {
  const said = (message) => py(`print(df.friendly(Exception(${JSON.stringify(message)})))`);
  assert.match(said('250001 (08001): Failed to login: Invalid Snowflake response. 404 Not Found'), /account identifier/);
  assert.equal(said('390100 (08004): Incorrect username or password was specified.'), 'Snowflake refused the user or password');
  assert.match(said("002003 (02000): Database 'RAW' does not exist or not authorized."), /warehouse, database or schema/);
  assert.equal(said('Webhook answered HTTP 404'), 'Webhook answered HTTP 404');
});

test('Snowflake loads stage the file and copy it with the feed and date bound', { skip }, () => {
  // A fake connection that formats parameters the way snowflake-connector-python does (pyformat).
  const sql = JSON.parse(py(`
class Cur:
    def __init__(self, log): self.log = log
    def execute(self, query, params=None):
        self.log.append(query % tuple("'" + p + "'" for p in params) if params is not None else query)
class Conn:
    def __init__(self): self.log = []
    def cursor(self): return Cur(self.log)
    def close(self): pass
conn = Conn()
df.snowflake_connect = lambda cfg, key: conn
cfg = {"snowflake_table": "DONEDEAL", "snowflake_account": "org-acct", "snowflake_database": "VEYORA", "snowflake_schema": "FEEDS"}
print(json.dumps([df.deliver_snowflake(cfg, None, "/tmp/x/listings.jsonl", "donedeal", "2026-11-22"), conn.log]))`));
  const [target, statements] = sql;
  assert.equal(target, 'snowflake://org-acct/VEYORA.FEEDS.DONEDEAL');
  assert.match(statements[0], /^CREATE TABLE IF NOT EXISTS "DONEDEAL"/);
  assert.equal(statements[1], `PUT 'file:///tmp/x/listings.jsonl' @%"DONEDEAL" AUTO_COMPRESS=TRUE OVERWRITE=TRUE`);
  assert.equal(statements[2], `COPY INTO "DONEDEAL" (record, feed_id, snapshot_date) FROM (SELECT $1, 'donedeal', '2026-11-22' FROM @%"DONEDEAL"/listings.jsonl.gz) FILE_FORMAT = (TYPE = JSON) PURGE = TRUE`);
});

test('external delivery folders map to a feed and snapshot date', { skip }, () => {
  const parse = (remote) => JSON.parse(py(`print(json.dumps(df.parse_external_folder(${JSON.stringify(remote)})))`));
  assert.deepEqual(parse('/upload/CARS/IE/Donedeal/donedeal_20261122'), ['donedeal', '2026-11-22']);
  assert.deepEqual(parse('/upload/CARS/RO/Olx/olx_ro_20261122/'), ['olx_ro', '2026-11-22']);
  assert.deepEqual(parse('/upload/CARS/HU/Hasnaltauto/hasnaltauto_20261117'), ['hasnalauto', '2026-11-17']);
  assert.equal(parse('/upload/CARS/IE/Donedeal/latest'), null);
});

test('download links signed by the script verify in Node', { skip }, () => {
  const key = crypto.randomBytes(32);
  const link = py(`u, e = df.download_link("https://veyora.pro/", bytes.fromhex(${JSON.stringify(key.toString('hex'))}), "sub-1", "log-2")\nprint(u)`);
  const url = new URL(link);
  assert.equal(url.pathname, '/v1/feeds/sub-1/deliveries/log-2/file');
  assert.equal(url.searchParams.get('sig'), downloadSignature(key, 'sub-1', 'log-2', url.searchParams.get('expires')));
});
