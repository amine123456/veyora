export function HomeCta() {
  return (
    <>
      <section className="panel endpanel" id="cta" aria-labelledby="cta-title">
        <div className="cta container">
          <h2 className="h2" id="cta-title" data-split="">
            Never think about{' '}
            <span className="y">
              <em className="serif">getting your data again.</em>
            </span>
          </h2>
          <p className="sub">
            Subscribe to a feed, choose your delivery method, and receive
            clean datasets every morning. 26 live sources, 2.4 million records daily,
            and growing every month.
          </p>
          <div className="cta-row">
            <a className="btn btn--yellow btn--lg" href="/data-feeds">
              Browse data feeds
            </a>{' '}
            <a className="btn btn--ghost-dark btn--lg" href="/signup">
              Start free
            </a>
          </div>
          <p className="cta__note">$1.00 free credit on signup · No credit card required</p>
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
              <p>Market intelligence, data feeds, and web data infrastructure — subscribe to data, not to scrapers.</p>
            </div>
            <nav className="footer__cols" aria-label="Footer">
              <div>
                <h4>Products</h4>
                <ul>
                  <li>
                    <a href="/data-feeds">Data Feeds</a>
                  </li>
                  <li>
                    <a href="/web-unlocker">Web Unlocker</a>
                  </li>
                  <li>
                    <a href="/residential-proxies">Residential Proxies</a>
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
                    <a href="/docs">Documentation</a>
                  </li>
                  <li>
                    <a href="#how">Setup guide</a>
                  </li>
                  <li>
                    <a href="#faq">FAQ</a>
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
