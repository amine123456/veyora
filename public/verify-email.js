(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fail = msg => { $('verify-loading').hidden = true; $('verify-error-msg').textContent = msg; $('verify-error').hidden = false; };

  const token = new URLSearchParams(location.search).get('token');
  if (!token) { $('verify-loading').hidden = true; $('verify-notoken').hidden = false; return; }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  (async () => {
    try {
      const r = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'same-origin',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      let data = {};
      try { data = await r.json(); } catch { /* non-JSON response */ }
      $('verify-loading').hidden = true;
      if (r.ok && data.verified) {
        $('verify-success').hidden = false;
        setTimeout(() => { location.assign('/account'); }, 1200);
      } else {
        fail(data.error || 'The link is invalid or has expired.');
      }
    } catch (e) {
      clearTimeout(timeout);
      fail(e.name === 'AbortError' ? 'Request timed out. Try refreshing the page.' : 'Could not reach the server. Check your connection and try again.');
    }
  })();
})();
