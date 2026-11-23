// Pricing (CLAUDE-PROMPT.md §4.7 — no approved screen; uses the tier-card system from
// §4.2/09) and the first of two FAQ blocks (§4.8). The monthly/yearly toggle keeps its
// exact behaviour (public/app.js: #billing, .seg__thumb, data-period/data-monthly/
// data-yearly/data-gb/data-total/data-tag, [data-price]/[data-desc]/[data-rate]) — only
// markup/classes are restyled. Section ids: this is the FIRST of the two `#faq` sections
// per §4.8 ("the two blocks share the section number"); `components/home/faq.tsx` is the
// second and — to avoid two elements sharing one HTML id — no longer repeats `id="faq"`.
// Same square-bullet marker as the tier cards (§4.2's .tcard-li .sq) — kept consistent
// since §4.7 has no approved screen of its own to follow instead.
const CHECK = <span className="sq" />;

export function HomePricing() {
  return (
    <>
      <section className="pricing-sec vy-type-display" id="pricing" aria-labelledby="pricing-title">
        <div className="vy-wrap">
          <div className="vy-specbar">
            <span>
              <i />
              Pricing / 06
            </span>
            <span>Prepaid · No contract</span>
          </div>
          <header className="sec-head">
            <h2 id="pricing-title">
              Pay for traffic,
              <br />
              <span className="vy-hl-block">not for promises.</span>
            </h2>
            <p className="sub">Simple per-GB plans on residential traffic. Upgrade, downgrade or cancel whenever you want.</p>
            <div className="seg" id="billing" role="group" aria-label="Billing period">
              <i className="seg__thumb" aria-hidden="true" />
              <button type="button" data-period="monthly" aria-pressed="true">
                Monthly
              </button>
              <button type="button" data-period="yearly" aria-pressed="false">
                Yearly <em className="vy-badge vy-badge--lilac">Save 20%</em>
              </button>
            </div>
          </header>

          <div className="tiers-grid pricing-grid">
            <article
              className="plan tcard light"
              data-monthly="29"
              data-yearly="23"
              data-gb="8"
              data-total="276"
              data-tag="For side projects and first tests."
            >
              <div className="tcard-top">
                <span className="tbadge">Starter</span>
                <span className="tnum">01 / Starter</span>
              </div>
              <div className="tcard-copy plan-copy">
                <h3 className="tcard-h">8 GB</h3>
                <p className="tcard-price">
                  <span className="amt">
                    $<b data-price="">29</b>
                  </span>
                  <span className="unit">
                    /month
                    <span className="sr-only" data-price-sr="">
                      {' '}
                      $29 per month
                    </span>
                  </span>
                </p>
                <p className="tcard-b" data-desc="">
                  For side projects and first tests. Billed monthly.
                </p>
                <p className="plan-rate mono" data-rate="">
                  About $3.63 per GB
                </p>
              </div>
              <div className="tcard-foot">
                <a className="tbtn" href="/signup">
                  <span>Get Starter</span>
                  <span className="ar">↗</span>
                </a>
                <p className="plan-note">No credit card required to start</p>
              </div>
              <ul className="tcard-list plan-checks">
                <li className="tcard-li">
                  {CHECK}
                  <span>8 GB residential traffic</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>195 countries</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Rotating and sticky sessions</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>HTTP and SOCKS5</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Country targeting</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Traffic never expires</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Email support</span>
                </li>
              </ul>
            </article>

            <article
              className="plan tcard yel"
              data-monthly="99"
              data-yearly="79"
              data-gb="40"
              data-total="948"
              data-tag="For teams that scrape every day."
            >
              <div className="tcard-top">
                <span className="tbadge">Pro · Most popular</span>
                <span className="tnum">02 / Pro</span>
              </div>
              <div className="tcard-copy plan-copy">
                <h3 className="tcard-h">40 GB</h3>
                <p className="tcard-price">
                  <span className="amt">
                    $<b data-price="">99</b>
                  </span>
                  <span className="unit">
                    /month
                    <span className="sr-only" data-price-sr="">
                      {' '}
                      $99 per month
                    </span>
                  </span>
                </p>
                <p className="tcard-b" data-desc="">
                  For teams that scrape every day. Billed monthly.
                </p>
                <p className="plan-rate mono" data-rate="">
                  About $2.48 per GB
                </p>
              </div>
              <div className="tcard-foot">
                <a className="tbtn" href="/signup">
                  <span>Get Pro</span>
                  <span className="ar">↗</span>
                </a>
                <p className="plan-note">No credit card required to start</p>
              </div>
              <ul className="tcard-list plan-checks">
                <li className="tcard-li">
                  {CHECK}
                  <span>40 GB residential traffic</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Unlimited concurrent sessions</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Unlimited IP whitelisting</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Priority email support</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Traffic never expires</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>API access and sub-users</span>
                </li>
              </ul>
            </article>

            <article className="tcard dark">
              <div className="tcard-top">
                <span className="tbadge">Enterprise</span>
                <span className="tnum">03 / Enterprise</span>
              </div>
              <div className="tcard-copy plan-copy">
                <h3 className="tcard-h">Custom</h3>
                <p className="tcard-price">
                  <span className="amt">Volume pricing</span>
                </p>
                <p className="tcard-b">For large-scale, mission-critical data. Invoicing available.</p>
                <p className="plan-rate mono">Tailored to your traffic</p>
              </div>
              <div className="tcard-foot">
                <a className="tbtn" href="/support">
                  <span>Talk to sales</span>
                  <span className="ar">↗</span>
                </a>
              </div>
              <ul className="tcard-list plan-checks">
                <li className="tcard-li">
                  {CHECK}
                  <span>Custom volume pricing</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Dedicated account manager</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Private IP pools</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Custom integrations</span>
                </li>
                <li className="tcard-li">
                  {CHECK}
                  <span>Invoicing and SSO</span>
                </li>
              </ul>
            </article>
          </div>

          <aside className="pnote" aria-labelledby="pnote-title">
            <h3 id="pnote-title">How billing works</h3>
            <p>
              Pick a plan and your balance is loaded with traffic. Use it for residential proxies (billed per GB) or Web
              Unlocker requests ($0.20 per 1,000). Traffic never expires — it rolls over until used. Need more? Top up
              anytime from the dashboard with card or USDT, starting at $10. See our{' '}
              <a className="vy-link" href="/refund-policy">
                refund policy
              </a>{' '}
              for details.
            </p>
          </aside>
        </div>
      </section>

      <section className="faq-sec vy-type-text" aria-labelledby="faq-title">
        <div className="vy-wrap">
          <div className="vy-specbar">
            <span>
              <i />
              FAQ / 07
            </span>
            <span>Pricing &amp; billing</span>
          </div>
          <header className="sec-head">
            <h2 id="faq-title">Frequently asked questions</h2>
          </header>
          <div className="faq__list">
            <details className="faq__item">
              <summary>
                How does billing work?
                <span className="faq__toggle" aria-hidden="true" />
              </summary>
              <p>
                Plans are monthly subscriptions that load your account with a traffic allowance (8 GB or 40 GB). You can
                also buy one-off top-ups from $10 in the dashboard. Both methods credit the same prepaid balance. You only
                pay for traffic you use — residential proxies per GB, Web Unlocker per request.
              </p>
            </details>
            <details className="faq__item">
              <summary>
                Does my traffic expire?
                <span className="faq__toggle" aria-hidden="true" />
              </summary>
              <p>No. Unused traffic rolls over indefinitely. Your balance stays until you use it, whether it came from a plan or a top-up.</p>
            </details>
            <details className="faq__item">
              <summary>
                What happens after I create an account?
                <span className="faq__toggle" aria-hidden="true" />
              </summary>
              <p>
                You get $1.00 free credit immediately — enough for 5,000 Web Unlocker requests. No card needed. Your API
                credentials and proxy gateway details appear in the dashboard. Add a payment method when you are ready to
                buy more traffic.
              </p>
            </details>
            <details className="faq__item">
              <summary>
                Can I cancel or change plans anytime?
                <span className="faq__toggle" aria-hidden="true" />
              </summary>
              <p>Yes. Upgrade, downgrade, or cancel from the dashboard. No contracts, no lock-in. Any remaining balance stays in your account.</p>
            </details>
            <details className="faq__item">
              <summary>
                What payment methods do you accept?
                <span className="faq__toggle" aria-hidden="true" />
              </summary>
              <p>Visa, Mastercard, and American Express via Stripe, or USDT on BNB Smart Chain (BEP-20). All payments are prepaid.</p>
            </details>
            <details className="faq__item">
              <summary>
                How do I get support?
                <span className="faq__toggle" aria-hidden="true" />
              </summary>
              <p>
                Email support is included on every plan. Pro and Enterprise customers get priority response. Send a
                request from the{' '}
                <a className="vy-link" href="/support">
                  support page
                </a>{' '}
                or email directly — we typically respond within a few hours during business days.
              </p>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}
