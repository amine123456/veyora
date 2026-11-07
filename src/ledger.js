import { createReadStream } from "node:fs";
import { appendFile, mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

// The unlocker cost ledger: one JSON line per request in an active file that rotates
// daily (UTC) or when it reaches maxBytes, keeping the newest `keep` archives.
//
// Per-site totals live in memory and in a snapshot (<name>.stats.json) that records how
// many bytes of the active file it already covers. load() reads the snapshot and replays
// only the lines after that offset, so totals survive rotation and restarts without
// re-reading old files. The snapshot is built from lines already appended (the
// "durable" totals), never from requests still waiting to be written, so a crash at any
// point neither loses nor double-counts a line that reached the file.

const SNAPSHOT_VERSION = 1;
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);

function blankSite() {
  return { requests: 0, successes: 0, attempts: 0, revenueMicros: 0, costMicros: 0, wireBytes: 0 };
}

function applyTo(sites, entry) {
  let site = sites.get(entry.site);
  if (!site) {
    site = blankSite();
    sites.set(entry.site, site);
  }
  site.requests += 1;
  site.successes += entry.billed ? 1 : 0;
  site.attempts += Number(entry.attempts) || 0;
  site.revenueMicros += Number(entry.priceMicros) || 0;
  site.costMicros += Number(entry.costMicros) || 0;
  site.wireBytes += Number(entry.wireBytes) || 0;
  return site;
}

const clone = (sites) => new Map([...sites].map(([name, totals]) => [name, { ...totals }]));

export function createLedger(file, {
  flagMinRequests = 20,
  maxBytes = 50 * 1024 * 1024,
  keep = 30,
  snapshotEvery = 1_000,
  snapshotIntervalMs = 60_000,
  now = Date.now,
  log = console,
} = {}) {
  const directory = path.dirname(file);
  const base = path.basename(file, ".jsonl");
  const snapshotFile = path.join(directory, `${base}.stats.json`);
  const losing = (site) => site.requests >= flagMinRequests && site.costMicros > site.revenueMicros;

  let live = new Map(); // everything recorded, for stats
  let durable = new Map(); // only lines appended to the file, for the snapshot
  const pending = []; // recorded, not yet appended, in order
  let offset = 0; // bytes of the active file covered by `durable`
  let activeDay = null;
  let unsnapshotted = 0;
  let chain = Promise.resolve();
  let initialized = null;
  let timer = null;

  async function saveSnapshot() {
    const body = JSON.stringify({
      version: SNAPSHOT_VERSION,
      savedAt: new Date(now()).toISOString(),
      activeDay,
      offset,
      sites: Object.fromEntries(durable),
    });
    const temporary = `${snapshotFile}.${process.pid}.tmp`;
    await writeFile(temporary, body, { mode: 0o600 });
    await rename(temporary, snapshotFile);
    unsnapshotted = 0;
  }

  async function readSnapshot() {
    try {
      const parsed = JSON.parse(await readFile(snapshotFile, "utf8"));
      if (parsed?.version !== SNAPSHOT_VERSION || !Number.isSafeInteger(parsed.offset) || parsed.offset < 0) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function replay(from) {
    const stream = createReadStream(file, { start: from, encoding: "utf8" });
    const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line) continue;
      try { applyTo(durable, JSON.parse(line)); } catch { /* a torn line after a crash is skipped */ }
    }
  }

  function init() {
    initialized ??= (async () => {
      await mkdir(directory, { recursive: true });
      const snapshot = await readSnapshot();
      if (snapshot) {
        durable = new Map(Object.entries(snapshot.sites ?? {}).map(([name, totals]) => [name, { ...blankSite(), ...totals }]));
        offset = snapshot.offset;
        activeDay = snapshot.activeDay ?? null;
      }
      let info = null;
      try { info = await stat(file); } catch { /* no active file yet */ }
      if (!info) {
        offset = 0;
        activeDay = null;
      } else {
        // A file shorter than the snapshot's offset is not the one it described: replay it all.
        if (info.size < offset) offset = 0;
        if (info.size > offset) await replay(offset);
        offset = info.size;
        activeDay ??= info.size > 0 ? utcDay(info.mtimeMs) : null;
        if (info.size > 0) {
          // A crash can leave a torn last line; end it so the next line starts clean.
          const handle = await open(file, "r");
          const last = Buffer.alloc(1);
          await handle.read(last, 0, 1, info.size - 1);
          await handle.close();
          if (last[0] !== 0x0a) {
            await appendFile(file, "\n");
            offset += 1;
          }
        }
      }
      live = clone(durable);
      for (const entry of pending) applyTo(live, entry);
      if (snapshotIntervalMs > 0) {
        timer = setInterval(() => {
          chain = chain.then(() => (unsnapshotted > 0 ? saveSnapshot() : undefined))
            .catch((error) => log.error?.(`Unlocker ledger snapshot failed: ${error.message}`));
        }, snapshotIntervalMs);
        timer.unref?.();
      }
    })();
    return initialized;
  }

  async function archiveName() {
    for (let index = 0; ; index += 1) {
      const name = path.join(directory, `${base}-${activeDay ?? utcDay(now())}${index ? `.${index}` : ""}.jsonl`);
      try { await stat(name); } catch { return name; }
    }
  }

  async function prune() {
    const prefix = `${base}-`;
    const archives = [];
    for (const name of await readdir(directory)) {
      if (!name.startsWith(prefix) || !name.endsWith(".jsonl")) continue;
      const full = path.join(directory, name);
      archives.push({ full, mtime: (await stat(full)).mtimeMs, name });
    }
    archives.sort((left, right) => left.mtime - right.mtime || left.name.localeCompare(right.name));
    for (const old of archives.slice(0, Math.max(0, archives.length - keep))) await unlink(old.full);
  }

  async function rotate() {
    // Snapshot first: it then covers the whole old file, so a crash after the rename
    // (when the active file is gone) loses nothing.
    await saveSnapshot();
    await rename(file, await archiveName());
    offset = 0;
    activeDay = null;
    await saveSnapshot();
    await prune();
  }

  async function write(entry, line) {
    await init();
    const size = Buffer.byteLength(line);
    const today = utcDay(now());
    if (offset > 0 && (today !== activeDay || offset + size > maxBytes)) await rotate();
    await appendFile(file, line, { encoding: "utf8", mode: 0o600 });
    if (offset === 0) activeDay = today;
    offset += size;
    applyTo(durable, entry);
    unsnapshotted += 1;
    if (unsnapshotted >= snapshotEvery) await saveSnapshot();
  }

  return {
    record(entry) {
      const before = live.get(entry.site);
      const wasLosing = before ? losing(before) : false;
      const site = applyTo(live, entry);
      if (losing(site) && !wasLosing) {
        log.warn?.(`Unlocker: ${entry.site} is losing money (cost ${Math.round(site.costMicros)} > revenue ${site.revenueMicros} micros over ${site.requests} requests)`);
      }
      pending.push(entry);
      const line = `${JSON.stringify(entry)}\n`;
      chain = chain
        .then(() => write(entry, line))
        .catch((error) => log.error?.(`Unlocker ledger write failed: ${error.message}`))
        .finally(() => pending.shift());
      return chain;
    },
    load() {
      return init();
    },
    flush() {
      return chain;
    },
    // Writes a final snapshot and stops the timer (for shutdown and tests).
    async close() {
      clearInterval(timer);
      await chain;
      if (initialized) await saveSnapshot();
    },
    stats() {
      return [...live.entries()]
        .map(([site, value]) => ({
          site,
          ...value,
          costMicros: Math.round(value.costMicros),
          flagged: losing(value),
          successRate: value.requests ? value.successes / value.requests : 0,
          marginMicros: Math.round(value.revenueMicros - value.costMicros),
        }))
        .sort((left, right) => right.requests - left.requests);
    },
  };
}
