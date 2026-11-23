import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';

// Verify email (same auth frame as /signup, /login). Every #verify-* id that
// public/verify-email.js toggles `hidden` on is unchanged; only markup/classes restyled.
export const metadata: Metadata = { title: 'Verify your email | Veyora', robots: 'noindex' };

export default function VerifyEmailPage() {
  return (
    <div className="page vy-type-app">
      <img className="page-bg" src="/design/05-backgrounds/sections/auth-page-bg-1440x900.svg" alt="" aria-hidden="true" />
      <header className="auth-top">
        <span className="mono at-l"><i />Verify / 01</span>
        <a className="at-brand" href="/" aria-label="Veyora home">
          <img
            src="/design/03-logo/3d/veyora-logo-3d-ink-27h@1x.png"
            srcSet="/design/03-logo/3d/veyora-logo-3d-ink-27h@1x.png 1x, /design/03-logo/3d/veyora-logo-3d-ink-27h@2x.png 2x"
            height={27}
            alt="Veyora"
          />
        </a>
        <span className="mono at-r">Prepaid · No contract</span>
      </header>

      <main className="card">
        <section className="card__form" aria-labelledby="verify-title">
          <div className="formwrap">
            <div id="verify-loading">
              <header className="head">
                <h1 id="verify-title">Verifying your email…</h1>
                <p>Please wait while we confirm your email address.</p>
              </header>
            </div>
            <div id="verify-success" hidden>
              <header className="head">
                <h1>Email verified</h1>
                <p>Your account is now active. Redirecting to your dashboard…</p>
              </header>
            </div>
            <div id="verify-error" hidden>
              <header className="head">
                <h1>Verification failed</h1>
                <p id="verify-error-msg">The link is invalid or has expired.</p>
              </header>
              <p style={{ marginTop: '24px' }}>
                <a className="vy-btn vy-btn--primary" href="/login">
                  Log in to resend <span className="ar">↗</span>
                </a>
              </p>
            </div>
            <div id="verify-notoken" hidden>
              <header className="head">
                <h1>No token found</h1>
                <p>This link is missing the verification token. Please check your email and try again.</p>
              </header>
              <p style={{ marginTop: '24px' }}>
                <a className="vy-btn vy-btn--primary" href="/login">
                  Go to login <span className="ar">↗</span>
                </a>
              </p>
            </div>
          </div>
        </section>
        <aside className="stage" aria-label="About Veyora">
          <img className="stage-bg" src="/design/05-backgrounds/sections/auth-lilac-visual-panel-bg-592x680.svg" alt="" aria-hidden="true" />
          <div className="spec-card">
            <div className="sc-top mono">
              <span className="sc-top-l"><i />Residential network</span>
              <span className="sc-top-tag">195 countries</span>
            </div>
            <div className="sc-main">
              <div className="slides" data-slides="">
                <figure className="slide is-on">
                  <p className="slide__n">
                    <span className="vy-hl-under">5M</span>
                  </p>
                  <p className="slide__t">residential IPs across 195 countries.</p>
                  <p className="slide__s">Real home ISPs. Not datacenter ranges.</p>
                </figure>
              </div>
              <img className="sc-art" src="/design/04-illustrations/radar/network-specimen-ip-nodes.svg" alt="" aria-hidden="true" />
            </div>
            <p className="stage__cap">
              Residential and mobile proxies plus a Web Unlocker API for teams that scrape.{' '}
              <a className="vy-link" href="/">
                Explore Veyora
              </a>{' '}
              to see it in action.
            </p>
          </div>
        </aside>
      </main>

      <footer className="auth-bottom mono">
        <span className="ab-l"><i />Veyora.pro · Self-serve onboarding</span>
        <nav aria-label="Footer">
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </footer>
      <LegacyScripts sources={['/verify-email.js']} />
    </div>
  );
}
