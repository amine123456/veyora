(() => {
'use strict';

const traffic = bytes => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

// Balances are integer micro-dollars; sub-dollar amounts keep enough digits to be useful.
const usd = micros => `$${(micros / 1e6).toFixed(micros > 0 && micros < 1e6 ? 4 : 2).replace(/(\.\d\d\d*?)0+$/, '$1')}`;

async function post(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

/* ================= login + signup forms ================= */
// Show / hide password
document.querySelectorAll('[data-toggle-password]').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const input = toggle.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
});

// Stat carousel on the auth panel: rotates every few seconds, pauses on hover/focus, and honours reduced motion.
const slides = [...document.querySelectorAll('[data-slides] .slide')];
const dots = [...document.querySelectorAll('[data-dot]')];
if (slides.length > 1) {
  let current = 0, timer = 0;
  const show = index => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('is-on', i === current));
    dots.forEach((dot, i) => { if (i === current) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
  };
  const stop = () => { clearInterval(timer); timer = 0; };
  const start = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stop(); timer = setInterval(() => show(current + 1), 5000);
  };
  dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); start(); }));
  const stage = document.querySelector('.stage');
  stage.addEventListener('mouseenter', stop); stage.addEventListener('mouseleave', start);
  stage.addEventListener('focusin', stop); stage.addEventListener('focusout', start);
  start();
}

const form = document.querySelector('[data-auth]');
if (form) {
  const mode = form.dataset.auth;
  const error = form.querySelector('.form__error');
  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;
  const show = message => { error.textContent = message; error.hidden = false; };

  let turnstileToken = '';
  let turnstileWidgetId = null;
  if (mode === 'signup') {
    fetch('/api/captcha').then(r => r.json()).then(({ siteKey }) => {
      if (!siteKey) return;
      const container = document.createElement('div');
      container.id = 'turnstile-container';
      container.style.cssText = 'margin:0 0 4px';
      button.parentElement.insertBefore(container, button);
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      window.onTurnstileLoad = () => {
        turnstileWidgetId = window.turnstile.render('#turnstile-container', {
          sitekey: siteKey,
          theme: 'light',
          callback: token => { turnstileToken = token; },
          'expired-callback': () => { turnstileToken = ''; },
          'error-callback': () => { turnstileToken = ''; },
        });
      };
      document.head.appendChild(script);
    }).catch(() => {});
  }

  function showVerificationNotice(maskedEmail, rawEmail, password) {
    const wrap = form.closest('.formwrap');
    wrap.innerHTML = `
      <header class="head">
        <h1 id="auth-title">Check your email</h1>
        <p>We sent a verification link to <strong>${esc(maskedEmail)}</strong>. Click it to activate your account.</p>
      </header>
      <p style="margin:16px 0 0;font-size:14px;color:#666">Didn't get it? Check your spam folder, or click below to resend.</p>
      <button class="btn" type="button" id="resend-btn" style="margin-top:16px">Resend verification email</button>
      <p class="form__error" role="alert" hidden id="resend-error"></p>
      <p class="switch" style="margin-top:16px"><a href="/login">Back to login</a></p>`;
    const resendBtn = document.getElementById('resend-btn');
    const resendErr = document.getElementById('resend-error');
    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      resendBtn.textContent = 'Sending…';
      resendErr.hidden = true;
      try {
        const { ok, data } = await post('/api/resend-verification', { email: rawEmail, password });
        if (ok) { resendBtn.textContent = 'Sent! Check your inbox'; return; }
        resendErr.textContent = data.error || 'Could not resend. Try again.';
        resendErr.hidden = false;
      } catch {
        resendErr.textContent = 'Could not reach the server.';
        resendErr.hidden = false;
      } finally {
        if (resendBtn.textContent === 'Sending…') { resendBtn.textContent = 'Resend verification email'; }
        resendBtn.disabled = false;
      }
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.hidden = true;
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!form.email.checkValidity() || !email) return show('Enter a valid email address.');
    if (mode === 'signup' && password.length < 10) return show('Password must be at least 10 characters.');
    if (!password) return show('Enter your password.');

    const body = { email, password };
    if (mode === 'signup' && turnstileWidgetId !== null) {
      if (!turnstileToken) return show('Complete the verification challenge.');
      body.turnstileToken = turnstileToken;
    }

    button.disabled = true;
    button.textContent = mode === 'signup' ? 'Creating account…' : 'Logging in…';
    try {
      const { ok, data } = await post(`/api/${mode}`, body);
      if (ok && !data.needsVerification) { location.assign('/account'); return; }
      if (data.needsVerification) {
        showVerificationNotice(data.email || email, email, password);
        return;
      }
      show(data.error || 'Something went wrong. Try again.');
      if (mode === 'signup' && window.turnstile && turnstileWidgetId !== null) {
        turnstileToken = '';
        window.turnstile.reset(turnstileWidgetId);
      }
    } catch {
      show('Could not reach the server. Check your connection and try again.');
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}

/* ================= dashboard ================= */
const dash = document.querySelector('[data-dashboard]');
// The dashboard used to be one page with #sections; old links and payment return URLs
// (/account?paid=1, ?feed_sub=1) are sent to the page that now holds that content.
const MOVED = {
  '#funds': '/account/billing', '#payments': '/account/billing', '#connection': '/account/proxies',
  '#targeting': '/account/proxies', '#test': '/account/proxies', '#sandbox': '/account/playground',
  '#unlocker': '/account/api-keys', '#keys': '/account/api-keys', '#data-feeds': '/account/feeds',
  '#usage': '/account/usage',
};
const movedTo = dash && location.pathname === '/account'
  ? (MOVED[location.hash] || (new URLSearchParams(location.search).has('paid') ? '/account/billing'
    : new URLSearchParams(location.search).has('feed_sub') ? '/account/feeds' : null))
  : null;
if (movedTo) location.replace(movedTo + location.search);
if (dash && !movedTo) {
  const $ = selector => dash.querySelector(selector);
  const set = (name, value) => { const el = $(`[data-field="${name}"]`); if (el) el.textContent = value; };
  const hide = (selector, hidden) => { const el = $(selector); if (el) el.hidden = hidden; };
  // On phones the nav is a scrolling row of pills: keep the current page's pill in view.
  if (matchMedia('(max-width: 900px)').matches) {
    const current = dash.querySelector('.snav__a.is-active');
    if (current) current.parentElement.closest('.snav').scrollLeft = current.offsetLeft - 16;
  }
  // Buttons carry an icon plus a .lbl span; only the label text changes so the icon survives.
  const lbl = (button, text) => { (button.querySelector('.lbl') || button).textContent = text; };
  const icon = id => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ic'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', `#i-${id}`);
    svg.append(use);
    return svg;
  };
  const values = {};
  let me = null;

  const proxyUrl = password => {
    const { scheme, host, port } = me.proxy;
    const hostPart = host.includes(':') ? `[${host}]` : host;
    return `${scheme}://${me.username}:${password}@${hostPart}:${port}`;
  };
  const renderCurl = password => {
    values.curl = `curl --proxy "${proxyUrl(password)}" https://api.ipify.org`;
    set('curl', values.curl);
  };

  fetch('/api/me', { credentials: 'same-origin' })
    .then(response => {
      if (response.status === 401) { location.assign('/login'); return null; }
      return response.json();
    })
    .then(data => {
      if (!data) return;
      me = data;
      set('email', me.email);
      set('initial', (me.email || 'V').trim().charAt(0));
      set('wallet', usd(me.balanceMicros ?? 0));
      if (me.prices) {
        const { residentialPerGbMicros: res, mobilePerGbMicros: mob, unlockerPerRequestMicros: unl } = me.prices;
        set('price-res', `${usd(res)}/GB`);
        set('price-mob', `${usd(mob)}/GB`);
        set('price-unl', `${usd(unl * 1000)} per 1,000`);
        hide('[data-chip-mobile]', !me.mobile);
        hide('[data-chip-unlocker]', !me.unlocker);
        set('mobile-price', `${usd(mob)}/GB`);
        set('unlocker-price', `${usd(unl * 1000)} per 1,000 successful requests.`);
      }
      // Prepaid GB bought before the balance existed are still used first.
      hide('[data-prepaid]', me.quotaBytes === 0);
      if (me.quotaBytes > 0 && $('[data-meter]')) {
        set('remaining', traffic(me.remainingBytes));
        const percent = Math.min(100, Math.max(0, (me.usedBytes / me.quotaBytes) * 100));
        $('[data-meter-fill]').style.width = `${percent}%`;
        $('[data-meter]').setAttribute('aria-valuenow', String(Math.round(percent)));
        set('usage', `${traffic(me.usedBytes)} used of ${traffic(me.quotaBytes)}`);
      }
      hide('[data-empty]', (me.balanceMicros ?? 0) > 0 || me.remainingBytes > 0);
      hide('[data-mobile-option]', !me.mobile);
      hide('[data-unlocker-off]', Boolean(me.unlocker));
      if (me.unlocker) {
        hide('[data-unlocker]', false);
        dash.querySelectorAll('[data-unlocker-nav]').forEach(link => { link.hidden = false; });
        values['unlock-curl'] = `curl -X POST ${location.origin}/v1/unlock \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://example.com/"}'`;
        set('unlock-curl', values['unlock-curl']);
        if (keyList || $('[data-field="ov-keys"]')) loadKeys();
        loadSandbox();
      }

      values.username = me.username;
      set('username', me.username);
      dash.querySelectorAll('[data-example]').forEach(el => { el.textContent = me.username + el.dataset.example; });
      const minutes = Math.round(me.stickySessionSeconds / 60);
      set('sticky', minutes === 1 ? '1 minute' : `${minutes} minutes`);
      if (me.proxy) {
        const { host, port } = me.proxy;
        values.endpoint = `${host.includes(':') ? `[${host}]` : host}:${port}`;
        set('endpoint', `${me.proxy.scheme}://${values.endpoint}`);
        set('ov-proxy', `Gateway ${values.endpoint} · user ${me.username}`);
        renderCurl('YOUR_PASSWORD');
      } else {
        set('endpoint', 'Not configured');
        set('curl', 'Proxy endpoint not configured yet.');
      }
    })
    .catch(() => set('remaining', 'Could not load'));

  // Add funds: USD top-ups paid with card (Stripe) or USDT (NOWPayments).
  const packs = $('[data-packs]');
  if (packs) {
  const buyError = $('[data-buy-error]');
  const payMethodTabs = document.querySelectorAll('[data-pay-method]');
  let activePayMethod = 'stripe';
  let payMethods = { crypto: false, stripe: false };
  if (new URLSearchParams(location.search).has('paid')) hide('[data-paid]', false);

  payMethodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      activePayMethod = tab.dataset.payMethod;
      payMethodTabs.forEach(t => t.classList.toggle('pay-tab--active', t.dataset.payMethod === activePayMethod));
    });
  });

  fetch('/packages')
    .then(response => response.json())
    .then(result => {
      const list = result.topups || result;
      payMethods = result.methods || { crypto: true, stripe: false };
      payMethodTabs.forEach(tab => {
        if (!payMethods[tab.dataset.payMethod]) tab.hidden = true;
      });
      if (!payMethods.stripe && payMethods.crypto) {
        activePayMethod = 'crypto';
        payMethodTabs.forEach(t => t.classList.toggle('pay-tab--active', t.dataset.payMethod === 'crypto'));
      }
      if (payMethods.stripe && !payMethods.crypto) {
        document.querySelector('[data-pay-methods]').hidden = true;
      }
      packs.replaceChildren();
      packs.removeAttribute('aria-busy');
      list.forEach(topup => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = topup.bonusPercent ? 'pack pack--bonus' : 'pack';
        button.dataset.pack = topup.id;
        button.innerHTML = '<i class="pack__ic"><svg class="ic" aria-hidden="true"><use href="#i-coins"/></svg></i><b></b><span></span>';
        button.querySelector('b').textContent = `$${(topup.cents / 100).toFixed(0)}`;
        button.querySelector('span').textContent = topup.bonusPercent
          ? `+${topup.bonusPercent}% bonus`
          : 'Top up';
        packs.append(button);
      });
    })
    .catch(() => { packs.replaceChildren(); packs.removeAttribute('aria-busy'); buyError.textContent = 'Could not load the top-ups. Refresh the page.'; buyError.hidden = false; });

  packs.addEventListener('click', async event => {
    const button = event.target.closest('[data-pack]');
    if (!button) return;
    buyError.hidden = true;
    packs.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const label = button.querySelector('span').textContent;
    button.querySelector('span').textContent = 'Opening…';
    const endpoint = activePayMethod === 'stripe' ? '/api/checkout/stripe' : '/api/checkout';
    try {
      const { ok, data } = await post(endpoint, { topupId: button.dataset.pack });
      if (ok && data.checkoutUrl) { location.assign(data.checkoutUrl); return; }
      throw new Error(data.error || 'Could not start the payment. Try again.');
    } catch (error) {
      buyError.textContent = error.message;
      buyError.hidden = false;
    } finally {
      button.querySelector('span').textContent = label;
      packs.querySelectorAll('button').forEach(b => { b.disabled = false; });
    }
  });
  }

  // API keys for the Web Unlocker: list, create (shown once), revoke (click twice).
  const keyList = $('[data-keys]');
  const keyError = $('[data-key-error]');
  const showKeyError = message => { if (keyError) { keyError.textContent = message; keyError.hidden = false; } };
  function renderKeys(keys) {
    set('ov-keys', keys.length === 1 ? '1 API key' : `${keys.length} API keys`);
    if (!keyList) return;
    keyList.replaceChildren();
    $('[data-no-keys]').hidden = keys.length > 0;
    keyList.hidden = keys.length === 0;
    keys.forEach(key => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      dt.append(icon('key'), key.name || 'Unnamed key');
      if (key.mode === 'test') {
        const badge = document.createElement('span');
        badge.className = 'badge badge--warn';
        badge.textContent = 'Sandbox';
        dt.append(badge);
      }
      const dd = document.createElement('dd');
      const code = document.createElement('code');
      code.textContent = `${key.prefix}…`;
      const revoke = document.createElement('button');
      revoke.type = 'button';
      revoke.className = 'btn btn--danger btn--sm';
      revoke.dataset.revoke = key.id;
      revoke.textContent = 'Revoke';
      dd.append(code, ' ', revoke);
      row.append(dt, dd);
      keyList.append(row);
    });
  }
  function loadKeys() {
    fetch('/api/keys', { credentials: 'same-origin' })
      .then(response => response.json())
      .then(data => renderKeys(data.keys ?? []))
      .catch(() => showKeyError('Could not load your API keys. Refresh the page.'));
  }
  if (keyList) {
  $('[data-key-form]').addEventListener('submit', async event => {
    event.preventDefault();
    keyError.hidden = true;
    const submit = event.target.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const { ok, data } = await post('/api/keys', { name: event.target.name.value.trim(), mode: event.target.mode?.value === 'test' ? 'test' : 'live' });
      if (!ok) throw new Error(data.error || 'Could not create a key. Try again.');
      values['new-key'] = data.key;
      set('new-key', data.key);
      $('[data-new-key]').hidden = false;
      $('[data-key-notice]').hidden = false;
      event.target.reset();
      loadKeys();
    } catch (error) {
      showKeyError(error.message);
    } finally {
      submit.disabled = false;
    }
  });
  keyList.addEventListener('click', async event => {
    const button = event.target.closest('[data-revoke]');
    if (!button) return;
    if (button.dataset.armed !== 'yes') {
      button.dataset.armed = 'yes';
      button.textContent = 'Click again to revoke';
      setTimeout(() => { button.dataset.armed = ''; button.textContent = 'Revoke'; }, 5000);
      return;
    }
    button.disabled = true;
    const { ok, data } = await post('/api/keys/revoke', { id: button.dataset.revoke }).catch(() => ({ ok: false, data: {} }));
    if (!ok) showKeyError(data.error || 'Could not revoke the key. Try again.');
    loadKeys();
  });
  }


  /* ================= sandbox playground ================= */
  // Free test requests: simulated scenarios (never leave the server) and real pages on
  // the daily allowance. Fetched pages are only ever shown as text, never rendered.
  const sbx = $('[data-sandbox]');
  let sandbox = null;
  let sbxKey = 'YOUR_SANDBOX_KEY';
  let sbxLang = 'curl';
  let sbxView = 'page';
  let sbxLast = null;
  const sbxForm = sbx?.querySelector('[data-sbx-form]');
  const sbxError = sbx?.querySelector('[data-sbx-error]');
  const sbxInput = () => {
    const body = { url: sbxForm.url.value.trim() || `https://${sandbox?.host || 'sandbox.veyora.pro'}/ok` };
    const country = sbxForm.country.value.trim().toLowerCase();
    const session = sbxForm.session.value.trim();
    if (country) body.country = country;
    if (session) body.session = session;
    return body;
  };
  const sbxQuota = (used, limit) => {
    const left = Math.max(0, limit - used);
    set('sbx-quota', limit > 0
      ? `${left} of ${limit} free live test requests left today. Simulated scenarios are unlimited. Failed requests don't count.`
      : 'Live test requests are not available right now. Simulated scenarios are free and unlimited.');
  };
  function renderSnippet() {
    if (!sbx) return;
    const body = sbxInput();
    const json = JSON.stringify(body);
    const endpoint = `${location.origin}/v1/unlock`;
    const pretty = JSON.stringify(body, null, 2);
    const snippets = {
      curl: `curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer ${sbxKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '${json.replace(/'/g, "'\\''")}'`,
      python: `import requests\n\nresponse = requests.post(\n    "${endpoint}",\n    headers={"Authorization": "Bearer ${sbxKey}"},\n    json=${pretty.replace(/\n/g, '\n    ')},\n    timeout=600,\n)\ndata = response.json()\nif data.get("success"):\n    print(data["status"], len(data["body"]), "characters")\nelse:\n    print("Failed:", response.status_code, data.get("error"))`,
      node: `const response = await fetch("${endpoint}", {\n  method: "POST",\n  headers: {\n    Authorization: "Bearer ${sbxKey}",\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(${pretty.replace(/\n/g, '\n  ')}),\n});\nconst data = await response.json();\nif (data.success) console.log(data.status, data.body.length, "characters");\nelse console.error("Failed:", response.status, data.error);`,
    };
    values['sbx-snippet'] = snippets[sbxLang];
    set('sbx-snippet', snippets[sbxLang]);
  }
  const tabs = (group, attribute, selected) => group.querySelectorAll('[role="tab"]').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset[attribute] === selected)));
  // What a person wants to know about a page, read from an inert parse (no scripts, no loads).
  function pageSummary(data) {
    if (data.encoding === 'base64') return `Binary response (${data.headers?.['content-type'] || 'unknown type'}), ${traffic(Math.floor(data.body.length * 3 / 4))}.\nThe body is base64-encoded: decode it to get the file.`;
    const type = String(data.headers?.['content-type'] || '');
    if (!/html/i.test(type)) return data.body.slice(0, 4000) + (data.body.length > 4000 ? '\n…' : '');
    // Style blocks are dropped first: the parsed copy inherits this page's policy and would log a violation for each.
    const doc = new DOMParser().parseFromString(data.body.replace(/<style[\s\S]*?<\/style>/gi, ''), 'text/html');
    const text = selector => doc.querySelector(selector)?.textContent.trim().replace(/\s+/g, ' ') || '—';
    doc.querySelectorAll('script, style, noscript, template').forEach(node => node.remove());
    const visible = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
    return [
      `Title:        ${text('title')}`,
      `Description:  ${doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '—'}`,
      `First H1:     ${text('h1')}`,
      `Links:        ${doc.querySelectorAll('a[href]').length}`,
      `Images:       ${doc.querySelectorAll('img').length}`,
      `Size:         ${traffic(new Blob([data.body]).size)}`,
      '',
      'Visible text:',
      visible.slice(0, 1500) + (visible.length > 1500 ? ' …' : '') || '(none)',
    ].join('\n');
  }
  function renderOutput() {
    if (!sbxLast) return;
    const { data } = sbxLast;
    const hasPage = typeof data.body === 'string';
    const { body, ...rest } = data;
    const output = {
      page: () => (hasPage ? pageSummary(data) : (data.error || 'No page was returned.')),
      body: () => (hasPage ? body.slice(0, 200000) + (body.length > 200000 ? '\n… (truncated here; the API returns the full body)' : '') : 'No body: the request did not return a page.'),
      headers: () => (data.headers ? Object.entries(data.headers).map(([name, value]) => `${name}: ${value}`).join('\n') : 'No headers: the request did not return a page.'),
      json: () => JSON.stringify(hasPage ? { ...rest, body: `<${body.length} characters, see the Body tab>` } : data, null, 2),
    }[sbxView]();
    values['sbx-output'] = sbxView === 'body' && hasPage ? body : output;
    set('sbx-output', output);
    set('sbx-output-title', { page: 'Page summary', body: 'body', headers: 'headers', json: `HTTP ${sbxLast.status}` }[sbxView]);
  }
  function renderResult() {
    const { data, status, ms } = sbxLast;
    const stats = sbx.querySelector('[data-sbx-stats]');
    stats.replaceChildren();
    const stat = (label, value, tone) => {
      const item = document.createElement('div');
      item.className = `sbx-stat${tone ? ` sbx-stat--${tone}` : ''}`;
      const small = document.createElement('small'); small.textContent = label;
      const strong = document.createElement('b'); strong.textContent = value;
      item.append(small, strong);
      stats.append(item);
    };
    stat('Result', data.success ? 'Success' : 'Failed', data.success ? 'ok' : 'err');
    stat('API status', `HTTP ${status}`);
    if (data.status) stat('Site status', String(data.status));
    stat('Time', ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
    if (data.sandbox) {
      stat('Charged', usd(0), 'ok');
      stat('A live key would pay', usd(data.sandbox.wouldBillMicros ?? 0));
      stat('Mode', data.sandbox.mode === 'simulated' ? 'Simulated' : 'Live fetch');
    }
    const list = sbx.querySelector('[data-sbx-attempts]');
    list.replaceChildren();
    (data.attempts ?? []).forEach(attempt => {
      const item = document.createElement('li');
      const good = attempt.result === 'ok' || attempt.result === 'small' || attempt.result === 'final';
      item.className = `sbx-attempt sbx-attempt--${good ? 'ok' : 'err'}`;
      const how = attempt.solver ? 'CAPTCHA solver' : attempt.flaresolverr ? 'challenge solver' : attempt.camoufox ? 'stealth browser' : attempt.browser ? 'browser' : 'HTTP';
      const name = document.createElement('b');
      name.textContent = `${attempt.pool === 'mobile' ? 'Mobile' : 'Residential'} · ${how}`;
      const outcome = document.createElement('span');
      outcome.textContent = `${attempt.result}${attempt.status ? ` (${attempt.status})` : ''}${attempt.error ? ` (${attempt.error})` : ''}`;
      item.append(name, outcome);
      list.append(item);
    });
    list.hidden = !data.attempts?.length;
    sbx.querySelector('[data-sbx-result]').hidden = false;
    renderOutput();
  }
  function loadSandbox() {
    if (!sbx) return;
    fetch('/api/sandbox', { credentials: 'same-origin' })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!data?.enabled) return;
        sandbox = data;
        sbx.hidden = false;
        sbxQuota(data.liveUsed, data.liveDailyLimit);
        const chips = sbx.querySelector('[data-sbx-scenarios]');
        chips.replaceChildren();
        data.scenarios.forEach(scenario => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'sbx-chip';
          chip.dataset.url = scenario.url;
          chip.dataset.summary = scenario.summary;
          chip.textContent = scenario.title;
          chip.title = scenario.summary;
          chips.append(chip);
        });
        sbxForm.url.value = data.scenarios[0]?.url ?? '';
        renderSnippet();
      })
      .catch(() => {});
  }
  if (sbx) {
    const run = sbx.querySelector('[data-sbx-run]');
    const hint = sbx.querySelector('[data-sbx-hint]');
    sbxForm.addEventListener('input', () => { hint.hidden = true; renderSnippet(); });
    sbx.querySelector('[data-sbx-scenarios]').addEventListener('click', event => {
      const chip = event.target.closest('[data-url]');
      if (!chip) return;
      sbxForm.url.value = chip.dataset.url;
      hint.textContent = chip.dataset.summary;
      hint.hidden = false;
      renderSnippet();
      sbxForm.requestSubmit();
    });
    sbx.querySelector('[data-sbx-langs]').addEventListener('click', event => {
      const tab = event.target.closest('[data-lang]');
      if (!tab) return;
      sbxLang = tab.dataset.lang;
      tabs(sbx.querySelector('[data-sbx-langs]'), 'lang', sbxLang);
      renderSnippet();
    });
    sbx.querySelector('[data-sbx-views]').addEventListener('click', event => {
      const tab = event.target.closest('[data-view]');
      if (!tab) return;
      sbxView = tab.dataset.view;
      tabs(sbx.querySelector('[data-sbx-views]'), 'view', sbxView);
      renderOutput();
    });
    sbxForm.addEventListener('submit', async event => {
      event.preventDefault();
      sbxError.hidden = true;
      const body = sbxInput();
      let target;
      try { target = new URL(body.url); } catch { target = null; }
      if (!target || !/^https?:$/.test(target.protocol)) {
        sbxError.textContent = 'Enter a full page URL starting with https://';
        sbxError.hidden = false;
        return;
      }
      const simulated = target.hostname === sandbox?.host;
      run.disabled = true;
      const started = Date.now();
      const tick = () => lbl(run, simulated ? 'Running…' : `Fetching… ${Math.round((Date.now() - started) / 1000)} s`);
      tick();
      const timer = setInterval(tick, 1000);
      try {
        const response = await fetch('/api/sandbox/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          credentials: 'same-origin',
        });
        const data = await response.json().catch(() => null);
        if (response.status === 401) { location.assign('/login'); return; }
        if (!data) throw new Error(response.status === 504 ? 'The request took too long for the dashboard. Hard sites can take a few minutes: run it from your code with a sandbox key instead.' : 'The server returned an unexpected answer. Try again.');
        sbxLast = { data, status: response.status, ms: Date.now() - started };
        renderResult();
        // Suggest data feeds when the unlocker is blocked
        const oldBanner = sbx.querySelector('.feeds-suggestion');
        if (oldBanner) oldBanner.remove();
        if (!data.success && data.suggestion?.type === 'data_feed') {
          const banner = document.createElement('div');
          banner.className = 'notice notice--warn feeds-suggestion';
          banner.style.marginTop = '12px';
          banner.innerHTML = '<b>This site uses advanced bot protection.</b> We crawl it daily with custom infrastructure. '
            + '<a href="/data-feeds" style="font-weight:600">Get structured data delivered instead &rarr;</a>';
          sbx.querySelector('[data-sbx-result]').after(banner);
        }
        if (data.sandbox?.mode === 'live') sbxQuota(data.sandbox.liveDailyLimit - data.sandbox.liveRemaining, data.sandbox.liveDailyLimit);
      } catch (error) {
        sbxError.textContent = error.message || 'Could not reach the server. Check your connection and try again.';
        sbxError.hidden = false;
      } finally {
        clearInterval(timer);
        run.disabled = false;
        lbl(run, 'Run request');
      }
    });
    const keyButton = sbx.querySelector('[data-sbx-key]');
    const keyProblem = sbx.querySelector('[data-sbx-key-error]');
    keyButton.addEventListener('click', async () => {
      keyProblem.hidden = true;
      keyButton.disabled = true;
      try {
        const { ok, data } = await post('/api/keys', { name: 'Sandbox', mode: 'test' });
        if (!ok) throw new Error(data.error || 'Could not create a sandbox key. Try again.');
        sbxKey = data.key;
        renderSnippet();
        sbx.querySelector('[data-sbx-key-notice]').hidden = false;
        loadKeys();
      } catch (error) {
        keyProblem.textContent = error.message;
        keyProblem.hidden = false;
      } finally {
        keyButton.disabled = false;
      }
    });
  }

  // Copy buttons
  dash.addEventListener('click', async event => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    const text = values[button.dataset.copy];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      lbl(button, 'Copied');
      button.classList.add('is-done');
    } catch {
      lbl(button, 'Select and copy');
    }
    setTimeout(() => { lbl(button, 'Copy'); button.classList.remove('is-done'); }, 1600);
  });

  // Regenerate: first click asks to confirm, second click replaces the password.
  const regenerate = $('[data-regenerate]');
  const errorBox = $('[data-password-error]');
  let armed = false, disarmTimer;
  regenerate?.addEventListener('click', async () => {
    errorBox.hidden = true;
    if (!armed) {
      armed = true;
      lbl(regenerate, 'Click again to replace your password');
      disarmTimer = setTimeout(() => { armed = false; lbl(regenerate, 'Generate new password'); }, 5000);
      return;
    }
    clearTimeout(disarmTimer);
    armed = false;
    regenerate.disabled = true;
    lbl(regenerate, 'Generating…');
    try {
      const { ok, data } = await post('/api/proxy-password', {});
      if (!ok) throw new Error(data.error || 'Could not generate a password. Try again.');
      values.password = data.password;
      set('password', data.password);
      $('[data-field="password"]').hidden = false;
      $('[data-copy="password"]').hidden = false;
      $('[data-password-hidden]').hidden = true;
      $('[data-password-notice]').hidden = false;
      if (me?.proxy) renderCurl(data.password);
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    } finally {
      regenerate.disabled = false;
      lbl(regenerate, 'Generate new password');
    }
  });
  // Usage chart + recent requests + payment history
  function loadUsage() {
    if ($('[data-usage-chart]')) fetch('/api/usage/summary?days=30', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(({ summary: days }) => {
        const wrap = $('[data-usage-chart]');
        if (!days || !days.length) { wrap.innerHTML = '<p class="usage-chart-empty">No usage data yet. Start sending requests to see your stats here.</p>'; return; }
        const maxReq = Math.max(...days.map(d => d.requests), 1);
        const chart = document.createElement('div');
        chart.className = 'usage-chart';
        chart.setAttribute('role', 'img');
        chart.setAttribute('aria-label', `Usage chart: ${days.length} days`);
        days.forEach(d => {
          const bar = document.createElement('div');
          bar.className = 'usage-bar';
          const h = Math.max(4, Math.round((d.requests / maxReq) * 100));
          const col = document.createElement('div');
          col.className = 'usage-bar__col';
          col.style.height = `${h}px`;
          if (d.billedRequests === 0) { col.style.background = 'var(--line-strong)'; }
          const tip = document.createElement('span');
          tip.className = 'usage-bar__tip';
          tip.textContent = `${d.day}: ${d.requests} req · ${usd(d.costMicros)} · ${traffic(d.bytes)}`;
          col.append(tip);
          const label = document.createElement('span');
          label.className = 'usage-bar__label';
          label.textContent = d.day.slice(8);
          bar.append(col, label);
          chart.append(bar);
        });
        const legend = document.createElement('div');
        legend.className = 'usage-legend';
        legend.innerHTML = '<span class="lg-req"><i></i>Billed</span><span class="lg-cost"><i></i>Not billed</span>';
        wrap.replaceChildren(chart, legend);
      })
      .catch(() => {
        $('[data-usage-chart]').innerHTML = '<p class="muted" style="font-size:14px">Could not load usage data.</p>';
      });

    let usagePage = 1;
    const usageLimit = 20;
    function loadEvents(page) {
      usagePage = page;
      const offset = (page - 1) * usageLimit;
      fetch(`/api/usage/events?limit=${usageLimit}&page=${page}`, { credentials: 'same-origin' })
        .then(r => r.json())
        .then(({ events }) => {
          events = events || [];
          const wrap = $('[data-usage-events]');
          if (!events.length && page === 1) {
            wrap.innerHTML = '<p class="empty-state"><svg class="ic" aria-hidden="true"><use href="#i-chart"/></svg>No requests recorded yet.</p>';
            $('[data-usage-pager]').hidden = true;
            return;
          }
          const table = document.createElement('table');
          table.className = 'usage-table';
          table.innerHTML = '<thead><tr><th>Time</th><th>Type</th><th>Domain</th><th>Status</th><th>Outcome</th><th class="right">Data</th><th class="right">Cost</th><th>Billed</th></tr></thead>';
          const tbody = document.createElement('tbody');
          events.forEach(e => {
            const tr = document.createElement('tr');
            const time = new Date(e.createdAt);
            const timeStr = time.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const statusBadge = e.status
              ? (e.status >= 200 && e.status < 300 ? `<span class="badge badge--ok">${e.status}</span>`
                : e.status >= 400 ? `<span class="badge badge--err">${e.status}</span>`
                : `<span class="badge badge--warn">${e.status}</span>`)
              : '<span class="badge badge--muted">—</span>';
            const domain = e.domain ? esc(e.domain.length > 28 ? e.domain.slice(0, 26) + '…' : e.domain) : '—';
            const domainTitle = esc(e.domain || '');
            tr.innerHTML = `<td class="mono">${timeStr}</td><td><span class="badge badge--muted">${esc(e.kind)}</span></td><td title="${domainTitle}">${domain}</td><td>${statusBadge}</td><td>${esc(e.outcome || '—')}</td><td class="right mono">${traffic(e.bytes)}</td><td class="right mono">${e.billed ? usd(e.costMicros) : '—'}</td><td>${e.billed ? '<span class="badge badge--ok">Yes</span>' : '<span class="badge badge--muted">No</span>'}</td>`;
            tbody.append(tr);
          });
          table.append(tbody);
          wrap.replaceChildren(table);
          const pager = $('[data-usage-pager]');
          pager.hidden = false;
          $('[data-usage-prev]').disabled = page <= 1;
          $('[data-usage-next]').disabled = events.length < usageLimit;
          $('[data-usage-page-info]').textContent = `Page ${page}`;
        })
        .catch(() => {
          $('[data-usage-events]').innerHTML = '<p class="muted" style="font-size:14px">Could not load requests.</p>';
        });
    }
    if ($('[data-usage-events]')) loadEvents(1);
    $('[data-usage-prev]')?.addEventListener('click', () => { if (usagePage > 1) loadEvents(usagePage - 1); });
    $('[data-usage-next]')?.addEventListener('click', () => loadEvents(usagePage + 1));

    if ($('[data-payment-list]')) fetch('/api/payments?limit=20', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(({ payments }) => {
        payments = payments || [];
        const wrap = $('[data-payment-list]');
        if (!payments.length) {
          wrap.innerHTML = '';
          $('[data-no-payments]').hidden = false;
          return;
        }
        const table = document.createElement('table');
        table.className = 'usage-table';
        table.innerHTML = '<thead><tr><th>Date</th><th>Package</th><th class="right">Amount</th></tr></thead>';
        const tbody = document.createElement('tbody');
        payments.forEach(p => {
          const tr = document.createElement('tr');
          const date = new Date(p.processedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          tr.innerHTML = `<td class="mono">${date}</td><td>${esc(p.packageId || p.eventId || '—')}</td><td class="right mono">${usd(p.micros)}</td>`;
          tbody.append(tr);
        });
        table.append(tbody);
        wrap.replaceChildren(table);
      })
      .catch(() => {
        $('[data-payment-list]').innerHTML = '<p class="muted" style="font-size:14px">Could not load payment history.</p>';
      });
  }
  loadUsage();
}

const logout = document.querySelector('[data-logout]');
if (logout) {
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    await post('/api/logout', {}).catch(() => {});
    location.assign('/login');
  });
}

// --- Data Feeds dashboard section ---
const feedsSubs = document.querySelector('[data-feeds-subs]');
const noFeeds = document.querySelector('[data-no-feeds]');
const deliveryPanel = document.querySelector('[data-delivery-panel]');
const deliveryForm = document.querySelector('[data-delivery-form]');
const deliveryOk = document.querySelector('[data-delivery-ok]');
const deliveryError = document.querySelector('[data-delivery-error]');
const deliveryFeedName = document.querySelector('[data-delivery-feed-name]');


function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

if (new URLSearchParams(location.search).has('feed_sub')) {
  var banner = document.querySelector('[data-feed-sub-ok]');
  if (banner) banner.hidden = false;
}

function formatEur(cents) { return '€' + (cents / 100).toFixed(0); }

function deliveryLink(subId, label, cls) {
  return '<a class="' + cls + '" href="/account/feeds/delivery?sub=' + encodeURIComponent(subId) + '" data-configure-delivery="">' + label + '</a>';
}

var METHOD_LABELS = { sftp: 'SFTP', s3: 'Amazon S3', gcs: 'Google Cloud Storage', snowflake: 'Snowflake', webhook: 'Webhook', api: 'API pull' };

function deliveryConfigured(dc) { return Boolean(dc && dc.method); }

function deliveryTarget(dc) {
  if (dc.method === 'manual') return dc.notes || 'Delivered outside Veyora';
  if (dc.method === 'sftp') return 'SFTP: ' + (dc.sftp_host || '');
  if (dc.method === 's3') return 'S3: ' + (dc.bucket || '');
  if (dc.method === 'gcs') return 'GCS: ' + (dc.bucket || '');
  if (dc.method === 'snowflake') return 'Snowflake: ' + (dc.snowflake_table || '');
  return METHOD_LABELS[dc.method] || dc.method;
}

function renderSubscriptions(subs) {
  if (!feedsSubs) return;
  if (!subs.length) {
    feedsSubs.innerHTML = '';
    if (noFeeds) noFeeds.hidden = false;
    if (deliveryPanel) deliveryPanel.hidden = true;
    return;
  }
  if (noFeeds) noFeeds.hidden = true;
  var html = '<div class="usage-table-wrap"><table class="usage-table" style="width:100%"><thead><tr>'
    + '<th>Feed</th><th>Status</th><th>Price</th><th>Frequency</th><th>Delivery</th><th>Paid until</th><th>Last delivery</th><th></th>'
    + '</tr></thead><tbody>';
  subs.forEach(function (s) {
    var ld = s.last_delivery;
    var statusClass = s.status === 'active' ? 'feed-chip--active' : s.status === 'paused' ? '' : 'feed-chip--coming';
    var paidUntil = s.current_period_end ? formatDate(s.current_period_end) : (s.stripe_subscription_id ? 'Active' : '—');
    var dc = s.delivery_config;
    var deliveryHtml;
    if (deliveryConfigured(dc)) {
      var tested = dc.last_test_ok === false ? ' feed-chip--coming' : ' feed-chip--active';
      deliveryHtml = '<span class="feed-chip' + tested + '" style="font-size:11px" title="' + esc(dc.last_test_ok === false ? 'Last connection test failed: ' + (dc.last_test_error || '') : '') + '">'
        + esc(deliveryTarget(dc)) + (dc.method === 'manual' ? ' · external' : ' · ' + esc((dc.format || 'jsonl').toUpperCase())) + '</span>';
    } else if (s.status === 'active') {
      deliveryHtml = deliveryLink(s.id, 'Setup needed', 'btn btn--sm btn--warn');
    } else {
      deliveryHtml = '<span class="muted" style="font-size:12px">—</span>';
    }
    var actions = '';
    if (s.status === 'pending' && !s.stripe_subscription_id) {
      actions += '<button class="btn btn--sm" data-feed-checkout="' + s.id + '">Complete payment</button> ';
    }
    if (s.status === 'active') {
      actions += deliveryLink(s.id, deliveryConfigured(dc) ? 'Edit delivery' : 'Configure delivery', 'btn btn--ghost btn--sm') + ' ';
      actions += '<button class="btn btn--ghost btn--sm" data-feed-pause="' + s.id + '">Pause</button> ';
    }
    if (s.status === 'paused') {
      actions += '<button class="btn btn--sm" data-feed-resume="' + s.id + '">Resume</button> ';
    }
    if (s.status !== 'cancelled') {
      actions += '<button class="btn btn--ghost btn--sm" style="color:var(--red,#e53935)" data-feed-cancel="' + s.id + '">Cancel</button>';
    }
    html += '<tr>'
      + '<td><b>' + esc(s.site_name) + '</b><br><small style="color:var(--muted)">' + esc(s.site_domain) + '</small></td>'
      + '<td><span class="feed-chip ' + statusClass + '">' + esc(s.status) + '</span></td>'
      + '<td>' + formatEur(s.price_cents) + '/mo</td>'
      + '<td>' + esc(s.frequency) + '</td>'
      + '<td>' + deliveryHtml + '</td>'
      + '<td>' + paidUntil + '</td>'
      + '<td>' + (ld ? formatDate(ld.completed_at) + ' (' + (ld.delivered_count || '—') + ' rows)' : '—') + '</td>'
      + '<td>' + actions + '</td>'
      + '</tr>';
  });
  html += '</tbody></table></div>';
  feedsSubs.innerHTML = html;

  feedsSubs.querySelectorAll('[data-feed-checkout]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      btn.textContent = 'Redirecting...';
      try {
        var r = await fetch('/api/subscriptions/' + btn.dataset.feedCheckout + '/checkout', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
        var data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Checkout failed');
        if (data.checkoutUrl) location.assign(data.checkoutUrl);
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Complete payment';
        alert(e.message);
      }
    });
  });

  feedsSubs.querySelectorAll('[data-feed-pause]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!confirm('Pause this subscription? Data deliveries will stop.')) return;
      btn.disabled = true;
      try {
        var r = await fetch('/api/subscriptions/' + btn.dataset.feedPause, {
          method: 'PATCH', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paused' }),
        });
        if (!r.ok) { var d = await r.json(); throw new Error(d.error || 'Failed'); }
        loadSubscriptions();
      } catch (e) { btn.disabled = false; alert(e.message); }
    });
  });

  feedsSubs.querySelectorAll('[data-feed-resume]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        var r = await fetch('/api/subscriptions/' + btn.dataset.feedResume, {
          method: 'PATCH', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }),
        });
        if (!r.ok) { var d = await r.json(); throw new Error(d.error || 'Failed'); }
        loadSubscriptions();
      } catch (e) { btn.disabled = false; alert(e.message); }
    });
  });

  feedsSubs.querySelectorAll('[data-feed-cancel]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!confirm('Cancel this subscription? This cannot be undone.')) return;
      btn.disabled = true;
      try {
        var r = await fetch('/api/subscriptions/' + btn.dataset.feedCancel, {
          method: 'DELETE', credentials: 'same-origin',
        });
        if (!r.ok) { var d = await r.json(); throw new Error(d.error || 'Failed'); }
        loadSubscriptions();
      } catch (e) { btn.disabled = false; alert(e.message); }
    });
  });
}

function esc(s) {
  var d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function loadSubscriptions() {
  if (!feedsSubs) return;
  fetch('/api/subscriptions', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) { if (data) renderSubscriptions(data.subscriptions || []); })
    .catch(function () {});
}

// Delivery setup page: /account/feeds/delivery?sub=<id> edits one subscription's delivery.
if (deliveryForm) {
  var subParam = new URLSearchParams(location.search).get('sub') || '';
  var missing = document.querySelector('[data-delivery-missing]');
  var testBtn = deliveryForm.querySelector('[data-delivery-test]');
  var saveBtn = deliveryForm.querySelector('[data-delivery-save]');
  var testOk = document.querySelector('[data-test-ok]');
  var savedConfig = null;
  var btnLabel = function (btn, text) { (btn.querySelector('.lbl') || btn).textContent = text; };
  var showMissing = function () { if (missing) missing.hidden = false; if (deliveryPanel) deliveryPanel.hidden = true; };
  var showError = function (message) { deliveryError.textContent = message; deliveryError.hidden = false; };
  var clearNotices = function () { deliveryOk.hidden = true; deliveryError.hidden = true; testOk.hidden = true; };
  var currentMethod = function () { var c = deliveryForm.querySelector('input[name="method"]:checked'); return c ? c.value : 'sftp'; };
  var groupFor = function (method) { return deliveryForm.querySelector('[data-method-fields="' + method + '"]'); };

  var setMethod = function (method) {
    var radio = deliveryForm.querySelector('input[name="method"][value="' + method + '"]');
    if (radio) radio.checked = true;
    deliveryForm.querySelectorAll('[data-method-fields]').forEach(function (group) { group.hidden = group.dataset.methodFields !== method; });
    deliveryForm.querySelector('[data-format-row]').hidden = method === 'snowflake';
    deliveryForm.querySelector('[data-format-snowflake]').hidden = method !== 'snowflake';
    var group = groupFor(method);
    group.querySelectorAll('input[data-secret]').forEach(function (input) {
      var saved = savedConfig && savedConfig.method === method && savedConfig[input.dataset.secret];
      input.placeholder = saved ? 'Saved · leave blank to keep it' : (method === 'webhook' ? 'Optional' : '');
    });
    testBtn.disabled = !(savedConfig && savedConfig.method === method);
  };

  var fill = function (dc) {
    if (!dc) return;
    deliveryForm.format.value = dc.format || 'jsonl';
    var group = groupFor(dc.method);
    if (!group) return;
    group.querySelectorAll('input:not([data-secret]), select').forEach(function (input) {
      if (dc[input.name] !== null && dc[input.name] !== undefined) input.value = dc[input.name];
    });
  };

  var describe = function (dc) {
    var current = document.querySelector('[data-delivery-current]');
    if (!current) return;
    if (!deliveryConfigured(dc)) { current.hidden = true; return; }
    if (dc.method === 'manual') {
      current.textContent = 'This feed is currently delivered outside Veyora (' + deliveryTarget(dc) + '), and those deliveries appear in your history. Save a method below to have Veyora deliver it instead.';
      current.hidden = false;
      return;
    }
    var test = dc.last_test_at
      ? (dc.last_test_ok ? ' Last connection test passed.' : ' Last connection test failed: ' + (dc.last_test_error || 'unknown error') + '.')
      : ' Not tested yet.';
    current.textContent = 'Currently delivering by ' + METHOD_LABELS[dc.method] + (dc.method === 'snowflake' ? '' : ' as ' + (dc.format || 'jsonl').toUpperCase())
      + ' (' + deliveryTarget(dc) + ').' + test;
    current.hidden = false;
  };

  var renderApiSnippet = function (subId) {
    var code = document.querySelector('[data-field="api-curl"]');
    if (code) code.textContent = 'curl -fL -H "Authorization: Bearer YOUR_API_KEY" \\\n  -o latest-snapshot \\\n  ' + location.origin + '/v1/feeds/' + subId + '/latest';
  };

  deliveryForm.addEventListener('change', function (event) {
    if (event.target.name === 'method') { clearNotices(); setMethod(event.target.value); }
  });

  var copyApi = deliveryForm.querySelector('[data-copy="api-curl"]');
  if (copyApi) copyApi.addEventListener('click', function () {
    var code = document.querySelector('[data-field="api-curl"]');
    if (code && navigator.clipboard) navigator.clipboard.writeText(code.textContent).then(function () {
      btnLabel(copyApi, 'Copied');
      setTimeout(function () { btnLabel(copyApi, 'Copy'); }, 1600);
    }).catch(function () {});
  });

  var load = function () {
    return fetch('/api/subscriptions', { credentials: 'same-origin' })
      .then(function (r) {
        if (r.status === 401) { location.assign('/login'); return null; }
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        var sub = data && (data.subscriptions || []).find(function (s) { return s.id === subParam; });
        if (!sub) { showMissing(); return; }
        if (missing) missing.hidden = true;
        if (deliveryPanel) deliveryPanel.hidden = false;
        deliveryForm.subscription_id.value = sub.id;
        if (deliveryFeedName) deliveryFeedName.textContent = sub.site_name;
        document.title = 'Delivery setup: ' + sub.site_name + ' | Veyora';
        var dcNow = deliveryConfigured(sub.delivery_config) ? sub.delivery_config : null;
        savedConfig = dcNow && dcNow.method !== 'manual' ? dcNow : null;
        fill(savedConfig);
        setMethod(savedConfig ? savedConfig.method : 'sftp');
        describe(dcNow);
        renderApiSnippet(sub.id);
      });
  };

  if (!/^[0-9a-f-]{36}$/.test(subParam)) showMissing();
  else load().catch(showMissing);

  deliveryForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearNotices();
    var subId = deliveryForm.subscription_id.value;
    if (!subId) return;
    var method = currentMethod();
    var payload = { method: method, format: deliveryForm.format.value };
    groupFor(method).querySelectorAll('input[name], select[name]').forEach(function (input) { payload[input.name] = input.value; });
    saveBtn.disabled = true;
    btnLabel(saveBtn, 'Saving…');
    try {
      var response = await fetch('/api/subscriptions/' + subId + '/delivery-config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin',
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || 'Could not save the delivery settings. Try again.');
      groupFor(method).querySelectorAll('input[data-secret]').forEach(function (input) { input.value = ''; });
      await load();
      deliveryOk.hidden = false;
    } catch (error) {
      showError(error.message);
    } finally {
      saveBtn.disabled = false;
      btnLabel(saveBtn, 'Save delivery settings');
    }
  });

  testBtn.addEventListener('click', async function () {
    clearNotices();
    var subId = deliveryForm.subscription_id.value;
    testBtn.disabled = true;
    var started = Date.now();
    var tick = function () { btnLabel(testBtn, 'Testing… ' + Math.round((Date.now() - started) / 1000) + ' s'); };
    tick();
    var timer = setInterval(tick, 1000);
    try {
      var response = await fetch('/api/subscriptions/' + subId + '/delivery-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', credentials: 'same-origin',
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || 'The test could not run. Try again.');
      if (!data.ok) throw new Error('Connection test failed: ' + data.error);
      var method = currentMethod();
      document.querySelector('[data-test-ok-text]').textContent = method === 'api'
        ? 'API pull is ready. The file appears at the address above after the next delivery.'
        : method === 'webhook' ? 'Your endpoint accepted a signed test event (delivery.test).'
        : method === 'snowflake' ? 'Signed in to Snowflake and the table is ready.'
        : 'Connected and wrote a small test file (then removed it).';
      testOk.hidden = false;
      await load();
    } catch (error) {
      showError(error.message);
      load().catch(function () {});
    } finally {
      clearInterval(timer);
      btnLabel(testBtn, 'Test connection');
      testBtn.disabled = !(savedConfig && savedConfig.method === currentMethod());
    }
  });
}

// Delivery history: every log of every subscription, newest first.
var deliveriesWrap = document.querySelector('[data-deliveries]');
if (deliveriesWrap) {
  var bytes = function (n) { return n == null ? '—' : n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB'; };
  var statusChip = function (s) {
    var tone = s === 'delivered' ? 'badge--ok' : s === 'failed' ? 'badge--err' : s === 'skipped' ? 'badge--muted' : 'badge--warn';
    return '<span class="badge ' + tone + '">' + esc(s) + '</span>';
  };
  fetch('/api/subscriptions', { credentials: 'same-origin' })
    .then(function (r) {
      if (r.status === 401) { location.assign('/login'); return null; }
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      var subs = (data && data.subscriptions) || [];
      return Promise.all(subs.map(function (s) {
        return fetch('/api/subscriptions/' + s.id + '/deliveries', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : { deliveries: [] }; })
          .then(function (d) { return (d.deliveries || []).map(function (row) { row.site_name = s.site_name; return row; }); })
          .catch(function () { return []; });
      }));
    })
    .then(function (lists) {
      var rows = [].concat.apply([], lists || []).sort(function (a, b) {
        return String(b.snapshot_date).localeCompare(String(a.snapshot_date)) || String(b.started_at).localeCompare(String(a.started_at));
      });
      deliveriesWrap.removeAttribute('aria-busy');
      var none = document.querySelector('[data-no-deliveries]');
      if (none) none.hidden = rows.length > 0;
      if (!rows.length) { deliveriesWrap.innerHTML = ''; return; }
      var html = '<table class="usage-table"><thead><tr><th>Snapshot</th><th>Feed</th><th>Status</th><th>Destination</th>'
        + '<th class="right">Records</th><th class="right">Size</th><th>Delivered</th><th>Details</th></tr></thead><tbody>';
      var destination = function (d) {
        var to = String(d.delivered_to || '').replace(/^(sftp|s3|gs|snowflake):\/\//, function (m, scheme) {
          return { sftp: 'SFTP ', s3: 'S3 ', gs: 'GCS ', snowflake: 'Snowflake ' }[scheme];
        });
        var label = to ? esc(to.length > 48 ? to.slice(0, 46) + '…' : to) : '—';
        var tag = d.source === 'external' ? ' <span class="badge badge--muted" title="Sent by the crawl job, outside Veyora">external</span>' : '';
        return '<span title="' + esc(d.delivered_to || '') + '">' + label + '</span>' + tag;
      };
      rows.forEach(function (d) {
        html += '<tr><td class="mono">' + formatDate(d.snapshot_date) + '</td><td>' + esc(d.site_name) + '</td>'
          + '<td>' + statusChip(d.status) + '</td><td>' + destination(d) + '</td>'
          + '<td class="right mono">' + (d.record_count != null ? Number(d.record_count).toLocaleString('en') : '—') + '</td>'
          + '<td class="right mono">' + bytes(d.file_size_bytes) + '</td>'
          + '<td class="mono">' + (d.completed_at ? new Date(d.completed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—') + '</td>'
          + '<td>' + (d.error ? '<small class="muted">' + esc(String(d.error).slice(0, 140)) + '</small>' : '') + '</td></tr>';
      });
      deliveriesWrap.innerHTML = html + '</tbody></table>';
    })
    .catch(function () {
      deliveriesWrap.removeAttribute('aria-busy');
      deliveriesWrap.innerHTML = '<p class="muted" style="font-size:14px">Could not load your deliveries. Refresh the page.</p>';
    });
}

// Overview: one line summarising the feed subscriptions.
var ovFeeds = document.querySelector('[data-field="ov-feeds"]');
if (ovFeeds) {
  fetch('/api/subscriptions', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var subs = ((data && data.subscriptions) || []).filter(function (s) { return s.status !== 'cancelled'; });
      if (!subs.length) { ovFeeds.textContent = 'No feeds yet: browse the catalog to add one'; return; }
      var needSetup = subs.filter(function (s) { return s.status === 'active' && !deliveryConfigured(s.delivery_config); }).length;
      ovFeeds.textContent = subs.length + (subs.length === 1 ? ' feed' : ' feeds') + (needSetup ? ' · ' + needSetup + ' need delivery setup' : ' · all delivering');
    })
    .catch(function () {});
}

loadSubscriptions();


})();
