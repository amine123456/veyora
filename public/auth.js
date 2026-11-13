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
        <p>We sent a verification link to <strong>${maskedEmail}</strong>. Click it to activate your account.</p>
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

  // Add funds: USD top-ups paid with USDT through a hosted invoice.
  const packs = $('[data-packs]');
  const buyError = $('[data-buy-error]');
  if (new URLSearchParams(location.search).has('paid')) $('[data-paid]').hidden = false;
  fetch('/packages')
    .then(response => response.json())
    .then(list => {
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
          ? `+${topup.bonusPercent}% · ${usd(topup.creditMicros)}`
          : 'Pay with USDT';
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
    try {
      const { ok, data } = await post('/api/checkout', { topupId: button.dataset.pack });
      if (ok && data.checkoutUrl) { location.assign(data.checkoutUrl); return; }
      throw new Error(data.error || 'Could not start the payment. Try again.');
    } catch (error) {
      buyError.textContent = error.message === 'Online payment is not set up yet'
        ? 'Online payment is not available yet. Ask us and we will credit your account manually.'
        : error.message;
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
      const { ok, data } = await post('/api/keys', { name: event.target.name.value.trim() });
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
            const domain = e.domain ? (e.domain.length > 28 ? e.domain.slice(0, 26) + '…' : e.domain) : '—';
            tr.innerHTML = `<td class="mono">${timeStr}</td><td><span class="badge badge--muted">${e.kind}</span></td><td title="${e.domain || ''}">${domain}</td><td>${statusBadge}</td><td>${e.outcome || '—'}</td><td class="right mono">${traffic(e.bytes)}</td><td class="right mono">${e.billed ? usd(e.costMicros) : '—'}</td><td>${e.billed ? '<span class="badge badge--ok">Yes</span>' : '<span class="badge badge--muted">No</span>'}</td>`;
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
          tr.innerHTML = `<td class="mono">${date}</td><td>${p.packageId || p.eventId || '—'}</td><td class="right mono">${usd(p.micros)}</td>`;
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
})();
