import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';

export const metadata: Metadata = {
  title: 'Documentation — Veyora',
  description:
    'Veyora API documentation: proxy gateway setup, Web Unlocker API, authentication, targeting, and code examples.',
};

export default function DocsPage() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="cc">
            <circle cx="12" cy="12" r="12" />
          </clipPath>
        </defs>
        <symbol id="i-logo" viewBox="0 0 28 28">
          <rect width="28" height="28" rx="8" fill="#FFDD1F" />
          <path d="M7.5 8h3.4l3.1 9.1L17.100 8h3.400l-4.800 12h-3.400z" fill="#161615" />
        </symbol>
      </svg>
      <header className="nav" id="nav">
        <div className="nav__in">
          <span className="nav__spacer" aria-hidden="true" />{' '}
          <nav className="nav__center" aria-label="Primary">
            <ul className="nav__links nav__links--l">
              <li>
                <a href="/#products">Products</a>
              </li>
              <li>
                <a href="/#pricing">Pricing</a>
              </li>
            </ul>{' '}
            <a className="brand" href="/" aria-label="Veyora, back to home">
              <svg className="brand__mark" aria-hidden="true">
                <use href="#i-logo" />
              </svg>
              <span>veyora</span>
            </a>{' '}
            <ul className="nav__links nav__links--r">
              <li>
                <a href="/#compare">Network</a>
              </li>
              <li>
                <a href="/docs">Docs</a>
              </li>
            </ul>
          </nav>
          <div className="nav__actions">
            <a className="nav__login" href="/login">
              Log in
            </a>{' '}
            <a className="btn btn--ink btn--sm" href="/signup">
              Start free
            </a>{' '}
            <button
              className="nav__toggle"
              id="navToggle"
              type="button"
              aria-expanded="false"
              aria-controls="sheet"
              aria-label="Open menu"
            >
              <i />
              <i />
            </button>
          </div>
        </div>
      </header>
      <div className="sheet" id="sheet" hidden>
        <ul>
          <li>
            <a href="/#products">Products</a>
          </li>
          <li>
            <a href="/#pricing">Pricing</a>
          </li>
          <li>
            <a href="/#compare">Network</a>
          </li>
          <li>
            <a href="/docs">Docs</a>
          </li>
          <li>
            <a href="/login">Log in</a>
          </li>
        </ul>{' '}
        <a className="btn btn--yellow btn--block" href="/signup">
          Start free
        </a>
      </div>
      <main>
        <article className="legal">
          <div className="container">
            <p className="eyebrow">Documentation</p>
            <h1>API Reference</h1>
            <p className="lead">
              Everything you need to integrate Veyora's residential proxies and Web Unlocker into your application.
            </p>
            <ul className="docs-nav">
              <li>
                <a href="#quickstart">Quick start</a>
              </li>
              <li>
                <a href="#proxy">Proxy gateway</a>
              </li>
              <li>
                <a href="#targeting">Targeting</a>
              </li>
              <li>
                <a href="#unlocker">Web Unlocker</a>
              </li>
              <li>
                <a href="#api-keys">API keys</a>
              </li>
              <li>
                <a href="#errors">Errors</a>
              </li>
              <li>
                <a href="#limits">Limits</a>
              </li>
            </ul>{' '}
            <h2 id="quickstart">Quick start</h2>
            <p>
              Create an account at <a href="/signup">/signup</a>. Every account starts with{' '}
              <strong>$1.00 free credit</strong> — enough for 5,000 Web Unlocker requests or roughly 0.6 GB of proxy
              traffic. Your proxy credentials and API keys are in the <a href="/account">dashboard</a>.
            </p>
            <div className="card">
              <h3>Your first request in 30 seconds</h3>
              <pre>
                {
                  'curl -x gate.veyora.io:8443 \\\n     -U "your-username:your-password" \\\n     https://httpbin.org/ip'
                }
              </pre>
              <p>
                Replace <code>your-username</code> and <code>your-password</code> with the credentials from your
                dashboard.
              </p>
            </div>{' '}
            <h2 id="proxy">Proxy gateway</h2>
            <p>
              The proxy gateway accepts standard HTTP, HTTPS (CONNECT) and SOCKS5 connections. Point any HTTP client,
              browser, or scraping framework at the gateway and authenticate with Basic auth.
            </p>
            <h3>Connection details</h3>
            <table>
              <tbody>
                <tr>
                  <th>Parameter</th>
                  <th>Value</th>
                </tr>
                <tr>
                  <td>Host</td>
                  <td>
                    <code>gate.veyora.io</code>
                  </td>
                </tr>
                <tr>
                  <td>Port</td>
                  <td>
                    <code>8443</code>
                  </td>
                </tr>
                <tr>
                  <td>Protocol</td>
                  <td>HTTP / HTTPS (CONNECT) / SOCKS5</td>
                </tr>
                <tr>
                  <td>Auth</td>
                  <td>Basic (username:password)</td>
                </tr>
              </tbody>
            </table>
            <h3>cURL</h3>
            <pre>{'curl -x gate.veyora.io:8443 \\\n     -U "USER:PASS" \\\n     https://example.com'}</pre>
            <h3>Python (requests)</h3>
            <pre>
              {
                'import requests\n\nproxies = {\n    "http":  "http://USER:PASS@gate.veyora.io:8443",\n    "https": "http://USER:PASS@gate.veyora.io:8443",\n}\n\nr = requests.get("https://example.com", proxies=proxies)\nprint(r.text)'
              }
            </pre>
            <h3>Node.js (undici)</h3>
            <pre>
              {
                "import { ProxyAgent, fetch } from 'undici';\n\nconst agent = new ProxyAgent('http://USER:PASS@gate.veyora.io:8443');\nconst res = await fetch('https://example.com', { dispatcher: agent });\nconsole.log(await res.text());"
              }
            </pre>
            <h3>Playwright</h3>
            <pre>
              {
                "const browser = await chromium.launch({\n  proxy: {\n    server: 'http://gate.veyora.io:8443',\n    username: 'USER',\n    password: 'PASS',\n  },\n});"
              }
            </pre>
            <h3>Puppeteer</h3>
            <pre>
              {
                "const browser = await puppeteer.launch({\n  args: ['--proxy-server=http://gate.veyora.io:8443'],\n});\nconst page = await browser.newPage();\nawait page.authenticate({ username: 'USER', password: 'PASS' });\nawait page.goto('https://example.com');"
              }
            </pre>
            <h3>Scrapy</h3>
            <pre>
              <span className="cmt">{'# settings.py'}</span>
              {
                '\nDOWNLOADER_MIDDLEWARES = {\n    "scrapy.downloadermiddlewares.httpproxy.HttpProxyMiddleware": 1,\n}\nHTTP_PROXY = "http://USER:PASS@gate.veyora.io:8443"'
              }
            </pre>{' '}
            <h2 id="targeting">Targeting options</h2>
            <p>
              Append flags to your username to control the exit IP. Options combine in this order: <code>-mobile</code>,
              then <code>-country-xx</code>, then <code>-session-name</code>.
            </p>
            <table>
              <tbody>
                <tr>
                  <th>Username</th>
                  <th>Effect</th>
                </tr>
                <tr>
                  <td>
                    <code>USER</code>
                  </td>
                  <td>Random residential IP, rotates every request</td>
                </tr>
                <tr>
                  <td>
                    <code>USER-country-fr</code>
                  </td>
                  <td>Residential IP in France (any two-letter ISO code)</td>
                </tr>
                <tr>
                  <td>
                    <code>USER-session-job1</code>
                  </td>
                  <td>Sticky IP for 10 minutes (any name up to 32 alphanumeric chars)</td>
                </tr>
                <tr>
                  <td>
                    <code>USER-country-de-session-cart</code>
                  </td>
                  <td>Sticky German IP</td>
                </tr>
                <tr>
                  <td>
                    <code>USER-mobile</code>
                  </td>
                  <td>Mobile carrier IP (4G/5G) — billed from wallet at mobile rate</td>
                </tr>
                <tr>
                  <td>
                    <code>USER-mobile-country-us</code>
                  </td>
                  <td>Mobile IP in the US</td>
                </tr>
                <tr>
                  <td>
                    <code>USER-mobile-country-gb-session-s1</code>
                  </td>
                  <td>Sticky mobile IP in the UK</td>
                </tr>
              </tbody>
            </table>
            <h3>Country codes</h3>
            <p>
              Use standard{' '}
              <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2" rel="noopener">
                ISO 3166-1 alpha-2
              </a>{' '}
              codes: <code>us</code>, <code>gb</code>, <code>de</code>, <code>fr</code>, <code>jp</code>,{' '}
              <code>br</code>, <code>in</code>, <code>au</code>, etc. Leave it off to use the full 195-country pool.
            </p>{' '}
            <h2 id="unlocker">Web Unlocker API</h2>
            <p>
              The Web Unlocker fetches a public web page for you. If the page is blocked, it automatically retries on
              new residential and mobile IPs. You pay only for successful responses — blocked or failed requests are
              free.
            </p>
            <div className="card">
              <h3>Pricing</h3>
              <p>
                <strong>$0.20 per 1,000 successful requests.</strong> Every account starts with $1.00 free credit (5,000
                requests). Failed and blocked requests are not billed.
              </p>
            </div>
            <h3>Endpoint</h3>
            <table>
              <tbody>
                <tr>
                  <th>Method</th>
                  <th>URL</th>
                </tr>
                <tr>
                  <td>
                    <code>POST</code>
                  </td>
                  <td>
                    <code>https://your-domain/v1/unlock</code>
                  </td>
                </tr>
              </tbody>
            </table>
            <h3>Authentication</h3>
            <p>
              Include your API key in the <code>Authorization</code> header as a Bearer token.
            </p>
            <pre>{'Authorization: Bearer YOUR_API_KEY'}</pre>
            <h3>Request body (JSON)</h3>
            <table>
              <tbody>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
                <tr>
                  <td>
                    <code>url</code>
                  </td>
                  <td>string</td>
                  <td>Yes</td>
                  <td>The public URL to fetch (http or https)</td>
                </tr>
                <tr>
                  <td>
                    <code>country</code>
                  </td>
                  <td>string</td>
                  <td>No</td>
                  <td>Two-letter country code for the exit IP</td>
                </tr>
                <tr>
                  <td>
                    <code>session</code>
                  </td>
                  <td>string</td>
                  <td>No</td>
                  <td>Session name to reuse the same IP and cookies (up to 10 min)</td>
                </tr>
              </tbody>
            </table>
            <h3>cURL example</h3>
            <pre>
              {
                'curl -X POST https://your-domain/v1/unlock \\\n     -H "Authorization: Bearer YOUR_API_KEY" \\\n     -H "Content-Type: application/json" \\\n     -d \'{"url": "https://example.com"}\''
              }
            </pre>
            <h3>With country and session</h3>
            <pre>
              {
                'curl -X POST https://your-domain/v1/unlock \\\n     -H "Authorization: Bearer YOUR_API_KEY" \\\n     -H "Content-Type: application/json" \\\n     -d \'{"url": "https://example.com", "country": "de", "session": "job1"}\''
              }
            </pre>
            <h3>Python</h3>
            <pre>
              {
                'import requests\n\nr = requests.post(\n    "https://your-domain/v1/unlock",\n    headers={"Authorization": "Bearer YOUR_API_KEY"},\n    json={"url": "https://example.com", "country": "fr"},\n)\nprint(r.json())'
              }
            </pre>
            <h3>Node.js</h3>
            <pre>
              {
                "const res = await fetch('https://your-domain/v1/unlock', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({ url: 'https://example.com' }),\n});\nconst data = await res.json();\nconsole.log(data);"
              }
            </pre>
            <h3>Response</h3>
            <p>A successful response returns the fetched page:</p>
            <pre>
              {
                '{\n  "status": 200,\n  "url": "https://example.com",\n  "body": "<!doctype html>...",\n  "headers": { "content-type": "text/html; charset=UTF-8", ... }\n}'
              }
            </pre>{' '}
            <h2 id="api-keys">API keys</h2>
            <p>
              API keys authenticate Web Unlocker requests. Create and manage them in your{' '}
              <a href="/account">dashboard</a> under the API Keys section.
            </p>
            <ul>
              <li>
                Each account can hold up to <strong>10 API keys</strong>.
              </li>
              <li>Keys are shown once at creation — copy and store them securely.</li>
              <li>We store only a hash of each key; lost keys must be replaced.</li>
              <li>Revoke a key from the dashboard at any time. Revocation is immediate.</li>
              <li>All keys on an account share the same wallet balance.</li>
            </ul>{' '}
            <h2 id="errors">Error codes</h2>
            <table>
              <tbody>
                <tr>
                  <th>HTTP Status</th>
                  <th>Meaning</th>
                </tr>
                <tr>
                  <td>
                    <code>400</code>
                  </td>
                  <td>Bad request — missing or invalid fields</td>
                </tr>
                <tr>
                  <td>
                    <code>401</code>
                  </td>
                  <td>Unauthorized — missing or invalid API key / proxy credentials</td>
                </tr>
                <tr>
                  <td>
                    <code>402</code>
                  </td>
                  <td>Payment required — insufficient balance</td>
                </tr>
                <tr>
                  <td>
                    <code>403</code>
                  </td>
                  <td>Forbidden — account disabled or URL blocked by policy</td>
                </tr>
                <tr>
                  <td>
                    <code>407</code>
                  </td>
                  <td>Proxy authentication required — missing credentials on gateway</td>
                </tr>
                <tr>
                  <td>
                    <code>429</code>
                  </td>
                  <td>Too many requests — rate limited</td>
                </tr>
                <tr>
                  <td>
                    <code>502</code>
                  </td>
                  <td>Bad gateway — upstream connection failed</td>
                </tr>
                <tr>
                  <td>
                    <code>503</code>
                  </td>
                  <td>Service unavailable — all attempts blocked (Web Unlocker)</td>
                </tr>
              </tbody>
            </table>{' '}
            <h2 id="limits">Rate limits & billing</h2>
            <h3>Proxy gateway</h3>
            <ul>
              <li>
                Traffic is metered by the byte: residential at the per-GB rate, mobile at the mobile rate (shown in your
                dashboard).
              </li>
              <li>Prepaid GB packs are consumed first for residential traffic; the wallet pays the rest.</li>
              <li>Sticky sessions last up to 10 minutes.</li>
              <li>Requests to private/internal IPs are blocked (SSRF protection).</li>
            </ul>
            <h3>Web Unlocker</h3>
            <ul>
              <li>
                <strong>$0.20 per 1,000 successful requests</strong> (charged per request from wallet).
              </li>
              <li>Blocked and failed requests are not billed.</li>
              <li>
                Only <code>GET</code> requests on standard web ports (80, 443).
              </li>
              <li>Cannot send custom cookies or credentials to the target site.</li>
              <li>Some sites are refused by policy (ticket resale, sneaker drops, etc.).</li>
              <li>Respect a reasonable request rate for each destination.</li>
            </ul>
            <h3>Wallet</h3>
            <ul>
              <li>All purchases are in USDT on BNB Smart Chain (BEP-20).</li>
              <li>Balance is prepaid in USD micro-units; no withdrawals or transfers.</li>
              <li>Larger top-ups include a bonus (shown before checkout).</li>
              <li>
                All sales are final — see our <a href="/refund-policy">refund policy</a>.
              </li>
            </ul>
            <h3>Need help?</h3>
            <p>
              Contact us through the <a href="/support">support form</a>. Include your username or API key name (never
              the key itself) and any relevant request details.
            </p>
          </div>
        </article>
      </main>
      <section className="panel">
        <footer className="footer container" id="footer">
          <div className="footer__top">
            <div className="footer__brand">
              <a className="brand brand--light" href="/" aria-label="Veyora, back to home">
                <svg className="brand__mark" aria-hidden="true">
                  <use href="#i-logo" />
                </svg>
                <span>veyora</span>
              </a>{' '}
              <p>Residential proxy access with clear pricing, usage controls, and human support.</p>
            </div>
            <nav className="footer__cols" aria-label="Footer">
              <div>
                <h4>Products</h4>
                <ul>
                  <li>
                    <a href="/#products">Residential proxies</a>
                  </li>
                  <li>
                    <a href="/#unlocker">Web Unlocker</a>
                  </li>
                  <li>
                    <a href="/#pricing">Pricing</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Company</h4>
                <ul>
                  <li>
                    <a href="/about">About</a>
                  </li>
                  <li>
                    <a href="/support">Contact & support</a>
                  </li>
                  <li>
                    <a href="/account">Customer account</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Resources</h4>
                <ul>
                  <li>
                    <a href="/docs">Documentation</a>
                  </li>
                  <li>
                    <a href="/#compare">How the network works</a>
                  </li>
                  <li>
                    <a href="/support">Frequently asked questions</a>
                  </li>
                </ul>
              </div>
              <div>
                <h4>Legal</h4>
                <ul>
                  <li>
                    <a href="/terms">Terms of service</a>
                  </li>
                  <li>
                    <a href="/privacy">Privacy policy</a>
                  </li>
                  <li>
                    <a href="/acceptable-use">Acceptable use</a>
                  </li>
                  <li>
                    <a href="/refund-policy">Refund policy</a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
          <div className="footer__bar">
            <p>
              Need help? <a href="/support">Send a support request</a>
            </p>
            <p>© 2026 Veyora. All rights reserved.</p>
          </div>
        </footer>
      </section>
      <LegacyScripts sources={['/nav.js']} />
    </>
  );
}
