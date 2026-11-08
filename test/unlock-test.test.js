import assert from 'node:assert/strict';
import test from 'node:test';
import { formatResult, formatSummary, parseUnlockTestArgs, parseUrlList, rungsFor, runUnlockTest } from '../src/unlock-test.js';

test('unlock-test parses one URL or a batch file with options', () => {
  assert.deepEqual(parseUnlockTestArgs(['https://www.mobile.de/', '--country', 'DE', '--pool', 'mobile']), {
    url: 'https://www.mobile.de/', batch: null, country: 'de', pool: 'mobile', fetcher: 'node', json: false,
  });
  assert.equal(parseUnlockTestArgs(['--batch', 'urls.txt', '--json']).batch, 'urls.txt');
  assert.equal(parseUnlockTestArgs(['https://a.example/', '--fetcher', 'impersonate']).fetcher, 'impersonate');
  for (const bad of [
    [],
    ['https://a.example/', '--batch', 'x.txt'],
    ['https://a.example/', 'https://b.example/'],
    ['https://a.example/', '--country', 'deu'],
    ['https://a.example/', '--pool', 'datacenter'],
    ['https://a.example/', '--fetcher', 'curl'],
    ['https://a.example/', '--country'],
    ['https://a.example/', '--verbose'],
  ]) assert.throws(() => parseUnlockTestArgs(bad), Error, bad.join(' '));
});

test('URL lists skip blanks and comments; rungs follow the ladder or one pool', () => {
  assert.deepEqual(parseUrlList('# sites\nhttps://a.example/\r\n\n  https://b.example/x  \n#https://c.example/\n'), ['https://a.example/', 'https://b.example/x']);
  const ladder = ['residential', 'residential', 'mobile'];
  assert.deepEqual(rungsFor(ladder, null), ladder);
  assert.deepEqual(rungsFor(ladder, 'residential'), ['residential', 'residential']);
  assert.deepEqual(rungsFor(ladder, 'mobile'), ['mobile']);
  assert.deepEqual(rungsFor(['residential'], 'mobile'), ['mobile']); // probe reports it is not configured
});

test('a batch runs every URL on every rung in order and sums the success rate per rung', async () => {
  const calls = [];
  const probe = async ({ url, country, pool }) => {
    calls.push(`${url} ${pool} ${country}`);
    const blocked = pool === 'residential' && url.includes('hard');
    return blocked
      ? { pool, outcome: 'blocked', status: 403, reasons: ['status:403', 'server:AkamaiGHost'], bytes: 0, wireBytes: 2048, costMicros: 0.3, ms: 100 }
      : { pool, outcome: 'ok', status: 200, protocol: 'h2', reasons: [], bytes: 50_000, wireBytes: 20_000, costMicros: 3, ms: 300 };
  };
  const seen = [];
  const { results, summary } = await runUnlockTest(probe, {
    urls: ['https://easy.example/', 'https://hard.example/'],
    rungs: ['residential', 'residential', 'mobile'],
    country: 'de',
    onResult: (result) => seen.push(result.rung),
  });
  assert.equal(results.length, 6);
  assert.deepEqual(seen, [1, 2, 3, 1, 2, 3]);
  assert.equal(calls[0], 'https://easy.example/ residential de');
  assert.deepEqual(summary.map(({ rung, pool, tries, ok, blocked, successRate }) => ({ rung, pool, tries, ok, blocked, successRate })), [
    { rung: 1, pool: 'residential', tries: 2, ok: 1, blocked: 1, successRate: 0.5 },
    { rung: 2, pool: 'residential', tries: 2, ok: 1, blocked: 1, successRate: 0.5 },
    { rung: 3, pool: 'mobile', tries: 2, ok: 2, blocked: 0, successRate: 1 },
  ]);
  assert.equal(summary[0].avgMs, 200);

  const line = formatResult(results[3]);
  assert.match(line, /rung 1 residential blocked\s+403/);
  assert.match(line, /status:403, server:AkamaiGHost/);
  assert.match(line, /https:\/\/hard\.example\//);
  assert.match(formatSummary(summary)[2], /rung 3 mobile\s+2\/2\s+ok \(100%\)/);
  assert.match(formatResult({ url: 'x', rung: 1, pool: 'mobile', outcome: 'error', error: 'TIMEOUT', reasons: [], wireBytes: 0, costMicros: 0, ms: 5 }), /error TIMEOUT/);
});

test('the admin CLI rejects bad unlock-test arguments before fetching anything', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { fileURLToPath } = await import('node:url');
  const run = promisify(execFile);
  const adminScript = fileURLToPath(new URL('../src/admin.js', import.meta.url));
  const env = { ...process.env, ADMIN_TOKEN: '' };
  for (const [args, message] of [
    [['unlock-test'], /Give one URL or --batch/],
    [['unlock-test', 'https://a.example/', '--pool', 'isp'], /--pool must be residential or mobile/],
    [['unlock-test', 'https://a.example/', '--fetcher', 'impersonate'], /impersonate fetcher is not installed yet/],
  ]) {
    await assert.rejects(run(process.execPath, [adminScript, ...args], { env }), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, message);
      return true;
    });
  }
});
