// CapSolver API client for solving CAPTCHAs detected by the unlocker.
// Supports DataDome (slider + interstitial), with room to add more types.

const API = 'https://api.capsolver.com';
const POLL_MS = 3000;

export function createSolver({ apiKey, log = console }) {
  if (!apiKey) return null;

  async function api(endpoint, body, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: apiKey, ...body }),
        signal: controller.signal,
      });
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function solve(task, deadlineMs) {
    const remaining = () => deadlineMs - Date.now();
    const create = await api('/createTask', { task }, Math.min(15_000, remaining()));
    if (create.errorId && create.errorId !== 0) {
      throw new Error(create.errorDescription || create.errorCode || 'createTask failed');
    }
    if (create.status === 'ready') return create.solution;
    const taskId = create.taskId;
    while (remaining() > 1000) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const result = await api('/getTaskResult', { taskId }, Math.min(10_000, remaining()));
      if (result.errorId && result.errorId !== 0) {
        throw new Error(result.errorDescription || result.errorCode || 'getTaskResult failed');
      }
      if (result.status === 'ready') return result.solution;
      if (result.status === 'failed') throw new Error('Solver task failed');
    }
    throw new Error('Solver timeout');
  }

  // Detect a DataDome challenge in a blocked response body.
  // Returns { solvable: true, captchaUrl, html } when t=fe (can be solved),
  // { solvable: false, reason: 'ip_banned' } when t=bv (need new IP),
  // or null when the body is not a DataDome challenge at all.
  function detectDatadome(body, { websiteURL = '' } = {}) {
    const html = body.toString('utf8', 0, Math.min(body.length, 200_000));
    const captchaUrl = extractDatadomeCaptchaUrl(html, websiteURL);
    if (!captchaUrl) return null;
    const tParam = new URL(captchaUrl).searchParams.get('t');
    if (tParam === 'bv') return { solvable: false, reason: 'ip_banned' };
    return { solvable: true, captchaUrl, html };
  }

  // Solve a DataDome challenge. proxyString must be host:port:user:pass format.
  async function solveDatadome({ captchaUrl, html, websiteURL, proxyString, userAgent, deadlineMs }) {
    log.info?.(`CapSolver: solving DataDome challenge for ${websiteURL}`);
    try {
      const solution = await solve({
        type: 'DatadomeSliderTask',
        websiteURL,
        captchaUrl,
        proxy: proxyString,
        userAgent,
        html,
      }, deadlineMs);
      if (solution?.cookie) {
        const domain = new URL(websiteURL).hostname.replace(/^www\./, '');
        return { type: 'datadome', cookies: parseCookieString(solution.cookie, domain) };
      }
    } catch (err) {
      log.warn?.(`CapSolver DataDome solve failed: ${err.message}`);
    }
    return null;
  }

  function detectTurnstile(body, { websiteURL = '' } = {}) {
    const html = body.toString('utf8', 0, Math.min(body.length, 200_000));
    const siteKey = extractTurnstileSiteKey(html);
    if (!siteKey) return null;
    return { siteKey, websiteURL };
  }

  async function solveTurnstile({ siteKey, websiteURL, deadlineMs }) {
    log.info?.(`CapSolver: solving Cloudflare Turnstile for ${websiteURL}`);
    try {
      const solution = await solve({
        type: 'AntiTurnstileTaskProxyLess',
        websiteURL,
        websiteKey: siteKey,
      }, deadlineMs);
      if (solution?.token) {
        return { token: solution.token };
      }
    } catch (err) {
      log.warn?.(`CapSolver Turnstile solve failed: ${err.message}`);
    }
    return null;
  }

  return { solve, detectDatadome, solveDatadome, detectTurnstile, solveTurnstile };
}

function extractDatadomeCaptchaUrl(html, websiteURL = '') {
  // Direct iframe URL (e.g. <iframe src="https://geo.captcha-delivery.com/captcha/?...">)
  const direct = html.match(/https?:\/\/(?:geo\.)?captcha-delivery\.com\/captcha\/[^"'\s<>)]+/i);
  if (direct) return direct[0].replace(/&amp;/g, '&');
  // DataDome JS interstitial: var dd={...,'host':'geo.captcha-delivery.com',...}
  const ddMatch = html.match(/var\s+dd\s*=\s*(\{[^}]+\})/);
  if (ddMatch) {
    try {
      const dd = JSON.parse(ddMatch[1].replace(/'/g, '"'));
      if (dd.host?.includes('captcha-delivery.com') && dd.cid) {
        const host = dd.host;
        const referer = websiteURL || dd.referer || '';
        const params = new URLSearchParams({
          initialCid: dd.cid, hash: dd.hsh || '', cid: dd.cid,
          t: dd.t || 'bv', s: String(dd.s || ''), e: dd.e || '',
          referer, ...(dd.qp ? { qp: dd.qp } : {}),
        });
        return `https://${host}/captcha/?${params}`;
      }
    } catch {}
  }
  return null;
}

function extractTurnstileSiteKey(html) {
  const attr = html.match(/data-sitekey=["']([0-9a-zA-Z_-]+)["']/);
  if (attr) return attr[1];
  const render = html.match(/turnstile\.render\s*\([^)]*sitekey['"]\s*:\s*['"]([0-9a-zA-Z_-]+)/);
  if (render) return render[1];
  const implicit = html.match(/cf-turnstile[^>]*data-sitekey=["']([0-9a-zA-Z_-]+)/);
  if (implicit) return implicit[1];
  return null;
}

function parseCookieString(cookieStr, domain) {
  const first = cookieStr.split(';')[0];
  const eq = first.indexOf('=');
  if (eq <= 0) return [];
  return [{ name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim(), domain }];
}
