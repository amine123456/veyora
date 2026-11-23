// End CTA band + footer (CLAUDE-PROMPT.md §4.9, reference 08-footer-b.html). All footer
// links/hrefs and the live CTA copy are unchanged; only markup/classes restyled. The live
// lead paragraph under the CTAs is dropped per the approved design (§4.1 note) — it has no
// data hook in this codebase, so nothing is left dangling. The copyright year is kept as
// the live literal "2026" (not computed) — §4.9 only asks to keep it computed if it
// already is, and it is not.
export function HomeCta() {
  return (
    <>
      <section className="cta-band" id="cta" aria-labelledby="cta-title">
        <img className="cta-band-bg" src="/design/05-backgrounds/sections/footer-cta-yellow-band-clouds-1440x340.svg" alt="" aria-hidden="true" />
        <div className="cta-band-in">
          <span className="lab mono">
            <i />
            26 live sources · 2.4 million records daily
          </span>
          <h2 id="cta-title">Never think about getting your data again.</h2>
          <div className="ctas">
            <a className="vy-btn vy-btn--primary vy-btn--lg" href="/data-feeds">
              Browse data feeds <span className="ar">↗</span>
            </a>
            <a className="vy-btn vy-btn--secondary vy-btn--lg on-yellow" href="/signup">
              Start free
            </a>
          </div>
          <p className="note mono">$1.00 free credit on signup · No credit card required</p>
        </div>
      </section>

      <footer className="footer" id="footer">
        <div className="footer-links">
          <div className="footer-brand">
            <a href="#top" aria-label="Veyora, back to top">
              <img
                src="/design/03-logo/3d/veyora-logo-3d-silver-30h@1x.png"
                srcSet="/design/03-logo/3d/veyora-logo-3d-silver-30h@1x.png 1x, /design/03-logo/3d/veyora-logo-3d-silver-30h@2x.png 2x"
                height={30}
                alt="Veyora"
              />
            </a>
            <p>Market intelligence, data feeds, and web data infrastructure — subscribe to data, not to scrapers.</p>
          </div>

          <nav className="footer-col" aria-label="Products">
            <h4 className="mono">Products</h4>
            <a href="/data-feeds">Data Feeds</a>
            <a href="/web-unlocker">Web Unlocker</a>
            <a href="/residential-proxies">Residential Proxies</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <nav className="footer-col" aria-label="Company">
            <h4 className="mono">Company</h4>
            <a href="/about">About</a>
            <a href="/support">Contact &amp; support</a>
            <a href="/account">Customer account</a>
          </nav>
          <nav className="footer-col" aria-label="Resources">
            <h4 className="mono">Resources</h4>
            <a href="/docs">Documentation</a>
            <a href="#how">Setup guide</a>
            <a href="#faq">FAQ</a>
          </nav>
          <nav className="footer-col" aria-label="Legal">
            <h4 className="mono">Legal</h4>
            <a href="/terms">Terms of service</a>
            <a href="/privacy">Privacy policy</a>
            <a href="/acceptable-use">Acceptable use</a>
            <a href="/refund-policy">Refund policy</a>
          </nav>
        </div>

        <div className="footer-giant" aria-hidden="true">
          <div className="m" />
        </div>

        <div className="footer-bar mono">
          <span>© 2026 Veyora. All rights reserved.</span>
          <a href="/support">
            Need help? <b>Send a support request ↗</b>
          </a>
        </div>
      </footer>
    </>
  );
}
