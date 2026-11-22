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

test('download links signed by the script verify in Node', { skip }, () => {
  const key = crypto.randomBytes(32);
  const link = py(`u, e = df.download_link("https://veyora.pro/", bytes.fromhex(${JSON.stringify(key.toString('hex'))}), "sub-1", "log-2")\nprint(u)`);
  const url = new URL(link);
  assert.equal(url.pathname, '/v1/feeds/sub-1/deliveries/log-2/file');
  assert.equal(url.searchParams.get('sig'), downloadSignature(key, 'sub-1', 'log-2', url.searchParams.get('expires')));
});
