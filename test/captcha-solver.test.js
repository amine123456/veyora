import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectDataDome, getCaptchaFrame } from "../src/captcha-solver.js";

// Mock page/frame helpers for unit tests — the solver's detectDataDome
// inspects frames and page.evaluate, so we stub those.

function mockPage({ frames = [], evaluateResult = "none" } = {}) {
  return {
    frames: () => frames,
    evaluate: async (fn) => evaluateResult,
    waitForTimeout: async () => {},
  };
}

function mockFrame(url, evaluateResult) {
  return {
    url: () => url,
    evaluate: async () => evaluateResult,
  };
}

describe("detectDataDome", () => {
  it("returns 'none' when no captcha-delivery iframe exists", async () => {
    const page = mockPage({ frames: [mockFrame("https://example.com", null)] });
    assert.equal(await detectDataDome(page), "none");
  });

  it("returns 'hard-block' for a hard-block iframe", async () => {
    const page = mockPage({
      frames: [
        mockFrame("https://example.com", null),
        mockFrame("https://geo.captcha-delivery.com/captcha/?cid=abc", "hard-block"),
      ],
    });
    assert.equal(await detectDataDome(page), "hard-block");
  });

  it("returns 'slider' for an interactive challenge iframe", async () => {
    const page = mockPage({
      frames: [
        mockFrame("https://geo.captcha-delivery.com/captcha/?cid=xyz", "slider"),
      ],
    });
    assert.equal(await detectDataDome(page), "slider");
  });

  it("returns dd type from main page when no iframe matches", async () => {
    const page = mockPage({
      frames: [mockFrame("https://example.com", null)],
      evaluateResult: "bv",
    });
    assert.equal(await detectDataDome(page), "bv");
  });
});

describe("getCaptchaFrame", () => {
  it("returns the captcha-delivery frame", () => {
    const cdFrame = mockFrame("https://geo.captcha-delivery.com/captcha/?cid=abc", null);
    const page = mockPage({ frames: [mockFrame("https://example.com", null), cdFrame] });
    assert.equal(getCaptchaFrame(page), cdFrame);
  });

  it("returns null when no captcha frame exists", () => {
    const page = mockPage({ frames: [mockFrame("https://example.com", null)] });
    assert.equal(getCaptchaFrame(page), null);
  });
});
