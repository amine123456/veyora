export function HomePricing() {
  return (
    <>
      <section className="pricing" id="pricing" aria-labelledby="pricing-title">
        <div className="panel pricing__panel">
          <div className="head head--center head--dark">
            <h2 className="h2" id="pricing-title" data-split="">
              Pay for traffic, <em className="serif">not for promises.</em>
            </h2>
            <p className="sub">
              Per-GB plans for proxies, pay-per-request for the Web Unlocker, and a monthly price per data feed.
              Upgrade, downgrade or cancel whenever you want.
            </p>
            <div className="seg" id="billing" role="group" aria-label="Billing period">
              <i className="seg__thumb" aria-hidden="true" />{' '}
              <button type="button" data-period="monthly" aria-pressed="true">
                Monthly
              </button>{' '}
              <button type="button" data-period="yearly" aria-pressed="false">
                Yearly <em>Save 20%</em>
              </button>
            </div>
          </div>
        </div>
        <div className="plans container">
          <article
            className="plan card"
            data-reveal=""
            data-monthly="29"
            data-yearly="23"
            data-gb="8"
            data-total="276"
            data-tag="For side projects and first tests."
          >
            <p className="pill pill--sm">
              <span className="dot" />
              Starter
            </p>
            <p className="meter" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </p>
            <h3 className="plan__big">8 GB</h3>
            <p className="plan__price">
              <b data-price="">29</b>
              /month
              <span className="sr-only" data-price-sr="">
                {' '}
                $29 per month
              </span>
            </p>
            <p className="plan__desc" data-desc="">
              For side projects and first tests. Billed monthly.
            </p>
            <p className="plan__rate mono" data-rate="">
              About $3.63 per GB
            </p>{' '}
            <a className="btn btn--ink btn--block" href="/signup">
              Get Starter
            </a>{' '}
            <ul className="checks">
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                8 GB residential traffic
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                195 countries
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Rotating and sticky sessions
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                HTTP and SOCKS5
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Country targeting
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Email support
              </li>
            </ul>
          </article>
          <article
            className="plan plan--pro card"
            data-reveal=""
            style={{ ['--d' as string]: '80ms' }}
            data-monthly="99"
            data-yearly="79"
            data-gb="40"
            data-total="948"
            data-tag="For teams that scrape every day."
          >
            <p className="pill pill--sm">
              <span className="dot" />
              Pro · Most popular
            </p>
            <p className="meter" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </p>
            <h3 className="plan__big">40 GB</h3>
            <p className="plan__price">
              <b data-price="">99</b>
              /month
              <span className="sr-only" data-price-sr="">
                {' '}
                $99 per month
              </span>
            </p>
            <p className="plan__desc" data-desc="">
              For teams that scrape every day. Billed monthly.
            </p>
            <p className="plan__rate mono" data-rate="">
              About $2.48 per GB
            </p>{' '}
            <a className="btn btn--ink btn--block" href="/signup">
              Get Pro
            </a>{' '}
            <ul className="checks">
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                40 GB residential traffic
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Unlimited concurrent sessions
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Unlimited IP whitelisting
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Priority chat support, 24/7
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                API access and sub-users
              </li>
            </ul>
          </article>
          <article className="plan card" data-reveal="" style={{ ['--d' as string]: '160ms' }}>
            <p className="pill pill--sm">
              <span className="dot" />
              Enterprise
            </p>
            <p className="meter" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </p>
            <h3 className="plan__big">Custom</h3>
            <p className="plan__price">Volume pricing</p>
            <p className="plan__desc">For large-scale, mission-critical data. Invoicing available.</p>
            <p className="plan__rate mono">Tailored to your traffic</p>{' '}
            <a className="btn btn--ink btn--block" href="/support">
              Talk to sales
            </a>{' '}
            <ul className="checks">
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Custom volume pricing
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Dedicated account manager
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Private IP pools
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Custom integrations
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Invoicing and SSO
              </li>
            </ul>
          </article>
        </div>
        <p className="plans__label container">Residential proxy plans above. Prepaid top-ups from $10 also available in the dashboard.</p>
        <div className="pmore container">
          <article className="pmore__card" data-reveal="">
            <div className="pmore__head">
              <p className="pill pill--sm">
                <span className="dot" />
                Web Unlocker
              </p>
              <p className="pmore__price">
                <b>$0.20</b> per 1,000 requests
              </p>
            </div>
            <p className="pmore__text">
              Pay as you go from your prepaid wallet. Every account starts with <b>$1.00 free credit</b>, enough
              for about 5,000 requests.
            </p>
            <a className="btn btn--ink" href="/signup">
              Get a free API key
            </a>
          </article>
          <article className="pmore__card pmore__card--dark" data-reveal="" style={{ ['--d' as string]: '80ms' }}>
            <div className="pmore__head">
              <p className="pill pill--sm">
                <span className="dot" />
                Data Feeds
              </p>
              <p className="pmore__price">
                <b>From €100</b> per feed / month
              </p>
            </div>
            <p className="pmore__text">
              Each feed is its own monthly subscription, priced by site and data volume. Download a free sample
              before you subscribe.
            </p>
            <a className="btn btn--yellow" href="/data-feeds">
              See feed prices
            </a>
          </article>
        </div>
      </section>
    </>
  );
}
