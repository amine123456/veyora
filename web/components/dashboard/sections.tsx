// Dashboard sections, one per job. Pages compose these; auth.js wires whichever are present.
// BalanceSection/ProductsSection/DashboardFooter restyled to screen 01
// (CLAUDE-PROMPT.md §5.2); every data-field/data-* hook auth.js depends on is unchanged.

export function BalanceSection() {
  return (
    <>
      <section className="balance-card" id="overview" aria-labelledby="balance-title">
        <div className="bal-left">
          <div className="bal-top">
            <h2 className="bal-tag mono" id="balance-title">
              <span className="sq">
                <img src="/design/04-illustrations/icons/dashboard-product/balance-wallet.svg" alt="" aria-hidden="true" />
              </span>
              Balance
            </h2>
            <span className="status-chip mono">
              <i />
              Prepaid balance
            </span>
          </div>
          <p className="bal-figure" data-field="wallet">
            …
          </p>
          <ul className="rate-row" aria-label="Pricing">
            <li className="rate-chip">
              <span className="rc-dot y" />
              Residential <strong data-field="price-res">…</strong>
            </li>
            <li className="rate-chip" data-chip-mobile="" hidden>
              <span className="rc-dot l" />
              Mobile <strong data-field="price-mob">…</strong>
            </li>
            <li className="rate-chip" data-chip-unlocker="" hidden>
              <span className="rc-dot" />
              Web Unlocker <strong data-field="price-unl">…</strong>
            </li>
          </ul>
          <div className="prepaid" data-prepaid="" hidden>
            <div className="prepaid__row">
              <span>Prepaid residential traffic, used before your balance</span>
              <b data-field="remaining" />
            </div>
            <div
              className="meter"
              role="progressbar"
              aria-label="Prepaid traffic used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              data-meter=""
            >
              <span className="meter__fill" data-meter-fill="" />
            </div>
            <p className="prepaid__note" data-field="usage" />
          </div>
          <p className="empty" data-empty="" hidden>
            <svg className="ic" aria-hidden="true">
              <use href="#i-alert" />
            </svg>
            Your balance is empty. Add funds to start using proxies and the Web Unlocker.
          </p>
        </div>
        <div className="bal-right">
          <img className="mat-art" src="/design/05-backgrounds/sections/dashboard-balance-lilac-mat-310x204.svg" alt="" aria-hidden="true" />
          <div className="mat-top-row mono">
            <span className="mat-badge">Wallet / Prepaid</span>
            <span className="mat-badge yel">Active</span>
          </div>
          <div className="mat-bottom-box mono">
            <span>No monthly lock-in</span>
            <span>Pay per use</span>
          </div>
        </div>
      </section>
    </>
  );
}

export function FundsSection() {
  return (
    <>
  <section className="card" id="funds" aria-labelledby="funds-title">
    <header className="card__head">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-walletadd" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="funds-title">Add funds</h2>
        <p>
          Choose an amount and pay with card or USDT. Your balance updates automatically once payment is confirmed.
          Larger top-ups include a bonus.
        </p>
      </div>
    </header>
    <p className="notice notice--ok" data-paid="" hidden role="status">
      <svg className="ic" aria-hidden="true">
        <use href="#i-ok" />
      </svg>
      Payment received! Your balance has been updated.
    </p>
    <div className="pay-methods" data-pay-methods="">
      <button type="button" className="pay-tab pay-tab--active" data-pay-method="stripe">Card</button>
      <button type="button" className="pay-tab" data-pay-method="crypto">USDT</button>
    </div>
    <div className="packs" data-packs="" aria-busy="true">
      <i className="sk" />
      <i className="sk" />
      <i className="sk" />
      <i className="sk" />
      <i className="sk" />
    </div>
    <p className="notice notice--err form__error" data-buy-error="" role="alert" hidden />
    <p className="card__note">
      <svg className="ic" aria-hidden="true">
        <use href="#i-info" />
      </svg>
      One balance pays for everything: residential and mobile traffic by the GB, and unlocker requests by the
      request.
    </p>
  </section>{' '}
    </>
  );
}

export function ConnectionSection() {
  return (
    <>
  <section className="card" id="connection" aria-labelledby="connect-title">
    <header className="card__head">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-router" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="connect-title">Connection details</h2>
        <p>Use these with any HTTP, HTTPS or SOCKS5 client.</p>
      </div>
    </header>
    <dl className="kv kv--copy">
      <div>
        <dt>Endpoint</dt>
        <dd>
          <code data-field="endpoint">…</code>
          <button className="copy" type="button" data-copy="endpoint">
            <svg className="ic" aria-hidden="true">
              <use href="#i-copy" />
            </svg>
            <span className="lbl">Copy</span>
          </button>
        </dd>
      </div>
      <div>
        <dt>Username</dt>
        <dd>
          <code data-field="username">…</code>
          <button className="copy" type="button" data-copy="username">
            <svg className="ic" aria-hidden="true">
              <use href="#i-copy" />
            </svg>
            <span className="lbl">Copy</span>
          </button>
        </dd>
      </div>
      <div>
        <dt>Password</dt>
        <dd>
          <span className="muted" data-password-hidden="">
            <svg className="ic" aria-hidden="true">
              <use href="#i-lock" />
            </svg>
            Hidden
          </span>{' '}
          <code data-field="password" hidden />
          <button className="copy" type="button" data-copy="password" hidden>
            <svg className="ic" aria-hidden="true">
              <use href="#i-copy" />
            </svg>
            <span className="lbl">Copy</span>
          </button>
        </dd>
      </div>
    </dl>
    <p className="notice notice--warn" data-password-notice="" hidden role="status">
      <svg className="ic" aria-hidden="true">
        <use href="#i-alert" />
      </svg>
      Save this password now. It will not be shown again, and your previous password no longer works.
    </p>
    <p className="notice notice--err form__error" data-password-error="" role="alert" hidden />
    <div className="card__actions">
      <button className="btn btn--secondary" type="button" data-regenerate="">
        <svg className="ic" aria-hidden="true">
          <use href="#i-refresh" />
        </svg>
        <span className="lbl">Generate new password</span>
      </button>
    </div>
    <p className="card__note">
      <svg className="ic" aria-hidden="true">
        <use href="#i-shield" />
      </svg>
      We only store a fingerprint of your proxy password, so we can't show an old one. Generating a new password
      signs out tools using the old one.
    </p>
  </section>{' '}
    </>
  );
}

export function TargetingSection() {
  return (
    <>
  <section className="card" id="targeting" aria-labelledby="options-title">
    <header className="card__head">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-globe" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="options-title">Country, mobile and sticky IPs</h2>
        <p>Add options to your username. The password stays the same.</p>
      </div>
    </header>
    <dl className="kv kv--options">
      <div>
        <dt>
          <code data-example="" />
        </dt>
        <dd>
          <svg className="ic" aria-hidden="true">
            <use href="#i-internet" />
          </svg>
          Residential IP, new on every request
        </dd>
      </div>
      <div data-mobile-option="" hidden>
        <dt>
          <code data-example="-mobile" />
        </dt>
        <dd>
          <svg className="ic" aria-hidden="true">
            <use href="#i-phone" />
          </svg>
          Mobile carrier IP (4G/5G), paid from your balance at <span data-field="mobile-price" />
        </dd>
      </div>
      <div>
        <dt>
          <code data-example="-country-gr" />
        </dt>
        <dd>
          <svg className="ic" aria-hidden="true">
            <use href="#i-pin" />
          </svg>
          IP in Greece. Use any two-letter country code.
        </dd>
      </div>
      <div>
        <dt>
          <code data-example="-session-job1" />
        </dt>
        <dd>
          <svg className="ic" aria-hidden="true">
            <use href="#i-timer" />
          </svg>
          Same IP for <span data-field="sticky">10 minutes</span>. Pick any name of up to 32 letters and digits.
        </dd>
      </div>
      <div>
        <dt>
          <code data-example="-country-gr-session-job1" />
        </dt>
        <dd>
          <svg className="ic" aria-hidden="true">
            <use href="#i-layers" />
          </svg>
          Both: a Greek IP that stays the same
        </dd>
      </div>
    </dl>
    <p className="card__note">
      <svg className="ic" aria-hidden="true">
        <use href="#i-info" />
      </svg>
      <span>
        Options combine in this order: <code>-mobile</code>, then <code>-country-xx</code>, then{' '}
        <code>-session-name</code>.
      </span>
    </p>
  </section>{' '}
    </>
  );
}

export function TestSection() {
  return (
    <>
  <section className="card" id="test" aria-labelledby="test-title">
    <header className="card__head">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-terminal" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="test-title">Test it</h2>
        <p>Run this in a terminal. It prints the IP address sites see.</p>
      </div>
    </header>
    <div className="code">
      {'\n        '}
      <span className="code__bar">
        <i />
        <i />
        <i />
        <em>{'Terminal'}</em>
      </span>
      {'\n        '}
      <pre>
        <code data-field="curl">{'…'}</code>
      </pre>
      {'\n        '}
      <button className="copy copy--dark" type="button" data-copy="curl">
        <svg className="ic" aria-hidden="true">
          <use href="#i-copy" />
        </svg>
        <span className="lbl">{'Copy'}</span>
      </button>
      {'\n      '}
    </div>
  </section>{' '}
    </>
  );
}

export function SandboxSection() {
  return (
    <>
  <section className="card" id="sandbox" aria-labelledby="sandbox-title" data-sandbox="" hidden>
    <header className="card__head">
      <span className="chip-ic chip-ic--accent">
        <svg className="ic" aria-hidden="true">
          <use href="#i-terminal" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="sandbox-title">Sandbox</h2>
        <p>
          Try the Web Unlocker for free, right here. Fetch a public page with your daily test allowance, or
          run a simulated scenario to see exactly what your code will receive. Nothing here touches your balance.
        </p>
      </div>
    </header>
    <p className="sbx-quota" role="status">
      <svg className="ic" aria-hidden="true">
        <use href="#i-shield" />
      </svg>
      <span data-field="sbx-quota">Loading your test allowance…</span>
    </p>
    <form className="sbx-form" data-sbx-form="" noValidate>
      <label className="field sbx-form__url">
        <span className="field__label">Page URL</span>
        <input type="url" name="url" required maxLength={2048} autoComplete="off" spellCheck={false} placeholder="https://example.com/" />
      </label>
      <label className="field sbx-form__opt">
        <span className="field__label">
          Country <small>optional</small>
        </span>
        <input type="text" name="country" maxLength={2} autoComplete="off" spellCheck={false} placeholder="any" />
      </label>
      <label className="field sbx-form__opt">
        <span className="field__label">
          Session <small>optional</small>
        </span>
        <input type="text" name="session" maxLength={32} autoComplete="off" spellCheck={false} placeholder="none" />
      </label>
      <button className="btn btn--primary" type="submit" data-sbx-run="">
        <svg className="ic" aria-hidden="true">
          <use href="#i-api" />
        </svg>
        <span className="lbl">Run request</span>
      </button>
    </form>
    <p className="sbx-label">Simulated scenarios: instant, free, unlimited</p>
    <div className="sbx-chips" data-sbx-scenarios="" role="group" aria-label="Simulated scenarios" />
    <p className="sbx-hint" data-sbx-hint="" hidden />
    <p className="notice notice--err form__error" data-sbx-error="" role="alert" hidden />
    <div className="sbx-result" data-sbx-result="" hidden>
      <div className="sbx-stats" data-sbx-stats="" aria-live="polite" />
      <ol className="sbx-attempts" data-sbx-attempts="" aria-label="Attempts" />
      <div className="sbx-tabs" role="tablist" aria-label="Response view" data-sbx-views="">
        <button type="button" role="tab" data-view="page" aria-selected="true">Page</button>
        <button type="button" role="tab" data-view="body" aria-selected="false">Body</button>
        <button type="button" role="tab" data-view="headers" aria-selected="false">Headers</button>
        <button type="button" role="tab" data-view="json" aria-selected="false">Full response</button>
      </div>
      <div className="code code--scroll">
        {'\n        '}
        <span className="code__bar">
          <i />
          <i />
          <i />
          <em data-field="sbx-output-title">{'Response'}</em>
        </span>
        {'\n        '}
        <pre>
          <code data-field="sbx-output" />
        </pre>
        {'\n        '}
        <button className="copy copy--dark" type="button" data-copy="sbx-output">
          <svg className="ic" aria-hidden="true">
            <use href="#i-copy" />
          </svg>
          <span className="lbl">{'Copy'}</span>
        </button>
        {'\n      '}
      </div>
    </div>
    <div className="divider" />
    <header className="card__head card__head--sub">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-key" />
        </svg>
      </span>{' '}
      <div>
        <h3>Run it from your code</h3>
        <p>
          The same request with a sandbox key (<code>vy_test_…</code>). Sandbox keys work exactly like live keys
          but never charge: swap in a live key when you go to production.
        </p>
      </div>
    </header>
    <div className="sbx-tabs" role="tablist" aria-label="Language" data-sbx-langs="">
      <button type="button" role="tab" data-lang="curl" aria-selected="true">cURL</button>
      <button type="button" role="tab" data-lang="python" aria-selected="false">Python</button>
      <button type="button" role="tab" data-lang="node" aria-selected="false">Node.js</button>
    </div>
    <div className="code">
      {'\n        '}
      <span className="code__bar">
        <i />
        <i />
        <i />
        <em>{'POST /v1/unlock'}</em>
      </span>
      {'\n        '}
      <pre>
        <code data-field="sbx-snippet">{'…'}</code>
      </pre>
      {'\n        '}
      <button className="copy copy--dark" type="button" data-copy="sbx-snippet">
        <svg className="ic" aria-hidden="true">
          <use href="#i-copy" />
        </svg>
        <span className="lbl">{'Copy'}</span>
      </button>
      {'\n      '}
    </div>
    <p className="notice notice--warn" data-sbx-key-notice="" hidden role="status">
      <svg className="ic" aria-hidden="true">
        <use href="#i-alert" />
      </svg>
      Your new sandbox key is in the snippet above. Copy it now: it will not be shown again.
    </p>
    <p className="notice notice--err form__error" data-sbx-key-error="" role="alert" hidden />
    <div className="card__actions">
      <button className="btn btn--secondary" type="button" data-sbx-key="">
        <svg className="ic" aria-hidden="true">
          <use href="#i-plus" />
        </svg>
        <span className="lbl">Create a sandbox key</span>
      </button>
    </div>
  </section>{' '}
    </>
  );
}

export function UnlockerSection() {
  return (
    <>
  <section className="card" id="unlocker" aria-labelledby="unlocker-title" data-unlocker="" hidden>
    <header className="card__head">
      <span className="chip-ic chip-ic--accent">
        <svg className="ic" aria-hidden="true">
          <use href="#i-api" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="unlocker-title">Web Unlocker</h2>
        <p>
          Send a URL, get the page back. We pick the exit, retry blocked requests on new residential and mobile
          IPs, and keep cookies per session. <span data-field="unlocker-price" /> You are charged only when the
          page comes back.
        </p>
      </div>
    </header>
    <div className="code">
      {'\n        '}
      <span className="code__bar">
        <i />
        <i />
        <i />
        <em>{'POST /v1/unlock'}</em>
      </span>
      {'\n        '}
      <pre>
        <code data-field="unlock-curl">{'…'}</code>
      </pre>
      {'\n        '}
      <button className="copy copy--dark" type="button" data-copy="unlock-curl">
        <svg className="ic" aria-hidden="true">
          <use href="#i-copy" />
        </svg>
        <span className="lbl">{'Copy'}</span>
      </button>
      {'\n      '}
    </div>
    <p className="card__note">
      <svg className="ic" aria-hidden="true">
        <use href="#i-info" />
      </svg>
      <span>
        Optional fields: <code>"country": "de"</code> for an exit in that country, <code>"session": "job1"</code>{' '}
        to keep the same IP and cookies for up to 10 minutes. Public pages only; see the{' '}
        <a href="/acceptable-use">acceptable-use policy</a>.
      </span>
    </p>
    <div className="divider" id="keys" />
    <header className="card__head card__head--sub">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-key" />
        </svg>
      </span>{' '}
      <div>
        <h3>API keys</h3>
        <p>Keys authenticate Web Unlocker requests. Create one per project so you can revoke it on its own.</p>
      </div>
    </header>
    <p className="notice notice--warn" data-key-notice="" hidden role="status">
      <svg className="ic" aria-hidden="true">
        <use href="#i-alert" />
      </svg>
      Copy this key now. It will not be shown again.
    </p>
    <dl className="kv kv--copy kv--new" data-new-key="" hidden>
      <div>
        <dt>New key</dt>
        <dd>
          <code data-field="new-key" />
          <button className="copy" type="button" data-copy="new-key">
            <svg className="ic" aria-hidden="true">
              <use href="#i-copy" />
            </svg>
            <span className="lbl">Copy</span>
          </button>
        </dd>
      </div>
    </dl>
    <dl className="keys" data-keys="" />
    <p className="empty-state" data-no-keys="" hidden>
      <svg className="ic" aria-hidden="true">
        <use href="#i-key" />
      </svg>
      No API keys yet.
    </p>
    <form className="keyform" data-key-form="">
      <label className="field">
        {' '}
        <span className="field__label">
          Key name <small>optional, for your own reference</small>
        </span>{' '}
        <input type="text" name="name" maxLength={40} autoComplete="off" placeholder="e.g. price-monitor" />{' '}
      </label>{' '}
      <label className="field field--mode">
        <span className="field__label">Type</span>
        <select name="mode" defaultValue="live">
          <option value="live">Live: charges your balance</option>
          <option value="test">Sandbox: free, for testing</option>
        </select>
      </label>{' '}
      <button className="btn btn--primary" type="submit">
        <svg className="ic" aria-hidden="true">
          <use href="#i-plus" />
        </svg>
        Create API key
      </button>
    </form>
    <p className="notice notice--err form__error" data-key-error="" role="alert" hidden />
  </section>
    </>
  );
}

export function FeedsSection() {
  return (
    <>
  <section className="card" id="data-feeds" aria-labelledby="feeds-title">
    <header className="card__head">
      <span className="chip-ic chip-ic--accent">
        <svg className="ic" aria-hidden="true">
          <use href="#i-database" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="feeds-title">Data Feeds</h2>
        <p>
          Structured data from hard-to-scrape sites, delivered to your endpoint on schedule.
          Subscribe to a feed, set where it should be delivered, and receive fresh data automatically.
        </p>
      </div>
    </header>
    <p className="notice notice--ok" data-feed-sub-ok="" hidden role="status">
      <svg className="ic" aria-hidden="true">
        <use href="#i-ok" />
      </svg>
      Subscription activated! Choose Configure delivery on the feed to start receiving data.
    </p>
    <div className="feeds-subs" data-feeds-subs="">
      <p className="muted" style={{ fontSize: '14px' }}>Loading...</p>
    </div>
    <p className="empty-state" data-no-feeds="" hidden>
      <svg className="ic" aria-hidden="true">
        <use href="#i-database" />
      </svg>
      No active subscriptions.{' '}
      <a href="/data-feeds">Browse the catalog</a> to get started.
    </p>
    <div className="card__actions">
      <a className="btn btn--secondary" href="/data-feeds">
        <svg className="ic" aria-hidden="true">
          <use href="#i-database" />
        </svg>
        <span className="lbl">Browse catalog</span>
      </a>
    </div>
  </section>{' '}
    </>
  );
}

export function DeliveriesSection() {
  return (
    <>
    <section className="card" id="deliveries" aria-labelledby="deliveries-title">
      <header className="card__head">
        <span className="chip-ic">
          <svg className="ic" aria-hidden="true">
            <use href="#i-timer" />
          </svg>
        </span>{' '}
        <div>
          <h2 id="deliveries-title">Recent deliveries</h2>
          <p>Every snapshot we sent you, newest first, across all your feeds.</p>
        </div>
      </header>
      <div className="usage-table-wrap" data-deliveries="" aria-busy="true">
        <p className="muted" style={{ fontSize: '14px' }}>Loading…</p>
      </div>
      <p className="empty-state" data-no-deliveries="" hidden>
        <svg className="ic" aria-hidden="true">
          <use href="#i-timer" />
        </svg>
        No deliveries yet. Once a feed has its delivery set up, each snapshot appears here.{' '}
        <a href="/account/feeds">Go to your feeds</a>
      </p>
    </section>
    </>
  );
}

const PRODUCT_ICON = (name: string) => `/design/04-illustrations/icons/dashboard-product/${name}.svg`;

export function ProductsSection() {
  return (
    <>
      <section className="cards-grid" aria-label="Your products">
        <a className="pcard" href="/account/feeds">
          <div className="pcard-top mono">
            <span className="idx">01 / Feeds</span>
            <i style={{ background: 'var(--vy-yellow)' }} />
          </div>
          <div className="pcard-body">
            <span className="picon-box yel">
              <img src={PRODUCT_ICON('product-data-feeds')} alt="" aria-hidden="true" />
            </span>
            <h3>Data Feeds</h3>
            <p data-field="ov-feeds">Structured datasets delivered on schedule</p>
          </div>
          <div className="pcard-foot mono">
            <span>Manage feeds</span>
            <span>→</span>
          </div>
        </a>
        <a className="pcard" href="/account/api-keys" data-unlocker-nav="" hidden>
          <div className="pcard-top mono">
            <span className="idx">02 / Unlocker</span>
            <i style={{ background: 'var(--vy-lilac)' }} />
          </div>
          <div className="pcard-body">
            <span className="picon-box lil">
              <img src={PRODUCT_ICON('product-web-unlocker')} alt="" aria-hidden="true" />
            </span>
            <h3>Web Unlocker</h3>
            <p data-field="ov-keys">Send a URL, get the page back</p>
          </div>
          <div className="pcard-foot mono">
            <span>API keys</span>
            <span>→</span>
          </div>
        </a>
        <a className="pcard" href="/account/proxies">
          <div className="pcard-top mono">
            <span className="idx">03 / Proxies</span>
            <i style={{ background: 'var(--vy-ink)' }} />
          </div>
          <div className="pcard-body">
            <span className="picon-box">
              <img src={PRODUCT_ICON('product-proxies')} alt="" aria-hidden="true" />
            </span>
            <h3>Proxies</h3>
            <p data-field="ov-proxy">Residential and mobile IPs</p>
          </div>
          <div className="pcard-foot mono">
            <span>Proxy setup</span>
            <span>→</span>
          </div>
        </a>
        <a className="pcard" href="/account/usage">
          <div className="pcard-top mono">
            <span className="idx">04 / Telemetry</span>
            <i style={{ background: 'var(--vy-white)' }} />
          </div>
          <div className="pcard-body">
            <span className="picon-box">
              <img src={PRODUCT_ICON('product-usage')} alt="" aria-hidden="true" />
            </span>
            <h3>Usage</h3>
            <p>Requests and spend, last 30 days</p>
          </div>
          <div className="pcard-foot mono">
            <span>View usage</span>
            <span>→</span>
          </div>
        </a>
      </section>
    </>
  );
}

export function UnlockerOffNotice() {
  return (
    <p className="notice notice--warn" data-unlocker-off="" hidden role="status">
      <svg className="ic" aria-hidden="true">
        <use href="#i-info" />
      </svg>
      <span>
        The Web Unlocker isn&rsquo;t enabled on your account yet. <a href="/support">Contact support</a> to turn it on.
      </span>
    </p>
  );
}

export function UsageSection() {
  return (
    <>
  <section className="card" id="usage" aria-labelledby="usage-title">
    <header className="card__head">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-chart" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="usage-title">Usage</h2>
        <p>Daily requests and spend over the last 30 days.</p>
      </div>
    </header>
    <div className="usage-chart" data-usage-chart="" aria-label="Daily usage chart">
      <p className="muted" style={{ fontSize: '14px' }}>Loading…</p>
    </div>
    <div className="divider" />
    <header className="card__head card__head--sub">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-timer" />
        </svg>
      </span>{' '}
      <div>
        <h3>Recent requests</h3>
        <p>Your last proxy and unlocker requests.</p>
      </div>
    </header>
    <div className="usage-table-wrap" data-usage-events="">
      <p className="muted" style={{ fontSize: '14px' }}>Loading…</p>
    </div>
    <div className="card__actions" data-usage-pager="" hidden>
      <button className="btn btn--ghost btn--sm" type="button" data-usage-prev="" disabled>Previous</button>
      <span className="muted" style={{ fontSize: '13px' }} data-usage-page-info="" />
      <button className="btn btn--ghost btn--sm" type="button" data-usage-next="">Next</button>
    </div>
  </section>{' '}
    </>
  );
}

export function PaymentsSection() {
  return (
    <>
  <section className="card" id="payments" aria-labelledby="payments-title">
    <header className="card__head">
      <span className="chip-ic">
        <svg className="ic" aria-hidden="true">
          <use href="#i-coins" />
        </svg>
      </span>{' '}
      <div>
        <h2 id="payments-title">Payment history</h2>
        <p>Completed top-ups credited to your balance.</p>
      </div>
    </header>
    <div className="usage-table-wrap" data-payment-list="">
      <p className="muted" style={{ fontSize: '14px' }}>Loading…</p>
    </div>
    <p className="empty-state" data-no-payments="" hidden>
      <svg className="ic" aria-hidden="true">
        <use href="#i-coins" />
      </svg>
      No payments yet.
    </p>
  </section>{' '}
    </>
  );
}

export function DashboardFooter() {
  return (
    <footer className="foot">
      <div className="footer-links">
        <a href="/support">Support</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/acceptable-use">Acceptable use</a>
        <a href="/refund-policy">Refund policy</a>
      </div>
      <div className="footer-right mono">
        <i />
        Veyora.pro · Prepaid workspace
      </div>
    </footer>
  );
}
