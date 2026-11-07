# Veyora

Residential-proxy reseller: customers sign up on the website, buy GB packs (USDT via
NOWPayments, optional Stripe), and use a metered, authenticated proxy gateway that forwards
to an upstream provider (proxi.st format) without exposing its credentials.

## Commands

- `npm test`: all tests (`node --test`, serial). No dependencies to install; Node >= 20.
- `npm start`: runs `src/server.js` with `.env` (copy `.env.example`).
- `npm run admin -- list|create|credit|password|enable|disable ...`: account admin. Uses the
  loopback admin API when the server runs with `ADMIN_TOKEN`, else edits the store file.

## Layout

- `src/server.js` starts three listeners: proxy gateway (`PROXY_PORT`), website + payments
  (`PAYMENTS_PORT`, loopback only, behind nginx), admin API (`ADMIN_PORT`, loopback only).
- `src/gateway.js` HTTP proxy + CONNECT tunnels, SSRF blocklist, connection/auth limits.
- `src/auth.js` Basic auth parsing, `USER-country-xx-session-id` routing, upstream login.
- `src/meter.js` stream Transform that reserves quota before passing bytes.
- `src/store.js` single-process JSON store: atomic snapshots + fsynced usage journal, all
  writes serialized through `mutate()`. scrypt password hashes, verified-credential cache.
- `src/payments.js` static site (`public/`), account API, sessions, checkout, IPN/webhooks.
- `src/nowpayments.js`, `src/admin-api.js`, `src/admin.js`, `src/config.js` (env parsing).
- `deploy/` nginx, systemd and certbot files. Production lives at `/opt/proxora` under the
  legacy `proxora` service/user name; keep those names unless migrating the server.

## Conventions

- Zero runtime dependencies; use Node built-ins only.
- The store is single-process: never run two servers, or the offline admin CLI alongside a
  running server, against the same `DATA_FILE`.
- Rate limits on the website must key on `clientAddress(request)` (nginx forwards the real IP),
  never on `request.socket.remoteAddress`.
- Security-sensitive code (payments crediting, auth, SSRF checks) has tests; extend them with
  every change. The session cookie name `__Host-proxora_session` is kept so renaming it does
  not sign every customer out.
