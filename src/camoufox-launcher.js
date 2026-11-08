// Launches Camoufox via Python subprocess, returns a Playwright-compatible
// WebSocket endpoint.  Node.js connects with playwright's firefox.connect().
//
// Camoufox is a stealth Firefox fork that defeats DataDome and similar
// fingerprint-based bot detection.  It generates realistic fingerprints,
// spoofs OS-level fonts, WebGL, and navigator properties automatically.

import { spawn } from "node:child_process";
import { once } from "node:events";

let _playwright = null;

async function getPlaywright() {
  if (_playwright) return _playwright;
  try { _playwright = await import("playwright"); return _playwright; } catch {}
  try { _playwright = await import("patchright"); return _playwright; } catch {}
  throw new Error("Neither playwright nor patchright is installed");
}

const LAUNCH_SCRIPT = `
import sys, json
from camoufox.server import launch_server

conf = json.loads(sys.argv[1])
proxy = conf.get("proxy")
headless = conf.get("headless", False)
geoip = conf.get("geoip")

launch_server(
    proxy=proxy or None,
    headless=headless if headless == "virtual" else bool(headless),
    geoip=geoip or None,
    humanize=True,
    block_webrtc=True,
    i_know_what_im_doing=True,
)
`;

// Start a Camoufox server process and return { wsEndpoint, kill() }.
// proxy: { server: "http://host:port", username, password }
export async function launchCamoufox({ proxy, headless = "virtual", geoip, timeoutMs = 30_000 } = {}) {
  const conf = {};
  if (proxy) {
    conf.proxy = { server: proxy.server };
    if (proxy.username) conf.proxy.username = proxy.username;
    if (proxy.password) conf.proxy.password = proxy.password;
  }
  conf.headless = headless;
  if (geoip) conf.geoip = geoip;

  const child = spawn("python3", ["-c", LAUNCH_SCRIPT, JSON.stringify(conf)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, DISPLAY: headless === "virtual" ? undefined : process.env.DISPLAY },
  });

  let wsEndpoint = null;
  let stderr = "";

  const endpointPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Camoufox launch timed out after ${timeoutMs}ms. stderr: ${stderr}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      // The server prints: "Websocket endpoint: ws://..."
      const m = /ws:\/\/[^\s\x1b]+/.exec(text);
      if (m && !wsEndpoint) {
        wsEndpoint = m[0];
        clearTimeout(timer);
        resolve(wsEndpoint);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("exit", (code) => {
      clearTimeout(timer);
      if (!wsEndpoint) reject(new Error(`Camoufox exited with code ${code}. stderr: ${stderr}`));
    });
  });

  const endpoint = await endpointPromise;

  return {
    wsEndpoint: endpoint,
    process: child,
    kill() {
      try { child.kill("SIGTERM"); } catch {}
      setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 3000);
    },
  };
}

// Connect to a running Camoufox server and return { browser, context, page, close() }.
export async function connectCamoufox({ wsEndpoint, proxy, headless = "virtual", geoip, viewport, timeoutMs = 30_000 } = {}) {
  let server = null;
  let endpoint = wsEndpoint;

  if (!endpoint) {
    server = await launchCamoufox({ proxy, headless, geoip, timeoutMs });
    endpoint = server.wsEndpoint;
  }

  const pw = await getPlaywright();
  const browser = await pw.firefox.connect(endpoint, { timeout: 15_000 });

  const context = await browser.newContext({
    viewport: viewport || { width: 1920, height: 1080 },
    acceptDownloads: false,
  });
  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    async close() {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
      if (server) server.kill();
    },
  };
}

export async function camoufoxAvailable() {
  try {
    const child = spawn("python3", ["-c", "import camoufox; print('ok')"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const [code] = await once(child, "exit");
    return code === 0;
  } catch {
    return false;
  }
}
