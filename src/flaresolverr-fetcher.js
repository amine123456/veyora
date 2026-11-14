// FlareSolverr fetcher: routes requests through a local FlareSolverr instance
// with the upstream residential proxy. Used as a ladder rung for Cloudflare
// managed challenges that patchright/Camoufox can't solve.

const DEFAULT_ENDPOINT = "http://127.0.0.1:8191/v1";

class FetchError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

export async function flareSolverrAvailable(endpoint = DEFAULT_ENDPOINT) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "sessions.list" }),
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

export async function fetchWithFlareSolverr({
  url,
  proxy,
  timeoutMs = 60_000,
  maxBytes = 5_000_000,
  cookie = "",
  endpoint = DEFAULT_ENDPOINT,
}) {
  const auth = parseBasicAuth(proxy.authorization);
  if (!auth) throw new FetchError("PROXY", "Cannot parse proxy credentials for FlareSolverr");

  // FlareSolverr supports proxy auth via a Chrome extension when username+password
  // are passed as separate fields (not embedded in the URL).
  const scheme = proxy.tls ? "https" : "http";
  const proxyObj = {
    url: `${scheme}://${proxy.host}:${proxy.port}`,
    username: auth.username,
    password: auth.password,
  };

  const body = {
    cmd: "request.get",
    url: url.href,
    maxTimeout: Math.min(timeoutMs - 2000, 90_000),
    proxy: proxyObj,
  };
  if (cookie) {
    body.cookies = cookie.split("; ").map((pair) => {
      const [name, ...rest] = pair.split("=");
      return { name: name.trim(), value: rest.join("="), domain: url.hostname };
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new FetchError(
      err.name === "AbortError" ? "TIMEOUT" : "NETWORK",
      `FlareSolverr request failed: ${err.message}`,
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json();

  if (data.status !== "ok" || !data.solution) {
    const msg = data.message || "Unknown FlareSolverr error";
    if (/timeout/i.test(msg)) throw new FetchError("TIMEOUT", msg);
    throw new FetchError("NETWORK", msg);
  }

  const sol = data.solution;
  const htmlBody = sol.response ?? "";

  // Detect Chrome's built-in error page (proxy unreachable, DNS failure, etc.)
  if (/Copyright.*The Chromium Authors|ERR_PROXY_CONNECTION_FAILED|ERR_CONNECTION_TIMED_OUT|this\s+site\s+can.t\s+be\s+reached/i.test(htmlBody.slice(0, 2000))) {
    throw new FetchError("PROXY", "FlareSolverr returned Chrome error page (proxy unreachable)");
  }

  const buf = Buffer.from(htmlBody, "utf8");
  if (buf.length > maxBytes) throw new FetchError("TOO_LARGE", `Response ${buf.length} bytes exceeds ${maxBytes}`);

  const headers = {};
  if (sol.headers) {
    for (const [k, v] of Object.entries(sol.headers)) {
      headers[k.toLowerCase()] = v;
    }
  }
  headers["content-type"] = "text/html; charset=utf-8";

  if (sol.cookies?.length) {
    headers["set-cookie"] = sol.cookies
      .map((c) => `${c.name}=${c.value}; Domain=${c.domain || url.hostname}; Path=${c.path || "/"}`)
      .join(", ");
  }

  return {
    status: sol.status ?? 200,
    headers,
    body: buf,
    wireBytes: buf.length,
    url: new URL(sol.url || url.href),
    finalUrl: sol.url || url.href,
  };
}

function parseBasicAuth(header) {
  if (!header) return null;
  const match = /^Basic\s+([A-Za-z0-9+/]+=*)$/i.exec(header);
  if (!match) return null;
  const decoded = Buffer.from(match[1], "base64").toString();
  const sep = decoded.indexOf(":");
  if (sep < 1) return null;
  return { username: decoded.slice(0, sep), password: decoded.slice(sep + 1) };
}
