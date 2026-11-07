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
const form = document.querySelector('[data-auth]');
if (form) {
  const mode = form.dataset.auth;
  const error = form.querySelector('.form__error');
  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;
  const show = message => { error.textContent = message; error.hidden = false; };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.hidden = true;
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!form.email.checkValidity() || !email) return show('Enter a valid email address.');
    if (mode === 'signup' && password.length < 10) return show('Password must be at least 10 characters.');
    if (!password) return show('Enter your password.');

    button.disabled = true;
    button.textContent = mode === 'signup' ? 'Creating account…' : 'Logging in…';
    try {
      const { ok, data } = await post(`/api/${mode}`, { email, password });
      if (ok) { location.assign('/account'); return; }
      show(data.error || 'Something went wrong. Try again.');
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
  const set = (name, value) => { $(`[data-field="${name}"]`).textContent = value; };
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
      set('wallet', usd(me.balanceMicros ?? 0));
      if (me.prices) {
        const { residentialPerGbMicros: res, mobilePerGbMicros: mob, unlockerPerRequestMicros: unl } = me.prices;
        const parts = [`Residential ${usd(res)}/GB`];
        if (me.mobile) parts.push(`mobile ${usd(mob)}/GB`);
        if (me.unlocker) parts.push(`Web Unlocker ${usd(unl * 1000)} per 1,000 requests`);
        set('prices', `${parts.join(', ')}.`);
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
      list.forEach(topup => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pack';
        button.dataset.pack = topup.id;
        button.innerHTML = '<b></b><span></span>';
        button.querySelector('b').textContent = `$${(topup.cents / 100).toFixed(0)}`;
        button.querySelector('span').textContent = topup.bonusPercent
          ? `+${topup.bonusPercent}% · ${usd(topup.creditMicros)}`
          : 'Pay with USDT';
        packs.append(button);
      });
    })
    .catch(() => { buyError.textContent = 'Could not load the top-ups. Refresh the page.'; buyError.hidden = false; });

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
      dt.textContent = key.name || 'Unnamed key';
      const dd = document.createElement('dd');
      const code = document.createElement('code');
      code.textContent = `${key.prefix}…`;
      const revoke = document.createElement('button');
      revoke.type = 'button';
      revoke.className = 'copy';
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
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select and copy';
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 1600);
  });

  // Regenerate: first click asks to confirm, second click replaces the password.
  const regenerate = $('[data-regenerate]');
  const errorBox = $('[data-password-error]');
  let armed = false, disarmTimer;
  regenerate.addEventListener('click', async () => {
    errorBox.hidden = true;
    if (!armed) {
      armed = true;
      regenerate.textContent = 'Click again to replace your password';
      disarmTimer = setTimeout(() => { armed = false; regenerate.textContent = 'Generate new password'; }, 5000);
      return;
    }
    clearTimeout(disarmTimer);
    armed = false;
    regenerate.disabled = true;
    regenerate.textContent = 'Generating…';
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
      regenerate.textContent = 'Generate new password';
    }
  });
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
