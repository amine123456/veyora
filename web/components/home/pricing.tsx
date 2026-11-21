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
            </a>
            <p className="plan__note">No credit card required to start</p>
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
                Traffic never expires
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
            </a>
            <p className="plan__note">No credit card required to start</p>
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
                Priority email support
              </li>
              <li>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                Traffic never expires
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
          <h3 id="pnote-title">How billing works</h3>
          <p>
            Pick a plan and your balance is loaded with traffic. Use it for residential proxies (billed per GB) or
            Web Unlocker requests ($0.20 per 1,000). Traffic never expires — it rolls over until used.
            Need more? Top up anytime from the dashboard with card or USDT, starting at $10.
            See our <a href="/refund-policy">refund policy</a> for details.
          </p>
        </aside>
      </section>
      <section className="faq container" id="faq" aria-labelledby="faq-title">
        <h2 className="h2" id="faq-title">Frequently asked questions</h2>
        <dl className="faq__list">
          <div className="faq__item" data-reveal="">
            <dt>How does billing work?</dt>
            <dd>
              Plans are monthly subscriptions that load your account with a traffic allowance (8 GB or 40 GB).
              You can also buy one-off top-ups from $10 in the dashboard. Both methods credit the same prepaid balance.
              You only pay for traffic you use — residential proxies per GB, Web Unlocker per request.
            </dd>
          </div>
          <div className="faq__item" data-reveal="">
            <dt>Does my traffic expire?</dt>
            <dd>
              No. Unused traffic rolls over indefinitely. Your balance stays until you use it, whether
              it came from a plan or a top-up.
            </dd>
          </div>
          <div className="faq__item" data-reveal="">
            <dt>What happens after I create an account?</dt>
            <dd>
              You get $1.00 free credit immediately — enough for 5,000 Web Unlocker requests. No card needed.
              Your API credentials and proxy gateway details appear in the dashboard. Add a payment method when you are ready
              to buy more traffic.
            </dd>
          </div>
          <div className="faq__item" data-reveal="">
            <dt>Can I cancel or change plans anytime?</dt>
            <dd>
              Yes. Upgrade, downgrade, or cancel from the dashboard. No contracts, no lock-in. Any remaining balance stays in
              your account.
            </dd>
          </div>
          <div className="faq__item" data-reveal="">
            <dt>What payment methods do you accept?</dt>
            <dd>
              Visa, Mastercard, and American Express via Stripe, or USDT on BNB Smart Chain (BEP-20).
              All payments are prepaid.
            </dd>
          </div>
          <div className="faq__item" data-reveal="">
            <dt>How do I get support?</dt>
            <dd>
              Email support is included on every plan. Pro and Enterprise customers get priority response.
              Send a request from the <a href="/support">support page</a> or email directly — we typically respond within a few hours during business days.
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
