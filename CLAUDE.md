# Veyora

Residential/mobile proxy reseller: customers sign up on the website, top up a prepaid USD
wallet (USDT via NOWPayments; legacy GB packs, optional Stripe), and use a metered,
authenticated proxy gateway that forwards to an upstream provider (proxi.st format) without
exposing its credentials, or the Web Unlocker API (`POST /v1/unlock`, API keys).

## Commands

- `npm test`: all tests (`node --test`, serial). No dependencies to install; Node >= 20.
- `npm start`: runs `src/server.js` with `.env` (copy `.env.example`).
- `npm run admin -- list|create|credit|password|enable|disable ...`: account admin. Uses the
  loopback admin API when the server runs with `ADMIN_TOKEN`, else edits the store file.
- `npm run admin -- unlock-test <url>|--batch <file> [--country xx] [--pool ...]`: fetches once
  per unlocker rung and prints the classification; bills and records nothing (`src/unlock-test.js`).

## Layout

- `src/server.js` starts three listeners: proxy gateway (`PROXY_PORT`), website + payments
  (`PAYMENTS_PORT`, loopback only, behind nginx), admin API (`ADMIN_PORT`, loopback only).
- `src/gateway.js` HTTP proxy + CONNECT tunnels, SSRF blocklist, connection/auth limits.
- `src/auth.js` Basic auth parsing, `USER[-mobile][-country-xx][-session-id]` routing, upstream login.
- `src/meter.js` stream Transform that reserves prepaid GB, then wallet funds, before passing bytes.
- `src/unlocker.js` `/v1/unlock`: validation, SSRF/blocklist, escalation ladder, per-site memory,
  sessions and cookies, wallet billing, JSONL cost ledger. `src/fetcher.js` Chrome-shaped GET
  through the upstream CONNECT tunnel (h2/HTTP 1.1, br/gzip, size cap).
- `src/store.js` single-process JSON store: atomic snapshots + fsynced usage journal, all
  writes serialized through `mutate()`. scrypt password hashes, verified-credential cache.
  Wallet balances are integer micro-dollars (`balanceMicros`); API keys are SHA-256 digests.
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
