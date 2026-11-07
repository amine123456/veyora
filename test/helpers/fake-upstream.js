import { readFileSync } from 'node:fs';
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
export const targetCert = readFileSync(path.join(fixtures, 'target-cert.pem'));
const targetKey = readFileSync(path.join(fixtures, 'target-key.pem'));

export function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

export function close(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}

// A TLS target. handler(req, res) is a normal request handler; h2 decides whether the
// server offers HTTP/2 over ALPN (with HTTP/1.1 fallback) or HTTP/1.1 only.
export async function tlsTarget(handler, { h2 = true } = {}) {
  const server = h2
    ? http2.createSecureServer({ cert: targetCert, key: targetKey, allowHTTP1: true }, handler)
    : https.createServer({ cert: targetCert, key: targetKey }, handler);
  const sessions = new Set();
  server.on('session', (session) => { sessions.add(session); session.on('close', () => sessions.delete(session)); });
  const port = await listen(server);
  return {
    port,
    close: async () => {
      for (const session of sessions) session.destroy();
      await close(server);
    },
  };
}

export async function plainTarget(handler) {
  const server = http.createServer(handler);
  const port = await listen(server);
  return { port, close: () => close(server) };
}

// A stand-in for the upstream provider. It accepts CONNECT and absolute-URI requests,
// records each login it was given, and routes hostnames to local ports through routes
// ({ 'shop.example:443': port }). decide(login, authority) may return a status to refuse.
export async function fakeUpstream(routes, { decide = () => 200 } = {}) {
  const logins = [];
  const loginOf = (header) => Buffer.from(String(header ?? '').replace(/^Basic /, ''), 'base64').toString().split(':')[0];
  const server = http.createServer((request, response) => {
    const login = loginOf(request.headers['proxy-authorization']);
    const target = new URL(request.url);
    const authority = `${target.hostname}:${target.port || 80}`;
    logins.push({ login, authority, method: 'GET' });
    const status = decide(login, authority);
    if (status !== 200 || !routes[authority]) {
      response.writeHead(status === 200 ? 502 : status);
      response.end();
      return;
    }
    const headers = { ...request.headers };
    delete headers['proxy-authorization'];
    const forwarded = http.request({
      host: '127.0.0.1', port: routes[authority], method: request.method, path: `${target.pathname}${target.search}`, headers,
    }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    forwarded.on('error', () => response.destroy());
    forwarded.end();
  });
  server.on('connect', (request, socket, head) => {
    socket.on('error', () => socket.destroy());
    const login = loginOf(request.headers['proxy-authorization']);
    logins.push({ login, authority: request.url, method: 'CONNECT' });
    const status = decide(login, request.url);
    if (status !== 200 || !routes[request.url]) {
      socket.end(`HTTP/1.1 ${status === 200 ? 502 : status} Refused\r\n\r\n`);
      return;
    }
    const target = net.connect(routes[request.url], '127.0.0.1', () => {
      socket.write('HTTP/1.1 200 Connection established\r\n\r\n');
      if (head.length) target.write(head);
      socket.pipe(target);
      target.pipe(socket);
    });
    target.on('error', () => socket.destroy());
    socket.on('close', () => target.destroy());
  });
  const port = await listen(server);
  return { port, logins, close: () => close(server) };
}

// A lookup that makes the test hostnames look public to the SSRF check.
export async function publicLookup(hostname) {
  if (hostname === 'private.example') return [{ address: '10.0.0.5', family: 4 }];
  return [{ address: '93.184.216.34', family: 4 }];
}
