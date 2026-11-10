// CAPTCHA solver: detects and solves DataDome challenges inside
// the Camoufox browser. Uses Vosk (offline speech-to-text) to solve
// the audio digit challenge, and script interception to neuter
// DataDome's devtools detection that blocks the widget from rendering.

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_SOLVER = join(__dirname, "audio-solver.py");

// Intercept captcha-delivery.com scripts to remove devtools detection.
// Must be called on the page BEFORE navigating.
export async function installDevtoolsBypass(page) {
  await page.route("**/*captcha-delivery.com/**/*.js*", async (route) => {
    try {
      const response = await route.fetch();
      let body = await response.text();
      if (/[Dd]ev[Tt]ools/.test(body)) {
        body = body.replace(/DevTools/g, "XXXXXXXX");
        body = body.replace(/devtools/gi, "xxxxxxxx");
      }
      await route.fulfill({ response, body });
    } catch {
      await route.continue().catch(() => {});
    }
  });
}

export async function detectDataDome(page) {
  for (const frame of page.frames()) {
    if (!frame.url().includes("captcha-delivery.com")) continue;
    const type = await frame.evaluate(() => {
      const attr = document.body?.getAttribute("data-dd-response-page");
      if (attr === "hard-block") return "hard-block";
      if (attr === "captcha" || attr === "interactive-challenge" || attr === "ic") return "captcha";
      if (attr) return attr;
      return "unknown";
    }).catch(() => "error");
    if (type !== "error") return type;
  }
  const hasDD = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    if (html.length > 20000) return "none";
    const m = /\bdd\s*=\s*\{[^}]*'t'\s*:\s*'([^']+)'/.exec(html);
    return m ? m[1] : "none";
  }).catch(() => "none");
  return hasDD;
}

export function getCaptchaFrame(page) {
  for (const frame of page.frames()) {
    if (frame.url().includes("captcha-delivery.com")) return frame;
  }
  return null;
}

// Wait for the captcha widget to fully render (inputs or canvases present).
async function waitForWidget(frame, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await frame.evaluate(() => {
      const inputs = document.querySelectorAll("input.audio-captcha-inputs");
      const canvases = document.querySelectorAll("canvas");
      const slider = document.querySelector(".sliderContainer");
      const audioBtn = document.querySelector("#captcha__audio__button");
      return { inputs: inputs.length, canvases: canvases.length, slider: !!slider, audioBtn: !!audioBtn };
    }).catch(() => null);
    if (ready && (ready.inputs > 0 || (ready.canvases > 0 && ready.slider) || ready.audioBtn)) return ready;
    await frame.page().waitForTimeout(1000);
  }
  return null;
}

// Solve the audio captcha: get audio URL, run Vosk, type digits, verify.
async function solveAudioCaptcha(page, frame, { timeoutMs = 25000 } = {}) {
  // Switch to audio mode if not already active
  const switched = await frame.evaluate(() => {
    const audioBtn = document.querySelector("#captcha__audio__button");
    if (audioBtn && !audioBtn.classList.contains("toggled")) {
      audioBtn.click();
      return true;
    }
    return false;
  }).catch(() => false);
  if (switched) await page.waitForTimeout(500);

  // Get audio URL
  const audioUrl = await frame.evaluate(() => {
    const audio = document.querySelector("audio.audio-captcha-track");
    return audio?.src || null;
  }).catch(() => null);
  if (!audioUrl) return { solved: false, reason: "no-audio-url" };

  // Run Vosk to transcribe the audio
  const digits = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("audio-solver timeout")), timeoutMs);
    execFile("python3", [AUDIO_SOLVER, audioUrl], { timeout: timeoutMs }, (err, stdout) => {
      clearTimeout(timer);
      if (err) return reject(err);
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result.digits);
      } catch { reject(new Error("bad solver output: " + stdout.substring(0, 100))); }
    });
  });

  if (!digits || digits.length !== 6) {
    return { solved: false, reason: "digit-extraction-failed", digits };
  }

  // Type digits into the 6 input fields
  const inputCount = await frame.evaluate(() =>
    document.querySelectorAll("input.audio-captcha-inputs").length
  ).catch(() => 0);
  if (inputCount < 6) return { solved: false, reason: "input-fields-not-found" };

  for (let i = 0; i < 6; i++) {
    await frame.evaluate((args) => {
      const inputs = document.querySelectorAll("input.audio-captcha-inputs");
      const input = inputs[args.i];
      if (!input) return;
      input.focus();
      input.value = args.d;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, { i, d: digits[i] });
    await page.waitForTimeout(80 + Math.floor(Math.random() * 120));
  }

  // Click verify button
  await frame.evaluate(() => {
    const btn = document.querySelector(".audio-captcha-submit-button");
    if (btn) btn.click();
  }).catch(() => {});

  // Wait for validation
  await page.waitForTimeout(4000);

  const afterType = await detectDataDome(page);
  const solved = afterType === "none" || afterType === "bv";
  return { solved, reason: solved ? "audio-solved" : "validation-failed", digits, afterType };
}

// Solve the puzzle slider captcha using canvas edge detection.
async function solvePuzzleSlider(page, frame, { timeoutMs = 20000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  // Ensure puzzle mode is active
  await frame.evaluate(() => {
    const btn = document.querySelector("#captcha__puzzle__button");
    if (btn && !btn.classList.contains("toggled")) btn.click();
  }).catch(() => {});
  await page.waitForTimeout(500);

  // Wait for canvases to have height (image loaded)
  let canvasReady = false;
  while (Date.now() < deadline) {
    canvasReady = await frame.evaluate(() => {
      const canvases = document.querySelectorAll("canvas");
      return [...canvases].some(c => c.height > 0);
    }).catch(() => false);
    if (canvasReady) break;
    await page.waitForTimeout(1000);
  }
  if (!canvasReady) return { solved: false, reason: "canvas-not-loaded" };

  // Detect gap position via edge detection on the background canvas
  const gapFraction = await frame.evaluate(() => {
    const canvases = document.querySelectorAll("canvas");
    const bg = canvases[0];
    if (!bg || !bg.width || !bg.height) return null;

    const ctx = bg.getContext("2d");
    const { width: w, height: h } = bg;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const startX = Math.floor(w * 0.15);
    const endX = Math.floor(w * 0.85);
    const scanTop = Math.floor(h * 0.1);
    const scanBottom = Math.floor(h * 0.9);
    const edgeStrength = new Float32Array(w);

    for (let x = startX; x < endX; x++) {
      let total = 0;
      for (let y = scanTop; y < scanBottom; y++) {
        const idx = (y * w + x) * 4;
        const idxPrev = (y * w + x - 1) * 4;
        const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        const lumPrev = data[idxPrev] * 0.299 + data[idxPrev + 1] * 0.587 + data[idxPrev + 2] * 0.114;
        total += Math.abs(lum - lumPrev);
      }
      edgeStrength[x] = total;
    }

    let maxEdge = 0, maxX = 0;
    for (let x = startX; x < endX; x++) {
      if (edgeStrength[x] > maxEdge) { maxEdge = edgeStrength[x]; maxX = x; }
    }
    return maxEdge > 0 ? maxX / w : null;
  }).catch(() => null);

  if (gapFraction === null) return { solved: false, reason: "gap-detection-failed" };

  // Find slider knob and track
  const slider = await frame.evaluate(() => {
    const knob = document.querySelector(".slider");
    const track = document.querySelector(".sliderContainer");
    if (!knob || !track) return null;
    const kr = knob.getBoundingClientRect();
    const tr = track.getBoundingClientRect();
    return { knobX: kr.x + kr.width / 2, knobY: kr.y + kr.height / 2, trackWidth: tr.width };
  }).catch(() => null);

  if (!slider) return { solved: false, reason: "slider-not-found" };

  const dragDistance = gapFraction * slider.trackWidth;
  const steps = 25 + Math.floor(Math.random() * 15);

  // Human-like drag
  await frame.page().mouse.move(slider.knobX, slider.knobY, { steps: 5 });
  await frame.page().mouse.down();
  await page.waitForTimeout(100 + Math.floor(Math.random() * 100));

  for (let i = 1; i <= steps; i++) {
    const eased = 1 - Math.pow(1 - i / steps, 3);
    const x = slider.knobX + dragDistance * eased;
    const wobbleY = slider.knobY + (Math.random() - 0.5) * 3;
    await frame.page().mouse.move(x, wobbleY);
    const delay = (i / steps) < 0.3 ? 8 : (i / steps) > 0.8 ? 20 : 12;
    await page.waitForTimeout(delay + Math.floor(Math.random() * 10));
  }

  const overshoot = 2 + Math.floor(Math.random() * 4);
  await frame.page().mouse.move(slider.knobX + dragDistance + overshoot, slider.knobY);
  await page.waitForTimeout(60);
  await frame.page().mouse.move(slider.knobX + dragDistance, slider.knobY);
  await page.waitForTimeout(80);
  await frame.page().mouse.up();

  await page.waitForTimeout(3000);
  const afterType = await detectDataDome(page);
  const solved = afterType === "none" || afterType === "bv";
  return { solved, reason: solved ? "slider-solved" : "validation-failed", gapFraction, afterType };
}

// Main solver entry point.
export async function solveDataDome(page, options = {}) {
  const type = await detectDataDome(page);

  if (type === "none") return { solved: true, type: "none", reason: "no-captcha" };
  if (type === "hard-block") return { solved: false, type: "hard-block", reason: "hard-block-no-challenge" };

  // JS challenges ("bv", "fe", "device-check") may auto-resolve with Camoufox.
  const jsChallenge = type === "bv" || type === "fe" || type === "device-check" || type === "unknown";
  if (jsChallenge) {
    for (let wait = 0; wait < 3; wait++) {
      await page.waitForTimeout(5000);
      const recheck = await detectDataDome(page);
      if (recheck === "none") return { solved: true, type, reason: "js-challenge-auto-solved" };
      if (recheck === "captcha") break;
      if (recheck === "hard-block") return { solved: false, type: recheck, reason: "escalated-to-hard-block" };
    }
  }

  // Solvable captcha: "captcha", "slider", "unknown" with a frame present.
  const frame = getCaptchaFrame(page);
  if (!frame) return { solved: false, type, reason: "no-captcha-frame" };

  const widget = await waitForWidget(frame, options.timeoutMs || 15000);
  if (!widget) return { solved: false, type, reason: "widget-not-loaded" };

  // Audio is more reliable than slider — try it first if available.
  const hasAudioBtn = widget.audioBtn || await frame.evaluate(() =>
    !!document.querySelector("#captcha__audio__button")
  ).catch(() => false);

  if (hasAudioBtn) {
    const result = await solveAudioCaptcha(page, frame, options);
    if (result.solved) return { type, ...result };
    // Audio failed — try slider as fallback.
    if (widget.slider && widget.canvases > 0) {
      return { type, ...await solvePuzzleSlider(page, frame, options) };
    }
    return { type, ...result };
  }

  if (widget.slider && widget.canvases > 0) {
    return { type, ...await solvePuzzleSlider(page, frame, options) };
  }

  return { solved: false, type, reason: "no-solvable-challenge" };
}
