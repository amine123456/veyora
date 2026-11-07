import crypto from 'node:crypto';
import http from 'node:http';
import { createClient, credit, findUsername, listClients, regenerateProxyPassword, setEnabled } from './store.js';

const MAX_BODY_BYTES = 64 * 1024;

function send(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Control channel for the admin CLI while the running gateway owns the store. It must
// listen on loopback only and is never published through the reverse proxy; every
// request also needs ADMIN_TOKEN.
export function createAdminServer({ token }) {
  if (typeof token !== 'string' || token.length < 32) {
    throw new Error('The admin API needs a token of at least 32 characters');
  }
  const expected = crypto.createHash('sha256').update(token).digest();
  const authorized = (request) => {
    const match = /^Bearer (.+)$/.exec(request.headers.authorization ?? '');
    if (!match) return false;
    return crypto.timingSafeEqual(expected, crypto.createHash('sha256').update(match[1]).digest());
  };

  return http.createServer(async (request, response) => {
    try {
      if (!authorized(request)) return send(response, 401, { error: 'Unauthorized' });
      const { pathname } = new URL(request.url, 'http://admin');

      if (request.method === 'GET' && pathname === '/clients') {
        return send(response, 200, await listClients());
      }
      if (request.method !== 'POST') return send(response, 404, { error: 'Not found' });
      const body = await readJson(request);

      if (pathname === '/clients') {
        const password = crypto.randomBytes(24).toString('base64url');
        const client = await createClient(body.username, password, body.bytes ?? 0);
        return send(response, 201, { ...client, password });
      }
      const action = /^\/clients\/([^/]+)\/(credit|enable|disable|password)$/.exec(pathname);
      if (action) {
        const username = await findUsername(decodeURIComponent(action[1]));
        if (!username) return send(response, 404, { error: 'Unknown client' });
        if (action[2] === 'credit') return send(response, 200, await credit(username, body.bytes));
        if (action[2] === 'password') return send(response, 200, { username, password: await regenerateProxyPassword(username) });
        return send(response, 200, await setEnabled(username, action[2] === 'enable'));
      }
      return send(response, 404, { error: 'Not found' });
    } catch (error) {
      return send(response, 400, { error: error instanceof Error ? error.message : 'Request failed' });
    }
  });
}
