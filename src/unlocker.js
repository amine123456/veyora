import crypto from "node:crypto";
import dns from "node:dns/promises";
import { StringDecoder } from "node:string_decoder";
import { upstreamAuthorization, upstreamEndpoint } from "./auth.js";
import { fetchThroughProxy, chromeHeaders } from "./fetcher.js";
import { createLedger } from "./ledger.js";
import { resolveTarget } from "./gateway.js";
import { authenticateApiKey, insertUsageEvent, releaseFunds, reserveFunds } from "./store.js";

// Web Unlocker: POST /v1/unlock fetches one public page for an API-key holder. Each
// request is priced up front from the wallet and refunded unless the page came back.
// Attempts climb a ladder of exits (residential, a new residential IP, then mobile) and
// remember per site which rung last worked, so hard sites start where they succeed.

const GIB = 1024 ** 3;
const MAX_REQUEST_BODY = 16 * 1024;
const MAX_REDIRECTS = 5;
const DOMAIN_MEMORY_MS = 30 * 60 * 1000;
const MAX_TRACKED = 50_000;
const MAX_COOKIES = 100;
const MARKER_SCAN_LIMIT = 150 * 1024;
const REQUEST_FIELDS = new Set(["url", "country", "render", "session"]);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const BLOCK_STATUSES = new Set([403, 429, 503]);
// Pages that are really there (or really gone) are billed like a 200.
const BILLABLE_STATUSES = new Set([404, 410]);
const RETRYABLE_ERRORS = new Set(["PROXY", "TIMEOUT", "NETWORK", "TLS", "ENCODING", "BUSY"]);

// Text found on anti-bot challenge and block pages. Only scanned on small HTML bodies:
// real pages often embed the same vendors' scripts, but never at challenge-page size.
// Each has a name so diagnostics (unlock-test) can say which one matched.
const CHALLENGE_MARKERS = [
  ["cloudflare-challenge-title", /<title>\s*just a moment\.\.\.\s*<\/title>/i],
  ["cloudflare-challenge-script", /cf-chl-|cf_chl_opt|cf-browser-verification/i],
  ["cloudflare-block", /attention required! \| cloudflare/i],
  ["imperva", /incapsula incident id|request unsuccessful\. incapsula/i],
  ["perimeterx", /px-captcha|perimeterx block/i],
  ["datadome", /captcha-delivery\.com|geo\.captcha-delivery/i],
  // Akamai's edge block page: <TITLE>Access Denied</TITLE> ... "Reference #18.xxxx" and a
  // link to errors.edgesuite.net. Akamai writes both with HTML entities
  // (Reference&#32;&#35;18&#46;..., errors&#46;edgesuite&#46;net), so markers are matched
  // against the text with numeric entities decoded.
  ["akamai-access-denied", /<title>\s*access denied\s*<\/title>[\s\S]*reference\s*#/i],
  ["akamai-edgesuite", /errors\.edgesuite\.net/i],
  ["akamai-challenge", /\/_sec\/cp_challenge/i],
  // Site-styled denial pages, e.g. mobile.de's "Zugriff verweigert / Access denied".
  // The title must be only the phrase(s), so "Help: access denied errors" is not a match.
  ["access-denied-title", /<title>\s*(?:(?:access denied|zugriff verweigert)\s*[/|:–-]?\s*)+<\/title>/i],
  ["datadome-adblock", /please enable js and disable any ad blocker/i],
  // AWS WAF's JavaScript challenge (Amazon, Booking): served as a 202 with challenge.js.
  ["aws-waf", /awsWafCookieDomainList|gokuProps|token\.awswaf\.com/i],
  ["captcha", /verify you are human|are you a robot\?|verify that you(?:’|&#39;|’)re not a robot/i],
  ["bot-block", /(?:que eres|sei) un (?:bot|robot)|(?:you(?:’|&#39;|’)re|you are) a (?:bot|robot)/i],
  // Cloudflare Turnstile managed challenge: the page embeds Turnstile JS/iframe.
  ["cloudflare-turnstile", /challenges\.cloudflare\.com|cf-turnstile-response|turnstile\.render/i],
  // Google's no-results stub that only redirects to its enable-JavaScript page.
  ["google-enablejs", /\/httpservice\/retry\/enablejs/i],
];

// Decodes numeric character references (&#46; &#x2E;) so entity-encoded block pages match.
function decodeNumericEntities(text) {
  return text.replace(/&#(x[0-9a-f]{1,6}|[0-9]{1,7});/gi, (entity, code) => {
    const point = code[0] === "x" || code[0] === "X" ? Number.parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });
}

class PublicError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Writes a page response as JSON without building the whole document in memory: the
// metadata first, then the body encoded and escaped in slices, honouring backpressure.
// A 5 MB page then costs its buffer plus one slice, not three more full-size copies.
const BODY_SLICE = 48 * 1024; // a multiple of 3, so base64 slices need no padding

async function sendPage(response, value, body, encoding) {
  if (response.headersSent) return response.destroy();
  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  // Waits for 'drain' (or 'close' if the client goes away), removing the other listener
  // so a slow reader does not pile up one 'close' listener per slice.
  const write = (chunk) => (response.write(chunk) || response.destroyed
    ? undefined
    : new Promise((resolve) => {
        const done = () => {
          response.off("drain", done);
          response.off("close", done);
          resolve();
        };
        response.on("drain", done);
        response.on("close", done);
      }));
  const head = JSON.stringify(value);
  await write(`${head.slice(0, -1)},"body":"`);
  const decoder = encoding === "base64" ? null : new StringDecoder(encoding);
  for (let start = 0; start < body.length && !response.destroyed; start += BODY_SLICE) {
    const slice = body.subarray(start, start + BODY_SLICE);
    await write(decoder ? JSON.stringify(decoder.write(slice)).slice(1, -1) : slice.toString("base64"));
  }
  if (decoder) await write(JSON.stringify(decoder.end()).slice(1, -1));
  response.end('"}');
}

function send(response, status, value, headers = {}) {
  if (response.headersSent) return response.destroy();
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  response.end(JSON.stringify(value));
}

function matchesDomain(hostname, domains) {
  if (domains.has(hostname)) return true;
  for (let index = hostname.indexOf("."); index !== -1; index = hostname.indexOf(".", index + 1)) {
    if (domains.has(hostname.slice(index + 1))) return true;
  }
  return false;
}

function premiumMultiplier(hostname, premiumDomains) {
  for (let candidate = hostname; candidate; ) {
    if (premiumDomains.has(candidate)) return premiumDomains.get(candidate);
    const dot = candidate.indexOf(".");
    candidate = dot === -1 ? "" : candidate.slice(dot + 1);
  }
  return 1;
}

export function siteOf(hostname) {
  return hostname.replace(/^www\./, "");
}

// Fixed-window counter per key, pruned as it grows.
function windowCounter(limit, windowMs = 60_000) {
  const counts = new Map();
  return {
    take(key, now = Date.now()) {
      let entry = counts.get(key);
      if (!entry || now - entry.start >= windowMs) {
        if (counts.size >= MAX_TRACKED) counts.clear();
        entry = { start: now, count: 0 };
        counts.set(key, entry);
      }
      entry.count += 1;
      return entry.count <= limit;
    },
    exceeded(key, now = Date.now()) {
      const entry = counts.get(key);
      return Boolean(entry && now - entry.start < windowMs && entry.count >= limit);
    },
  };
}

// A minimal cookie jar: name/value per domain with expiry, enough to carry
// anti-bot clearance cookies and redirect-set cookies between requests.
export class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(hostname, setCookies, now = Date.now()) {
    for (const line of [].concat(setCookies ?? [])) {
      const [pair, ...attributes] = String(line).split(";");
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,256}$/.test(name) || value.length > 4096 || /[\r\n;]/.test(value)) continue;
      let domain = hostname;
      let expiresAt = Infinity;
      let maxAgeSet = false;
      for (const attribute of attributes) {
        const [rawKey, ...rest] = attribute.split("=");
        const key = rawKey.trim().toLowerCase();
        const attributeValue = rest.join("=").trim();
        if (key === "domain" && attributeValue) {
          const candidate = attributeValue.replace(/^\./, "").toLowerCase();
          domain = candidate.includes(".") && (hostname === candidate || hostname.endsWith(`.${candidate}`)) ? candidate : null;
        } else if (key === "max-age") {
          const seconds = Number(attributeValue);
          if (Number.isFinite(seconds)) {
            expiresAt = now + seconds * 1000;
            maxAgeSet = true;
          }
        } else if (key === "expires" && !maxAgeSet) {
          const time = Date.parse(attributeValue);
          if (Number.isFinite(time)) expiresAt = time;
        }
      }
      if (domain === null) continue;
      const id = `${domain}\t${name}`;
      this.cookies.delete(id);
      if (expiresAt <= now) continue;
      this.cookies.set(id, { domain, name, value, expiresAt });
      while (this.cookies.size > MAX_COOKIES) this.cookies.delete(this.cookies.keys().next().value);
    }
  }

  header(hostname, now = Date.now()) {
    const pairs = [];
    for (const [id, cookie] of this.cookies) {
      if (cookie.expiresAt <= now) {
        this.cookies.delete(id);
        continue;
      }
      if (hostname === cookie.domain || hostname.endsWith(`.${cookie.domain}`)) pairs.push(`${cookie.name}=${cookie.value}`);
    }
    return pairs.join("; ");
  }
}

// Least-recently-used map with expiry, for sticky exits and per-site memory.
function expiringMap(max) {
  const entries = new Map();
  return {
    get(key, now = Date.now()) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now) {
        entries.delete(key);
        return undefined;
      }
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value, ttlMs, now = Date.now()) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now + ttlMs });
      while (entries.size > max) entries.delete(entries.keys().next().value);
    },
    delete(key) {
      entries.delete(key);
    },
  };
}

function isHtml(headers) {
  return /text\/html|application\/xhtml/i.test(String(headers["content-type"] ?? ""));
}

// "ok": the page; "small": an HTML page so small it may be a soft block; "blocked": an
// anti-bot answer; "retry": a server or exit failure; "final": a client error from the
// site that another IP will not change. `reasons` names what decided it: the status, a
// header, or the challenge markers that matched.
export function diagnose(result, minBodyBytes) {
  const reasons = [];
  if (/akamaighost/i.test(String(result.headers.server ?? ""))) reasons.push("server:AkamaiGHost");
  if (String(result.headers["cf-mitigated"] ?? "").toLowerCase() === "challenge") {
    return { outcome: "blocked", reasons: [...reasons, "header:cf-mitigated"] };
  }
  if (isHtml(result.headers) && result.body.length <= MARKER_SCAN_LIMIT) {
    const text = decodeNumericEntities(result.body.toString("latin1"));
    for (const [name, pattern] of CHALLENGE_MARKERS) if (pattern.test(text)) reasons.push("marker:" + name);
  }
  const status = "status:" + result.status;
  if (BLOCK_STATUSES.has(result.status)) return { outcome: "blocked", reasons: [status, ...reasons] };
  if (result.status >= 500) return { outcome: "retry", reasons: [status, ...reasons] };
  if (result.status >= 400 && !BILLABLE_STATUSES.has(result.status)) return { outcome: "final", reasons: [status, ...reasons] };
  if (reasons.some((reason) => reason.startsWith("marker:"))) return { outcome: "blocked", reasons };
  // A page navigation answered 202 with a small HTML body is a challenge, not the page:
  // challenge vendors use 202 for "come back after running this script".
  if (result.status === 202 && isHtml(result.headers) && result.body.length <= MARKER_SCAN_LIMIT) {
    return { outcome: "blocked", reasons: [status, ...reasons] };
  }
  if (isHtml(result.headers) && result.status === 200 && result.body.length < minBodyBytes) {
    return { outcome: "small", reasons: [...reasons, "size:" + result.body.length] };
  }
  return { outcome: "ok", reasons };
}

export function classify(result, minBodyBytes) {
  return diagnose(result, minBodyBytes).outcome;
}

// Akamai Bot Manager sets _abck on a visitor it is scoring; seeing it issued tells us a
// site is behind Bot Manager even when the page itself came back.
function issuesAbck(setCookie) {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return cookies.some((cookie) => /^\s*_abck=/i.test(cookie));
}

function bodyEncoding(headers) {
  const type = String(headers["content-type"] ?? "").toLowerCase();
  if (type && !/^text\/|json|xml|javascript|ecmascript|x-www-form-urlencoded/.test(type)) return "base64";
  return /charset=["']?(iso-8859-1|latin1|windows-1252|us-ascii)/.test(type) ? "latin1" : "utf8";
}

export { createLedger };

export function createUnlocker({
  gateway,
  pricing,
  config,
  lookup = dns.lookup,
  fetchImpl = fetchThroughProxy,
  browserFetchImpl = null,
  camoufoxFetchImpl = null,
  flareSolverrFetchImpl = null,
  solverImpl = null,
  solverQueue = null,
  tlsOptions = {},
  authenticate = authenticateApiKey,
  log = console,
}) {
  const ledger = createLedger(config.ledgerFile, {
    flagMinRequests: config.flagMinRequests,
    maxBytes: config.ledgerMaxBytes,
    keep: config.ledgerKeep,
    log,
  });
  const keyRequests = windowCounter(config.requestsPerMinutePerKey);
  const authFailures = windowCounter(30);
  const sessions = expiringMap(MAX_TRACKED);
  const siteMemory = expiringMap(MAX_TRACKED);
  const abckLogged = expiringMap(MAX_TRACKED); // sites whose _abck issue was logged recently
  const sessionTtlMs = (gateway.upstreamSessionTtlSeconds ?? 600) * 1000;
  const activeByAccount = new Map();
  let active = 0;

  // Several plain HTTP tries, each on a new IP, before any browser: DataDome sites such as
  // leboncoin.fr block some IPs but serve plain requests from others, while every browser
  // engine gets caught there. Blocked HTTP answers are tiny, so retries cost little.
  const httpPools = Array.from({ length: config.httpAttempts ?? 3 }, () => "residential");
  const browserOk = Boolean(browserFetchImpl) && config.browserEnabled !== false;
  const camoufoxOk = Boolean(camoufoxFetchImpl) && config.browserEnabled !== false;
  const mobileOk = Boolean(gateway.upstreamMobile);
  // Escalation ladder: HTTP residential → Chromium browser → Camoufox (stealth Firefox)
  // → mobile HTTP → Camoufox on mobile. Mobile IPs have better reputation and may skip
  // challenges that block residential exits entirely (DataDome strict tier, etc.).
  const browserPools = browserOk ? ["browser-residential", "ref-browser-residential"] : [];
  const camoufoxPools = camoufoxOk ? ["camoufox-residential"] : [];
  const mobilePools = mobileOk ? ["mobile", ...(camoufoxOk ? ["camoufox-mobile"] : [])] : [];
  const flareSolverrOk = Boolean(flareSolverrFetchImpl);
  const flareSolverrPools = flareSolverrOk ? ["flaresolverr-residential", ...(mobileOk ? ["flaresolverr-mobile"] : [])] : [];
  const solverOk = Boolean(solverImpl);
  const solverPools = solverOk ? ["solver-residential"] : [];
  const pools = [...httpPools, ...browserPools, ...camoufoxPools, ...mobilePools, ...flareSolverrPools, ...solverPools];
  const isBrowserRung = (rung) => rung.includes("browser-") || rung.startsWith("camoufox-") || rung.startsWith("flaresolverr-");
  const isBrowserNotFs = (rung) => isBrowserRung(rung) && !isFlareSolverrRung(rung);
  const isCamoufoxRung = (rung) => rung.startsWith("camoufox-");
  const isFlareSolverrRung = (rung) => rung.startsWith("flaresolverr-");
  const isRefererRung = (rung) => rung.startsWith("ref-");
  const isSolverRung = (rung) => rung.startsWith("solver-");
  const poolOf = (rung) => rung.replace(/^ref-/, "").replace(/^browser-/, "").replace(/^camoufox-/, "").replace(/^flaresolverr-/, "").replace(/^solver-/, "");
  const poolForStep = (step) => pools[Math.min(step, pools.length - 1)];
  const costPerGb = { residential: pricing.costResidentialPerGbMicros, mobile: pricing.costMobilePerGbMicros };
  let browserActive = 0;

  async function checkTarget(url) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new PublicError(400, "url must be http or https");
    if (url.username || url.password) throw new PublicError(400, "url must not contain credentials");
    if (url.port !== "") throw new PublicError(400, "Only the standard ports 80 and 443 are supported");
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (matchesDomain(hostname, config.blockedDomains)) {
      throw new PublicError(403, "This site is not available through the unlocker (see the acceptable-use policy)");
    }
    const resolved = await resolveTarget(url.hostname, { destinationAllowlist: [], dnsTimeoutMs: gateway.dnsTimeoutMs }, lookup);
    if (!resolved) throw new PublicError(403, "Destination not allowed or not resolvable");
    return url;
  }

  function newExit(pool) {
    return { pool, sid: crypto.randomBytes(8).toString("hex"), jar: new CookieJar() };
  }

  // One attempt on one exit, following redirects. Each hop is checked like the first URL.
  async function fetchOnExit(exit, username, country, startUrl, deadline) {
    let url = startUrl;
    let referer = "";
    let wireBytes = 0;
    for (let hop = 0; ; hop += 1) {
      const remaining = Math.min(config.attemptTimeoutMs, deadline - Date.now());
      if (remaining < 250) {
        const error = new Error("Out of time");
        error.code = "TIMEOUT";
        error.wireBytes = wireBytes;
        throw error;
      }
      const endpoint = upstreamEndpoint(gateway, exit.pool);
      let result;
      try {
        result = await fetchImpl({
          url,
          proxy: {
            host: endpoint.host,
            port: endpoint.port,
            tls: gateway.upstreamTls,
            authorization: upstreamAuthorization(gateway, { username, country, session: exit.sid, pool: exit.pool }),
          },
          timeoutMs: remaining,
          maxBytes: config.maxResponseBytes,
          cookie: exit.jar.header(url.hostname),
          referer,
          tlsOptions,
        });
      } catch (error) {
        error.wireBytes = wireBytes + (error.wireBytes ?? 0);
        throw error;
      }
      wireBytes += result.wireBytes ?? 0;
      exit.jar.store(url.hostname, result.headers["set-cookie"]);
      if (issuesAbck(result.headers["set-cookie"])) {
        result.abck = true;
        const cookieSite = siteOf(url.hostname);
        if (!abckLogged.get(cookieSite)) {
          abckLogged.set(cookieSite, true, DOMAIN_MEMORY_MS);
          log.info?.(`Unlocker: ${cookieSite} issued an _abck cookie (Akamai Bot Manager) on a ${exit.pool} exit, status ${result.status}`);
        }
      }
      const location = result.headers.location;
      if (!REDIRECTS.has(result.status) || !location || hop >= MAX_REDIRECTS) return { ...result, url, wireBytes };
      let next;
      try {
        next = await checkTarget(new URL(location, url));
      } catch {
        // A redirect to somewhere we will not go is returned as it is.
        return { ...result, url, wireBytes };
      }
      referer = url.href;
      url = next;
    }
  }

  // Browser-based fetch: the browser handles redirects and cookies internally.
  async function browserFetchOnExit(exit, username, country, startUrl, deadline, { useReferer = false, useCamoufox = false } = {}) {
    const impl = useCamoufox ? camoufoxFetchImpl : browserFetchImpl;
    if (!impl) {
      const error = new Error(useCamoufox ? "Camoufox not available" : "Browser fetcher not available");
      error.code = "NETWORK";
      error.wireBytes = 0;
      throw error;
    }
    const remaining = Math.min(config.browserTimeoutMs ?? 45_000, deadline - Date.now());
    if (remaining < 2000) {
      const error = new Error("Out of time for browser attempt");
      error.code = "TIMEOUT";
      error.wireBytes = 0;
      throw error;
    }
    if (browserActive >= (config.browserMaxConcurrent ?? 2)) {
      const error = new Error("Browser concurrency limit");
      error.code = "BUSY";
      error.wireBytes = 0;
      throw error;
    }
    browserActive += 1;
    try {
      const endpoint = upstreamEndpoint(gateway, exit.pool);
      const result = await impl({
        url: startUrl,
        proxy: {
          host: endpoint.host,
          port: endpoint.port,
          tls: gateway.upstreamTls,
          authorization: upstreamAuthorization(gateway, { username, country, session: exit.sid, pool: exit.pool }),
        },
        timeoutMs: remaining,
        maxBytes: config.maxResponseBytes,
        cookie: exit.jar.header(startUrl.hostname),
        referer: "",
        country: country ?? "",
        useReferer,
      });
      exit.jar.store(startUrl.hostname, result.headers["set-cookie"]);
      const wireBytes = result.wireBytes ?? 0;
      return { ...result, url: result.url ?? startUrl, wireBytes };
    } finally {
      browserActive -= 1;
    }
  }

  // Solver-backed fetch: HTTP fetch → detect CAPTCHA → if t=bv (IP banned) retry
  // with a fresh exit up to SOLVER_IP_TRIES times → once t=fe, submit to CapSolver
  // → inject clearance cookies → re-fetch on the same exit.
  // WAF type detected from challenge markers — used to skip futile rungs.
  const siteWaf = expiringMap(MAX_TRACKED);
  const firstCamoufoxStep = pools.findIndex((rung) => isCamoufoxRung(rung));

  function wafFromReasons(reasons) {
    for (const r of reasons) {
      if (r.startsWith("marker:cloudflare-") || r === "header:cf-mitigated") return "cloudflare";
      if (r.startsWith("marker:datadome")) return "datadome";
      if (r.startsWith("marker:akamai-") || r === "marker:access-denied-title") return "akamai";
      if (r.startsWith("marker:aws-waf")) return "aws";
      if (r.startsWith("marker:imperva")) return "imperva";
      if (r.startsWith("marker:perimeterx")) return "perimeterx";
    }
    return null;
  }

  async function flareSolverrFetchOnExit(exit, country, startUrl, deadline) {
    // FlareSolverr needs at least 15s to load a page through a proxy. If the deadline
    // is too tight (after camoufox ate most of the budget), extend it.
    const remaining = deadline - Date.now();
    const timeoutMs = Math.max(15_000, remaining);
    const endpoint = upstreamEndpoint(gateway, exit.pool);
    const auth = upstreamAuthorization(gateway, { country, session: exit.sid, pool: exit.pool });
    try {
      return await flareSolverrFetchImpl({
        url: startUrl,
        proxy: { host: endpoint.host, port: endpoint.port, tls: gateway.upstreamTls, authorization: auth },
        timeoutMs,
        cookie: exit.jar?.header(startUrl.hostname) ?? "",
      });
    } catch (err) {
      const wrapped = new Error(err.message);
      wrapped.code = err.code ?? "NETWORK";
      wrapped.wireBytes = 0;
      throw wrapped;
    }
  }

  const SOLVER_IP_TRIES = 4;
  async function solverFetchOnExit(exit, username, country, startUrl, deadline) {
    const ua = chromeHeaders().find(([k]) => k === "User-Agent")?.[1] ?? "";
    let totalWireBytes = 0;
    let currentExit = exit;

    for (let ipTry = 0; ipTry < SOLVER_IP_TRIES && Date.now() < deadline - 2000; ipTry++) {
      if (ipTry > 0) currentExit = newExit(currentExit.pool);
      let result;
      try {
        result = await fetchOnExit(currentExit, username, country, startUrl, deadline);
      } catch (error) {
        totalWireBytes += error.wireBytes ?? 0;
        throw Object.assign(error, { wireBytes: totalWireBytes });
      }
      totalWireBytes += result.wireBytes ?? 0;

      const outcome = classify(result, config.minBodyBytes);
      if (outcome !== "blocked" || !result.body?.length) {
        return { ...result, wireBytes: totalWireBytes, solverUsed: false };
      }

      const detection = solverImpl.detectDatadome(result.body, { websiteURL: startUrl.href });
      // Not DataDome — try Cloudflare Turnstile before giving up on the solver rung.
      if (!detection) {
        const turnstile = solverImpl.detectTurnstile?.(result.body, { websiteURL: startUrl.href });
        if (turnstile) {
          log.info?.(`CapSolver: detected Cloudflare Turnstile for ${startUrl.hostname}`);
          const solution = await solverImpl.solveTurnstile?.({
            siteKey: turnstile.siteKey,
            websiteURL: startUrl.href,
            deadlineMs: Math.min(deadline, Date.now() + 60_000),
          });
          if (solution?.token) {
            // Turnstile token alone can't clear cf_clearance — retry with Camoufox which
            // can now pass the challenge script that produced the Turnstile.
            if (camoufoxFetchImpl) {
              try {
                const browserResult = await browserFetchOnExit(currentExit, username, country, startUrl, deadline, { useCamoufox: true });
                totalWireBytes += browserResult.wireBytes ?? 0;
                const browserOutcome = classify(browserResult, config.minBodyBytes);
                if (browserOutcome === "ok" || browserOutcome === "final") {
                  Object.assign(exit, { pool: currentExit.pool, sid: currentExit.sid, jar: currentExit.jar });
                  return { ...browserResult, wireBytes: totalWireBytes, solverUsed: true };
                }
              } catch (err) {
                totalWireBytes += err.wireBytes ?? 0;
              }
            }
          }
        }
        return { ...result, wireBytes: totalWireBytes, solverUsed: false };
      }

      if (!detection.solvable) {
        log.info?.(`CapSolver: IP banned (t=bv) for ${startUrl.hostname}, trying fresh exit (${ipTry + 1}/${SOLVER_IP_TRIES})`);
        continue;
      }

      // t=fe: solvable challenge — submit to CapSolver
      const endpoint = upstreamEndpoint(gateway, currentExit.pool);
      const auth = upstreamAuthorization(gateway, { username, country, session: currentExit.sid, pool: currentExit.pool });
      const decoded = Buffer.from(auth.replace(/^Basic /, ""), "base64").toString();
      // CapSolver proxy format: host:port:user:pass
      const colonIdx = decoded.indexOf(":");
      const proxyUser = decoded.slice(0, colonIdx);
      const proxyPass = decoded.slice(colonIdx + 1);
      const proxyString = `${endpoint.host}:${endpoint.port}:${proxyUser}:${proxyPass}`;

      const solution = await solverImpl.solveDatadome({
        captchaUrl: detection.captchaUrl,
        html: detection.html,
        websiteURL: startUrl.href,
        proxyString,
        userAgent: ua,
        deadlineMs: Math.min(deadline, Date.now() + 60_000),
      });
      if (solution) {
        for (const c of solution.cookies) currentExit.jar.store(startUrl.hostname, [`${c.name}=${c.value}`]);
        const retry = await fetchOnExit(currentExit, username, country, startUrl, deadline);
        totalWireBytes += retry.wireBytes ?? 0;
        Object.assign(exit, { pool: currentExit.pool, sid: currentExit.sid, jar: currentExit.jar });
        return { ...retry, wireBytes: totalWireBytes, solverUsed: true };
      }

      // CapSolver failed (proxy banned on captcha page etc.) — fall back to
      // Camoufox on the same proxy session. A real browser solves DataDome's JS
      // challenge natively; the resulting datadome cookie works for plain HTTP.
      if (camoufoxFetchImpl) {
        log.info?.(`CapSolver failed for ${startUrl.hostname}, falling back to Camoufox on same proxy session`);
        try {
          const browserResult = await browserFetchOnExit(currentExit, username, country, startUrl, deadline, { useCamoufox: true });
          totalWireBytes += browserResult.wireBytes ?? 0;
          const browserOutcome = classify(browserResult, config.minBodyBytes);
          if (browserOutcome === "ok" || browserOutcome === "final") {
            Object.assign(exit, { pool: currentExit.pool, sid: currentExit.sid, jar: currentExit.jar });
            return { ...browserResult, wireBytes: totalWireBytes, solverUsed: true };
          }
          log.info?.(`Camoufox fallback got ${browserOutcome} for ${startUrl.hostname}, trying fresh exit (${ipTry + 1}/${SOLVER_IP_TRIES})`);
        } catch (err) {
          totalWireBytes += err.wireBytes ?? 0;
          log.warn?.(`Camoufox fallback error for ${startUrl.hostname}: ${err.message}`);
        }
      } else {
        log.info?.(`CapSolver: solve failed for ${startUrl.hostname}, no Camoufox available, trying fresh exit (${ipTry + 1}/${SOLVER_IP_TRIES})`);
      }
    }

    // All IP tries exhausted (banned or solve failed)
    const error = new Error("Solver exhausted all IP tries");
    error.code = "PROXY";
    error.wireBytes = totalWireBytes;
    throw error;
  }

  async function unlock({ username, url, country, session }) {
    const started = Date.now();
    const deadline = started + config.totalTimeoutMs;
    const site = siteOf(url.hostname);
    const remembered = siteMemory.get(site);
    // Every request opens with one cheap plain try (a blocked answer costs ~2 KB and a
    // second). A site remembered on a browser rung then jumps straight to that rung,
    // except every 20th request, which walks the whole ladder to find cheaper exits again.
    const probeDown = remembered && remembered.step > 0 && remembered.uses % 20 === 19;
    let jumpTo = remembered && !probeDown ? remembered.step : 0;
    // WAF-aware fast-track: when we know the site's WAF type, skip futile HTTP/Chromium
    // rungs and go straight to Camoufox or solver. One cheap HTTP try still runs first to
    // test whether clearance cookies from a prior request are still valid.
    const waf = siteWaf.get(site);
    if (waf && !probeDown) {
      // Cloudflare managed challenges block camoufox too — jump straight to FlareSolverr.
      const firstFsStep = pools.findIndex((r) => isFlareSolverrRung(r));
      const target = waf === "cloudflare" && firstFsStep >= 0 ? firstFsStep : firstCamoufoxStep;
      if (target >= 0) jumpTo = Math.max(jumpTo, target);
    }
    let step = 0;
    // A named session keeps its exit (and cookies) across requests; without one, each
    // customer keeps a warm exit per site so clearance cookies are reused.
    const exitKey = session ? `${username}\0session\0${session}` : `${username}\0site\0${site}`;
    let exit = sessions.get(exitKey) ?? newExit(poolOf(poolForStep(step)));
    if (exit.pool !== poolOf(poolForStep(step)) && !session) exit = newExit(poolOf(poolForStep(step)));
    const attempts = [];
    const wireByPool = { residential: 0, mobile: 0 };
    const rank = { retry: 0, blocked: 1, small: 2, final: 3, ok: 4 };
    let best = null;
    let bestOutcome = null;
    let lastError = null;
    let solverUsed = false;

    const cached = solverQueue?.cookiesFor(site);
    if (cached) {
      // Try plain HTTP first — fast and cheap; clearance cookies often work without a browser.
      const httpExit = { pool: cached.exitInfo.pool, sid: cached.exitInfo.sid, jar: new CookieJar() };
      httpExit.jar.store(url.hostname, cached.cookies);
      log.info?.(`Trying cached solver cookies for ${site} via HTTP (exit ${cached.exitInfo.sid})`);
      try {
        const result = await fetchOnExit(httpExit, username, country, url, deadline);
        wireByPool[httpExit.pool] += result.wireBytes;
        const outcome = classify(result, config.minBodyBytes);
        if (outcome === "ok" || outcome === "final") {
          log.info?.(`Cached solver cookies worked for ${site} (HTTP)`);
          attempts.push({ pool: httpExit.pool, outcome, status: result.status, ms: Date.now() - started });
          exit = httpExit;
          sessions.set(exitKey, exit, sessionTtlMs);
          const billable = outcome === "ok";
          const costMicros = (wireByPool[httpExit.pool] * (costPerGb[httpExit.pool] ?? 0)) / GIB;
          return { billable, outcome, result, attempts, pool: exit.pool, wireBytes: wireByPool[httpExit.pool], costMicros, ms: Date.now() - started, site, solverUsed: false };
        }
        attempts.push({ pool: httpExit.pool, outcome, status: result.status, ms: Date.now() - started });
      } catch (err) {
        log.info?.(`Cached solver cookies HTTP attempt failed for ${site}: ${err.message}`);
      }

      // HTTP didn't work — try Camoufox browser with fresh cookies on the same exit.
      const browserExit = { pool: cached.exitInfo.pool, sid: cached.exitInfo.sid, jar: new CookieJar() };
      browserExit.jar.store(url.hostname, cached.cookies);
      log.info?.(`Trying cached solver cookies for ${site} via browser (exit ${cached.exitInfo.sid})`);
      try {
        const result = await browserFetchOnExit(browserExit, username, country, url, deadline, { useReferer: false, useCamoufox: true });
        wireByPool[browserExit.pool] += result.wireBytes;
        const outcome = classify(result, config.minBodyBytes);
        if (outcome === "ok" || outcome === "final") {
          log.info?.(`Cached solver cookies worked for ${site}`);
          attempts.push({ pool: browserExit.pool, browser: true, camoufox: true, outcome, status: result.status, ms: Date.now() - started });
          exit = browserExit;
          sessions.set(exitKey, exit, sessionTtlMs);
          const billable = outcome === "ok";
          const costMicros = (wireByPool[browserExit.pool] * (costPerGb[browserExit.pool] ?? 0)) / GIB;
          return { billable, outcome, result, attempts, pool: exit.pool, wireBytes: wireByPool[browserExit.pool], costMicros, ms: Date.now() - started, site, solverUsed: false };
        }
        attempts.push({ pool: browserExit.pool, browser: true, camoufox: true, outcome, status: result.status, ms: Date.now() - started });
        log.info?.(`Cached solver cookies failed for ${site} (${outcome}), falling through to normal ladder`);
      } catch (err) {
        log.warn?.(`Cached solver cookies browser attempt failed: ${err.message}`);
      }
    }

    for (let attempt = 0; attempt < config.maxAttempts && Date.now() < deadline - 250; attempt += 1) {
      if (attempt > 0) {
        step = Math.max(step + 1, jumpTo);
        // Browser rungs always get a fresh proxy session (new IP) for maximum coverage.
        exit = newExit(poolOf(poolForStep(step)));
      }
      const rung = poolForStep(step);
      const attemptStarted = Date.now();
      try {
        let result;
        if (isSolverRung(rung)) {
          result = await solverFetchOnExit(exit, username, country, url, deadline);
        } else if (isFlareSolverrRung(rung)) {
          result = await flareSolverrFetchOnExit(exit, country, url, deadline);
        } else if (isBrowserRung(rung)) {
          result = await browserFetchOnExit(exit, username, country, url, deadline, { useReferer: isRefererRung(rung), useCamoufox: isCamoufoxRung(rung) });
        } else {
          result = await fetchOnExit(exit, username, country, url, deadline);
        }
        wireByPool[exit.pool] += result.wireBytes;
        if (result.solverUsed) solverUsed = true;
        const { outcome, reasons } = diagnose(result, config.minBodyBytes);
        if (outcome === "blocked") {
          result.body = Buffer.alloc(0);
          const detected = wafFromReasons(reasons);
          if (detected && !siteWaf.get(site)) {
            siteWaf.set(site, detected, DOMAIN_MEMORY_MS);
            log.info?.(`Unlocker: ${site} is behind ${detected} (${reasons.join(", ")})`);
          }
        }
        attempts.push({ pool: exit.pool, browser: isBrowserNotFs(rung), camoufox: isCamoufoxRung(rung) || undefined, flaresolverr: isFlareSolverrRung(rung) || undefined, referer: isRefererRung(rung) || undefined, solver: isSolverRung(rung) || undefined, outcome, status: result.status, ms: Date.now() - attemptStarted });
        if (bestOutcome === null || rank[outcome] >= rank[bestOutcome]) {
          best = result;
          bestOutcome = outcome;
        }
        if (outcome === "ok" || outcome === "final") break;
        // WAF fast-track: once we know the WAF type, skip intermediate rungs.
        // - HTTP/browser rung blocked → jump to camoufox
        // - Camoufox rung blocked → jump to solver (or break)
        const currentWaf = siteWaf.get(site);
        if (outcome === "blocked" && currentWaf) {
          if (!isCamoufoxRung(rung) && !isSolverRung(rung) && firstCamoufoxStep >= 0 && step < firstCamoufoxStep) {
            step = firstCamoufoxStep - 1;
          } else if (isCamoufoxRung(rung)) {
            const fsStep = pools.findIndex((r) => isFlareSolverrRung(r));
            const solverStep = pools.findIndex((r) => isSolverRung(r));
            const nextStep = fsStep >= 0 && step < fsStep ? fsStep : solverStep;
            if (nextStep >= 0 && step < nextStep) {
              step = nextStep - 1;
            } else {
              break;
            }
          } else if (isFlareSolverrRung(rung)) {
            const solverStep = pools.findIndex((r) => isSolverRung(r));
            if (solverStep >= 0 && step < solverStep) {
              step = solverStep - 1;
            } else {
              break;
            }
          } else if (isSolverRung(rung)) {
            break;
          }
        }
      } catch (error) {
        wireByPool[exit.pool] += error.wireBytes ?? 0;
        const code = error.code ?? "NETWORK";
        attempts.push({ pool: exit.pool, outcome: "error", error: code, ms: Date.now() - attemptStarted });
        lastError = code;
        if (!RETRYABLE_ERRORS.has(code)) break;
        // The solver already tried SOLVER_IP_TRIES fresh IPs — retrying won't help.
        if (isSolverRung(rung) && code === "PROXY") break;
      }
    }

    const billable = bestOutcome === "ok" || bestOutcome === "small";
    if (billable) {
      sessions.set(exitKey, exit, sessionTtlMs);
      // Any plain HTTP success means the site needs no browser; only browser rungs are remembered.
      const settled = step < httpPools.length ? 0 : Math.min(step, pools.length - 1);
      siteMemory.set(site, { step: settled, uses: settled === remembered?.step ? remembered.uses + 1 : 0 }, DOMAIN_MEMORY_MS);
    } else {
      sessions.delete(exitKey);
    }
    const costMicros = Object.entries(wireByPool).reduce((sum, [pool, bytes]) => sum + (bytes * costPerGb[pool]) / GIB, 0);
    return {
      billable,
      // "retry" here means the site kept answering 5xx; that page is returned unbilled.
      outcome: bestOutcome ?? "error",
      error: lastError,
      result: best,
      attempts,
      pool: exit.pool,
      wireBytes: Object.values(wireByPool).reduce((a, b) => a + b, 0),
      costMicros,
      solverUsed,
      ms: Date.now() - started,
      site,
    };
  }

  // Diagnostics for `admin unlock-test`: one fetch on a fresh exit of the given pool,
  // with the same checks, caps and timeouts as a customer request (redirects included),
  // but nothing is billed, remembered or written to the ledger.
  async function probe({ url: rawUrl, country = null, pool = "residential", username = "unlock-test" }) {
    const browser = pool.includes("browser-") || pool.startsWith("camoufox-");
    const solver = pool.startsWith("solver-");
    const useCamoufox = pool.startsWith("camoufox-");
    const useReferer = pool.startsWith("ref-");
    const actualPool = poolOf(pool);
    const refused = (error) => ({ pool, outcome: "refused", error, reasons: [], wireBytes: 0, costMicros: 0, ms: 0 });
    if (solver && !solverImpl) return refused("CAPTCHA solver is not configured (set CAPSOLVER_API_KEY)");
    if (useCamoufox && !camoufoxFetchImpl) return refused("Camoufox is not available (install camoufox Python package)");
    if (browser && !useCamoufox && !browserFetchImpl) return refused("Browser fetcher is not available (install patchright or playwright)");
    if (!pools.includes(pool) && !httpPools.includes(actualPool)) return refused(`The ${pool} pool is not configured`);
    let url;
    try {
      url = await checkTarget(new URL(rawUrl));
    } catch (error) {
      return refused(error instanceof PublicError ? error.message : "Invalid URL");
    }
    const started = Date.now();
    const exit = newExit(actualPool);
    const timeout = solver ? 90_000 : browser ? (config.browserTimeoutMs ?? 45_000) : config.attemptTimeoutMs;
    try {
      const result = solver
        ? await solverFetchOnExit(exit, username, country, url, started + timeout)
        : browser
          ? await browserFetchOnExit(exit, username, country, url, started + timeout, { useReferer, useCamoufox })
          : await fetchOnExit(exit, username, country, url, started + timeout);
      const { outcome, reasons } = diagnose(result, config.minBodyBytes);
      return {
        pool,
        outcome,
        status: result.status,
        reasons: result.abck ? [...reasons, "cookie:_abck"] : reasons,
        bytes: result.body.length,
        wireBytes: result.wireBytes,
        costMicros: (result.wireBytes * costPerGb[actualPool]) / GIB,
        protocol: result.protocol,
        finalUrl: (result.url ?? url).href,
        ms: Date.now() - started,
      };
    } catch (error) {
      const wireBytes = error.wireBytes ?? 0;
      return { pool, outcome: "error", error: error.code ?? "NETWORK", reasons: [], wireBytes, costMicros: (wireBytes * costPerGb[actualPool]) / GIB, ms: Date.now() - started };
    }
  }

  function parseInput(raw) {
    let input;
    try { input = JSON.parse(raw); } catch { throw new PublicError(400, "Body must be JSON"); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new PublicError(400, "Body must be a JSON object");
    const unknown = Object.keys(input).filter((key) => !REQUEST_FIELDS.has(key));
    if (unknown.length) throw new PublicError(400, `Unknown field: ${unknown[0]}. Allowed: url, country, render, session`);
    if (typeof input.url !== "string" || input.url.trim().length === 0 || input.url.length > 2048) {
      throw new PublicError(400, "url is required (at most 2048 characters)");
    }
    let url;
    try { url = new URL(input.url.trim()); } catch { throw new PublicError(400, "url is not a valid URL"); }
    if (input.country !== undefined && input.country !== null && (typeof input.country !== "string" || !/^[A-Za-z]{2}$/.test(input.country))) {
      throw new PublicError(400, "country must be a two-letter country code");
    }
    if (input.session !== undefined && input.session !== null && (typeof input.session !== "string" || !/^[A-Za-z0-9]{1,32}$/.test(input.session))) {
      throw new PublicError(400, "session must be 1-32 letters or digits");
    }
    if (input.render !== undefined && typeof input.render !== "boolean") throw new PublicError(400, "render must be true or false");
    return { url, country: input.country ? input.country.toLowerCase() : null, session: input.session || null };
  }

  async function readRequestBody(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_REQUEST_BODY) throw new PublicError(413, "Request body too large", { headers: { Connection: "close" } });
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  // Each request may hold up to two full-size bodies at once (the best page so far and
  // the attempt in flight), so it books twice the response cap from the memory budget.
  const bytesPerRequest = 2 * config.maxResponseBytes;
  const memoryBudget = config.memoryBudgetBytes ?? Infinity;
  let bookedBytes = 0;

  function acquire(username) {
    const mine = activeByAccount.get(username) ?? 0;
    if (active >= config.maxConcurrent || bookedBytes + bytesPerRequest > memoryBudget) {
      throw new PublicError(503, "Unlocker busy, retry shortly", { headers: { "Retry-After": "5" } });
    }
    if (mine >= config.maxConcurrentPerAccount) {
      throw new PublicError(429, `At most ${config.maxConcurrentPerAccount} requests at a time per account`);
    }
    active += 1;
    bookedBytes += bytesPerRequest;
    activeByAccount.set(username, mine + 1);
    return () => {
      active -= 1;
      bookedBytes -= bytesPerRequest;
      const left = (activeByAccount.get(username) ?? 1) - 1;
      if (left > 0) activeByAccount.set(username, left);
      else activeByAccount.delete(username);
    };
  }

  // In-flight /v1 requests, so shutdown can wait for them to settle their holds.
  let inFlight = 0;
  let stopping = false;
  let idleWaiters = [];
  const settleOne = () => {
    inFlight -= 1;
    if (inFlight === 0) {
      for (const resolve of idleWaiters) resolve();
      idleWaiters = [];
    }
  };

  function handle(request, response, clientIp) {
    if (stopping) return Promise.resolve(send(response, 503, { error: "Shutting down, retry shortly" }, { "Retry-After": "5", Connection: "close" }));
    inFlight += 1;
    return handleRequest(request, response, clientIp).finally(settleOne);
  }

  // Refuses new requests and resolves once the ones in flight have finished.
  function stop() {
    stopping = true;
    return inFlight === 0 ? Promise.resolve() : new Promise((resolve) => idleWaiters.push(resolve));
  }

  async function handleRequest(request, response, clientIp) {
    try {
      const { pathname } = new URL(request.url, "http://local");
      if (pathname !== "/v1/unlock") return send(response, 404, { error: "Not found" });
      if (request.method !== "POST") return send(response, 405, { error: "Use POST" }, { Allow: "POST" });
      if (!config.enabled) return send(response, 503, { error: "The unlocker is not available" });
      if (authFailures.exceeded(clientIp)) return send(response, 429, { error: "Too many invalid API keys. Wait a minute." });

      const header = String(request.headers.authorization ?? "");
      const key = /^Bearer\s+(\S+)$/i.exec(header)?.[1] ?? String(request.headers["x-api-key"] ?? "");
      const client = key ? await authenticate(key) : null;
      if (!client) {
        authFailures.take(clientIp);
        return send(response, 401, { error: "Missing or invalid API key" }, { "WWW-Authenticate": "Bearer" });
      }
      if (!keyRequests.take(client.apiKeyId)) return send(response, 429, { error: "Rate limit exceeded" }, { "Retry-After": "60" });
      if (!String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
        throw new PublicError(415, "Content-Type must be application/json");
      }
      const input = parseInput(await readRequestBody(request));
      const url = await checkTarget(input.url);
      const priceMicros = Math.round(pricing.unlockerPerRequestMicros * premiumMultiplier(url.hostname.toLowerCase(), pricing.premiumDomains));

      const release = acquire(client.username);
      try {
        if (!(await reserveFunds(client.username, priceMicros))) {
          throw new PublicError(402, "Insufficient balance. Top up your wallet to keep unlocking.");
        }
        let outcome;
        try {
          outcome = await unlock({ username: client.username, url, country: input.country, session: input.session });
        } catch (error) {
          await releaseFunds(client.username, priceMicros);
          throw error;
        }
        if (!outcome.billable) await releaseFunds(client.username, priceMicros);
        // Solver surcharge: billed only when the solver was actually used and the request succeeded.
        const solverSurcharge = outcome.solverUsed && outcome.billable ? (config.solverSurchargeMicros ?? 0) : 0;
        if (solverSurcharge > 0) {
          if (!(await reserveFunds(client.username, solverSurcharge))) {
            // Not enough for the surcharge — still deliver the page, just skip the extra charge.
            log.warn?.(`Unlocker: solver surcharge of ${solverSurcharge} micros could not be reserved for ${client.username}`);
          }
        }
        const totalBilledMicros = outcome.billable ? priceMicros + solverSurcharge : 0;
        const requestId = `unl_${crypto.randomBytes(8).toString("hex")}`;
        void ledger.record({
          at: new Date().toISOString(),
          id: requestId,
          username: client.username,
          apiKeyId: client.apiKeyId,
          site: outcome.site,
          status: outcome.result?.status ?? null,
          outcome: outcome.outcome,
          billed: outcome.billable,
          priceMicros: totalBilledMicros,
          solverSurchargeMicros: solverSurcharge || undefined,
          costMicros: Math.round(outcome.costMicros * 1000) / 1000,
          wireBytes: outcome.wireBytes,
          attempts: outcome.attempts.length,
          pools: outcome.attempts.map((attempt) => attempt.pool),
          ms: outcome.ms,
        });
        void insertUsageEvent({
          username: client.username, kind: "unlocker", pool: outcome.pool,
          domain: outcome.site, status: outcome.result?.status ?? null,
          outcome: outcome.outcome, bytes: outcome.wireBytes,
          costMicros: totalBilledMicros,
          billed: outcome.billable, durationMs: outcome.ms,
        }).catch(() => {});

        const summary = {
          requestId,
          billedMicros: totalBilledMicros,
          ...(solverSurcharge ? { solverSurchargeMicros: solverSurcharge } : {}),
          attempts: outcome.attempts.map(({ pool, browser, camoufox, referer, solver, outcome: result, status, error }) => ({ pool, ...(browser ? { browser: true } : {}), ...(camoufox ? { camoufox: true } : {}), ...(referer ? { referer: true } : {}), ...(solver ? { solver: true } : {}), result, status, error })),
        };
        if (["ok", "small", "final", "retry"].includes(outcome.outcome)) {
          const page = outcome.result;
          const encoding = bodyEncoding(page.headers);
          const headers = { ...page.headers };
          delete headers["set-cookie"]; // cookies stay with the session's jar
          return await sendPage(response, {
            success: outcome.billable,
            status: page.status,
            url: page.url.href,
            headers,
            encoding,
            ...summary,
          }, page.body, encoding);
        }
        if (outcome.outcome === "blocked") {
          if (solverQueue) {
            const queued = solverQueue.push({ site: outcome.site, url: url.href, exitInfo: { pool: outcome.pool, sid: crypto.randomBytes(8).toString("hex") }, markers: outcome.attempts.map((a) => a.result).filter(Boolean) });
            if (queued) log.info?.(`Queued ${outcome.site} for human solver (task ${queued})`);
          }
          return send(response, 502, { success: false, error: `The site blocked every attempt (${outcome.attempts.length}). You were not charged.`, ...summary });
        }
        if (outcome.error === "TOO_LARGE") {
          return send(response, 502, { success: false, error: "The page is larger than the response limit. You were not charged.", ...summary });
        }
        const timedOut = outcome.error === "TIMEOUT";
        return send(response, timedOut ? 504 : 502, {
          success: false,
          error: timedOut ? "The site did not answer in time. You were not charged." : "Could not reach the site. You were not charged.",
          ...summary,
        });
      } finally {
        release();
      }
    } catch (error) {
      if (error instanceof PublicError) return send(response, error.status, { error: error.message }, error.extra.headers);
      log.error?.(`Unlocker error: ${error.message}`);
      return send(response, 500, { error: "Internal error" });
    }
  }

  return {
    handle,
    unlock,
    ledger,
    stop,
    probe,
    rungs: [...new Set(pools)],
    stats: () => ledger.stats(),
    memory: () => ({ bookedBytes, budgetBytes: memoryBudget, active, inFlight }),
  };
}
