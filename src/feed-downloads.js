// Feed file downloads under /v1/feeds/:
//   GET /v1/feeds/<subscription>/latest                         API pull, authenticated by API key
//   GET /v1/feeds/<subscription>/deliveries/<log>/file?expires=&sig=   signed link sent in webhooks
// Files are the exports scripts/deliver-feeds.py wrote; only paths inside the export
// directory are ever served.
import crypto from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { authenticateApiKey } from './store.js';
import { deliveryExport, latestExport } from './feeds-store.js';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const LATEST = new RegExp(`^/v1/feeds/(${UUID})/latest$`);
const SIGNED = new RegExp(`^/v1/feeds/(${UUID})/deliveries/(${UUID})/file$`);
const TYPES = { jsonl: 'application/x-ndjson', json: 'application/json', csv: 'text/csv; charset=utf-8', parquet: 'application/vnd.apache.parquet' };

// Same derivation as download_link() in scripts/deliver-feeds.py.
export function downloadSignature(key, subscriptionId, logId, expires) {
  const linkKey = crypto.createHmac('sha256', key).update('veyora-download-link').digest();
  return crypto.createHmac('sha256', linkKey).update(`${subscriptionId}.${logId}.${expires}`).digest('hex');
}

function send(response, status, body) {
  const text = JSON.stringify(body);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text), 'Cache-Control': 'no-store' });
  response.end(text);
}

export function createFeedDownloads({ exportDir, secretKey, limiter }) {
  const root = path.resolve(exportDir) + path.sep;

  async function stream(request, response, file) {
    const resolved = path.resolve(file.export_path);
    if (!resolved.startsWith(root)) return send(response, 404, { error: 'File not available' });
    let info;
    try { info = await stat(resolved); } catch { return send(response, 410, { error: 'This snapshot has expired. Download the latest one instead.' }); }
    const name = `${file.feed_id}_${String(file.snapshot_date instanceof Date ? file.snapshot_date.toISOString().slice(0, 10) : file.snapshot_date).replaceAll('-', '')}${path.extname(resolved)}`;
    response.writeHead(200, {
      'Content-Type': TYPES[file.format] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(file.sha256 ? { 'X-Veyora-SHA256': file.sha256 } : {}),
    });
    if (request.method === 'HEAD') return response.end();
    createReadStream(resolved).on('error', () => response.destroy()).pipe(response);
  }

  async function handle(request, response, address) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, { error: 'Use GET' });
    if (limiter && !limiter.allowed(address)) return send(response, 429, { error: 'Too many downloads. Wait a minute and try again.' });
    const url = new URL(request.url, 'http://local');

    const latest = LATEST.exec(url.pathname);
    if (latest) {
      const header = String(request.headers.authorization ?? '');
      const key = /^Bearer\s+(\S+)$/i.exec(header)?.[1] ?? String(request.headers['x-api-key'] ?? '');
      const client = key ? await authenticateApiKey(key) : null;
      if (!client) {
        limiter?.fail(address);
        response.setHeader('WWW-Authenticate', 'Bearer');
        return send(response, 401, { error: 'Missing or invalid API key' });
      }
      const file = await latestExport(latest[1], client.username);
      if (!file) return send(response, 404, { error: 'No snapshot is ready for this subscription yet' });
      return stream(request, response, file);
    }

    const signed = SIGNED.exec(url.pathname);
    if (signed && secretKey) {
      const expires = url.searchParams.get('expires') ?? '';
      const sig = url.searchParams.get('sig') ?? '';
      const expected = downloadSignature(secretKey, signed[1], signed[2], expires);
      const valid = /^\d{10}$/.test(expires) && sig.length === expected.length
        && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      if (!valid) { limiter?.fail(address); return send(response, 403, { error: 'This download link is not valid' }); }
      if (Number(expires) * 1000 < Date.now()) return send(response, 410, { error: 'This download link has expired' });
      const file = await deliveryExport(signed[1], signed[2]);
      if (!file) return send(response, 404, { error: 'File not available' });
      return stream(request, response, file);
    }
    return send(response, 404, { error: 'Not found' });
  }

  return { handle };
}
