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
| `USER-country-gr` | Exit IP in that country (any two-letter code) |
| `USER-session-job1` | Same exit IP for `UPSTREAM_SESSION_TTL_SECONDS` (default 600) |
| `USER-country-gr-session-job1` | Both |

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

`/account` is the customer dashboard: traffic left and used, the proxy endpoint, the proxy username, and a ready-to-run `curl` test. `POST /api/proxy-password` issues a new random proxy password, returns it once, and stores only its hash, so the old password stops working immediately. Set `PUBLIC_PROXY_URL` (for example `https://gate.proxora.io:8080`) to the address customers should use; it defaults to `PROXY_HOST`/`PROXY_PORT`.

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
