// How Veyora works (CLAUDE-PROMPT.md §4.5, reference 04-how-veyora-works-section-a.html).
// Tab-switch behaviour (public/home.js, [data-how-tabs]/[data-how-pane]/.is-on) is unchanged;
// only markup/classes are restyled. Icons for the Unlocker/Proxies tabs reuse the same small
// pixel-square language as the Data Feeds tab (no reference art exists for those two).
import type { ReactNode } from 'react';
const STEP_ICONS = {
  catalog: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" fill="#FAE401" stroke="#161616" strokeWidth="1" />
      <rect x="14" y="2" width="8" height="8" fill="#FFFFFF" stroke="#161616" strokeWidth="1" />
      <rect x="2" y="14" width="8" height="8" fill="#FFFFFF" stroke="#161616" strokeWidth="1" />
      <rect x="14" y="14" width="8" height="8" fill="#DC9AFF" stroke="#161616" strokeWidth="1" />
    </svg>
  ),
  delivery: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="6" width="8" height="12" fill="#DC9AFF" stroke="#161616" strokeWidth="1" />
      <rect x="14" y="6" width="8" height="12" fill="#FAE401" stroke="#161616" strokeWidth="1" />
      <path d="M10 12H14" stroke="#161616" strokeWidth="2" />
      <rect x="5" y="10" width="2" height="4" fill="#161616" />
      <rect x="17" y="10" width="2" height="4" fill="#161616" />
    </svg>
  ),
  snapshot: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="16" width="20" height="5" fill="#161616" />
      <rect x="4" y="9" width="16" height="5" fill="#FAE401" stroke="#161616" strokeWidth="1" />
      <rect x="7" y="2" width="10" height="5" fill="#DC9AFF" stroke="#161616" strokeWidth="1" />
    </svg>
  ),
};

function StepCard({
  num,
  tone,
  label,
  icon,
  title,
  text,
  panel,
}: {
  num: 1 | 2 | 3;
  tone: 's1' | 's2' | 's3';
  label: string;
  icon: keyof typeof STEP_ICONS;
  title: string;
  text: string;
  panel: ReactNode;
}) {
  return (
    <article className="scard">
      <div className="scard-top">
        <div className="scard-step mono">
          <span className={`snum ${tone}`}>{num}</span>
          <span>{label}</span>
        </div>
        {STEP_ICONS[icon]}
      </div>
      <div className="scard-body">
        <h3>{title}</h3>
        <p>{text}</p>
        {panel}
      </div>
    </article>
  );
}

function MiniPanel({ title, badge, children, sub }: { title: string; badge: string; children: ReactNode; sub: string }) {
  return (
    <div className="mini-panel">
      <div className="mp-head">
        <span className="mp-title mono">{title}</span>
        <span className="mp-badge mono">{badge}</span>
      </div>
      <div className="mp-body">
        {children}
        <div className="mp-sub mono">{sub}</div>
      </div>
    </div>
  );
}

export function HomeHow() {
  return (
    <section className="how-sec vy-type-text" id="how" aria-labelledby="how-title">
      <div className="vy-wrap">
        <div className="vy-specbar vy-specbar--plain">
          <span>
            <i />
            Workflow / 04
          </span>
          <span>3 steps · Data Feeds · Web Unlocker · Proxies</span>
        </div>

        <header className="how-head">
          <span className="vy-label-chip">
            <span className="vy-label-chip__sq">
              <i />
            </span>
            <span className="vy-label-chip__txt">How Veyora works</span>
          </span>
          <h2 id="how-title">
            From sign-up <span className="vy-hl-inline">to data in hand.</span>
          </h2>
          <p className="sub">Three steps, whichever product you pick.</p>

          <div className="how__tabs tabs-row" role="tablist" aria-label="Choose a product" data-how-tabs="">
            <button
              type="button"
              role="tab"
              id="how-tab-feeds"
              className="tab-chip active"
              aria-controls="how-feeds"
              aria-selected="true"
              data-how="feeds"
            >
              <span>Data Feeds</span>
              <span className="ar">↗</span>
            </button>
            <button
              type="button"
              role="tab"
              id="how-tab-unlocker"
              className="tab-chip"
              aria-controls="how-unlocker"
              aria-selected="false"
              tabIndex={-1}
              data-how="unlocker"
            >
              <span>Web Unlocker</span>
            </button>
            <button
              type="button"
              role="tab"
              id="how-tab-proxies"
              className="tab-chip"
              aria-controls="how-proxies"
              aria-selected="false"
              tabIndex={-1}
              data-how="proxies"
            >
              <span>Proxies</span>
            </button>
          </div>
        </header>

        <div className="pipe-rail mono">
          <div className="rail-cell">
            <span className="rail-node n1" />
            <span>01 / Source</span>
            <span className="rail-line" />
          </div>
          <div className="rail-cell">
            <span className="rail-node n2" />
            <span>02 / Route</span>
            <span className="rail-line" />
          </div>
          <div className="rail-cell">
            <span className="rail-node n3" />
            <span>03 / Snapshot</span>
          </div>
        </div>

        <div className="how__pane is-on" id="how-feeds" role="tabpanel" aria-labelledby="how-tab-feeds" data-how-pane="feeds">
          <h3 className="sr-only">Data Feeds</h3>
          <div className="steps-grid">
            <StepCard
              num={1}
              tone="s1"
              label="Step 01 / Catalog"
              icon="catalog"
              title="Pick a feed"
              text="Browse the catalog by vertical or country, and open the free sample to check every field."
              panel={
                <MiniPanel title="Fields in the mobile.de feed" badge="Sample" sub="23 structured fields · JSON · CSV · Parquet">
                  <div className="field-chips">
                    <span className="fchip">make</span>
                    <span className="fchip">model</span>
                    <span className="fchip">year</span>
                    <span className="fchip">price</span>
                    <span className="fchip">mileage</span>
                    <span className="fchip more">+18 more</span>
                  </div>
                </MiniPanel>
              }
            />
            <StepCard
              num={2}
              tone="s2"
              label="Step 02 / Delivery"
              icon="delivery"
              title="Set your delivery"
              text="Tell us where the files go and how often. Change it any time from the dashboard."
              panel={
                <MiniPanel title="Delivery" badge="Example" sub="Daily · JSON · Webhook on every delivery">
                  <div className="ex-box">
                    <span>sftp://data.yourco.com/veyora/</span>
                  </div>
                </MiniPanel>
              }
            />
            <StepCard
              num={3}
              tone="s3"
              label="Step 03 / Snapshot"
              icon="snapshot"
              title="Get fresh files"
              text="A full, cleaned snapshot lands every morning. Every delivery is logged in your dashboard."
              panel={
                <MiniPanel title="Last delivery" badge="Example" sub="SFTP · S3 · Snowflake · Webhook · API">
                  <div className="ex-box">
                    <span className="fname">
                      <i className="sq-live" />
                      mobilede_20261121.json
                    </span>
                    <span className="ftime">06:00</span>
                  </div>
                </MiniPanel>
              }
            />
          </div>
        </div>

        <div className="how__pane" id="how-unlocker" role="tabpanel" aria-labelledby="how-tab-unlocker" data-how-pane="unlocker">
          <h3 className="sr-only">Web Unlocker</h3>
          <div className="steps-grid">
            <StepCard
              num={1}
              tone="s1"
              label="Step 01 / Account"
              icon="catalog"
              title="Create an account"
              text="Sign up with your email. $1.00 of free credit is added straight away, no card needed."
              panel={
                <MiniPanel title="Wallet" badge="On signup" sub="about 5,000 requests">
                  <div className="ex-box">
                    <span className="fname">
                      <i className="sq-live" />
                      $1.00 free credit
                    </span>
                  </div>
                </MiniPanel>
              }
            />
            <StepCard
              num={2}
              tone="s2"
              label="Step 02 / Keys"
              icon="delivery"
              title="Create an API key"
              text="Generate a key in the dashboard. Test keys fetch a few real pages a day for free."
              panel={
                <MiniPanel title="Keys" badge="Example" sub="Live and test keys, side by side">
                  <div className="field-chips">
                    <span className="fchip">vy_live_••••••••••••</span>
                    <span className="fchip">vy_test_••••••••••••</span>
                  </div>
                </MiniPanel>
              }
            />
            <StepCard
              num={3}
              tone="s3"
              label="Step 03 / Request"
              icon="snapshot"
              title="Send a URL"
              text="POST the URL and get the page back. Blocked attempts are retried on fresh IPs for you."
              panel={
                <MiniPanel title="Request" badge="Example" sub="POST /v1/unlock">
                  <div className="ex-box">
                    <span className="fname">
                      <i className="sq-live" />
                      200 OK
                    </span>
                    <span className="ftime">page returned</span>
                  </div>
                </MiniPanel>
              }
            />
          </div>
        </div>

        <div className="how__pane" id="how-proxies" role="tabpanel" aria-labelledby="how-tab-proxies" data-how-pane="proxies">
          <h3 className="sr-only">Residential Proxies</h3>
          <div className="steps-grid">
            <StepCard
              num={1}
              tone="s1"
              label="Step 01 / Wallet"
              icon="catalog"
              title="Create your user"
              text="Generate credentials in the dashboard or through the API. Top up with card or USDT — prepaid from $10."
              panel={
                <MiniPanel title="Live top-ups" badge="From /packages" sub="Card or USDT on BNB Smart Chain (BEP-20)">
                  <div className="field-chips">
                    <span className="fchip">$10</span>
                    <span className="fchip">$25</span>
                    <span className="fchip">$50</span>
                    <span className="fchip">$100 +5%</span>
                    <span className="fchip more">$500 +10%</span>
                  </div>
                </MiniPanel>
              }
            />
            <StepCard
              num={2}
              tone="s2"
              label="Step 02 / Country"
              icon="delivery"
              title="Choose a country"
              text="Add a country flag to your username, or leave it off to use the whole 195-country pool."
              panel={
                <MiniPanel title="Username pattern" badge="Example" sub="Flags, in order: -mobile, -country-xx, -session-name">
                  <div className="field-chips">
                    <span className="fchip">user-country-fr</span>
                    <span className="fchip">user-session-cart</span>
                    <span className="fchip">user-mobile</span>
                  </div>
                </MiniPanel>
              }
            />
            <StepCard
              num={3}
              tone="s3"
              label="Step 03 / Gateway"
              icon="snapshot"
              title="Send the request"
              text="Point your client at the gateway. If it speaks HTTP, HTTPS or SOCKS5, it works with Veyora."
              panel={
                <MiniPanel title="Gateway" badge="Example host" sub="cURL · Python · Node · Playwright">
                  <div className="ex-box">
                    <span className="fname">
                      <i className="sq-live" />
                      gate.veyora.pro:8443
                    </span>
                    <span className="ftime">200 OK · 412ms</span>
                  </div>
                </MiniPanel>
              }
            />
          </div>
        </div>

        <div className="how-foot">
          <span className="hf-main">
            No contract. Card or USDT. See <a className="hf-link" href="/refund-policy">refund policy</a>.
          </span>
          <span className="hf-spec mono">99.8% delivery success · Automated logs</span>
        </div>
      </div>
    </section>
  );
}
