export function HomeCta() {
  return (
    <>
      <section className="panel endpanel" id="cta" aria-labelledby="cta-title">
        <div className="cta container">
          <h2 className="h2" id="cta-title" data-split="">
            Ready for traffic that{' '}
            <span className="y">
              <em className="serif">never gets blocked?</em>
            </span>
          </h2>
          <p className="sub">
            Every account starts with $1.00 free — 5,000 Web Unlocker requests, no card needed. Add residential traffic
            from $2/GB when you're ready.
          </p>
          <div className="cta-row">
            <a className="btn btn--yellow btn--lg" href="/signup">
              Start free
            </a>{' '}
            <a className="btn btn--ghost-dark btn--lg" href="#pricing">
              View pricing
            </a>
          </div>
        </div>
        <footer className="footer container" id="footer">
          <div className="footer__top">
            <div className="footer__brand">
              <a className="brand brand--light" href="#top" aria-label="Veyora, back to top">
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
                    <a href="#products">Residential proxies</a>
                  </li>
                  <li>
                    <a href="#unlocker">Web Unlocker</a>
                  </li>
                  <li>
                    <a href="#pricing">Pricing</a>
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
                    <a href="#how">Setup guide</a>
                  </li>
                  <li>
                    <a href="#compare">How the network works</a>
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
        <div className="wordmark" aria-hidden="true">
          veyora
        </div>
      </section>
    </>
  );
}
