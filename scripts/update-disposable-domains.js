// Refreshes src/lists/disposable-email-domains.txt from the maintained public list.
//   npm run update-disposable-domains
import { writeFile } from 'node:fs/promises';

const SOURCE = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';
const target = new URL('../src/lists/disposable-email-domains.txt', import.meta.url);

const response = await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const domains = (await response.text()).split('\n').map((line) => line.trim().toLowerCase()).filter(Boolean);
if (domains.length < 1_000 || domains.some((domain) => !/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(domain))) {
  throw new Error('Downloaded list looks wrong; file left unchanged');
}
await writeFile(target, `${domains.join('\n')}\n`);
console.log(`Saved ${domains.length} disposable domains`);
