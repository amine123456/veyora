import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { HomeIcons } from '@/components/home/icons';
import { ORGANIZATION, UNLOCKER_PRODUCT, breadcrumbs, shareImage } from '@/components/seo/schema';

const SHARE = shareImage('og-web-unlocker.png', 'Veyora Web Unlocker API');
const jsonLd = { '@context': 'https://schema.org', '@graph': [ORGANIZATION, UNLOCKER_PRODUCT, breadcrumbs('Web Unlocker', '/web-unlocker')] };

export const metadata: Metadata = {
  title: 'Web Unlocker API — Veyora | $0.20 per 1,000 Requests',
  description:
    'Send a URL, get the page back. Veyora Web Unlocker fetches supported public pages through residential IPs with automatic retries. $0.20 per 1,000 requests.',
  alternates: { canonical: 'https://veyora.pro/web-unlocker' },
  openGraph: {
    title: 'Web Unlocker API — Veyora',
    description: 'Send a URL, get the page back. Residential IP rotation, automatic retries. $0.20/1k requests.',
    url: 'https://veyora.pro/web-unlocker',
    siteName: 'Veyora',
    type: 'website',
    images: SHARE.openGraph.images,
  },
  twitter: {
    ...SHARE.twitter,
    title: 'Web Unlocker API — Veyora',
    description: 'Send a URL, get the page back. Residential IP rotation, automatic retries. $0.20/1k requests.',
  },
};

export default function WebUnlockerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeIcons />
      <a className="skip" href="#main">
        Skip to content
      </a>
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
              <li>
                <a href="/docs">Documentation</a>
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
                <a href="/data-feeds">Data Feeds</a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <a href="/support">Support</a>
              </li>
            </ul>
          </nav>
          <div className="nav__actions">
            <a className="nav__login" href="/login">
              Log in
            </a>{' '}
            <a className="btn btn--ink btn--sm" href="/signup">
              Get started
            </a>
          </div>
        </div>
      </header>
      <main id="main">
        <section className="panel hero" style={{ minHeight: 0, paddingBottom: 'clamp(48px, 6vw, 80px)' }}>
          <div className="hero__copy" style={{ paddingTop: '120px' }}>
            <p className="chip">
              <span className="dot" />
              Web Unlocker API
            </p>
            <h1 className="h1" data-split="">
              Send a URL.{' '}
              <span className="y">
                <em className="serif">Get the page back.</em>
              </span>
            </h1>
            <p className="sub">
              The Web Unlocker API fetches supported public pages through residential IPs.
              Blocked requests are retried automatically on new exits until the page comes back.
              Just $0.20 per 1,000 successful requests.
            </p>
            <div className="cta-row">
              <a className="btn btn--yellow btn--lg" href="/signup">
                Get an API key
              </a>{' '}
              <a className="btn btn--ghost-dark btn--lg" href="/docs#unlocker">
                Read the docs
              </a>
            </div>
            <p className="hero__pill">
              No credit card required. 5,000 free requests on signup ($1.00 credit).
            </p>
          </div>
        </section>

        <section className="container" style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <h2 className="h2" style={{ textAlign: 'center', marginBottom: '16px' }} data-split="">
              One request, one result
            </h2>
            <p className="sub" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto clamp(32px, 4vw, 48px)' }}>
              No browser setup, no proxy rotation, no CAPTCHA solving.
              Send a POST request and get the rendered HTML back.
            </p>
            <div className="ucode" style={{ maxWidth: '720px', margin: '0 auto' }}>
              <p className="well__h well__h--dark">
                <span>Request</span>
                <em className="tagv">Production endpoint</em>
              </p>
              <pre className="ucode__pre" tabIndex={0} aria-label="Web Unlocker request example">
                <code>
                  <span className="k">{'curl'}</span>
                  {' -X POST https://veyora.pro/v1/unlock \\\n  -H '}
                  <span className="s">{'"Authorization: Bearer YOUR_API_KEY"'}</span>
                  {' \\\n  -H '}
                  <span className="s">{'"Content-Type: application/json"'}</span>
                  {' \\\n  -d '}
                  <span className="s">{'\'{"url": "https://example.com/", "country": "fr"}\''}</span>
                </code>
              </pre>
              <p className="ucode__resp">
                <span>
                  <i className="dot" />
                  <b>200 OK</b>
                </span>
                <small>HTML returned</small>
              </p>
              <div className="ucode__fields">
                <p className="well__h well__h--dark">
                  <span>Request fields</span>
                </p>
                <ul>
                  <li>
                    <code>url</code>
                    <span>The page to fetch (required)</span>
                  </li>
                  <li>
                    <code>country</code>
                    <span>Two-letter exit country (optional)</span>
                  </li>
                  <li>
                    <code>session</code>
                    <span>Session name to keep exit and cookies (optional)</span>
                  </li>
                  <li>
                    <code>render</code>
                    <span>Set to true to render JavaScript (optional)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="container" style={{ padding: '0 0 clamp(48px, 6vw, 80px)' }}>
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <h2 className="h2" style={{ textAlign: 'center', marginBottom: 'clamp(32px, 4vw, 56px)' }} data-split="">
              How it works
            </h2>
            <dl className="faq__list">
              <div className="faq__item">
                <dt>Automatic retries</dt>
                <dd>
                  If the target site blocks a request, the API automatically retries on a new residential IP.
                  You are billed when the page is fetched — including if the target returns a 404. Blocked and failed requests are not charged.
                </dd>
              </div>
              <div className="faq__item">
                <dt>Pricing</dt>
                <dd>
                  $0.20 per 1,000 successful requests, deducted from your prepaid wallet.
                  Pages that require a CAPTCHA solve cost an additional $0.005 per request.
                  Every new account gets $1.00 free credit — enough for 5,000 requests with no payment needed.
                </dd>
              </div>
              <div className="faq__item">
                <dt>Authentication</dt>
                <dd>
                  Create an API key in the dashboard. Pass it as a Bearer token in the Authorization header.
                  Keys can be scoped and revoked at any time.
                </dd>
              </div>
              <div className="faq__item">
                <dt>Sessions</dt>
                <dd>
                  Name a session to keep the same exit IP and cookies across requests.
                  This is useful for multi-step flows like login, search, and checkout sequences.
                </dd>
              </div>
              <div className="faq__item">
                <dt>JavaScript rendering</dt>
                <dd>
                  Set <code style={{ background: '#F4F2EC', padding: '2px 7px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>render: true</code> to
                  get the fully rendered page after JavaScript execution.
                  Useful for SPAs and pages that load content dynamically.
                </dd>
              </div>
              <div className="faq__item">
                <dt>Response format</dt>
                <dd>
                  The API returns the page HTML as a string, along with the final HTTP status code,
                  response headers, and metadata about the request (exit country, latency, retries).
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="panel endpanel">
          <div className="cta container">
            <h2 className="h2" data-split="">
              Try it{' '}
              <span className="y">
                <em className="serif">right now.</em>
              </span>
            </h2>
            <p className="sub">
              Create an account, grab your API key, and send your first request.
              5,000 free requests included — no card needed.
            </p>
            <div className="cta-row">
              <a className="btn btn--yellow btn--lg" href="/signup">
                Get an API key
              </a>{' '}
              <a className="btn btn--ghost-dark btn--lg" href="/docs#unlocker">
                Full documentation
              </a>
            </div>
            <p className="cta__note">No credit card required</p>
          </div>
          <footer className="footer container" id="footer">
            <div className="footer__bar">
              <p>
                Need help? <a href="/support">Send a support request</a>
              </p>
              <p>&copy; 2026 Veyora. All rights reserved.</p>
            </div>
          </footer>
        </section>
      </main>
      <LegacyScripts sources={['/app.js']} />
    </>
  );
}
