// CAPTCHA solver client supporting CapSolver and SolVerify backends.
// Supports DataDome (slider + interstitial) and Cloudflare Turnstile.

const CAPSOLVER_API = 'https://api.capsolver.com';
const SOLVERIFY_API = 'https://solver.solverify.net';
const POLL_MS = 3000;

export function createSolver({ apiKey, solverifyKey, log = console }) {
  const backend = solverifyKey ? 'solverify' : apiKey ? 'capsolver' : null;
  const key = solverifyKey || apiKey;
  const api_base = backend === 'solverify' ? SOLVERIFY_API : CAPSOLVER_API;
  if (!key) return null;

  async function api(endpoint, body, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${api_base}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey: key, ...body }),
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
    log.info?.(`${backend} createTask response: status=${create.status} errorId=${create.errorId} taskId=${create.taskId} ${create.errorDescription || ''}`);
    if (create.errorId && create.errorId !== 0) {
      throw new Error(create.errorDescription || create.errorCode || 'createTask failed');
    }
    if (create.status === 'ready' || create.status === 'completed') return create.solution;
    const taskId = create.taskId;
    while (remaining() > 1000) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const result = await api('/getTaskResult', { taskId }, Math.min(10_000, remaining()));
      if (result.errorId && result.errorId !== 0) {
        throw new Error(result.errorDescription || result.errorCode || 'getTaskResult failed');
      }
      log.info?.(`${backend} poll ${taskId}: status=${result.status} remaining=${Math.round(remaining()/1000)}s`);
      if (result.status === 'ready' || result.status === 'completed') return result.solution;
      if (result.status === 'failed') throw new Error('Solver task failed');
    }
    throw new Error('Solver timeout');
  }

  function detectDatadome(body, { websiteURL = '' } = {}) {
    const html = body.toString('utf8', 0, Math.min(body.length, 200_000));
    const captchaUrl = extractDatadomeCaptchaUrl(html, websiteURL);
    if (!captchaUrl) return null;
    const tParam = new URL(captchaUrl).searchParams.get('t');
    if (tParam === 'bv') return { solvable: false, reason: 'ip_banned' };
    return { solvable: true, captchaUrl, html };
  }

  async function solveDatadome({ captchaUrl, html, websiteURL, proxyString, userAgent, deadlineMs }) {
    log.info?.(`${backend}: solving DataDome challenge for ${websiteURL} via ${proxyString?.split(':').slice(0, 2).join(':')}`);
    try {
      let task;
      if (backend === 'solverify') {
        const parts = proxyString.split(':');
        task = {
          type: 'datadome',
          websiteURL,
          captchaUrl,
          proxyType: 'http',
          proxyAddress: parts[0],
          proxyPort: String(parts[1]),
          ...(parts[2] ? { proxyLogin: parts[2] } : {}),
          ...(parts[3] ? { proxyPassword: parts.slice(3).join(':') } : {}),
          // Don't pass useragent — Solverify's default UA solves DataDome reliably,
          // but a custom Chrome UA causes indefinite processing hangs.
        };
      } else {
        task = {
          type: 'DatadomeSliderTask',
          websiteURL,
          captchaUrl,
          proxy: proxyString,
          userAgent,
          html,
        };
      }
      const solution = await solve(task, deadlineMs);
      // Clearance cookies are credentials for the target site: log their names, never the values.
      log.info?.(`${backend} DataDome solve result: ${solution ? `cookies=${Object.keys(solution.cookies ?? {}).join(',') || 'none'} ip=${solution.ip ?? '?'}` : 'null'}`);
      if (backend === 'solverify') {
        if (solution?.cookies?.datadome) {
          const domain = new URL(websiteURL).hostname.replace(/^www\./, '');
          const cookies = Object.entries(solution.cookies)
            .map(([name, value]) => ({ name, value, domain }));
          return {
            type: 'datadome',
            cookies,
            userAgent: solution.useragent || userAgent,
          };
        }
      } else {
        if (solution?.cookie) {
          const domain = new URL(websiteURL).hostname.replace(/^www\./, '');
          return { type: 'datadome', cookies: parseCookieString(solution.cookie, domain) };
        }
      }
    } catch (err) {
      log.warn?.(`${backend} DataDome solve failed: ${err.message}`);
      const retryable = /navigation_timeout|proxy.*error|proxy.*fail|connection.*refused/i.test(err.message);
      if (retryable) {
        const wrapped = new Error(err.message);
        wrapped.retryable = true;
        throw wrapped;
      }
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
    log.info?.(`${backend}: solving Cloudflare Turnstile for ${websiteURL}`);
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
      log.warn?.(`${backend} Turnstile solve failed: ${err.message}`);
    }
    return null;
  }

  return { solve, detectDatadome, solveDatadome, detectTurnstile, solveTurnstile, backend };
}

function extractDatadomeCaptchaUrl(html, websiteURL = '') {
  const direct = html.match(/https?:\/\/(?:geo\.)?captcha-delivery\.com\/(?:captcha|interstitial)\/[^"'\s<>)]+/i);
  if (direct) return direct[0].replace(/&amp;/g, '&');
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
