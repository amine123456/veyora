// Launches Camoufox via Python subprocess, returns a Playwright-compatible
// WebSocket endpoint.  Node.js connects with playwright's firefox.connect().
//
// Camoufox is a stealth Firefox fork that defeats DataDome and similar
// fingerprint-based bot detection.  It generates realistic fingerprints,
// spoofs OS-level fonts, WebGL, and navigator properties automatically.

import { spawn, execSync } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DD_BYPASS_EXT = join(__dirname, "dd-bypass-ext");

let _playwright = null;

async function getPlaywright() {
  if (_playwright) return _playwright;
  try { _playwright = await import("playwright"); return _playwright; } catch {}
  try { _playwright = await import("patchright"); return _playwright; } catch {}
  throw new Error("Neither playwright nor patchright is installed");
}

const LAUNCH_SCRIPT = `
import sys, json, warnings
warnings.filterwarnings("ignore", category=UserWarning)

from camoufox.server import launch_server

conf = json.loads(sys.argv[1])
proxy = conf.get("proxy")
headless = conf.get("headless", False)
addons = conf.get("addons")

kwargs = dict(
    proxy=proxy or None,
    humanize=True,
    block_webrtc=True,
    i_know_what_im_doing=True,
    headless=bool(headless),
)
if addons:
    kwargs["addons"] = addons

launch_server(**kwargs)
`;

const XVFB_DISPLAY = `:${90 + (process.pid % 10)}`;

function ensureXvfb() {
  try {
    execSync(`xdpyinfo -display ${XVFB_DISPLAY} >/dev/null 2>&1`, { timeout: 2000 });
    return XVFB_DISPLAY;
  } catch {}
  try { execSync(`pkill -f "Xvfb ${XVFB_DISPLAY}" 2>/dev/null`, { stdio: "ignore" }); } catch {}
  const xvfb = spawn("Xvfb", [XVFB_DISPLAY, "-screen", "0", "1920x1080x24", "-ac"], {
    stdio: "ignore", detached: true,
  });
  xvfb.unref();
  xvfb.on("error", () => {});
  execSync("sleep 1");
  return XVFB_DISPLAY;
}

// Start a Camoufox server process and return { wsEndpoint, kill() }.
// proxy: { server: "http://host:port", username, password }
export async function launchCamoufox({ proxy, headless = "virtual", addons, timeoutMs = 30_000 } = {}) {
  const conf = {};
  if (proxy) {
    conf.proxy = { server: proxy.server };
    if (proxy.username) conf.proxy.username = proxy.username;
    if (proxy.password) conf.proxy.password = proxy.password;
  }
  const useXvfb = headless === "virtual";
  conf.headless = useXvfb ? false : Boolean(headless);
  if (addons) conf.addons = addons;

  const env = { ...process.env };
  if (useXvfb) {
    const display = ensureXvfb();
    env.DISPLAY = display;
  }

  const child = spawn("python3", ["-u", "-c", LAUNCH_SCRIPT, JSON.stringify(conf)], {
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });

  let wsEndpoint = null;
  let output = "";

  const parseWs = (text) => {
    output += text;
    const m = /ws:\/\/[^\s\x1b]+/.exec(text);
    if (m && !wsEndpoint) {
      wsEndpoint = m[0];
      return true;
    }
    return false;
  };

  const endpointPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Camoufox launch timed out after ${timeoutMs}ms. output: ${output}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      if (parseWs(chunk.toString())) { clearTimeout(timer); resolve(wsEndpoint); }
    });
    child.stderr.on("data", (chunk) => {
      if (parseWs(chunk.toString())) { clearTimeout(timer); resolve(wsEndpoint); }
    });

    child.on("exit", (code) => {
      clearTimeout(timer);
      if (!wsEndpoint) reject(new Error(`Camoufox exited with code ${code}. output: ${output}`));
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
