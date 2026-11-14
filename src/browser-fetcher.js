// Browser-based page fetcher: launches Chromium (patchright) or Camoufox
// (stealth Firefox) through the upstream proxy, navigates, waits for JS
// to execute, and returns the rendered HTML.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FetchError } from "./fetcher.js";
import { solveDataDome, detectDataDome } from "./captcha-solver.js";
import { camoufoxAvailable } from "./camoufox-launcher.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DD_BYPASS_EXT = join(__dirname, "dd-bypass-ext");

let browserModule = null;
let checked = false;
let _camoufoxOk = null;

export async function browserAvailable() {
  if (checked) return browserModule !== null;
  checked = true;
  try {
    browserModule = await import("patchright");
    return true;
  } catch {}
  try {
    browserModule = await import("playwright");
    return true;
  } catch {}
  return false;
}

async function isCamoufoxAvailable() {
  if (_camoufoxOk !== null) return _camoufoxOk;
  _camoufoxOk = await camoufoxAvailable();
  return _camoufoxOk;
}

function parseBasicAuth(header) {
  const m = /^Basic\s+(.+)$/i.exec(header);
  if (!m) return null;
  const decoded = Buffer.from(m[1], "base64").toString();
  const i = decoded.indexOf(":");
  return i > 0 ? { username: decoded.slice(0, i), password: decoded.slice(i + 1) } : null;
}

export { parseBasicAuth };

// Country → locale/timezone for realistic browser context.
const COUNTRY_CONTEXT = {
  us: { locale: "en-US", tz: "America/New_York", lang: "en-US,en" },
  gb: { locale: "en-GB", tz: "Europe/London", lang: "en-GB,en" },
  uk: { locale: "en-GB", tz: "Europe/London", lang: "en-GB,en" },
  de: { locale: "de-DE", tz: "Europe/Berlin", lang: "de-DE,de,en" },
  fr: { locale: "fr-FR", tz: "Europe/Paris", lang: "fr-FR,fr,en" },
  es: { locale: "es-ES", tz: "Europe/Madrid", lang: "es-ES,es,en" },
  it: { locale: "it-IT", tz: "Europe/Rome", lang: "it-IT,it,en" },
  nl: { locale: "nl-NL", tz: "Europe/Amsterdam", lang: "nl-NL,nl,en" },
  pt: { locale: "pt-PT", tz: "Europe/Lisbon", lang: "pt-PT,pt,en" },
  br: { locale: "pt-BR", tz: "America/Sao_Paulo", lang: "pt-BR,pt,en" },
  jp: { locale: "ja-JP", tz: "Asia/Tokyo", lang: "ja-JP,ja,en" },
  kr: { locale: "ko-KR", tz: "Asia/Seoul", lang: "ko-KR,ko,en" },
  cn: { locale: "zh-CN", tz: "Asia/Shanghai", lang: "zh-CN,zh,en" },
  au: { locale: "en-AU", tz: "Australia/Sydney", lang: "en-AU,en" },
  ca: { locale: "en-CA", tz: "America/Toronto", lang: "en-CA,en,fr" },
  in: { locale: "en-IN", tz: "Asia/Kolkata", lang: "en-IN,en,hi" },
  mx: { locale: "es-MX", tz: "America/Mexico_City", lang: "es-MX,es,en" },
  ar: { locale: "es-AR", tz: "America/Argentina/Buenos_Aires", lang: "es-AR,es,en" },
  pl: { locale: "pl-PL", tz: "Europe/Warsaw", lang: "pl-PL,pl,en" },
  se: { locale: "sv-SE", tz: "Europe/Stockholm", lang: "sv-SE,sv,en" },
  ch: { locale: "de-CH", tz: "Europe/Zurich", lang: "de-CH,de,fr,en" },
  at: { locale: "de-AT", tz: "Europe/Vienna", lang: "de-AT,de,en" },
  be: { locale: "fr-BE", tz: "Europe/Brussels", lang: "fr-BE,nl-BE,fr,nl,en" },
  ru: { locale: "ru-RU", tz: "Europe/Moscow", lang: "ru-RU,ru,en" },
  tr: { locale: "tr-TR", tz: "Europe/Istanbul", lang: "tr-TR,tr,en" },
  za: { locale: "en-ZA", tz: "Africa/Johannesburg", lang: "en-ZA,en" },
};
const DEFAULT_CONTEXT = { locale: "en-US", tz: "America/New_York", lang: "en-US,en" };

// Common desktop resolutions with slight randomization.
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1680, height: 1050 },
  { width: 2560, height: 1440 },
];

function randomViewport() {
  const base = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
  return { width: base.width, height: base.height };
}

function contextFor(country) {
  return COUNTRY_CONTEXT[country?.toLowerCase()] ?? DEFAULT_CONTEXT;
}

// Stealth patches injected before every page load to defeat common bot
// detection vectors (navigator.webdriver, missing chrome object, etc.).
const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, "webdriver", { get: () => undefined, configurable: true });
  window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: { isInstalled: false } };

  // Clean automation globals
  (function() {
    var props = [
      '__playwright','__pw_manual','__PW_inspect',
      '_selenium','__selenium_evaluate','__selenium_unwrapped',
      'callSelenium','_Selenium_IDE_Recorder',
      '__nightmare','callPhantom','_phantom',
      'domAutomation','domAutomationController',
      '__webdriver_evaluate','__driver_evaluate',
      '__webdriver_unwrapped','__driver_unwrapped',
      '_WEBDRIVER_ELEM_CACHE',
    ];
    for (var i = 0; i < props.length; i++) {
      try { delete window[props[i]]; } catch(e) {}
      try { delete document[props[i]]; } catch(e) {}
    }
    // cdc_ Chromium DevTools markers
    var keys = Object.getOwnPropertyNames(window);
    for (var i = 0; i < keys.length; i++) {
      if (/^cdc_/.test(keys[i])) try { delete window[keys[i]]; } catch(e) {}
    }
  })();

  var _origQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = function(p) {
    if (p.name === "notifications")
      return Promise.resolve({ state: "prompt", onchange: null });
    return _origQuery.call(navigator.permissions, p);
  };

  Object.defineProperty(navigator, "plugins", {
    get: () => {
      var a = [
        { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer",
          description: "Portable Document Format" },
        { name: "Chrome PDF Viewer",
          filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai", description: "" },
        { name: "Native Client", filename: "internal-nacl-plugin",
          description: "" },
      ];
      a.refresh = function() {};
      return a;
    },
  });

  Object.defineProperty(navigator, "languages", {
    get: () => ["en-US", "en"],
  });

  var _gp = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(p) {
    if (p === 37445) return "Intel Inc.";
    if (p === 37446) return "Intel Iris OpenGL Engine";
    return _gp.call(this, p);
  };

  // Patch Function.prototype.toString to hide overrides
  (function() {
    var _nts = Function.prototype.toString;
    var _ov = new Map();
    Function.prototype.toString = function() {
      return _ov.has(this) ? _ov.get(this) : _nts.call(this);
    };
    _ov.set(Function.prototype.toString, 'function toString() { [native code] }');
    _ov.set(navigator.permissions.query, 'function query() { [native code] }');
  })();
`;

// Stealth init script for Camoufox (Firefox) — cleans up Playwright artifacts
// that DataDome may detect even through Camoufox's fingerprint spoofing.
const CAMOUFOX_STEALTH_SCRIPT = `
  Object.defineProperty(navigator, "webdriver", { get: () => undefined, configurable: true });
  // Clean up Playwright globals that may leak
  (function() {
    var props = [
      '__playwright', '__pw_manual', '__PW_inspect',
      'domAutomation', 'domAutomationController',
    ];
    for (var i = 0; i < props.length; i++) {
      try { delete window[props[i]]; } catch(e) {}
    }
  })();
`;

// Simulate human-like behavior with realistic timing and patterns.
async function simulateHuman(page) {
  const vp = page.viewportSize() ?? { width: 1920, height: 1080 };
  const moves = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < moves; i++) {
    const x = 80 + Math.floor(Math.random() * (vp.width - 160));
    const y = 80 + Math.floor(Math.random() * (vp.height - 160));
    await page.mouse.move(x, y, { steps: 8 + Math.floor(Math.random() * 15) });
    await page.waitForTimeout(150 + Math.floor(Math.random() * 400));
  }
  await page.mouse.wheel(0, 100 + Math.floor(Math.random() * 500));
  await page.waitForTimeout(300 + Math.floor(Math.random() * 700));
  // Small upward scroll to look natural
  if (Math.random() > 0.5) {
    await page.mouse.wheel(0, -(50 + Math.floor(Math.random() * 100)));
    await page.waitForTimeout(200 + Math.floor(Math.random() * 300));
  }
}

export async function fetchWithBrowser({ url, proxy, timeoutMs, maxBytes, cookie = "", referer = "", country = "", useReferer = false }) {
  if (!browserModule) throw new FetchError("NETWORK", "No browser engine installed (patchright or playwright)");
  const { chromium } = browserModule;
  const auth = parseBasicAuth(proxy.authorization);
  if (!auth) throw new FetchError("PROXY", "Cannot parse proxy credentials for browser");

  const scheme = proxy.tls ? "https" : "http";
  const browser = await chromium.launch({
    headless: true,
    proxy: { server: `${scheme}://${proxy.host}:${proxy.port}`, username: auth.username, password: auth.password },
    args: [
      "--disable-dev-shm-usage", "--disable-gpu", "--disable-extensions",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  let wireBytes = 0;
  try {
    const ctx = contextFor(country);
    const viewport = randomViewport();
    const context = await browser.newContext({
      viewport,
      locale: ctx.locale,
      timezoneId: ctx.tz,
      deviceScaleFactor: Math.random() < 0.3 ? 2 : 1,
      hasTouch: false,
      isMobile: false,
      colorScheme: "light",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      extraHTTPHeaders: { "Accept-Language": ctx.lang },
    });
    const page = await context.newPage();
    await page.addInitScript(STEALTH_SCRIPT);

    page.on("response", (resp) => {
      const cl = resp.headers()["content-length"];
      if (cl) wireBytes += Number(cl) || 0;
    });

    const target = url instanceof URL ? url : new URL(url);

    if (cookie) {
      const pairs = cookie
        .split("; ")
        .filter(Boolean)
        .map((pair) => {
          const eq = pair.indexOf("=");
          return eq > 0 ? { name: pair.slice(0, eq), value: pair.slice(eq + 1), domain: target.hostname, path: "/" } : null;
        })
        .filter(Boolean);
      if (pairs.length) await context.addCookies(pairs);
    }

    // Referer chain: navigate to Google first, then to the target.
    // This makes the traffic look like a real user clicking a search result.
    if (useReferer) {
      const googleDomain = country === "de" ? "google.de" : country === "fr" ? "google.fr"
        : country === "br" ? "google.com.br" : country === "es" ? "google.es"
        : country === "it" ? "google.it" : country === "nl" ? "google.nl"
        : country === "jp" ? "google.co.jp" : "google.com";
      try {
        await page.goto(`https://www.${googleDomain}/`, { waitUntil: "domcontentloaded", timeout: Math.min(10_000, timeoutMs / 3) });
        await page.waitForTimeout(500 + Math.floor(Math.random() * 1000));
        await simulateHuman(page);
      } catch {
        // Google failed (proxy issue etc.) — proceed without referer.
      }
    }

    const navReferer = useReferer
      ? `https://www.google.com/`
      : referer || undefined;

    const response = await page.goto(target.href, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
      referer: navReferer,
    });

    // Simulate human behavior on the target page.
    await simulateHuman(page);

    // Wait for JS challenges (Cloudflare, DataDome, Akamai, etc.) to resolve.
    const settleDeadline = Date.now() + Math.min(25_000, timeoutMs - 5000);
    let captchaSolveAttempted = false;
    let akamaiReloaded = false;
    let turnstileClicked = false;
    while (Date.now() < settleDeadline) {
      await page.waitForTimeout(2000);
      const challengeInfo = await page.evaluate(() => {
        const html = document.documentElement.outerHTML;
        if (html.length > 10000) return { isChallenge: false };
        const meta = document.querySelector('meta[http-equiv="refresh"]');
        const cf = document.getElementById("challenge-running") || document.getElementById("cf-challenge-running");
        const title = document.title.toLowerCase();
        const isTurnstile = !!document.querySelector('iframe[src*="challenges.cloudflare.com"]')
          || !!document.querySelector('.cf-turnstile');
        const hasCfChallenge = cf || title.includes("just a moment") || title.includes("checking") || isTurnstile;
        const hasDataDome = /\bdd\s*=\s*\{/.test(html) && /['"]rt['"]\s*:\s*['"]c['"]/.test(html);
        const hasGenericChallenge = meta || /captcha|challenge|verify|blocked/i.test(html);
        const isAkamai = /access.denied|zugriff.verweigert/i.test(title)
          || /akamaighost/i.test(html)
          || /errors\.edgesuite\.net/i.test(html)
          || /\/_sec\/cp_challenge/i.test(html);
        return {
          isChallenge: Boolean(hasCfChallenge || hasDataDome || hasGenericChallenge),
          isAkamai,
          isTurnstile,
        };
      }).catch(() => ({ isChallenge: false, isAkamai: false, isTurnstile: false }));
      if (!challengeInfo.isChallenge) break;

      // Cloudflare Turnstile: find the iframe and click the verification checkbox.
      if (challengeInfo.isTurnstile && !turnstileClicked) {
        turnstileClicked = true;
        const cfFrame = page.frames().find((f) => f.url().includes("challenges.cloudflare.com"));
        if (cfFrame) {
          try {
            await cfFrame.waitForSelector("input[type='checkbox'], .mark, #challenge-stage", { timeout: 5000 }).catch(() => {});
            const checkbox = (await cfFrame.$("input[type='checkbox']")) || (await cfFrame.$(".mark"));
            if (checkbox) {
              const box = await checkbox.boundingBox();
              if (box) {
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await page.waitForTimeout(3000 + Math.floor(Math.random() * 2000));
              }
            }
          } catch {}
        }
        continue;
      }

      // Akamai Bot Manager: sensor JS sets _abck cookie, then page must reload.
      if (challengeInfo.isAkamai && !akamaiReloaded) {
        akamaiReloaded = true;
        await page.waitForTimeout(3000 + Math.floor(Math.random() * 2000));
        await page.reload({ waitUntil: "domcontentloaded", timeout: Math.min(15_000, settleDeadline - Date.now()) }).catch(() => {});
        await simulateHuman(page);
        continue;
      }

      // Try to solve DataDome CAPTCHAs if present and not already attempted.
      if (!captchaSolveAttempted) {
        captchaSolveAttempted = true;
        const ddType = await detectDataDome(page).catch(() => "none");
        if (ddType === "slider" || ddType === "ic" || ddType === "interactive-challenge") {
          const result = await solveDataDome(page, {
            timeoutMs: Math.min(15_000, settleDeadline - Date.now()),
          }).catch(() => ({ solved: false }));
          if (result.solved) break;
        }
      }
    }

    const finalUrl = page.url();
    const html = await page.content();
    const body = Buffer.from(html, "utf-8");
    if (body.length > maxBytes) throw new FetchError("TOO_LARGE", "Rendered page exceeds size limit");

    const status = response?.status() ?? 200;
    const headers = { ...(response?.headers() ?? {}) };
    headers["content-type"] = "text/html; charset=utf-8";
    delete headers["content-encoding"];
    delete headers["content-length"];
    wireBytes = Math.max(wireBytes, body.length);

    // Pass cookies back so the unlocker's jar can store them.
    const cookies = await context.cookies();
    if (cookies.length) {
      headers["set-cookie"] = cookies.map(
        (c) => `${c.name}=${c.value}; Domain=${c.domain}; Path=${c.path}${c.expires > 0 ? `; Expires=${new Date(c.expires * 1000).toUTCString()}` : ""}`,
      );
    }

    return { status, headers, body, wireBytes, protocol: "browser", url: new URL(finalUrl) };
  } catch (error) {
    if (error instanceof FetchError) {
      error.wireBytes = wireBytes;
      throw error;
    }
    const code = error.name === "TimeoutError" || error.message?.includes("Timeout") ? "TIMEOUT" : "NETWORK";
    const wrapped = new FetchError(code, `Browser: ${error.message}`);
    wrapped.wireBytes = wireBytes;
    throw wrapped;
  } finally {
    await browser.close().catch(() => {});
  }
}

// Camoufox-based fetcher: stealth Firefox that defeats DataDome fingerprinting.
// Runs entirely in Python (Camoufox context manager) to avoid the Node.js
// Playwright server/connect protocol mismatch that hangs on newPage().
const CAMOUFOX_FETCH_SCRIPT = join(__dirname, "camoufox-fetch.py");

export async function fetchWithCamoufox({ url, proxy, timeoutMs, maxBytes, cookie = "", referer = "", country = "", useReferer = false }) {
  if (!(await isCamoufoxAvailable())) {
    throw new FetchError("NETWORK", "Camoufox not installed on this server");
  }

  const auth = parseBasicAuth(proxy.authorization);
  if (!auth) throw new FetchError("PROXY", "Cannot parse proxy credentials for browser");

  const scheme = proxy.tls ? "https" : "http";
  const input = JSON.stringify({
    url: url instanceof URL ? url.href : url,
    proxy: { server: `${scheme}://${proxy.host}:${proxy.port}`, username: auth.username, password: auth.password },
    country, cookie, referer, useReferer, timeoutMs, maxBytes,
    addons: [DD_BYPASS_EXT],
  });

  const { spawn } = await import("node:child_process");
  const totalTimeout = timeoutMs + 30_000;

  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["-u", CAMOUFOX_FETCH_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: totalTimeout,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new FetchError("TIMEOUT", "Camoufox fetch timed out"));
    }, totalTimeout);

    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });

    child.stdin.write(input);
    child.stdin.end();

    child.on("close", (code) => {
      clearTimeout(timer);
      if (!stdout.trim()) {
        reject(new FetchError("NETWORK", `Camoufox exited ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new FetchError(result.error, result.message || result.error));
          return;
        }
        const body = Buffer.from(result.body, "base64");
        resolve({
          status: result.status,
          headers: result.headers,
          body,
          wireBytes: result.wireBytes || body.length,
          protocol: "camoufox",
          url: new URL(result.finalUrl),
        });
      } catch (e) {
        reject(new FetchError("NETWORK", `Camoufox parse error: ${e.message}`));
      }
    });
  });
}
