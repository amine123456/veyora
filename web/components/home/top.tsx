import { LIVE_FEEDS } from '@/components/feeds/live-feeds';

// Home hero (CLAUDE-PROMPT.md §4.1, reference 07-home-hero-b.html). Presentation only:
// the decorative tiles, Lyon/Tokyo clocks, the live lead paragraph, the pipeline panel
// and the "Get 5,000 free requests" CTA are dropped per the approved design — none of
// them were backed by a data hook or an i18n key in this codebase (DESIGN-MIGRATION.md),
// so there is nothing left to keep wired behind the scenes.
// The ticker's source list is bound to the real feed catalogue (site_name), not hard-coded.
const TICKER_SOURCES = LIVE_FEEDS.map((f) => f.site_name);

export function HomeTop() {
  return (
    <section className="hero vy-type-text" id="top" aria-labelledby="hero-title">
      <img
        className="hero__bg"
        src="/design/05-backgrounds/sections/home-hero-horizon-floor-1440x776.svg"
        alt=""
        aria-hidden="true"
      />
      <div className="hero__copy">
        <div className="vy-chip-row live">
          <span className="vy-chip vy-chip--active">
            <i className="sq" />
            Live
          </span>
          <span className="vy-chip">2.4M records collected daily</span>
          <span className="vy-chip">26 live sources</span>
          <span className="vy-chip">99.8% delivery success</span>
        </div>
        <h1 id="hero-title">
          Get the web data.
          <br />
          Skip the scraping.
        </h1>
        <div className="tiers">
          <a className="tier on" href="/data-feeds">
            <div className="top mono">
              <span>We do all of it</span>
              <span>↗</span>
            </div>
            <div className="nm">Data Feeds</div>
            <div className="pr mono">From €100 / month per feed</div>
          </a>
          <a className="tier" href="/web-unlocker">
            <div className="top mono">
              <span>We handle the blocks</span>
              <span>↗</span>
            </div>
            <div className="nm">Web Unlocker</div>
            <div className="pr mono">$0.20 per 1,000 requests</div>
          </a>
          <a className="tier" href="/residential-proxies">
            <div className="top mono">
              <span>You run the scraper</span>
              <span>↗</span>
            </div>
            <div className="nm">Residential Proxies</div>
            <div className="pr mono">$29 / month for 8 GB</div>
          </a>
        </div>
        <div className="ctas">
          <a className="vy-btn vy-btn--primary vy-btn--lg" href="/data-feeds">
            Browse data feeds <span className="ar">↗</span>
          </a>
          <a className="vy-btn vy-btn--secondary vy-btn--lg" href="/signup">
            Start free
          </a>
        </div>
        <p className="note mono">$1.00 free credit on signup · No credit card required</p>
      </div>
      <div className="vy-ticker">
        <span className="vy-ticker__lab">Live sources</span>
        <div className="vy-ticker__track" aria-hidden="true">
          {[...TICKER_SOURCES, ...TICKER_SOURCES].map((name, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <i />}
              <span>{name}</span>
            </span>
          ))}
        </div>
        <span className="sr-only">Live sources: {TICKER_SOURCES.join(', ')}.</span>
      </div>
    </section>
  );
}
