You are continuing work on **Veyora**, my residential/mobile proxy business, and we are adding a **Web Unlocker** product. Read `CLAUDE.md`, `README.md` and `deploy/DEPLOY.md` first, then run `npm test` to confirm the baseline (47 tests should pass). Treat this as a production business: careful, tested changes only.

## What exists today
- Repo: `amine123456/veyora`. Node >= 20, **zero runtime dependencies** (Node built-ins only; keep it that way unless a dependency is clearly worth it, e.g. Playwright for the browser tier or `pg` for PostgreSQL).
- `src/server.js` starts 3 listeners: proxy gateway (TLS, public port 8443 in prod), website + account + payments API (loopback port 3100 behind nginx), admin API (loopback 3101).
- `src/gateway.js` HTTP proxy + CONNECT tunnels, SSRF blocklist, per-client connection limits, per-IP auth-failure limits. `src/auth.js` parses `USER-country-xx-session-id` usernames and builds the upstream login in proxi.st format (`BASE-cc-GR-sid-<hash>-ttl-600`). `src/meter.js` reserves quota before forwarding bytes.
- `src/store.js` single-process JSON store (atomic snapshots + fsynced usage journal, writes serialized via `mutate()`), scrypt hashes, sessions, pending/processed payments, verified-credential cache.
- `src/payments.js` serves the site (`public/`), signup/login/dashboard API, NOWPayments USDT checkout (BEP-20 default) + signed IPN crediting, optional Stripe. Packages today: 1 GB $2, 5 GB $10, 10 GB $20.
- Admin CLI: `npm run admin -- list|create|credit|password|enable|disable`.

## Production
- Live: `https://veyora.pro` (site), `https://gate.veyora.pro:8443` (proxy). DigitalOcean Ubuntu 24.04, nginx + certbot (cert valid to 2027-01-25), systemd service `proxora`, app in `/opt/proxora`, data in `/opt/proxora/data`. Legacy `proxora` names are intentional; the session cookie `__Host-proxora_session` must not be renamed (it would log everyone out).
- Deploy: `sh deploy/push.sh root@157.230.28.253`. Production currently runs commit `7c88157` (before the fixes below).
- Security to-do for me: the root password was exposed in a chat. Rotate it, use SSH keys, set `PasswordAuthentication no`.
- Production upstream uses `ALLOW_INSECURE_UPSTREAM=true` to `gw.proxi.st:9999`: upstream credentials travel in cleartext. Switch to a TLS endpoint if the provider has one.

## Done in the last session (branch `claude/admiring-feynman-m7z09c`, not merged or deployed yet)
1. **Customer lockout fix:** proxy auth ran scrypt (~66 ms) per request; above `MAX_CONCURRENT_AUTH` the extras got 407 and counted as failed logins, so paying customers with parallel requests were locked out. Now: HMAC-keyed cache of verified credentials (5 min, invalidated by password change/disable) checked *before* the scrypt gate; a full gate returns `AUTH_BUSY` -> 503, not counted as a failure. Burst test: 160/160 succeed.
2. **Rate limits behind nginx:** the site is loopback-only behind nginx, so every visitor shared the `127.0.0.1` bucket (5 signups/min site-wide). Now `clientAddress(request)` uses `X-Real-IP` / last `X-Forwarded-For` entry from loopback peers; `deploy/nginx-proxora.conf` sets `X-Real-IP` (copy it to `/etc/nginx/sites-available/proxora` and reload nginx on deploy).
3. Added `CLAUDE.md`.
Open nits: add `Strict-Transport-Security` and `server_tokens off` to nginx; README still has the old "Private Proxy Gateway" title and a Windows path; `package.json` name is `private-proxy-gateway`.

## Business inputs
- My upstream cost: **residential $0.15/GB, mobile $0.29/GB**. I can open multiple provider accounts. (Confirm with me: provider names, username formats, and that resale is allowed.)
- A client is asking for a Web Unlocker. Benchmarks (2026, verify before publishing): Bright Data Web Unlocker ~$1.50/1k successful requests PAYG ($1.30/1k on $499 plan), Decodo ~$0.95/1k, IPRoyal ~$1.00/1k, Gologin ~$0.98/1k, Oxylabs ~$0.90/1k ($1.40 with JS). Residential proxies retail $1-3/GB, mobile $2-5/GB.

## Unit economics (estimates, to be replaced by measured data)
- HTML page compressed ~150 KB; browser-rendered page with images/fonts/media blocked ~1.5 MB (~0.6 MB with our own JS/CSS cache).
- Cost per 1,000 successful requests: easy ~$0.03, medium ~$0.07, hard via browser $0.65 unoptimized / $0.14-0.26 optimized, unbilled final failures +$0.03. **Blended (60/30/10 mix): ~$0.13 before, ~$0.09 after optimization.**
- Compute is minor: a 4 vCPU / 8 GB worker (~$48/mo) handles ~3M browser pages/month (~$0.015/1k).
- Fixed costs ~$100-130/month; break-even ~$150/month revenue.
- Scenarios: 2M req/mo -> ~$1,190 profit (74%); 10M req + 500 GB resi + 100 GB mobile -> ~$7,720 revenue, ~$5,990 profit (78%).

## Pricing and business model (agreed direction)
- Web Unlocker: **$0.80 / 1k successful** ($0.60 at volume), **$1.20 / 1k with `render=true`**, premium pricing for domains that cost us too much. Bill successful requests only.
- Residential $1.50/GB -> $0.80/GB at volume; mobile $2.50 -> $2.00/GB. Wholesale to resellers $0.40-0.60/GB.
- **One prepaid USD wallet** usable for all products (replaces per-product GB packs), top-up bonuses (+5% at $100, +10% at $500), crypto-first (no chargebacks; if cards are added, $10 minimum).
- Subscriptions: $49 (70k req, $0.70/1k over), $199 (330k, $0.60), $499 (1M, $0.50).
- Free trial after email verification: 1,000 unlocker requests + 100 MB.
- First client: pilot at ~$0.60/1k with a monthly commitment.
- Later: target-specific scraper APIs (SERP, e-commerce) at $1-2/1k results.
- Guardrails: public pages only; no account login/takeover, ticket/sneaker bots, paywall bypass or attacks; domain blocklist; KYC for large buyers; update `public/acceptable-use.html` and terms accordingly.

## Web Unlocker architecture to build
- API: `POST /v1/unlock {url, country?, render?: bool, session?}` with an API key (dashboard issues/rotates keys) -> returns status, final URL, headers, HTML. Proxy-mode endpoint later.
- Escalating tiers: (1) HTTP request through residential with a realistic Chrome TLS/HTTP2 fingerprint and headers (Node's default fingerprint is blocked), always `Accept-Encoding: br, gzip`; (2) new IP / mobile IP; (3) headless Chromium via Playwright through the proxy, blocking images/fonts/media and serving cached static JS/CSS locally.
- Block detection: 403/429/503, challenge-page markers, empty or suspiciously small bodies. Only real pages count as success.
- Per-domain strategy memory (start at the cheapest tier that worked), sticky session + cookie reuse after a passed challenge, retry budget (max ~4 attempts), multi-provider routing by success/cost.
- Per-request ledger: tier used, attempts, bytes, provider, cost, success; dashboard of success rate and cost per domain; auto-flag money-losing domains.
- Same SSRF/destination protections as the gateway.

## Roadmap
1. Merge + deploy the two fixes (and the nginx `X-Real-IP` change). Nginx hardening + README/package cleanup.
2. **Phase 1:** USD wallet + per-request billing, API keys, unlocker tiers 1-2, block detection, per-domain memory, cost ledger, tests.
3. **Phase 2:** move storage to PostgreSQL (the JSON store cannot handle per-request metering at scale), browser tier on a separate worker server, asset cache.
4. **Phase 3:** pricing page and plans, proxy-mode unlocker, success-rate stats, affiliate program, second server + backups.

Start by confirming the baseline, then ask me for the provider details you need, and propose a concrete Phase 1 plan before writing code. Commit on a feature branch with clear messages; never deploy without telling me.
