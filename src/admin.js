import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { adminConfig, gatewayConfig, pricingConfig, unlockerConfig } from './config.js';
import { UNLOCK_TEST_USAGE, formatResult, formatSummary, parseUnlockTestArgs, parseUrlList, rungsFor, runUnlockTest } from './unlock-test.js';
import { MICROS_PER_USD, createClient, credit, creditWallet, findUsername, listClients, regenerateProxyPassword, setEnabled } from './store.js';

const [, , command, ...args] = process.argv;

function gb(value, { allowZero = false } = {}) {
  const amount = Number(value);
  const bytes = Math.round(amount * 1024 ** 3);
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0) || !Number.isSafeInteger(bytes)) {
    throw new Error('GB must be a positive, finite number');
  }
  return bytes;
}

const display = (bytes) => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(3)} GB`;
};

function usage() {
  console.log('Usage:');
  console.log('  npm run admin -- create <username> [initial-gb]');
  console.log('  npm run admin -- credit <username|email> <gb>');
  console.log('  npm run admin -- credit-usd <username|email> <usd>');
  console.log('  npm run admin -- unlocker-stats');
  console.log(`  npm run admin -- ${UNLOCK_TEST_USAGE}`);
  console.log('  npm run admin -- password <username|email>');
  console.log('  npm run admin -- enable|disable <username|email>');
  console.log('  npm run admin -- list');
}

// While the server runs it owns the store, so commands go through its loopback admin
// API. Only when nothing is listening do they edit the store file directly.
const admin = adminConfig();
async function api(method, path, body) {
  if (!admin.token) return null;
  let response;
  try {
    response = await fetch(`http://127.0.0.1:${admin.port}${path}`, {
      method,
      headers: { authorization: `Bearer ${admin.token}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error?.cause?.code === 'ECONNREFUSED') return null;
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Admin API returned ${response.status}`);
  return data;
}

async function offlineUsername(identifier) {
  const username = await findUsername(identifier);
  if (!username) throw new Error('Unknown client');
  return username;
}

async function unlockTest(options) {
  if (options.fetcher === 'impersonate') {
    throw new Error('The impersonate fetcher is not installed yet; use --fetcher node');
  }
  const { createUnlocker } = await import('./unlocker.js');
  const { browserAvailable, fetchWithBrowser } = await import('./browser-fetcher.js');
  const gateway = gatewayConfig();
  const config = { ...unlockerConfig(), ledgerFile: path.join(os.tmpdir(), `unlock-test-${process.pid}.jsonl`) };
  const hasBrowser = await browserAvailable();
  const unlocker = createUnlocker({
    gateway, pricing: pricingConfig(), config,
    browserFetchImpl: hasBrowser ? fetchWithBrowser : null,
    log: { info: (line) => console.error(line), warn: (line) => console.error(line), error: (line) => console.error(line) },
  });
  const urls = options.batch ? parseUrlList(await readFile(options.batch, 'utf8')) : [options.url];
  if (!urls.length) throw new Error('The batch file lists no URLs');
  const rungs = rungsFor(unlocker.rungs, options.pool);
  if (!rungs.length) throw new Error('No rungs to test');
  if (!options.json) {
    console.log(`Testing ${urls.length} URL(s) on ${rungs.length} rung(s): ${rungs.join(', ')}${options.country ? `, country ${options.country}` : ''}. Nothing is billed.`);
  }
  const report = await runUnlockTest(unlocker.probe, {
    urls,
    rungs,
    country: options.country,
    onResult: (result) => { if (!options.json) console.log(formatResult(result)); },
  });
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (urls.length > 1 || rungs.length > 1) {
    console.log('Per rung:');
    for (const line of formatSummary(report.summary)) console.log(`  ${line}`);
  }
}

async function main() {
  if (command === 'unlock-test') {
    await unlockTest(parseUnlockTestArgs(args));
    return;
  }

  if (command === 'create' && (args.length === 1 || args.length === 2)) {
    const initialBytes = args[1] === undefined ? 0 : gb(args[1], { allowZero: true });
    let created = await api('POST', '/clients', { username: args[0], bytes: initialBytes });
    if (!created) {
      const password = crypto.randomBytes(24).toString('base64url');
      created = { ...(await createClient(args[0], password, initialBytes)), password };
    }
    console.log('Created client. Save this password now; it is not stored in plaintext.');
    console.log(`Username: ${created.username}`);
    console.log(`Password: ${created.password}`);
    return;
  }

  if (command === 'credit' && args.length === 2) {
    const bytes = gb(args[1]);
    const client = await api('POST', `/clients/${encodeURIComponent(args[0])}/credit`, { bytes })
      ?? await credit(await offlineUsername(args[0]), bytes);
    console.log(`Credited ${args[1]} GB to ${client.username}. Remaining: ${display(client.remainingBytes)}`);
    return;
  }

  if (command === 'credit-usd' && args.length === 2) {
    const usd = Number(args[1]);
    if (!Number.isFinite(usd) || usd <= 0 || usd > 100_000) throw new Error('USD must be a positive amount up to 100000');
    const client = await api('POST', `/clients/${encodeURIComponent(args[0])}/credit-usd`, { usd })
      ?? await creditWallet(await offlineUsername(args[0]), Math.round(usd * MICROS_PER_USD));
    console.log(`Credited $${usd.toFixed(2)} to ${client.username}. Balance: $${(client.balanceMicros / MICROS_PER_USD).toFixed(4)}`);
    return;
  }

  if (command === 'unlocker-stats' && args.length === 0) {
    const stats = await api('GET', '/unlocker/stats');
    if (!stats) throw new Error('unlocker-stats needs the running server and ADMIN_TOKEN');
    console.table(stats.map((site) => ({
      site: site.site,
      requests: site.requests,
      success: `${Math.round(site.successRate * 100)}%`,
      revenue: `$${(site.revenueMicros / MICROS_PER_USD).toFixed(4)}`,
      cost: `$${(site.costMicros / MICROS_PER_USD).toFixed(4)}`,
      margin: `$${(site.marginMicros / MICROS_PER_USD).toFixed(4)}`,
      flagged: site.flagged ? 'LOSING MONEY' : '',
    })));
    return;
  }

  if (command === 'password' && args.length === 1) {
    const username = await offlineUsername(args[0]);
    const rotated = await api('POST', `/clients/${encodeURIComponent(username)}/password`, {})
      ?? { username, password: await regenerateProxyPassword(username) };
    console.log('Replaced proxy password. Save it now; it is not stored in plaintext.');
    console.log(`Username: ${rotated.username}`);
    console.log(`Password: ${rotated.password}`);
    return;
  }

  if ((command === 'enable' || command === 'disable') && args.length === 1) {
    const client = await api('POST', `/clients/${encodeURIComponent(args[0])}/${command}`, {})
      ?? await setEnabled(await offlineUsername(args[0]), command === 'enable');
    console.log(`${client.username} ${command}d`);
    return;
  }

  if (command === 'list' && args.length === 0) {
    const clients = await api('GET', '/clients') ?? await listClients();
    console.table(clients.map((client) => ({
      username: client.username,
      email: client.email ?? '',
      enabled: client.enabled,
      quota: display(client.quotaBytes),
      used: display(client.usedBytes),
      remaining: display(client.remainingBytes),
      balance: `$${((client.balanceMicros ?? 0) / MICROS_PER_USD).toFixed(4)}`,
    })));
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Administration command failed');
  process.exitCode = 1;
});
