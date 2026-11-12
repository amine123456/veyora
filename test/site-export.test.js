import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import './helpers/database.js';

const { createPaymentServer } = await import('../src/payments.js');

const HASH = 'sha256-VovJ5CyMeynqMukA1foxwBgVB4FR4SiF09lssZsReJA=';
const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-site-'));
await mkdir(path.join(directory, '_next', 'static', 'chunks'), { recursive: true });
await writeFile(path.join(directory, 'index.html'), '<!DOCTYPE html><title>Exported home</title>');
await writeFile(path.join(directory, 'styles.css'), 'body{}');
await writeFile(path.join(directory, 'csp-hashes.json'), JSON.stringify({ 'index.html': [HASH] }));
await writeFile(path.join(directory, '_next', 'static', 'chunks', 'abc123.js'), 'console.log(1)');
await writeFile(path.join(directory, '_next', 'static', 'chunks', 'notes.txt'), 'not a servable type');
test.after(() => rm(directory, { recursive: true, force: true }));

const baseConfig = {
  stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 30, maxConcurrentAuth: 4,
  maxBodyBytes: 32_768, stripeTimeoutMs: 1_000, requestTimeoutMs: 5_000,
  successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/cancel',
  proxyEndpoint: { scheme: 'https', host: 'gate.example.test', port: 8443 },
};

function get(port, requestPath) {
  return new Promise((resolve, reject) => {
    // The raw path is sent as-is so traversal attempts are not normalised away by a client.
    const req = http.request({ host: '127.0.0.1', port, path: requestPath, method: 'GET' }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function withServer(config, run) {
  const server = createPaymentServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('an exported site is served with its inline script hashes in the page policy', async () => {
  await withServer({ ...baseConfig, siteDirectory: directory }, async (port) => {
    const page = await get(port, '/');
    assert.equal(page.status, 200);
    assert.match(page.body, /Exported home/);
    assert.ok(page.headers['content-security-policy'].includes(`script-src 'self' '${HASH}' https://challenges.cloudflare.com`));
    assert.doesNotMatch(page.headers['content-security-policy'], /script-src[^;]*unsafe/);

    // Files without recorded hashes keep the strict policy.
    const css = await get(port, '/styles.css');
    assert.equal(css.status, 200);
    assert.ok(css.headers['content-security-policy'].includes("script-src 'self' https://challenges.cloudflare.com"));
  });
});

test('build assets are served with long caching and cannot escape their directory', async () => {
  await withServer({ ...baseConfig, siteDirectory: directory }, async (port) => {
    const chunk = await get(port, '/_next/static/chunks/abc123.js');
    assert.equal(chunk.status, 200);
    assert.equal(chunk.body, 'console.log(1)');
    assert.match(chunk.headers['content-type'], /^text\/javascript/);
    assert.equal(chunk.headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.equal(chunk.headers['x-content-type-options'], 'nosniff');

    for (const attempt of [
      '/_next/static/../../csp-hashes.json',
      '/_next/static/chunks/../../../csp-hashes.json',
      '/_next/static/%2e%2e/%2e%2e/csp-hashes.json',
      '/_next/static/chunks/..%2f..%2f..%2fcsp-hashes.json',
      '/_next/static/chunks/..\\..\\..\\csp-hashes.json',
      '/_next/static/chunks/.hidden.js',
      '/_next/static/chunks/notes.txt',
      '/_next/static/chunks/missing.js',
      '/_next/static/chunks',
      '/_next/static/',
    ]) {
      const response = await get(port, attempt);
      assert.notEqual(response.status, 200, attempt);
      assert.doesNotMatch(response.body, /sha256-/, attempt);
    }
  });
});

test('without SITE_DIR the static pages are served and /_next is not', async () => {
  await withServer(baseConfig, async (port) => {
    const page = await get(port, '/');
    assert.match(page.body, /<title>Veyora \|/);
    assert.ok(page.headers['content-security-policy'].includes("script-src 'self' https://challenges.cloudflare.com"));
    assert.notEqual((await get(port, '/_next/static/chunks/abc123.js')).status, 200);
  });
});

test('a SITE_DIR without a built site refuses to start', () => {
  assert.throws(() => createPaymentServer({ ...baseConfig, siteDirectory: path.join(directory, 'nope') }), /build the site first/);
});
