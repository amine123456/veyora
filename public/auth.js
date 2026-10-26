(() => {
'use strict';

const gb = bytes => `${(bytes / 1024 ** 3).toFixed(2)} GB`;

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
      set('remaining', gb(me.remainingBytes));
      const percent = me.quotaBytes > 0 ? Math.round((me.usedBytes / me.quotaBytes) * 100) : 0;
      $('[data-meter-fill]').style.width = `${percent}%`;
      $('[data-meter]').setAttribute('aria-valuenow', String(percent));
      set('usage', me.quotaBytes > 0 ? `${gb(me.usedBytes)} used of ${gb(me.quotaBytes)}` : '');
      $('[data-empty]').hidden = me.quotaBytes > 0;

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

  // Buy traffic: GB packs paid with USDT through a hosted invoice.
  const packs = $('[data-packs]');
  const buyError = $('[data-buy-error]');
  if (new URLSearchParams(location.search).has('paid')) $('[data-paid]').hidden = false;
  fetch('/packages')
    .then(response => response.json())
    .then(list => {
      list.forEach(pack => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pack';
        button.dataset.pack = pack.id;
        const size = pack.bytes / 1024 ** 3;
        button.innerHTML = '<b></b><span></span>';
        button.querySelector('b').textContent = `${Number.isInteger(size) ? size : size.toFixed(1)} GB`;
        button.querySelector('span').textContent = `$${(pack.cents / 100).toFixed(2)}`;
        packs.append(button);
      });
    })
    .catch(() => { buyError.textContent = 'Could not load the packs. Refresh the page.'; buyError.hidden = false; });

  packs.addEventListener('click', async event => {
    const button = event.target.closest('[data-pack]');
    if (!button) return;
    buyError.hidden = true;
    packs.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const label = button.querySelector('span').textContent;
    button.querySelector('span').textContent = 'Opening…';
    try {
      const { ok, data } = await post('/api/checkout', { packageId: button.dataset.pack });
      if (ok && data.checkoutUrl) { location.assign(data.checkoutUrl); return; }
      throw new Error(data.error || 'Could not start the payment. Try again.');
    } catch (error) {
      buyError.textContent = error.message === 'Online payment is not set up yet'
        ? 'Online payment is not available yet. Ask us and we will add GB manually.'
        : error.message;
      buyError.hidden = false;
    } finally {
      button.querySelector('span').textContent = label;
      packs.querySelectorAll('button').forEach(b => { b.disabled = false; });
    }
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
