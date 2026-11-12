// The backend serves pages with script-src 'self', which blocks inline scripts. Next.js
// emits a few inline bootstrap scripts per page, so after each build this records their
// SHA-256 hashes; the backend adds exactly those hashes to that page's policy.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');
const pages = fs.readdirSync(out, { recursive: true }).map(String).filter((name) => name.endsWith('.html'));
const hashes = {};

for (const page of pages) {
  const html = fs.readFileSync(path.join(out, page), 'utf8');
  const found = new Set();
  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attributes) || body === '') continue;
    found.add(`sha256-${crypto.createHash('sha256').update(body).digest('base64')}`);
  }
  hashes[page.replaceAll('\\', '/')] = [...found];
}

fs.writeFileSync(path.join(out, 'csp-hashes.json'), `${JSON.stringify(hashes, null, 2)}\n`);
console.log(`Recorded inline script hashes for ${pages.length} pages`);
