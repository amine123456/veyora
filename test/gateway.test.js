import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const directory = await mkdtemp(path.join(os.tmpdir(), 'proxy-gateway-'));
process.env.DATA_FILE = path.join(directory, 'state.json');
const store = await import('../src/store.js');
const { createGateway } = await import('../src/gateway.js');
test.after(async () => rm(directory, { recursive: true, force: true }));

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function proxyRequest(port, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, ...options }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}

function gatewayConfig(upstreamPort, overrides = {}) {
  return {
    upstreamHost: '127.0.0.1',
    upstreamPort,
    upstreamUsername: 'upstream-test-user',
    upstreamPassword: 'upstream-test-password-not-live',
    upstreamTls: false,
    tlsCertFile: '',
    tlsKeyFile: '',
    billingMode: 'total',
    destinationAllowlist: [],
    destinationPorts: new Set([80, 443]),
    requestTimeoutMs: 1_000,
    idleTimeoutMs: 1_000,
    maxTunnelLifetimeMs: 2_000,
    connectHandshakeMaxBytes: 4_096,
    maxConnectionsPerClient: 5,
    maxConnectionsGlobal: 10,
    authAttemptsPerMinute: 30,
    maxConcurrentAuth: 4,
    dnsTimeoutMs: 500,
    quotaReservationBytes: 64,
    ...overrides,
  };
}

async function publicTestLookup(hostname, options) {
  assert.deepEqual(options, { all: true, verbatim: true });
  if (hostname === 'mixed.example.test') {
    return [
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ];
  }
  assert.equal(hostname, 'example.test');
  return [{ address: '8.8.8.8', family: 4 }];
}

test('HTTP gateway hides credentials, strips hop headers, blocks private targets, and meters usage', async () => {
  let upstream;
  let gateway;
  try {
    let upstreamRequest;
    upstream = http.createServer((req, res) => {
      upstreamRequest = { url: req.url, headers: req.headers };
      res.writeHead(200, { connection: 'x-upstream-secret', 'x-upstream-secret': 'remove-me', 'content-type': 'text/plain' });
      res.end('gateway-ok');
    });
    await listen(upstream);

    const username = 'gateway-http-test';
    const password = 'gateway http password';
    await store.createClient(username, password, 100_000);
    gateway = await createGateway(gatewayConfig(upstream.address().port), { lookup: publicTestLookup });
    await listen(gateway);
    const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const response = await proxyRequest(gateway.address().port, {
      method: 'GET',
      path: 'http://example.test/test?q=1',
      headers: { 'proxy-authorization': auth, connection: 'x-client-secret', 'x-client-secret': 'remove-me' },
    });
    assert.equal(response.status, 200, response.body);
    assert.equal(response.body, 'gateway-ok');
    assert.equal(response.headers['x-upstream-secret'], undefined);
    assert.equal(upstreamRequest.url, 'http://example.test:80/test?q=1');
    assert.equal(upstreamRequest.headers['x-client-secret'], undefined);
    assert.equal(upstreamRequest.headers['proxy-authorization'], `Basic ${Buffer.from('upstream-test-user:upstream-test-password-not-live').toString('base64')}`);

    const denied = await proxyRequest(gateway.address().port, { method: 'GET', path: 'http://8.8.8.8/' });
    assert.equal(denied.status, 407);
    const privateTarget = await proxyRequest(gateway.address().port, {
      method: 'GET', path: 'http://127.0.0.1/', headers: { 'proxy-authorization': auth },
    });
    assert.equal(privateTarget.status, 403);
    const mixedDnsTarget = await proxyRequest(gateway.address().port, {
      method: 'GET', path: 'http://mixed.example.test/', headers: { 'proxy-authorization': auth },
    });
    assert.equal(mixedDnsTarget.status, 403);
    assert.ok((await store.getClient(username)).usedBytes > 0);
  } finally {
    if (gateway) await close(gateway);
    if (upstream) await close(upstream);
  }
});

test('CONNECT gateway handles coalesced client and upstream bytes and meters the tunnel', async () => {
  let upstream;
  let gateway;
  let clientSocket;
  const upstreamSockets = new Set();
  try {
    let receivedHandshake = '';
    upstream = net.createServer((socket) => {
      upstreamSockets.add(socket);
      socket.on('close', () => upstreamSockets.delete(socket));
      let handshakeDone = false;
      let pending = Buffer.alloc(0);
      socket.on('data', (chunk) => {
        if (!handshakeDone) {
          pending = Buffer.concat([pending, chunk]);
          const end = pending.indexOf('\r\n\r\n');
          if (end < 0) return;
          receivedHandshake = pending.subarray(0, end + 4).toString('latin1');
          handshakeDone = true;
          socket.write('HTTP/1.1 200 Connection established\r\n\r\nPRE');
          const remainder = pending.subarray(end + 4);
          if (remainder.length) socket.write(Buffer.concat([Buffer.from('ECHO:'), remainder]));
          return;
        }
        socket.write(Buffer.concat([Buffer.from('ECHO:'), chunk]));
      });
    });
    await listen(upstream);

    const username = 'gateway-connect-test';
    const password = 'gateway connect password';
    await store.createClient(username, password, 100_000);
    gateway = await createGateway(gatewayConfig(upstream.address().port), { lookup: publicTestLookup });
    await listen(gateway);
    const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

    const received = await new Promise((resolve, reject) => {
      const chunks = [];
      clientSocket = net.connect(gateway.address().port, '127.0.0.1', () => {
        clientSocket.write(`CONNECT example.test:443 HTTP/1.1\r\nHost: example.test:443\r\nProxy-Authorization: ${auth}\r\n\r\nPING`);
      });
      const timer = setTimeout(() => reject(new Error('CONNECT test timed out')), 1_500);
      clientSocket.on('data', (chunk) => {
        chunks.push(chunk);
        const all = Buffer.concat(chunks).toString('latin1');
        if (all.includes('PRE') && all.includes('ECHO:PING')) {
          clearTimeout(timer);
          resolve(all);
          clientSocket.destroy();
        }
      });
      clientSocket.on('error', reject);
    });

    assert.match(received, /^HTTP\/1\.1 200 Connection Established/m);
    assert.match(receivedHandshake, /^CONNECT example\.test:443 HTTP\/1\.1/m);
    assert.match(receivedHandshake, new RegExp(`Proxy-Authorization: Basic ${Buffer.from('upstream-test-user:upstream-test-password-not-live').toString('base64')}`, 'i'));
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.ok((await store.getClient(username)).usedBytes > 0);
  } finally {
    clientSocket?.destroy();
    if (gateway) await close(gateway);
    for (const socket of upstreamSockets) socket.destroy();
    if (upstream) await close(upstream);
  }
});

test('a client resetting the connection after a rejected CONNECT does not crash the gateway', async () => {
  const gateway = await createGateway(gatewayConfig(9), { lookup: publicTestLookup });
  await listen(gateway);
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await new Promise((resolve, reject) => {
        const socket = net.connect(gateway.address().port, '127.0.0.1', () => {
          socket.write('CONNECT example.test:443 HTTP/1.1\r\nHost: example.test:443\r\nProxy-Authorization: Basic bm9ib2R5Ondyb25nLXBhc3N3b3JkLTEyMzQ1\r\n\r\n');
        });
        socket.once('data', (chunk) => {
          try {
            assert.match(chunk.toString(), /^HTTP\/1\.1 407/);
          } catch (error) {
            reject(error);
            return;
          }
          socket.resetAndDestroy();
          setTimeout(resolve, 50);
        });
        socket.on('error', () => {});
      });
    }
    // Still serving after the resets.
    const after = await proxyRequest(gateway.address().port, { method: 'GET', path: 'http://example.test/' });
    assert.equal(after.status, 407);
  } finally {
    await close(gateway);
  }
});

async function leakTestUpstream() {
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let tunnel = false;
    socket.on('data', (chunk) => {
      if (!tunnel) {
        tunnel = true;
        socket.write('HTTP/1.1 200 Connection established\r\n\r\n');
        return;
      }
      socket.write(Buffer.concat([Buffer.from('ECHO:'), chunk]));
    });
  });
  await listen(server);
  return { server, sockets };
}

test('abruptly closed tunnels return their unused quota reservations', async () => {
  const upstream = await leakTestUpstream();
  const username = 'gateway-leak-test';
  const password = 'gateway leak password 1';
  await store.createClient(username, password, 1_000_000);
  // Production-like reservation size so a leaked reservation is obvious; a long idle
  // timeout so only the socket closing (not a timeout) can return it.
  const gateway = await createGateway(
    gatewayConfig(upstream.server.address().port, { quotaReservationBytes: 50_000, idleTimeoutMs: 5_000 }),
    { lookup: publicTestLookup },
  );
  await listen(gateway);
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  try {
    await new Promise((resolve, reject) => {
      const socket = net.connect(gateway.address().port, '127.0.0.1', () => {
        socket.write(`CONNECT example.test:443 HTTP/1.1\r\nHost: example.test:443\r\nProxy-Authorization: ${auth}\r\n\r\n`);
      });
      let established = false;
      socket.on('data', (chunk) => {
        if (!established && chunk.toString().includes('200 Connection Established')) {
          established = true;
          socket.write('PING');
          return;
        }
        if (chunk.toString().includes('ECHO:PING')) {
          socket.resetAndDestroy(); // abrupt: no FIN, like a client crashing or dropping
          resolve();
        }
      });
      socket.on('error', () => {});
      setTimeout(() => reject(new Error('tunnel test timed out')), 3_000);
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const used = (await store.getClient(username)).usedBytes;
    assert.ok(used > 0 && used < 1_000, `expected only the bytes actually sent, got ${used}`);
  } finally {
    await close(gateway);
    for (const socket of upstream.sockets) socket.destroy();
    await close(upstream.server);
  }
});

test('aborted plain HTTP requests return their unused quota reservations', async () => {
  const upstream = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.write('first-chunk'); // then never finish, like a slow download the client abandons
  });
  await listen(upstream);
  const username = 'gateway-http-leak-test';
  const password = 'gateway http leak password';
  await store.createClient(username, password, 1_000_000);
  const gateway = await createGateway(
    gatewayConfig(upstream.address().port, { quotaReservationBytes: 50_000, idleTimeoutMs: 5_000 }),
    { lookup: publicTestLookup },
  );
  await listen(gateway);
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  try {
    await new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1', port: gateway.address().port, method: 'GET',
        path: 'http://example.test/slow', headers: { 'proxy-authorization': auth },
      }, (res) => {
        res.once('data', () => { req.destroy(); resolve(); });
      });
      req.on('error', () => {});
      req.end();
      setTimeout(() => reject(new Error('http test timed out')), 3_000);
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const used = (await store.getClient(username)).usedBytes;
    assert.ok(used > 0 && used < 1_000, `expected only the bytes actually sent, got ${used}`);
  } finally {
    upstream.closeAllConnections?.();
    await close(gateway);
    await close(upstream);
  }
});
