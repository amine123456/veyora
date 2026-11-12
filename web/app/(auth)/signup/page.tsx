import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';

export const metadata: Metadata = { title: 'Create an account | Veyora', robots: 'noindex' };

export default function SignupPage() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <symbol id="i-logo" viewBox="0 0 28 28">
            <rect width="28" height="28" rx="8" fill="#FFDD1F" />
            <path d="M7.5 8h3.4l3.1 9.1L17.100 8h3.400l-4.800 12h-3.400z" fill="#161615" />
          </symbol>
          <symbol id="i-eye" viewBox="0 0 24 24" fill="none">
            <path
              d="M2 8C2 8 6.47715 3 12 3C17.5228 3 22 8 22 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
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
      <div className="page">
        <a className="brand" href="/" aria-label="Veyora home">
          <svg className="brand__mark" aria-hidden="true">
            <use href="#i-logo" />
          </svg>
          <span>veyora</span>
        </a>{' '}
        <main className="card">
          <section className="card__form" aria-labelledby="auth-title">
            <div className="formwrap">
              <header className="head">
                <h1 id="auth-title">Create your account</h1>
                <p>Residential proxies from $2 per GB. You only pay for the traffic you buy.</p>
              </header>
              <form className="form" data-auth="signup" noValidate>
                <div className="field">
                  <label htmlFor="email">Email</label>{' '}
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">Password</label>{' '}
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
                    />{' '}
                    <button
                      className="pw__toggle"
                      type="button"
                      data-toggle-password=""
                      aria-label="Show password"
                      aria-pressed="false"
                    >
                      {' '}
                      <svg className="pw__on" aria-hidden="true">
                        <use href="#i-eye" />
                      </svg>{' '}
                      <svg className="pw__off" aria-hidden="true">
                        <use href="#i-eyeoff" />
                      </svg>{' '}
                    </button>
                  </div>{' '}
                  <small id="password-hint">At least 10 characters.</small>
                </div>
                <p className="form__error" role="alert" hidden />{' '}
                <button className="btn" type="submit">
                  Create account
                </button>
              </form>
              <p className="switch">
                Already have an account? <a href="/login">Log in</a>
              </p>
            </div>
          </section>
          <aside className="stage" aria-label="About Veyora">
            <div className="slides" data-slides="">
              <figure className="slide is-on">
                <p className="slide__n">5M</p>
                <p className="slide__t">residential IPs across 195 countries.</p>
                <p className="slide__s">Real home ISPs. Not datacenter ranges.</p>
              </figure>
              <figure className="slide">
                <p className="slide__n">API</p>
                <p className="slide__t">Send a URL. Get the page back.</p>
                <p className="slide__s">The Web Unlocker charges you only when the page comes back.</p>
              </figure>
              <figure className="slide">
                <p className="slide__n">USDT</p>
                <p className="slide__t">prepaid, with no contract.</p>
                <p className="slide__s">Top up from $10. One balance pays for everything.</p>
              </figure>
            </div>
            <div className="dots" role="group" aria-label="Choose a slide">
              <button type="button" data-dot="" aria-label="Show slide 1" aria-current="true" />{' '}
              <button type="button" data-dot="" aria-label="Show slide 2" />{' '}
              <button type="button" data-dot="" aria-label="Show slide 3" />
            </div>
            <p className="stage__cap">
              Residential and mobile proxies plus a Web Unlocker API for teams that scrape.{' '}
              <a href="/">Explore Veyora</a> to see it in action.
            </p>
          </aside>
        </main>
        <p className="foot">
          By creating an account, you agree to our <a href="/terms">Terms of Service</a>,{' '}
          <a href="/acceptable-use">Acceptable Use Policy</a> and <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
      <LegacyScripts sources={['/auth.js']} />
    </>
  );
}
