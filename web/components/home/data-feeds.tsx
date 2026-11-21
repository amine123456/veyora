export function HomeDataFeeds() {
  return (
    <section className="dfeed" id="data" aria-labelledby="dfeed-title">
      <div className="container">
        <div className="dfeed__head">
          <p className="pill">
            <span className="dot" />
            Data Marketplace
          </p>
          <h2 className="h2" id="dfeed-title" data-split="">
            Ready data,{' '}
            <span className="y">
              <em className="serif">delivered daily.</em>
            </span>
          </h2>
          <p className="sub dfeed__sub">
            Pick the sources you need, choose your delivery method, and receive
            clean, structured datasets every morning. We cover the hardest sites
            in automotive, real estate, jobs, and software — so your team stays
            focused on analysis, not collection.
          </p>
        </div>

        <div className="dfeed__cats">
          <h3 className="dfeed__label">Live categories</h3>
          <div className="dfeed__grid">
            <article className="dfeed__card" data-reveal="">
              <div className="dfeed__icon">
                <svg><use href="#i-globe" /></svg>
              </div>
              <div className="dfeed__card-body">
                <h4>Cars &amp; Automotive</h4>
                <p>
                  mobile.de, LaCentrale, car.gr, Milanuncios, Coches.net,
                  Nettiauto, DoneDeal, GoCar, and more.
                </p>
                <ul className="dfeed__tags">
                  <li>12+ sources</li>
                  <li>1M+ listings</li>
                  <li>Daily</li>
                </ul>
              </div>
            </article>

            <article className="dfeed__card" data-reveal="" style={{ ['--d' as string]: '60ms' }}>
              <div className="dfeed__icon">
                <svg><use href="#i-home" /></svg>
              </div>
              <div className="dfeed__card-body">
                <h4>Real Estate</h4>
                <p>
                  Rent and sale listings across 99 cities. Prices, locations, features,
                  photos — track market movements daily.
                </p>
                <ul className="dfeed__tags">
                  <li>Rent &amp; sale</li>
                  <li>99 cities</li>
                  <li>Daily</li>
                </ul>
              </div>
            </article>

            <article className="dfeed__card" data-reveal="" style={{ ['--d' as string]: '120ms' }}>
              <div className="dfeed__icon">
                <svg><use href="#i-search" /></svg>
              </div>
              <div className="dfeed__card-body">
                <h4>Jobs &amp; Recruitment</h4>
                <p>
                  Job postings from regional portals. Titles, salaries, companies,
                  locations — structured for market intelligence.
                </p>
                <ul className="dfeed__tags">
                  <li>3+ portals</li>
                  <li>5,000+ jobs</li>
                  <li>Daily</li>
                </ul>
              </div>
            </article>

            <article className="dfeed__card" data-reveal="" style={{ ['--d' as string]: '180ms' }}>
              <div className="dfeed__icon">
                <svg><use href="#i-code" /></svg>
              </div>
              <div className="dfeed__card-body">
                <h4>Software Reviews</h4>
                <p>
                  Product reviews, ratings, and sentiment from Capterra. Competitor
                  benchmarks for product and market research.
                </p>
                <ul className="dfeed__tags">
                  <li>Reviews</li>
                  <li>Ratings</li>
                  <li>Weekly</li>
                </ul>
              </div>
            </article>
          </div>
          <p className="dfeed__more">
            New sources added every month.{' '}
            <a href="/support">Request a feed</a> for any site we do not cover yet.
          </p>
        </div>

        <div className="dfeed__deliver">
          <h3 className="dfeed__label">Delivery &amp; formats</h3>
          <div className="dfeed__pipes">
            <div className="dfeed__pipe" data-reveal="">
              <span className="dfeed__pipe-name">SFTP</span>
              <span className="dfeed__pipe-desc">Scheduled daily push to your server</span>
            </div>
            <div className="dfeed__pipe" data-reveal="" style={{ ['--d' as string]: '50ms' }}>
              <span className="dfeed__pipe-name">Amazon S3</span>
              <span className="dfeed__pipe-desc">Direct upload to your S3 bucket</span>
            </div>
            <div className="dfeed__pipe" data-reveal="" style={{ ['--d' as string]: '100ms' }}>
              <span className="dfeed__pipe-name">Google Cloud Storage</span>
              <span className="dfeed__pipe-desc">Push to GCS with configurable paths</span>
            </div>
            <div className="dfeed__pipe" data-reveal="" style={{ ['--d' as string]: '150ms' }}>
              <span className="dfeed__pipe-name">Snowflake</span>
              <span className="dfeed__pipe-desc">Load directly into your warehouse</span>
            </div>
            <div className="dfeed__pipe" data-reveal="" style={{ ['--d' as string]: '200ms' }}>
              <span className="dfeed__pipe-name">Webhook</span>
              <span className="dfeed__pipe-desc">HTTP POST on every delivery</span>
            </div>
            <div className="dfeed__pipe" data-reveal="" style={{ ['--d' as string]: '250ms' }}>
              <span className="dfeed__pipe-name">API</span>
              <span className="dfeed__pipe-desc">Pull latest snapshot on demand</span>
            </div>
          </div>
          <p className="dfeed__formats">
            <span>Formats:</span>
            <code>JSON</code>
            <code>CSV</code>
            <code>Parquet</code>
            <code>JSONL</code>
          </p>
        </div>

        <div className="dfeed__why">
          <h3 className="dfeed__label">Why companies choose managed feeds</h3>
          <div className="dfeed__value">
            <div className="dfeed__vcard" data-reveal="">
              <h4>
                <svg><use href="#i-spark" /></svg>
                Pricing &amp; market intelligence
              </h4>
              <p>
                Power pricing models, competitive analysis, and market predictions
                with fresh data. Spot trends before they become obvious.
              </p>
            </div>
            <div className="dfeed__vcard" data-reveal="" style={{ ['--d' as string]: '60ms' }}>
              <h4>
                <svg><use href="#i-cube" /></svg>
                Fully managed pipeline
              </h4>
              <p>
                We handle crawling, cleaning, and delivery end to end.
                Your team gets analysis-ready datasets without touching infrastructure.
              </p>
            </div>
            <div className="dfeed__vcard" data-reveal="" style={{ ['--d' as string]: '120ms' }}>
              <h4>
                <svg><use href="#i-link" /></svg>
                Enterprise-ready
              </h4>
              <p>
                SLA-backed delivery, Stripe billing, dedicated support. Scale from
                one feed to dozens as your data needs grow.
              </p>
            </div>
          </div>
        </div>

        <div className="dfeed__cta">
          <a className="btn btn--yellow btn--lg" href="/data-feeds">
            Browse the data catalog
          </a>{' '}
          <a className="btn btn--ghost-dark btn--lg" href="/support">
            Request a custom feed
          </a>
        </div>
      </div>
    </section>
  );
}
