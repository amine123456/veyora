// Fetch through curl_cffi (Python) with Chrome TLS impersonation.
// Falls back gracefully: if Python or curl_cffi is missing, curlAvailable()
// returns false and the unlocker uses the plain Node fetcher instead.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromeHeaders, FetchError } from "./fetcher.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, "curl-fetch.py");

let _available = null;

export async function curlAvailable() {
  if (_available !== null) return _available;
  try {
    const ok = await new Promise((resolve) => {
      const proc = spawn("python3", ["-c", "from curl_cffi import requests; print('ok')"], { timeout: 5000 });
      let out = "";
      proc.stdout.on("data", (chunk) => { out += chunk; });
      proc.on("close", (code) => resolve(code === 0 && out.trim() === "ok"));
      proc.on("error", () => resolve(false));
    });
    _available = ok;
  } catch {
    _available = false;
  }
  return _available;
}

export async function fetchWithCurl({ url, proxy, timeoutMs, maxBytes, cookie = "", referer = "" }) {
  const target = url instanceof URL ? url : new URL(url);
  const headers = chromeHeaders({ cookie, referer });

  // Build a proxy URL for curl_cffi: http://user:pass@host:port
  const auth = parseAuth(proxy.authorization);
  if (!auth) throw new FetchError("PROXY", "Cannot parse proxy credentials for curl");
  const scheme = proxy.tls ? "https" : "http";
  const proxyUrl = `${scheme}://${encodeURIComponent(auth.username)}:${encodeURIComponent(auth.password)}@${proxy.host}:${proxy.port}`;

  const input = JSON.stringify({
    url: target.href,
    proxyUrl,
    timeoutMs,
    maxBytes,
    headers,
  });

  const result = await runPython(input, timeoutMs + 5000);

  if (result.error) {
    throw new FetchError(result.code || "NETWORK", result.error);
  }

  const body = Buffer.from(result.bodyBase64, "base64");
  const wireBytes = result.wireBytes ?? body.length;

  // Flatten headers: curl_cffi returns them as object, some values may be arrays
  const respHeaders = {};
  for (const [key, val] of Object.entries(result.headers)) {
    respHeaders[key.toLowerCase()] = Array.isArray(val) ? val : val;
  }

  return {
    status: result.status,
    headers: respHeaders,
    body,
    wireBytes,
    protocol: result.protocol || "h2",
    url: result.finalUrl ? new URL(result.finalUrl) : target,
  };
}

function parseAuth(header) {
  const m = /^Basic\s+(.+)$/i.exec(header);
  if (!m) return null;
  const decoded = Buffer.from(m[1], "base64").toString();
  const i = decoded.indexOf(":");
  return i > 0 ? { username: decoded.slice(0, i), password: decoded.slice(i + 1) } : null;
}

function runPython(input, timeoutMs) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-u", SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: timeoutMs,
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => { stdout += chunk; });
    proc.stderr.on("data", (chunk) => { stderr += chunk; });
    proc.stdin.write(input);
    proc.stdin.end();
    proc.on("close", (code) => {
      if (code !== 0) {
        const msg = stderr.trim().split("\n").pop() || `curl-fetch.py exited with code ${code}`;
        return reject(new FetchError("NETWORK", msg));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new FetchError("NETWORK", `curl-fetch.py returned invalid JSON: ${stdout.slice(0, 200)}`));
      }
    });
    proc.on("error", (error) => {
      reject(new FetchError("NETWORK", `Failed to spawn curl-fetch.py: ${error.message}`));
    });
  });
}
