import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

const TARGET_HOST = 'ipwho.is';
const TARGET_PATH = '/';
const COUNTRIES = Object.freeze([
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
]);

function requiredEnvironment(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : '');
  if (!value) {
    throw new Error(`Missing ${name}${fallbackName ? ` (or ${fallbackName})` : ''}`);
  }
  return value;
}

export function usernameForCountry(username, countryCode) {
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error('Country code must be two uppercase ASCII letters');
  }
  if (!/-cc-[A-Z]{2}(?=-|$)/i.test(username)) {
    throw new Error('Upstream username does not contain a -cc-XX country segment');
  }
  return username.replace(/-cc-[A-Z]{2}(?=-|$)/i, `-cc-${countryCode}`);
}

export function usernameForSmoke(username, countryCode, sessionId) {
  if (!/^[a-z0-9]{8,32}$/.test(sessionId)) {
    throw new Error('Session ID must be 8 to 32 lowercase ASCII letters or digits');
  }
  const routedUsername = usernameForCountry(username, countryCode);
  if (!/-sid-[a-z0-9]+(?=-|$)/i.test(routedUsername)) {
    throw new Error('Upstream username does not contain a -sid-SESSION segment');
  }
  return routedUsername.replace(/-sid-[a-z0-9]+(?=-|$)/i, `-sid-${sessionId}`);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  return new Promise((resolve) => server.close(resolve));
}

function requestCountry({ gatewayPort, username, password, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let connectRequest;
    let secureSocket;
    let request;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };

    const timer = setTimeout(() => {
      connectRequest?.destroy();
      request?.destroy();
      secureSocket?.destroy();
      finish(new Error(`Smoke request exceeded ${timeoutMs} ms`));
    }, timeoutMs);
    timer.unref?.();

    const authorization = Buffer.from(`${username}:${password}`).toString('base64');
    connectRequest = http.request({
      host: '127.0.0.1',
      port: gatewayPort,
      method: 'CONNECT',
      path: `${TARGET_HOST}:443`,
      headers: {
        Host: `${TARGET_HOST}:443`,
        'Proxy-Authorization': `Basic ${authorization}`,
      },
    });

    connectRequest.once('error', (error) => finish(error));
    connectRequest.once('connect', (response, socket, head) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        finish(new Error(`Gateway CONNECT returned HTTP ${response.statusCode}`));
        return;
      }
      if (head.length) socket.unshift(head);

      secureSocket = tls.connect({
        socket,
        servername: TARGET_HOST,
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      });
      secureSocket.once('error', (error) => finish(error));

      request = https.request({
        hostname: TARGET_HOST,
        port: 443,
        path: TARGET_PATH,
        method: 'GET',
        agent: false,
        createConnection: () => secureSocket,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'private-proxy-gateway-smoke/1.0',
          Connection: 'close',
        },
      }, (targetResponse) => {
        const chunks = [];
        let size = 0;
        targetResponse.on('data', (chunk) => {
          size += chunk.length;
          if (size > 64 * 1024) {
            request.destroy(new Error('Smoke response exceeded 64 KiB'));
            return;
          }
          chunks.push(chunk);
        });
        targetResponse.once('error', (error) => finish(error));
        targetResponse.once('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            finish(null, {
              statusCode: targetResponse.statusCode,
              success: body.success,
              countryCode: body.country_code,
              countryName: body.country,
            });
          } catch (error) {
            finish(new Error(`Invalid JSON from country endpoint: ${error.message}`));
          }
        });
      });
      request.once('error', (error) => finish(error));
      request.end();
    });
    connectRequest.end();
  });
}

export async function runSmoke() {
  const upstreamHost = requiredEnvironment('SMOKE_UPSTREAM_HOST', 'UPSTREAM_PROXY_HOST');
  const upstreamPortText = process.env.SMOKE_UPSTREAM_PORT || process.env.UPSTREAM_PROXY_PORT || '9999';
  const upstreamPort = Number(upstreamPortText);
  const upstreamUsername = requiredEnvironment('SMOKE_UPSTREAM_USERNAME', 'UPSTREAM_PROXY_USERNAME');
  const upstreamPassword = requiredEnvironment('SMOKE_UPSTREAM_PASSWORD', 'UPSTREAM_PROXY_PASSWORD');
  if (!Number.isSafeInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65_535) {
    throw new Error('Upstream port must be an integer from 1 to 65535');
  }

  // Store data lives only in an OS temporary directory and is deleted at the end.
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'proxy-smoke-'));
  process.env.DATA_FILE = path.join(temporaryDirectory, 'clients.json');

  let gateway;
  try {
    const [{ createGateway }, { createClient, getClient }] = await Promise.all([
      import('../src/gateway.js'),
      import('../src/store.js'),
    ]);

    const localUsername = `smoke-${Date.now()}`;
    const localPassword = `${randomUUID()}-${randomUUID()}`;
    await createClient(localUsername, localPassword, 5 * 1024 * 1024);

    const results = [];
    for (const country of COUNTRIES) {
      const sessionId = randomUUID().replaceAll('-', '').slice(0, 12);
      const before = await getClient(localUsername);
      gateway = await createGateway({
        host: '127.0.0.1',
        port: 0,
        tlsCertFile: '',
        tlsKeyFile: '',
        upstreamHost,
        upstreamPort,
        upstreamUsername: usernameForSmoke(upstreamUsername, country.code, sessionId),
        upstreamPassword,
        upstreamTls: false,
        billingMode: 'total',
        destinationAllowlist: [TARGET_HOST],
        destinationPorts: new Set([443]),
        requestTimeoutMs: 30_000,
        idleTimeoutMs: 30_000,
        maxTunnelLifetimeMs: 60_000,
        connectHandshakeMaxBytes: 64 * 1024,
        maxConnectionsPerClient: 1,
        maxConnectionsGlobal: 1,
        authAttemptsPerMinute: 10,
        maxConcurrentAuth: 2,
        dnsTimeoutMs: 5_000,
        quotaReservationBytes: 64 * 1024,
      });
      const address = await listen(gateway);

      let response;
      let error;
      try {
        response = await requestCountry({
          gatewayPort: address.port,
          username: localUsername,
          password: localPassword,
          timeoutMs: 45_000,
        });
      } catch (caught) {
        error = caught;
      } finally {
        await close(gateway);
        gateway = undefined;
      }

      const after = await getClient(localUsername);
      const usedBytes = after.usedBytes - before.usedBytes;
      const passed = !error
        && response.statusCode === 200
        && response.success !== false
        && response.countryCode === country.code
        && usedBytes > 0;
      results.push({
        requested: country.code,
        expected: country.name,
        status: error ? null : response.statusCode,
        observed: error ? null : response.countryCode,
        observedName: error ? null : response.countryName,
        meteredBytes: usedBytes,
        result: passed ? 'PASS' : 'FAIL',
        error: error?.message,
      });
    }

    console.table(results);
    if (results.some((result) => result.result !== 'PASS')) process.exitCode = 1;
    return results;
  } finally {
    if (gateway) await close(gateway);
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSmoke().catch((error) => {
    // Never print configuration or nested request objects: they can contain credentials.
    console.error(`Live smoke test failed: ${error.message}`);
    process.exitCode = 1;
  });
}
