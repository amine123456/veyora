export function SiteHeader() {
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
                <a href="/support">Support</a>
              </li>
            </ul>
          </nav>
          <div className="nav__actions">
            <a className="nav__login" href="/login">
              Log in
            </a>{' '}
            <a className="btn btn--ink btn--sm" href="/#pricing">
              Get proxies
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
            <a href="/support">Support</a>
          </li>
          <li>
            <a href="/login">Log in</a>
          </li>
        </ul>{' '}
        <a className="btn btn--yellow btn--block" href="/#pricing">
          Get proxies
        </a>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <>
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
                    <a href="/#how">Setup guide</a>
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
    </>
  );
}
