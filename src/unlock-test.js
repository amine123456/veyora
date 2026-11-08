// `npm run admin -- unlock-test`: measures how a site answers each rung of the unlocker
// ladder without billing anyone. One URL prints one line per rung; --batch runs a list
// of URLs and prints the success rate per rung.

const POOLS = new Set(["residential", "mobile", "browser-residential", "browser-mobile", "ref-browser-residential", "ref-browser-mobile"]);
const FETCHERS = new Set(["node", "impersonate"]);
export const UNLOCK_TEST_USAGE = "unlock-test <url> | --batch <file> [--country xx] [--pool residential|mobile] [--fetcher node|impersonate] [--json]";

export function parseUnlockTestArgs(args) {
  const options = { url: null, batch: null, country: null, pool: null, fetcher: "node", json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = () => {
      const next = args[index + 1];
      if (next === undefined || next.startsWith("--")) throw new Error(`${arg} needs a value`);
      index += 1;
      return next;
    };
    if (arg === "--batch") options.batch = value();
    else if (arg === "--country") options.country = value().toLowerCase();
    else if (arg === "--pool") options.pool = value().toLowerCase();
    else if (arg === "--fetcher") options.fetcher = value().toLowerCase();
    else if (arg === "--json") options.json = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
    else if (options.url === null) options.url = arg;
    else throw new Error(`Unexpected argument ${arg}`);
  }
  if (Boolean(options.url) === Boolean(options.batch)) throw new Error("Give one URL or --batch <file>");
  if (options.country !== null && !/^[a-z]{2}$/.test(options.country)) throw new Error("--country must be a two-letter code");
  if (options.pool !== null && !POOLS.has(options.pool)) throw new Error("--pool must be residential or mobile");
  if (!FETCHERS.has(options.fetcher)) throw new Error("--fetcher must be node or impersonate");
  return options;
}

// One URL per line; blank lines and lines starting with # are skipped.
export function parseUrlList(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

// The rungs to try: the unlocker's ladder, or only the rungs of one pool.
export function rungsFor(ladder, pool) {
  const rungs = pool ? ladder.filter((rung) => rung === pool) : [...ladder];
  return rungs.length ? rungs : pool ? [pool] : [];
}

// Runs every URL through every rung, one fetch at a time (gentle on the sites and the
// upstream), and calls onResult as each finishes.
export async function runUnlockTest(probe, { urls, rungs, country = null, onResult = () => {} }) {
  const results = [];
  for (const url of urls) {
    for (const [index, pool] of rungs.entries()) {
      const result = { url, rung: index + 1, ...(await probe({ url, country, pool })) };
      results.push(result);
      onResult(result);
    }
  }
  return { results, summary: summarize(results) };
}

export function summarize(results) {
  const byRung = new Map();
  for (const result of results) {
    const key = `${result.rung}:${result.pool}`;
    const row = byRung.get(key) ?? { rung: result.rung, pool: result.pool, tries: 0, ok: 0, blocked: 0, other: 0, ms: 0, wireBytes: 0, costMicros: 0 };
    row.tries += 1;
    if (result.outcome === "ok") row.ok += 1;
    else if (result.outcome === "blocked") row.blocked += 1;
    else row.other += 1;
    row.ms += result.ms ?? 0;
    row.wireBytes += result.wireBytes ?? 0;
    row.costMicros += result.costMicros ?? 0;
    byRung.set(key, row);
  }
  return [...byRung.values()].map((row) => ({
    rung: row.rung,
    pool: row.pool,
    tries: row.tries,
    ok: row.ok,
    blocked: row.blocked,
    other: row.other,
    successRate: row.tries ? row.ok / row.tries : 0,
    avgMs: row.tries ? Math.round(row.ms / row.tries) : 0,
    wireBytes: row.wireBytes,
    costMicros: row.costMicros,
  }));
}

const kb = (bytes) => (bytes === undefined ? "" : `${(bytes / 1024).toFixed(1)} KB`);
// Micro-dollar precision: a 12 KB page costs about $0.0000017.
const dollars = (micros) => `$${(micros / 1_000_000).toFixed(7)}`;

export function formatResult(result) {
  const detail = result.error ? `error ${result.error}` : `${result.status} ${result.protocol ?? ""}`.trim();
  const reasons = result.reasons?.length ? result.reasons.join(", ") : "-";
  return `rung ${result.rung} ${result.pool.padEnd(11)} ${result.outcome.padEnd(8)} ${detail.padEnd(14)} ${kb(result.bytes).padStart(10)} wire ${kb(result.wireBytes).padStart(10)} ${dollars(result.costMicros)} ${String(result.ms).padStart(6)} ms  ${reasons}  ${result.url}`;
}

export function formatSummary(summary) {
  return summary.map((row) => `rung ${row.rung} ${row.pool.padEnd(11)} ${String(row.ok).padStart(4)}/${String(row.tries).padEnd(4)} ok (${Math.round(row.successRate * 100)}%), blocked ${row.blocked}, other ${row.other}, avg ${row.avgMs} ms, wire ${kb(row.wireBytes)}, cost ${dollars(row.costMicros)}`);
}
