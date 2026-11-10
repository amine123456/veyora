#!/usr/bin/env node
// Quick captcha solver test: launches Camoufox, navigates to a DataDome site,
// detects and attempts to solve the captcha. Usage:
//   node --env-file=.env src/captcha-test.js [url]

import { detectDataDome, solveDataDome, getCaptchaFrame } from "./captcha-solver.js";
import { launchCamoufox } from "./camoufox-launcher.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DD_BYPASS_EXT = join(__dirname, "dd-bypass-ext");

const url = process.argv[2] || "https://www.lacentrale.fr/listing?makesModelsCommercialNames=RENAULT";
const pool = process.argv[3] || "residential";

const host = process.env.UPSTREAM_PROXY_HOST;
const port = process.env.UPSTREAM_PROXY_PORT;
const user = pool === "mobile"
  ? process.env.UPSTREAM_MOBILE_USERNAME
  : process.env.UPSTREAM_PROXY_USERNAME;
const pass = pool === "mobile"
  ? process.env.UPSTREAM_MOBILE_PASSWORD
  : process.env.UPSTREAM_PROXY_PASSWORD;

const sessionId = "captcha-test-" + Date.now();
const proxy = {
  server: `http://${host}:${port}`,
  username: `${user}-sid-${sessionId}`,
  password: pass,
};

let server, browser;

async function cleanup() {
  try { await browser?.close(); } catch {}
  try { server?.kill(); } catch {}
}

process.on("SIGTERM", async () => { await cleanup(); process.exit(1); });
process.on("SIGINT", async () => { await cleanup(); process.exit(1); });

const timeout = setTimeout(async () => {
  console.error("TIMEOUT: test exceeded 120s");
  await cleanup();
  process.exit(1);
}, 120_000);

try {
  console.log(`Pool: ${pool} | URL: ${url}`);
  console.log("Launching Camoufox...");
  server = await launchCamoufox({ proxy, headless: "virtual", addons: [DD_BYPASS_EXT], timeoutMs: 30_000 });

  const pw = await import("playwright");
  browser = await pw.firefox.connect(server.wsEndpoint, { timeout: 15_000 });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  console.log("Navigating...");
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });

  console.log("Waiting 12s for page/captcha to settle...");
  await page.waitForTimeout(12_000);

  const ddType = await detectDataDome(page);
  const bodyLen = (await page.content()).length;
  console.log(`DataDome: ${ddType} | Body: ${bodyLen} | Title: ${await page.title()}`);

  if (ddType === "none" && bodyLen > 10000) {
    console.log("No captcha — page loaded directly.");
  } else if (ddType === "hard-block") {
    console.log("Hard-blocked — IP reputation too low for this site.");
  } else if (ddType !== "none") {
    const frame = getCaptchaFrame(page);
    if (frame) {
      const info = await frame.evaluate(() => ({
        audioBtn: !!document.querySelector("#captcha__audio__button"),
        puzzleBtn: !!document.querySelector("#captcha__puzzle__button"),
        inputs: document.querySelectorAll("input.audio-captcha-inputs").length,
        slider: !!document.querySelector(".sliderContainer"),
        canvases: document.querySelectorAll("canvas").length,
      })).catch((e) => ({ error: e.message }));
      console.log("Widget state:", JSON.stringify(info));
    }

    console.log("Attempting solve...");
    const t0 = Date.now();
    const result = await solveDataDome(page, { timeoutMs: 50_000 });
    console.log(`Solve took ${Date.now() - t0}ms`);
    console.log("Result:", JSON.stringify(result));

    if (result.solved) {
      await page.waitForTimeout(3000);
      const newBody = (await page.content()).length;
      console.log(`SUCCESS! New body: ${newBody} | Title: ${await page.title()}`);
    }
  } else {
    console.log("Unknown state — small body, no captcha detected.");
  }

  await ctx.close();
} catch (e) {
  console.error("Error:", e.message);
} finally {
  clearTimeout(timeout);
  await cleanup();
  process.exit(0);
}
