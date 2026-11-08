// CAPTCHA solver: detects and solves DataDome slider challenges inside
// the browser, using in-browser canvas pixel analysis — zero Node deps.

// Detect whether the current page (or an iframe) contains a solvable
// DataDome CAPTCHA and return the type.
// Returns: "slider" | "hard-block" | "none"
export async function detectDataDome(page) {
  for (const frame of page.frames()) {
    if (!frame.url().includes("captcha-delivery.com")) continue;
    const type = await frame.evaluate(() => {
      const attr = document.body?.getAttribute("data-dd-response-page");
      if (attr === "hard-block") return "hard-block";
      const hasSlider = !!(
        document.querySelector("#captcha-container canvas") ||
        document.querySelector(".geetest_slider") ||
        document.querySelector("[class*=slider]") ||
        document.querySelector(".captcha__human__puzzle")
      );
      if (hasSlider) return "slider";
      if (attr === "interactive-challenge" || attr === "ic") return "slider";
      if (attr) return attr;
      return "unknown";
    }).catch(() => "error");
    if (type !== "error") return type;
  }
  // Check main page for dd object
  const hasDD = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    if (html.length > 20000) return "none";
    const m = /\bdd\s*=\s*\{[^}]*'t'\s*:\s*'([^']+)'/.exec(html);
    return m ? m[1] : "none";
  }).catch(() => "none");
  return hasDD;
}

// Get the DataDome captcha iframe from the page.
export function getCaptchaFrame(page) {
  for (const frame of page.frames()) {
    if (frame.url().includes("captcha-delivery.com")) return frame;
  }
  return null;
}

// Solve a DataDome slider CAPTCHA by analysing the puzzle image in-browser.
// The slider shows a background with a puzzle-piece-shaped gap; we find the
// gap's X offset using edge detection on the canvas, then drag the slider
// knob to that position with human-like mouse movement.
export async function solveDataDomeSlider(page, { timeoutMs = 20000 } = {}) {
  const frame = getCaptchaFrame(page);
  if (!frame) return { solved: false, reason: "no-captcha-frame" };

  const deadline = Date.now() + timeoutMs;

  // Wait for the slider/puzzle to render.
  let sliderReady = false;
  while (Date.now() < deadline) {
    sliderReady = await frame.evaluate(() => {
      // DataDome slider puzzle: look for the puzzle image canvas or img
      const canvas = document.querySelector("canvas");
      const img = document.querySelector(".captcha__human__puzzle img, .geetest_canvas_bg img, [class*=puzzle] img");
      const slider = document.querySelector(
        ".geetest_slider_button, [class*=slider] button, " +
        "[class*=slider] [role=slider], .captcha__human__slider__knob, " +
        "[data-dd-captcha-slider-knob]"
      );
      return !!(canvas || img) && !!slider;
    }).catch(() => false);
    if (sliderReady) break;
    await page.waitForTimeout(1000);
  }

  if (!sliderReady) {
    // Might be a different challenge type — check what's visible
    const detail = await frame.evaluate(() => {
      const attr = document.body?.getAttribute("data-dd-response-page");
      const text = document.body?.innerText?.substring(0, 200);
      return { attr, text };
    }).catch(() => ({}));
    return { solved: false, reason: "slider-not-found", detail };
  }

  // Analyse the puzzle image inside the browser using canvas API.
  // The gap in the background image is typically a darker/different region.
  const gapOffset = await frame.evaluate(() => {
    // Strategy: Render the puzzle background onto a canvas and scan for the
    // gap. The gap is where pixel brightness drops sharply compared to the
    // surrounding area (it's a cutout silhouette).

    const bgImg = document.querySelector(
      "canvas, .captcha__human__puzzle img, .geetest_canvas_bg img, [class*=puzzle] img"
    );
    if (!bgImg) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let w, h;
    if (bgImg.tagName === "CANVAS") {
      w = bgImg.width;
      h = bgImg.height;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(bgImg, 0, 0);
    } else {
      w = bgImg.naturalWidth || bgImg.width;
      h = bgImg.naturalHeight || bgImg.height;
      if (!w || !h) return null;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(bgImg, 0, 0, w, h);
    }

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Scan columns for vertical edge (the left edge of the gap).
    // The gap is typically 40-80px wide and appears between 20% and 80% of width.
    // We look for a column where many pixels have a big luminance difference
    // compared to their left neighbour.
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

    // Find the column with the strongest edge (left edge of gap).
    let maxEdge = 0;
    let maxX = 0;
    for (let x = startX; x < endX; x++) {
      if (edgeStrength[x] > maxEdge) {
        maxEdge = edgeStrength[x];
        maxX = x;
      }
    }

    if (maxEdge === 0) return null;

    // Return the gap's left X position as a fraction of the image width.
    // The slider track maps [0, 1] to the full width.
    return { gapX: maxX, imageWidth: w, imageHeight: h, fraction: maxX / w };
  }).catch(() => null);

  if (!gapOffset) return { solved: false, reason: "gap-detection-failed" };

  // Find the slider knob and track dimensions.
  const sliderInfo = await frame.evaluate(() => {
    const knob = document.querySelector(
      ".geetest_slider_button, [class*=slider] button, " +
      "[class*=slider] [role=slider], .captcha__human__slider__knob, " +
      "[data-dd-captcha-slider-knob]"
    );
    const track = knob?.closest("[class*=slider]") || knob?.parentElement;
    if (!knob || !track) return null;

    const knobRect = knob.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    return {
      knobX: knobRect.x + knobRect.width / 2,
      knobY: knobRect.y + knobRect.height / 2,
      trackLeft: trackRect.x,
      trackWidth: trackRect.width,
      trackRight: trackRect.x + trackRect.width,
    };
  }).catch(() => null);

  if (!sliderInfo) return { solved: false, reason: "slider-element-not-found" };

  // Calculate drag distance. The gap fraction maps to the track width.
  const dragDistance = gapOffset.fraction * sliderInfo.trackWidth;
  const targetX = sliderInfo.knobX + dragDistance;

  // Perform human-like drag: accelerate, maintain, decelerate, with slight
  // Y wobble and randomized timing.
  const steps = 25 + Math.floor(Math.random() * 15);
  const startX = sliderInfo.knobX;
  const startY = sliderInfo.knobY;

  // Move to knob, press down
  await frame.page().mouse.move(startX, startY, { steps: 5 });
  await frame.page().mouse.down();
  await frame.page().waitForTimeout(100 + Math.floor(Math.random() * 100));

  // Drag with easing curve (ease-out: fast start, slow end)
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentX = startX + dragDistance * eased;
    // Slight Y wobble to look human
    const wobbleY = startY + (Math.random() - 0.5) * 3;
    await frame.page().mouse.move(currentX, wobbleY);
    // Variable delay: faster in middle, slower at edges
    const baseDelay = progress < 0.3 ? 8 : progress > 0.8 ? 20 : 12;
    await frame.page().waitForTimeout(baseDelay + Math.floor(Math.random() * 10));
  }

  // Small overshoot then correct (human imprecision)
  const overshoot = 2 + Math.floor(Math.random() * 4);
  await frame.page().mouse.move(targetX + overshoot, startY + (Math.random() - 0.5) * 2);
  await frame.page().waitForTimeout(50 + Math.floor(Math.random() * 80));
  await frame.page().mouse.move(targetX, startY);
  await frame.page().waitForTimeout(80 + Math.floor(Math.random() * 60));

  // Release
  await frame.page().mouse.up();

  // Wait for validation — DataDome sends the answer server-side and
  // either redirects or shows an error.
  await frame.page().waitForTimeout(3000);

  // Check if the challenge was solved (page should have navigated away
  // from the captcha or the iframe should be gone).
  const afterType = await detectDataDome(page);
  const solved = afterType === "none" || afterType === "bv";

  return { solved, reason: solved ? "slider-solved" : "validation-failed", gapOffset, afterType };
}

// Attempt to solve whatever DataDome challenge is present.
// Returns { solved: boolean, type: string, reason: string }
export async function solveDataDome(page, options = {}) {
  const type = await detectDataDome(page);

  switch (type) {
    case "none":
      return { solved: true, type: "none", reason: "no-captcha" };
    case "hard-block":
      return { solved: false, type: "hard-block", reason: "hard-block-no-challenge" };
    case "slider":
    case "interactive-challenge":
    case "ic":
      return { solved: false, type, ...(await solveDataDomeSlider(page, options)) };
    case "bv":
      // Browser verification — the dd JS may solve itself; wait and re-check.
      await page.waitForTimeout(5000);
      const recheck = await detectDataDome(page);
      if (recheck === "none") return { solved: true, type: "bv", reason: "js-challenge-auto-solved" };
      return { solved: false, type: "bv", reason: "js-challenge-persisted" };
    default:
      return { solved: false, type, reason: "unknown-challenge-type" };
  }
}
