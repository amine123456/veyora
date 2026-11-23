// Site footer (reference 08-footer-b.html), shared by every marketing, docs and legal page.
// Section links point at the home page so they work from any route.
export function SiteFooter() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-links">
        <div className="footer-brand">
          <a href="/" aria-label="Veyora home">
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
          <a href="/#pricing">Pricing</a>
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
          <a href="/#how">Setup guide</a>
          <a href="/#faq">FAQ</a>
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
  );
}
