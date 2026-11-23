// Managed data feeds teaser (CLAUDE-PROMPT.md §4.4 — no approved screen; composed from
// the system established by screens 06/09). All live content and hrefs kept; presentation
// only. Category cards restyled as a joined ink-bordered grid per §4.4; the delivery and
// "why managed feeds" blocks (not described by a specific screen) use the same primitives.
export function HomeDataFeeds() {
  return (
    <section className="dfeed vy-type-display" id="data" aria-labelledby="dfeed-title">
      <div className="vy-wrap">
        <div className="vy-specbar">
          <span>
            <i />
            Feeds / 03
          </span>
          <span>Daily snapshots</span>
        </div>
        <header className="sec-head">
          <span className="vy-label-chip">
            <span className="vy-label-chip__sq">
              <i />
            </span>
            <span className="vy-label-chip__txt">Managed data feeds</span>
          </span>
          <h2 id="dfeed-title">Ready data, delivered daily.</h2>
          <p className="sub">
            Pick the sources you need, choose your delivery method, and receive clean, structured datasets every morning. We
            cover the hardest sites in automotive, real estate, jobs, and software — so your team stays focused on analysis,
            not collection.
          </p>
        </header>

        <div className="dfeed__cats">
          <h3 className="dfeed__label mono">Live categories</h3>
          <div className="dfeed__grid">
            <article className="dfeed__card">
              <div className="dfeed__icon">
                <img src="/design/04-illustrations/icons/feed-category/feed-cars.svg" alt="" aria-hidden="true" />
              </div>
              <div className="dfeed__card-body">
                <h4>Cars &amp; Automotive</h4>
                <p>mobile.de, LaCentrale, car.gr, Milanuncios, Coches.net, Nettiauto, DoneDeal, GoCar, and more.</p>
                <div className="vy-chip-row">
                  <span className="vy-chip">12+ sources</span>
                  <span className="vy-chip">1M+ listings</span>
                  <span className="vy-chip">Daily</span>
                </div>
              </div>
            </article>

            <article className="dfeed__card">
              <div className="dfeed__icon">
                <img src="/design/04-illustrations/icons/feed-category/feed-real-estate.svg" alt="" aria-hidden="true" />
              </div>
              <div className="dfeed__card-body">
                <h4>Real Estate</h4>
                <p>Rent and sale listings across 99 cities. Prices, locations, features, photos — track market movements daily.</p>
                <div className="vy-chip-row">
                  <span className="vy-chip">Rent &amp; sale</span>
                  <span className="vy-chip">99 cities</span>
                  <span className="vy-chip">Daily</span>
                </div>
              </div>
            </article>

            <article className="dfeed__card">
              <div className="dfeed__icon">
                <img src="/design/04-illustrations/icons/feed-category/feed-jobs.svg" alt="" aria-hidden="true" />
              </div>
              <div className="dfeed__card-body">
                <h4>Jobs &amp; Recruitment</h4>
                <p>Job postings from regional portals. Titles, salaries, companies, locations — structured for market intelligence.</p>
                <div className="vy-chip-row">
                  <span className="vy-chip">3+ portals</span>
                  <span className="vy-chip">5,000+ jobs</span>
                  <span className="vy-chip">Daily</span>
                </div>
              </div>
            </article>

            <article className="dfeed__card">
              <div className="dfeed__icon">
                <img src="/design/04-illustrations/icons/feed-category/feed-reviews.svg" alt="" aria-hidden="true" />
              </div>
              <div className="dfeed__card-body">
                <h4>Software Reviews</h4>
                <p>Product reviews, ratings, and sentiment from Capterra. Competitor benchmarks for product and market research.</p>
                <div className="vy-chip-row">
                  <span className="vy-chip">Reviews</span>
                  <span className="vy-chip">Ratings</span>
                  <span className="vy-chip">Weekly</span>
                </div>
              </div>
            </article>
          </div>
          <p className="dfeed__more">
            New sources added every month. <a className="vy-link" href="/support">Request a feed</a> for any site we do not cover yet.
          </p>
        </div>

        <div className="dfeed__deliver">
          <h3 className="dfeed__label mono">Delivery &amp; formats</h3>
          <div className="dfeed__pipes">
            <div className="dfeed__pipe">
              <span className="dfeed__pipe-name mono">SFTP</span>
              <span className="dfeed__pipe-desc">Scheduled daily push to your server</span>
            </div>
            <div className="dfeed__pipe">
              <span className="dfeed__pipe-name mono">Amazon S3</span>
              <span className="dfeed__pipe-desc">Direct upload to your S3 bucket</span>
            </div>
            <div className="dfeed__pipe">
              <span className="dfeed__pipe-name mono">Google Cloud Storage</span>
              <span className="dfeed__pipe-desc">Push to GCS with configurable paths</span>
            </div>
            <div className="dfeed__pipe">
              <span className="dfeed__pipe-name mono">Snowflake</span>
              <span className="dfeed__pipe-desc">Load directly into your warehouse</span>
            </div>
            <div className="dfeed__pipe">
              <span className="dfeed__pipe-name mono">Webhook</span>
              <span className="dfeed__pipe-desc">HTTP POST on every delivery</span>
            </div>
            <div className="dfeed__pipe">
              <span className="dfeed__pipe-name mono">API</span>
              <span className="dfeed__pipe-desc">Pull latest snapshot on demand</span>
            </div>
          </div>
          <p className="dfeed__formats">
            <span className="mono">Formats:</span>
            <code>JSON</code>
            <code>CSV</code>
            <code>Parquet</code>
            <code>JSONL</code>
          </p>
        </div>

        <div className="dfeed__why">
          <h3 className="dfeed__label mono">Why companies choose managed feeds</h3>
          <div className="dfeed__value">
            <div className="dfeed__vcard">
              <h4>
                <svg><use href="#i-spark" /></svg>
                Pricing &amp; market intelligence
              </h4>
              <p>Power pricing models, competitive analysis, and market predictions with fresh data. Spot trends before they become obvious.</p>
            </div>
            <div className="dfeed__vcard">
              <h4>
                <svg><use href="#i-cube" /></svg>
                Fully managed pipeline
              </h4>
              <p>We handle crawling, cleaning, and delivery end to end. Your team gets analysis-ready datasets without touching infrastructure.</p>
            </div>
            <div className="dfeed__vcard">
              <h4>
                <svg><use href="#i-link" /></svg>
                Enterprise-ready
              </h4>
              <p>SLA-backed delivery, Stripe billing, dedicated support. Scale from one feed to dozens as your data needs grow.</p>
            </div>
          </div>
        </div>

        <div className="dfeed__cta">
          <a className="vy-btn vy-btn--primary vy-btn--lg" href="/data-feeds">
            Browse the data catalog <span className="ar">↗</span>
          </a>
          <a className="vy-btn vy-btn--secondary vy-btn--lg" href="/support">
            Request a custom feed
          </a>
        </div>
      </div>
    </section>
  );
}
