import assert from 'node:assert/strict';
import test from 'node:test';
import zlib from 'node:zlib';
import { FetchError, fetchThroughProxy } from '../src/fetcher.js';
import { fakeUpstream, plainTarget, targetCert, tlsTarget } from './helpers/fake-upstream.js';

const authorization = `Basic ${Buffer.from('base-user:secret').toString('base64')}`;
const options = (upstream, url, extra = {}) => ({
  url,
  proxy: { host: '127.0.0.1', port: upstream.port, tls: false, authorization },
  timeoutMs: 5_000,
  maxBytes: 1024 * 1024,
  tlsOptions: { ca: targetCert },
  ...extra,
});

test('fetches over HTTP/2 through a CONNECT tunnel with Chrome headers and brotli', async () => {
  let seen;
  const target = await tlsTarget((req, res) => {
    seen = { version: req.httpVersion, headers: req.headers, url: req.url };
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-encoding': 'br', 'set-cookie': ['a=1; Path=/', 'b=2'] });
    res.end(zlib.brotliCompressSync('<html><body>hello h2</body></html>'));
  });
  const upstream = await fakeUpstream({ 'shop.example:443': target.port });
  try {
    const result = await fetchThroughProxy(options(upstream, 'https://shop.example/page?x=1', { cookie: 'sid=abc' }));
    assert.equal(result.status, 200);
    assert.equal(result.protocol, 'h2');
    assert.equal(result.body.toString(), '<html><body>hello h2</body></html>');
    assert.deepEqual(result.headers['set-cookie'], ['a=1; Path=/', 'b=2']);
    assert.ok(result.wireBytes > 0);
    assert.equal(seen.version, '2.0');
    assert.equal(seen.url, '/page?x=1');
    assert.match(seen.headers['user-agent'], /Chrome\/\d+/);
    assert.equal(seen.headers['accept-encoding'], 'gzip, deflate, br');
    assert.equal(seen.headers['sec-fetch-mode'], 'navigate');
    assert.equal(seen.headers.cookie, 'sid=abc');
    assert.deepEqual(upstream.logins, [{ login: 'base-user', authority: 'shop.example:443', method: 'CONNECT' }]);
  } finally {
    await upstream.close();
    await target.close();
  }
});

test('falls back to HTTP/1.1 and decodes gzip', async () => {
  let version;
  const target = await tlsTarget((req, res) => {
    version = req.httpVersion;
    res.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'gzip' });
    res.end(zlib.gzipSync('<html>h1 page</html>'));
  }, { h2: false });
  const upstream = await fakeUpstream({ 'shop.example:443': target.port });
  try {
    const result = await fetchThroughProxy(options(upstream, 'https://shop.example/'));
    assert.equal(result.protocol, 'http/1.1');
    assert.equal(version, '1.1');
    assert.equal(result.body.toString(), '<html>h1 page</html>');
  } finally {
    await upstream.close();
    await target.close();
  }
});

test('plain HTTP goes to the proxy as an absolute URI', async () => {
  const target = await plainTarget((req, res) => {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end(`path ${req.url}`);
  });
  const upstream = await fakeUpstream({ 'shop.example:80': target.port });
  try {
    const result = await fetchThroughProxy(options(upstream, 'http://shop.example/missing?q=2'));
    assert.equal(result.status, 404);
    assert.equal(result.body.toString(), 'path /missing?q=2');
    assert.equal(upstream.logins[0].method, 'GET');
  } finally {
    await upstream.close();
    await target.close();
  }
});

test('refused tunnels, bad certificates, oversize and slow bodies fail with a code', async () => {
  const big = zlib.gzipSync(Buffer.alloc(3 * 1024 * 1024, 'a')); // small on the wire, 3 MB decoded
  const target = await tlsTarget((req, res) => {
    if (req.url === '/slow') return; // never answers
    res.writeHead(200, { 'content-encoding': 'gzip' });
    res.end(big);
  });
  const upstream = await fakeUpstream({ 'shop.example:443': target.port }, { decide: (login) => (login === 'refused' ? 502 : 200) });
  try {
    const refusedAuth = `Basic ${Buffer.from('refused:x').toString('base64')}`;
    await assert.rejects(
      fetchThroughProxy(options(upstream, 'https://shop.example/', { proxy: { host: '127.0.0.1', port: upstream.port, tls: false, authorization: refusedAuth } })),
      (error) => error instanceof FetchError && error.code === 'PROXY',
    );
    await assert.rejects(fetchThroughProxy(options(upstream, 'https://shop.example/', { tlsOptions: {} })), (error) => error.code === 'TLS');
    await assert.rejects(fetchThroughProxy(options(upstream, 'https://shop.example/')), (error) => error.code === 'TOO_LARGE');
    await assert.rejects(fetchThroughProxy(options(upstream, 'https://shop.example/slow', { timeoutMs: 300 })), (error) => error.code === 'TIMEOUT');
  } finally {
    await upstream.close();
    await target.close();
  }
});
