import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { HomeIcons } from '@/components/home/icons';

export const metadata: Metadata = {
  title: 'Residential Proxies — Veyora | 5M IPs in 195 Countries',
  description:
    '5 million residential IPs from real ISPs in 195 countries. HTTP, HTTPS and SOCKS5 on one gateway. Sticky or rotating sessions. Prepaid from $2/GB.',
  alternates: { canonical: 'https://veyora.pro/residential-proxies' },
  openGraph: {
    title: 'Residential Proxies — Veyora',
    description: '5 million residential IPs in 195 countries. HTTP, HTTPS & SOCKS5. Sticky or rotating. From $2/GB.',
    url: 'https://veyora.pro/residential-proxies',
    siteName: 'Veyora',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Residential Proxies — Veyora',
    description: '5M residential IPs in 195 countries. HTTP, HTTPS & SOCKS5. Sticky or rotating. From $2/GB.',
  },
};

export default function ResidentialProxiesPage() {
  return (
    <>
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
              Residential Proxies
            </p>
            <h1 className="h1" data-split="">
              5 million IPs from{' '}
              <span className="y">
                <em className="serif">real home ISPs.</em>
              </span>
            </h1>
            <p className="sub">
              Route traffic through residential internet providers in 195 countries.
              HTTP, HTTPS, and SOCKS5 on a single gateway.
              Sticky sessions hold the same exit for 10 minutes; rotating sessions get a fresh IP every request.
            </p>
            <div className="cta-row">
              <a className="btn btn--yellow btn--lg" href="/signup">
                Start free
              </a>{' '}
              <a className="btn btn--ghost-dark btn--lg" href="/docs">
                Read the docs
              </a>
            </div>
            <p className="hero__pill">
              No credit card required. Every account starts with $1.00 free credit.
            </p>
          </div>
        </section>

        <section className="container" style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <h2 className="h2" style={{ textAlign: 'center', marginBottom: 'clamp(32px, 4vw, 56px)' }} data-split="">
              How it works
            </h2>
            <dl className="faq__list">
              <div className="faq__item">
                <dt>Gateway connection</dt>
                <dd>
                  Point any HTTP client at <code style={{ background: '#F4F2EC', padding: '2px 7px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>gate.veyora.pro:8080</code> (HTTP/SOCKS5)
                  or <code style={{ background: '#F4F2EC', padding: '2px 7px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>gate.veyora.pro:8443</code> (HTTPS CONNECT).
                  Authenticate with the username and password from your dashboard.
                </dd>
              </div>
              <div className="faq__item">
                <dt>Country targeting</dt>
                <dd>
                  Append <code style={{ background: '#F4F2EC', padding: '2px 7px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>-country-fr</code> to your username
                  to exit through France (or any of 195 two-letter country codes). Leave it off to use the full global pool.
                </dd>
              </div>
              <div className="faq__item">
                <dt>Sticky sessions</dt>
                <dd>
                  Add <code style={{ background: '#F4F2EC', padding: '2px 7px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>-session-mycart</code> to keep the same exit IP and cookies for up to 10 minutes.
                  Without a session name, every request gets a fresh IP from the pool.
                </dd>
              </div>
              <div className="faq__item">
                <dt>Billing</dt>
                <dd>
                  Traffic is billed per GB from your prepaid balance. Plans start at $29/mo for 8 GB.
                  You can also buy one-off top-ups from $10. Unused traffic never expires.
                </dd>
              </div>
              <div className="faq__item">
                <dt>Protocols</dt>
                <dd>
                  HTTP, HTTPS (via CONNECT), and SOCKS5 are all available on the same gateway.
                  Works with cURL, Python requests, Node.js, Playwright, Puppeteer, Scrapy, and any standard proxy client.
                </dd>
              </div>
              <div className="faq__item">
                <dt>IP sourcing</dt>
                <dd>
                  Every exit address is a real residential IP from a consumer internet service provider.
                  IPs are sourced from opt-in peer networks where users have explicitly consented to share their bandwidth.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="panel endpanel">
          <div className="cta container">
            <h2 className="h2" data-split="">
              Ready to{' '}
              <span className="y">
                <em className="serif">get started?</em>
              </span>
            </h2>
            <p className="sub">
              Create an account and get $1.00 free credit — no card needed.
              Your proxy credentials appear in the dashboard immediately.
            </p>
            <div className="cta-row">
              <a className="btn btn--yellow btn--lg" href="/signup">
                Create free account
              </a>{' '}
              <a className="btn btn--ghost-dark btn--lg" href="/#pricing">
                View pricing
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
