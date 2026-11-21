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
if (dash) {
  const $ = selector => dash.querySelector(selector);
  const set = (name, value) => { const el = $(`[data-field="${name}"]`); if (el) el.textContent = value; };
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
        $('[data-chip-mobile]').hidden = !me.mobile;
        $('[data-chip-unlocker]').hidden = !me.unlocker;
        set('mobile-price', `${usd(mob)}/GB`);
        set('unlocker-price', `${usd(unl * 1000)} per 1,000 successful requests.`);
      }
      // Prepaid GB bought before the balance existed are still used first.
      $('[data-prepaid]').hidden = me.quotaBytes === 0;
      if (me.quotaBytes > 0) {
        set('remaining', traffic(me.remainingBytes));
        const percent = Math.min(100, Math.max(0, (me.usedBytes / me.quotaBytes) * 100));
        $('[data-meter-fill]').style.width = `${percent}%`;
        $('[data-meter]').setAttribute('aria-valuenow', String(Math.round(percent)));
        set('usage', `${traffic(me.usedBytes)} used of ${traffic(me.quotaBytes)}`);
      }
      $('[data-empty]').hidden = (me.balanceMicros ?? 0) > 0 || me.remainingBytes > 0;
      $('[data-mobile-option]').hidden = !me.mobile;
      if (me.unlocker) {
        $('[data-unlocker]').hidden = false;
        dash.querySelectorAll('[data-unlocker-nav]').forEach(link => { link.hidden = false; });
        values['unlock-curl'] = `curl -X POST ${location.origin}/v1/unlock \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://example.com/"}'`;
        set('unlock-curl', values['unlock-curl']);
        loadKeys();
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
        renderCurl('YOUR_PASSWORD');
      } else {
        set('endpoint', 'Not configured');
        set('curl', 'Proxy endpoint not configured yet.');
      }
    })
    .catch(() => set('remaining', 'Could not load'));

  // Add funds: USD top-ups paid with card (Stripe) or USDT (NOWPayments).
  const packs = $('[data-packs]');
  const buyError = $('[data-buy-error]');
  const payMethodTabs = document.querySelectorAll('[data-pay-method]');
  let activePayMethod = 'stripe';
  let payMethods = { crypto: false, stripe: false };
  if (new URLSearchParams(location.search).has('paid')) $('[data-paid]').hidden = false;

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

  // API keys for the Web Unlocker: list, create (shown once), revoke (click twice).
  const keyList = $('[data-keys]');
  const keyError = $('[data-key-error]');
  const showKeyError = message => { keyError.textContent = message; keyError.hidden = false; };
  function renderKeys(keys) {
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
  regenerate.addEventListener('click', async () => {
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
    fetch('/api/usage/summary?days=30', { credentials: 'same-origin' })
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
    loadEvents(1);
    $('[data-usage-prev]')?.addEventListener('click', () => { if (usagePage > 1) loadEvents(usagePage - 1); });
    $('[data-usage-next]')?.addEventListener('click', () => loadEvents(usagePage + 1));

    fetch('/api/payments?limit=20', { credentials: 'same-origin' })
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

  // Sidebar: highlight the section being read.
  const links = [...dash.querySelectorAll('.snav__a[href^="#"]')];
  const sections = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  const mark = id => links.forEach(a => {
    const on = a.getAttribute('href') === `#${id}`;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
  if ('IntersectionObserver' in window && sections.length) {
    const visible = new Map();
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      const top = [...visible].filter(([, r]) => r > 0).sort((a, b) => sections.findIndex(x => x.id === a[0]) - sections.findIndex(x => x.id === b[0]))[0];
      if (top) mark(top[0]);
    }, { rootMargin: '-15% 0px -55% 0px', threshold: [0, .1, .5] });
    sections.forEach(sec => spy.observe(sec));
  }

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
var activeDeliveryTab = 'sftp';

function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

if (new URLSearchParams(location.search).has('feed_sub')) {
  var banner = document.querySelector('[data-feed-sub-ok]');
  if (banner) banner.hidden = false;
}

function formatEur(cents) { return '€' + (cents / 100).toFixed(0); }

function openDeliveryPanel(subId, feedName, method) {
  if (!deliveryPanel || !deliveryForm) return;
  deliveryPanel.hidden = false;
  deliveryForm.subscription_id.value = subId;
  deliveryForm.delivery_method.value = method || 'sftp';
  if (deliveryFeedName) deliveryFeedName.textContent = feedName;
  deliveryOk.hidden = true;
  deliveryError.hidden = true;
  setDeliveryTab(method || 'sftp');
  deliveryPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setDeliveryTab(tab) {
  activeDeliveryTab = tab;
  if (!deliveryPanel) return;
  deliveryPanel.querySelectorAll('[data-delivery-tab]').forEach(function (t) {
    t.classList.toggle('pay-tab--active', t.dataset.deliveryTab === tab);
  });
  var sftpFields = deliveryPanel.querySelector('[data-delivery-fields-sftp]');
  var webhookFields = deliveryPanel.querySelector('[data-delivery-fields-webhook]');
  if (sftpFields) sftpFields.hidden = tab !== 'sftp';
  if (webhookFields) webhookFields.hidden = tab !== 'webhook';
  if (deliveryForm) deliveryForm.delivery_method.value = tab;
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
    if (dc && (dc.sftp_host || dc.webhook_url)) {
      var label = dc.method === 'webhook' ? 'Webhook' : 'SFTP: ' + esc(dc.sftp_host);
      deliveryHtml = '<span class="feed-chip feed-chip--active" style="font-size:11px">' + label + '</span>';
    } else if (s.status === 'active') {
      deliveryHtml = '<button class="btn btn--sm btn--warn" data-configure-delivery="' + s.id + '" data-feed-label="' + esc(s.site_name) + '" data-method="' + esc(s.delivery_method) + '">Setup needed</button>';
    } else {
      deliveryHtml = '<span class="muted" style="font-size:12px">—</span>';
    }
    var actions = '';
    if (s.status === 'pending' && !s.stripe_subscription_id) {
      actions += '<button class="btn btn--sm" data-feed-checkout="' + s.id + '">Complete payment</button> ';
    }
    if (s.status === 'active') {
      actions += '<button class="btn btn--ghost btn--sm" data-configure-delivery="' + s.id + '" data-feed-label="' + esc(s.site_name) + '" data-method="' + esc(s.delivery_method) + '">' + (dc && (dc.sftp_host || dc.webhook_url) ? 'Edit delivery' : 'Configure') + '</button> ';
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

  feedsSubs.querySelectorAll('[data-configure-delivery]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openDeliveryPanel(btn.dataset.configureDelivery, btn.dataset.feedLabel, btn.dataset.method);
    });
  });

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

if (deliveryPanel) {
  deliveryPanel.querySelectorAll('[data-delivery-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () { setDeliveryTab(tab.dataset.deliveryTab); });
  });
  var closeBtn = deliveryPanel.querySelector('[data-delivery-close]');
  if (closeBtn) closeBtn.addEventListener('click', function () { deliveryPanel.hidden = true; });
}

if (deliveryForm) {
  deliveryForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    deliveryOk.hidden = true;
    deliveryError.hidden = true;
    var subId = deliveryForm.subscription_id.value;
    if (!subId) return;
    var method = deliveryForm.delivery_method.value;
    var payload;
    if (method === 'webhook') {
      payload = {
        webhook_url: deliveryForm.webhook_url.value.trim(),
        webhook_secret: deliveryForm.webhook_secret.value.trim() || null,
      };
    } else {
      payload = {
        sftp_host: deliveryForm.sftp_host.value.trim(),
        sftp_port: parseInt(deliveryForm.sftp_port.value) || 22,
        sftp_username: deliveryForm.sftp_username.value.trim(),
        sftp_password: deliveryForm.sftp_password.value,
        sftp_path: deliveryForm.sftp_path.value.trim() || '/',
      };
    }
    var submitBtn = deliveryForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    try {
      var response = await fetch('/api/subscriptions/' + subId + '/delivery-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');
      deliveryOk.hidden = false;
      loadSubscriptions();
    } catch (error) {
      deliveryError.textContent = error.message;
      deliveryError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save delivery settings';
    }
  });
}

loadSubscriptions();

if (new URLSearchParams(location.search).has('feed_sub') && feedsSubs) {
  setTimeout(function () {
    var setupBtn = feedsSubs.querySelector('[data-configure-delivery]');
    if (setupBtn) setupBtn.click();
  }, 500);
}

})();
