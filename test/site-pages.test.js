import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import './helpers/database.js';

const { createPaymentServer } = await import('../src/payments.js');
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const pages = (await readdir(publicDirectory)).filter((name) => name.endsWith('.html'));

function get(port, requestPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: requestPath }, (res) => {
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    }).on('error', reject);
  });
}

// The pages are served with script-src 'self' and style-src-elem 'self': the browser
// silently drops any inline <script>, <style> or on* handler, so the page looks fine in
// the source and is broken for every visitor.
test('no page relies on inline scripts, inline style blocks or inline handlers', async () => {
  assert.ok(pages.length >= 12);
  for (const page of pages) {
    const html = await readFile(path.join(publicDirectory, page), 'utf8');
    for (const [, attributes] of html.matchAll(/<script\b([^>]*)>/g)) {
      assert.match(attributes, /\bsrc=/, `${page} has an inline <script>`);
    }
    assert.doesNotMatch(html, /<style\b/, `${page} has an inline <style>`);
    assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i, `${page} has an inline event handler`);
  }
});

test('every local script and stylesheet a page references is actually served', async () => {
  const server = createPaymentServer({
    stripeKey: '', webhookSecret: '', authAttemptsPerMinute: 30, maxConcurrentAuth: 4,
    maxBodyBytes: 32_768, stripeTimeoutMs: 1_000, requestTimeoutMs: 5_000,
    successUrl: 'https://example.test/success', cancelUrl: 'https://example.test/cancel',
    proxyEndpoint: { scheme: 'https', host: 'gate.example.test', port: 8443 },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const assets = new Set();
    for (const page of pages) {
      const html = await readFile(path.join(publicDirectory, page), 'utf8');
      for (const [, url] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) assets.add(url);
      for (const [, url] of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) assets.add(url);
    }
    const local = [...assets].filter((url) => !/^https?:/.test(url)).map((url) => (url.startsWith('/') ? url : `/${url}`));
    assert.ok(local.includes('/verify-email.js') && local.includes('/nav.js') && local.includes('/docs.css'));
    for (const url of local) {
      const response = await get(port, url);
      assert.equal(response.status, 200, `${url} is referenced but not served`);
      assert.match(response.headers['content-type'], url.endsWith('.css') ? /^text\/css/ : /^text\/javascript/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
