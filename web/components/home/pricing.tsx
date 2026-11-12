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
              Simple per-GB plans on residential traffic. Upgrade, downgrade or cancel whenever you want.
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
        <aside className="pnote container" aria-labelledby="pnote-title">
          <h3 id="pnote-title">A note on how pricing is published</h3>
          <p>
            These three plans are copied from the public marketing page: Starter <b>$29/mo · 8 GB · about $3.63/GB</b>,
            Pro <b>$99/mo · 40 GB · about $2.48/GB</b>, Enterprise custom. Annual billing is offered as <b>Save 20%</b>{' '}
            (Starter $23/mo, Pro $79/mo). The live product dashboard also sells <b>prepaid USDT top-ups</b> on BNB Smart
            Chain: $10, $25, $50, $100 (+5% credit), $500 (+10% credit). Signup copy says residential proxies from{' '}
            <b>$2 per GB</b>. Cryptocurrency payments are final. Which of those two models is the source of truth is not
            resolved here — both are shown as they appear in source.
          </p>
        </aside>
      </section>
    </>
  );
}
