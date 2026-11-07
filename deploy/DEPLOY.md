# Deploying Veyora to a server

> **Live now (temporary address):** `https://veyora.157-230-28-253.sslip.io` (site) and `https://gate.157-230-28-253.sslip.io:8443` (proxy) on 157.230.28.253. sslip.io maps the name to the IP, so Let's Encrypt certificates work without a domain. To move Veyora to a real domain: add its DNS records (step 1), replace the sslip.io names in `/etc/nginx/sites-available/proxora`, `/etc/letsencrypt/renewal-hooks/deploy/proxora.sh` and `PUBLIC_PROXY_URL` in `/opt/proxora/.env`, then rerun step 5 and `systemctl restart proxora`. The `proxora` service, user, and filesystem names are retained as legacy operational identifiers.

Target: Ubuntu 24.04 with Node 20+ and nginx (as on 157.230.28.253). Replace `veyora.example` with the real domain everywhere below and in `nginx-proxora.conf` and `certbot-deploy-hook.sh`.

| Piece | Where it listens | Who reaches it |
|---|---|---|
| Website, signup, dashboard | `127.0.0.1:3100` behind nginx (HTTPS) | Everyone, via `https://veyora.example` |
| Proxy gateway | `0.0.0.0:8443`, TLS | Customers' tools, via `https://gate.veyora.example:8443` |
| Admin API | `127.0.0.1:3101` | Only `npm run admin` on the server |

## 1. DNS

At the registrar, point three A records at the server IP: `veyora.example`, `www.veyora.example`, `gate.veyora.example`. Wait until `nslookup gate.veyora.example` returns the IP.

## 2. One-time server setup (as root)

```sh
useradd --system --home /opt/proxora --shell /usr/sbin/nologin proxora
install -d -o proxora -g proxora /opt/proxora /opt/proxora/data
apt-get install -y certbot python3-certbot-nginx
```

## 3. Copy the app (from this PC, in the proxy-provider folder)

```sh
sh deploy/push.sh root@157.230.28.253
```

The first run reports that the service does not exist yet; that is expected.

## 4. Production settings on the server

Create `/opt/proxora/.env` from `.env.example` and set at least:

```ini
PROXY_HOST=0.0.0.0
PROXY_PORT=8443
PROXY_TLS_CERT_FILE=/opt/proxora/certs/fullchain.pem
PROXY_TLS_KEY_FILE=/opt/proxora/certs/privkey.pem
PUBLIC_PROXY_URL=https://gate.veyora.example:8443
UPSTREAM_PROXY_HOST=gw.proxi.st
UPSTREAM_PROXY_PORT=9999
UPSTREAM_PROXY_USERNAME=...
UPSTREAM_PROXY_PASSWORD=...
ALLOW_INSECURE_UPSTREAM=true
PAYMENTS_PORT=3100
DATA_FILE=/opt/proxora/data/store.json
ADMIN_TOKEN=<new random value, not the one from the PC>
```

Then `chown root:proxora /opt/proxora/.env && chmod 640 /opt/proxora/.env`.

## 5. nginx and certificates

```sh
cp /opt/proxora/deploy/nginx-proxora.conf /etc/nginx/sites-available/proxora
ln -s /etc/nginx/sites-available/proxora /etc/nginx/sites-enabled/proxora
nginx -t && systemctl reload nginx
install -m 755 /opt/proxora/deploy/certbot-deploy-hook.sh /etc/letsencrypt/renewal-hooks/deploy/proxora.sh
certbot --nginx -d veyora.example -d www.veyora.example
certbot certonly --nginx -d gate.veyora.example
```

The second certbot command runs the deploy hook, which copies the gateway certificate to `/opt/proxora/certs`. Renewals repeat that automatically and restart the service.

## 6. Start it

The server firewall (`server-firewall.sh`) only lets SSH and web in, so open the gateway port first:

```sh
ufw allow 8443/tcp comment 'proxora gateway'
```

```sh
cp /opt/proxora/deploy/proxora.service /etc/systemd/system/proxora.service
systemctl daemon-reload
systemctl enable --now proxora
journalctl -u proxora -n 20 --no-pager
```

## 7. Use it

- Sign up at `https://veyora.example/signup`, then on the server: `cd /opt/proxora && sudo -u proxora node --env-file=.env src/admin.js credit you@example.com 10`
- In the dashboard, generate a proxy password, then test: `curl --proxy "https://USERNAME:PASSWORD@gate.veyora.example:8443" https://api.ipify.org`

## Backups

Everything lives in `/opt/proxora/data/` (accounts, quotas, sessions, payments). Copy that folder off the server regularly.
