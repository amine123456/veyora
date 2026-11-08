// Browser-based page fetcher: launches Chromium through the upstream proxy,
// navigates, waits for JS to execute, and returns the rendered HTML.
// Tries patchright (stealth fork) first, then vanilla playwright.

import { FetchError } from "./fetcher.js";

let browserModule = null;
let checked = false;

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

function parseBasicAuth(header) {
  const m = /^Basic\s+(.+)$/i.exec(header);
  if (!m) return null;
  const decoded = Buffer.from(m[1], "base64").toString();
  const i = decoded.indexOf(":");
  return i > 0 ? { username: decoded.slice(0, i), password: decoded.slice(i + 1) } : null;
}

export { parseBasicAuth };

export async function fetchWithBrowser({ url, proxy, timeoutMs, maxBytes, cookie = "", referer = "" }) {
  if (!browserModule) throw new FetchError("NETWORK", "No browser engine installed (patchright or playwright)");
  const { chromium } = browserModule;
  const auth = parseBasicAuth(proxy.authorization);
  if (!auth) throw new FetchError("PROXY", "Cannot parse proxy credentials for browser");

  const scheme = proxy.tls ? "https" : "http";
  const browser = await chromium.launch({
    headless: true,
    proxy: { server: `${scheme}://${proxy.host}:${proxy.port}`, username: auth.username, password: auth.password },
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-extensions"],
  });

  let wireBytes = 0;
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezoneId: "America/New_York",
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Accumulate wire bytes from response content-length headers.
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

    const response = await page.goto(target.href, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
      referer: referer || undefined,
    });

    // Give dynamic content a moment to settle after networkidle.
    await page.waitForTimeout(2000);

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
