# Private Proxy Gateway

This service gives each client a separate username, password, and prepaid byte quota while keeping the upstream proxy credentials on the server. It supports ordinary HTTP proxy requests and HTTPS tunnels through `CONNECT`; it never decrypts the client's HTTPS traffic.

Node.js 20 or newer is required. Confirm that your upstream provider's contract permits your intended resale or delegated-access model before using the service commercially.

## 1. Configure it

In PowerShell:

```powershell
cd C:\Users\pc\Downloads\P3_PNN_TF\proxy-provider
Copy-Item .env.example .env
notepad .env
```

Set the upstream host, port, username, and password. The gateway expects a TLS-capable upstream proxy by default so those credentials are not exposed in transit. Use `ALLOW_INSECURE_UPSTREAM=true` only if the provider has no TLS endpoint and you accept that risk.

For local use, keep `PROXY_HOST=127.0.0.1`. A non-loopback/public bind refuses to start unless both `PROXY_TLS_CERT_FILE` and `PROXY_TLS_KEY_FILE` are configured. Limit the public port in your firewall as an additional control.

`DESTINATION_PORTS` defaults to `80,443`. `DESTINATION_ALLOWLIST` can further restrict hostnames (for example, `example.com,*.example.org`). Private, loopback, link-local, and special-use destination addresses are denied even when DNS returns them.

### Country and sticky sessions

Customers add options to their proxy username; the password stays the same:

| Username | Result |
|---|---|
| `USER` | New exit IP on every request |
| `USER-mobile` | Mobile carrier exit (needs `UPSTREAM_MOBILE_USERNAME`; wallet-only, `PRICE_MOBILE_PER_GB`) |
| `USER-country-gr` | Exit IP in that country (any two-letter code) |
| `USER-session-job1` | Same exit IP for `UPSTREAM_SESSION_TTL_SECONDS` (default 600) |
| `USER-country-gr-session-job1` | Both |

Options combine in the order `-mobile`, `-country-xx`, `-session-name`.

The gateway authenticates `USER`, then logs in upstream as `UPSTREAM_PROXY_USERNAME-cc-GR-sid-<hash>-ttl-600` (the proxi.st format). The session name is hashed together with the customer's username, so two customers who pick the same name never share an exit IP, and gateway sessions cannot collide with other tools using the same provider account.

Destinations are still checked locally (names that resolve to private or special-use addresses are refused), but the upstream receives the hostname rather than a pinned IP: plain-HTTP sites need the hostname, and exit-side DNS returns servers near the exit country.

## 2. Create the first 30 GB account

Stop the gateway before running an administration command; the JSON store is intentionally single-process.

```powershell
node --env-file=.env src/admin.js create cousin 30
```

The command prints a cryptographically random password once. Other commands are:

```powershell
node --env-file=.env src/admin.js list
node --env-file=.env src/admin.js credit cousin 5
node --env-file=.env src/admin.js disable cousin
node --env-file=.env src/admin.js enable cousin
```

## 3. Start it

```powershell
node --env-file=.env src/server.js
```

With the default local HTTP listener, test with:

```powershell
curl.exe --proxy http://cousin:GENERATED_PASSWORD@127.0.0.1:8080 https://api.ipify.org
```

With a public TLS listener, clients use an HTTPS proxy URL and must trust the configured certificate:

```powershell
curl.exe --proxy https://cousin:GENERATED_PASSWORD@proxy.example.com:8080 https://api.ipify.org
```

The gateway reserves quota before forwarding bytes, limits connections, failed authentication attempts, and concurrent password verification work, enforces request/idle/tunnel deadlines, strips hop-by-hop headers, and meters the entire `CONNECT` handshake and tunnel.

## Customer accounts

The payment service also serves `/signup`, `/login` and `/account`. Signing up creates a client record with the customer's email, a separately hashed web password, and an automatically generated proxy username (`px` + 10 hex characters) with a random proxy password that is never shown.

Sessions use an `HttpOnly`, `Secure`, `SameSite=Lax` cookie named `__Host-proxora_session`, valid for 30 days. Only a SHA-256 hash of each session token is stored. Browsers accept `Secure` cookies on `http://localhost`; in production the site must be served over HTTPS. Account endpoints (`POST /api/signup`, `/api/login`, `/api/logout`, `GET /api/me`) accept JSON only and reject requests whose `Origin` does not match the host. Signups are capped at 5 per address per minute.

`/account` is the customer dashboard: wallet balance and prices, USD top-ups, any prepaid GB left, API keys for the Web Unlocker, the proxy endpoint, the proxy username, and a ready-to-run `curl` test. `POST /api/proxy-password` issues a new random proxy password, returns it once, and stores only its hash, so the old password stops working immediately. Set `PUBLIC_PROXY_URL` (for example `https://gate.veyora.io:8080`) to the address customers should use; it defaults to `PROXY_HOST`/`PROXY_PORT`.

## Wallet and pricing

Each account has a prepaid USD balance (integer micro-dollars, `balanceMicros`). Residential traffic spends prepaid GB first (packs sold before the wallet), then the balance at `PRICE_RESIDENTIAL_PER_GB`; mobile traffic is paid from the balance only at `PRICE_MOBILE_PER_GB`. Traffic is reserved in chunks and unused reservations are refunded when a connection ends. `COST_RESIDENTIAL_PER_GB` and `COST_MOBILE_PER_GB` are the upstream costs used by the unlocker ledger.

## Web Unlocker

`POST /v1/unlock` on the website host, with `Authorization: Bearer vy_live_...` (keys are issued in the dashboard, up to 10 per account, stored as SHA-256 digests):

```bash
curl -X POST https://<site>/v1/unlock -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"url": "https://example.com/", "country": "us", "session": "job1"}'
```

The answer is JSON with `success`, the target `status`, final `url`, `headers`, `body` (`encoding` is `utf8`, `latin1` or `base64`), `billedMicros` and the `attempts` made. Each request costs `PRICE_UNLOCKER_PER_1K`/1000 (times any `UNLOCKER_PREMIUM_DOMAINS` multiplier). It is held from the balance up front and refunded unless the page comes back (2xx/3xx, 404 or 410); blocked, failed and timed-out requests are free. `render` is not available yet. The body is the last JSON field and is streamed in slices, so a page costs about its own size in memory; each request books twice `UNLOCKER_MAX_RESPONSE_BYTES` (5 MB) from `UNLOCKER_MEMORY_BUDGET_BYTES` (256 MB), and requests beyond it or beyond `UNLOCKER_MAX_CONCURRENT` (30) get `503` with `Retry-After: 5`.

How it works: the fetcher goes through the upstream CONNECT tunnel with Chrome's TLS cipher/curve/signature order and Chrome's HTTP/2 settings, Chrome navigation headers and `Accept-Encoding: gzip, deflate, br`. Node cannot copy Chrome's TLS extension order, so the JA4 fingerprint is not Chrome's; the fetcher is pluggable for a curl-impersonate or browser tier later. A response counts as blocked on 403/429/503, `cf-mitigated: challenge`, challenge-page markers in small HTML (Cloudflare, Imperva, PerimeterX, DataDome, and Akamai's "Access Denied ... Reference #" and errors.edgesuite.net pages, also when written with HTML entities), or HTML under `UNLOCKER_MIN_BODY_BYTES`. Up to `UNLOCKER_MAX_ATTEMPTS` (4) attempts: residential, a new residential IP, then mobile. Each site remembers the rung that worked for 30 minutes and tries a cheaper one every 20th request. A `session` keeps its exit and cookies for `UPSTREAM_SESSION_TTL_SECONDS`; without one, each customer keeps a warm exit per site. Redirects are followed (max 5) and every hop gets the gateway's SSRF check. Only ports 80/443, GET, and no customer cookies or headers. `UNLOCKER_BLOCKED_DOMAINS` adds to a built-in blocklist (ticket resale, sneaker launches, the upstream provider).

Every request appends a line to `UNLOCKER_LEDGER_FILE` (default `unlocker-ledger.jsonl` next to the store) with price, upstream cost, bytes and attempts. The file rotates daily (UTC) or at `UNLOCKER_LEDGER_MAX_BYTES` (50 MB) into `unlocker-ledger-YYYY-MM-DD.jsonl`, keeping `UNLOCKER_LEDGER_KEEP` (30) archives. Per-site totals are saved in `unlocker-ledger.stats.json` together with how much of the active file they cover, so a restart reads the snapshot and replays only newer lines; a site whose upstream cost exceeds its revenue after `UNLOCKER_FLAG_MIN_REQUESTS` requests is flagged and logged. See them with `npm run admin -- unlocker-stats` (needs the running server and `ADMIN_TOKEN`).

### Testing a site: `unlock-test`

```sh
npm run admin -- unlock-test https://www.mobile.de/ --country de
npm run admin -- unlock-test --batch urls.txt --country de --pool mobile
```

Fetches the URL once on every rung of the ladder (or only the rungs of `--pool residential|mobile`), each on a new IP, with the same SSRF checks, blocklist, size cap and timeouts as `/v1/unlock`. For each rung it prints the outcome, status, what decided it (`status:403`, `server:AkamaiGHost`, `marker:akamai-edgesuite`, `cookie:_abck`, ...), bytes, upstream cost and time. `--batch` takes a file with one URL per line (`#` comments allowed) and ends with the success rate per rung; `--json` prints everything as JSON. Nothing is billed and nothing is written to the store or the ledger, so it is safe to run on the server while the service is up; it only spends upstream bandwidth. `--fetcher impersonate` is reserved for the curl-impersonate fetcher. The unlocker also logs once per site (per 30 minutes) when a site issues an Akamai Bot Manager `_abck` cookie.

## USDT top-ups (NOWPayments)

Customers add funds to their balance from the dashboard (`TOPUPS`, `id:cents[:bonusPercent]`; by default $10-$500 with +5% at $100 and +10% at $500) and pay a NOWPayments USDT invoice. The server credits the balance only when a correctly signed IPN reports `finished` for the exact purchase and USD amount; replays and second payments on the same invoice credit nothing. Partial payments and signed payments that cannot be matched are logged (`journalctl -u proxora`) for manual handling.

1. Create a NOWPayments account, set your USDT payout wallet, and generate an API key and an IPN secret.
2. In `/opt/proxora/.env`: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, and `CHECKOUT_SUCCESS_URL=https://<site>/account?paid=1`. Start with `NOWPAYMENTS_SANDBOX=true` (sandbox keys) to test with fake payments, then switch to live keys.
3. `systemctl restart proxora`. Payment notices arrive at `https://<site>/nowpayments/ipn`.

Manual top-ups keep working alongside: `npm run admin -- credit-usd <email> <usd>` for the balance, or `credit <email> <gb>` for prepaid GB.

## Stripe top-ups (optional)

Set a Stripe secret key and webhook signing secret. Package definitions use `id:bytes:price_in_cents:currency`; the defaults charge $2 per GiB.

The payment service also serves the residential-proxy landing page at `/`. Start it with the payment settings from `.env`, keep it on loopback for local development, and expose it through the same HTTPS reverse proxy used for Stripe webhooks in production.

An authenticated client starts Checkout with:

```http
POST /checkout
Authorization: Basic base64(username:password)
Content-Type: application/json

{"packageId":"gb1"}
```

Keep `PAYMENTS_HOST` on loopback. Publish it through an HTTPS reverse proxy, then configure Stripe to send `checkout.session.completed` to `https://YOUR_DOMAIN/stripe/webhook`. A signed webhook grants quota only when its Stripe session, local purchase ID, exact amount, and currency match a checkout created by this server. Duplicate events do not grant quota twice.

`PROCESSED_PAYMENT_HISTORY_LIMIT` bounds the retained Stripe event ledger (default `10000`). Replays for pruned events remain harmless because their one-time pending purchase has already been consumed. State snapshots and their containing directory are synced before journal cleanup for crash-safe replacement.

## Storage and deployment limits

- Client passwords are scrypt-hashed; upstream credentials remain in the environment and are never returned to clients.
- Quota usage is recorded in an append-only journal and account/payment changes use atomic snapshots.
- This store supports one running gateway process. Do not run the admin CLI concurrently with it, and do not run multiple gateway replicas against the same files.
- Move state and atomic quota reservations to PostgreSQL or Redis before adding replicas or a larger customer base. Put the service behind monitored infrastructure, retain audit logs outside this process, and rotate upstream and client credentials regularly.

Automated tests are available with `node --test`.
