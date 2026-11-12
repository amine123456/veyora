import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';

export const metadata: Metadata = { title: 'Verify your email | Veyora', robots: 'noindex' };

export default function VerifyEmailPage() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <symbol id="i-logo" viewBox="0 0 28 28">
            <rect width="28" height="28" rx="8" fill="#FFDD1F" />
            <path d="M7.5 8h3.4l3.1 9.1L17.100 8h3.400l-4.800 12h-3.400z" fill="#161615" />
          </symbol>
        </defs>
      </svg>
      <div className="page">
        <a className="brand" href="/" aria-label="Veyora home">
          <svg className="brand__mark" aria-hidden="true">
            <use href="#i-logo" />
          </svg>
          <span>veyora</span>
        </a>{' '}
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
                  <a className="btn" href="/login">
                    Log in to resend
                  </a>
                </p>
              </div>
              <div id="verify-notoken" hidden>
                <header className="head">
                  <h1>No token found</h1>
                  <p>This link is missing the verification token. Please check your email and try again.</p>
                </header>
                <p style={{ marginTop: '24px' }}>
                  <a className="btn" href="/login">
                    Go to login
                  </a>
                </p>
              </div>
            </div>
          </section>
          <aside className="stage" aria-label="About Veyora">
            <div className="slides" data-slides="">
              <figure className="slide is-on">
                <p className="slide__n">5M</p>
                <p className="slide__t">residential IPs across 195 countries.</p>
                <p className="slide__s">Real home ISPs. Not datacenter ranges.</p>
              </figure>
            </div>
            <p className="stage__cap">
              Residential and mobile proxies plus a Web Unlocker API for teams that scrape.{' '}
              <a href="/">Explore Veyora</a> to see it in action.
            </p>
          </aside>
        </main>
      </div>
      <LegacyScripts sources={['/verify-email.js']} />
    </>
  );
}
