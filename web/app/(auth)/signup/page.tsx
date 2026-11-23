import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';

// Sign up (CLAUDE-PROMPT.md §7, reference 02-auth-signup-a.html). Every field id/name/
// type/autoComplete/required/minLength/maxLength/placeholder/aria-describedby, the
// data-toggle-password button, the data-auth="signup" form, the real Turnstile mount
// point (#turnstile-container, created by public/auth.js — unchanged script/sitekey/
// callbacks) and the data-slides/.is-on/data-dot carousel are all unchanged; only
// markup/classes are restyled.
export const metadata: Metadata = { title: 'Create an account | Veyora', robots: 'noindex' };

export default function SignupPage() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <symbol id="i-eye" viewBox="0 0 24 24" fill="none">
            <path d="M2 8C2 8 6.47715 3 12 3C17.5228 3 22 8 22 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path
              d="M12 7C7.08671 7 3.43133 11.7818 2 14C3.43133 16.2182 7.08671 21 12 21C16.9133 21 20.5687 16.2182 22 14C20.5687 11.7818 16.9133 7 12 7Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M15 14C15 12.3431 13.6569 11 12 11C10.3431 11 9 12.3431 9 14C9 15.6569 10.3431 17 12 17C13.6569 17 15 15.6569 15 14Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </symbol>
          <symbol id="i-eyeoff" viewBox="0 0 24 24" fill="none">
            <path d="M22 8C22 8 18 14 12 14C6 14 2 8 2 8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15 13.5L16.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M20 11L22 13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M2 13L4 11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9 13.5L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </symbol>
        </defs>
      </svg>
      <div className="page vy-type-app">
        <img className="page-bg" src="/design/05-backgrounds/sections/auth-page-bg-1440x900.svg" alt="" aria-hidden="true" />
        <header className="auth-top">
          <span className="mono at-l"><i />Sign up / 01</span>
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
          <section className="card__form" aria-labelledby="auth-title">
            <div className="formwrap">
              <span className="vy-label-chip auth-chip">
                <span className="vy-label-chip__sq">
                  <i />
                </span>
                <span className="vy-label-chip__txt">New account</span>
              </span>
              <header className="head">
                <h1 id="auth-title">Create your account</h1>
                <p>Residential proxies from $2 per GB. You only pay for the traffic you buy.</p>
              </header>
              <form className="form" data-auth="signup" noValidate>
                <div className="field">
                  <label className="mono" htmlFor="email">
                    Email
                  </label>
                  <input id="email" type="email" name="email" autoComplete="email" required maxLength={254} placeholder="Enter your email" />
                </div>
                <div className="field">
                  <label className="mono" htmlFor="password">
                    Password
                  </label>
                  <div className="pw">
                    <input
                      id="password"
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      required
                      minLength={10}
                      maxLength={256}
                      aria-describedby="password-hint"
                      placeholder="Create a password"
                    />
                    <button className="pw__toggle" type="button" data-toggle-password="" aria-label="Show password" aria-pressed="false">
                      <svg className="pw__on" aria-hidden="true">
                        <use href="#i-eye" />
                      </svg>
                      <svg className="pw__off" aria-hidden="true">
                        <use href="#i-eyeoff" />
                      </svg>
                    </button>
                  </div>
                  <small id="password-hint">At least 10 characters.</small>
                </div>
                <p className="form__error" role="alert" hidden />
                <button className="vy-btn vy-btn--primary vy-btn--block" type="submit">
                  Create account <span className="ar">↗</span>
                </button>
              </form>
              <p className="legal">
                By creating an account, you agree to our <a className="vy-link" href="/terms">Terms of Service</a>,{' '}
                <a className="vy-link" href="/acceptable-use">Acceptable Use Policy</a> and{' '}
                <a className="vy-link" href="/privacy">Privacy Policy</a>.
              </p>
              <p className="switch">
                Already have an account? <a href="/login">Log in</a>
              </p>
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
                  <figure className="slide">
                    <p className="slide__n">
                      <span className="vy-hl-under">API</span>
                    </p>
                    <p className="slide__t">Send a URL. Get the page back.</p>
                    <p className="slide__s">The Web Unlocker charges you only when the page comes back.</p>
                  </figure>
                  <figure className="slide">
                    <p className="slide__n">
                      <span className="vy-hl-under">USDT</span>
                    </p>
                    <p className="slide__t">prepaid, with no contract.</p>
                    <p className="slide__s">Top up from $10. One balance pays for everything.</p>
                  </figure>
                </div>
                <img className="sc-art" src="/design/04-illustrations/radar/network-specimen-ip-nodes.svg" alt="" aria-hidden="true" />
              </div>
              <div className="dots" role="group" aria-label="Choose a slide">
                <button type="button" data-dot="" aria-label="Show slide 1" aria-current="true" />
                <button type="button" data-dot="" aria-label="Show slide 2" />
                <button type="button" data-dot="" aria-label="Show slide 3" />
              </div>
              <div className="facts-grid mono">
                <div className="fact-cell">
                  <span className="fact-k">02 / Starter credit</span>
                  <span className="fact-v">$1.00 free credit</span>
                </div>
                <div className="fact-cell">
                  <span className="fact-k">03 / Web Unlocker</span>
                  <span className="fact-v">5,000 requests</span>
                </div>
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
      </div>
      <LegacyScripts sources={['/auth.js']} />
    </>
  );
}
