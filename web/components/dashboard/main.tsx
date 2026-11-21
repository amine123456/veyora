export function DashboardMain() {
  return (
    <>
      <main className="main" id="main">
        <header className="page-head">
          <div>
            <p className="eyebrow">Account</p>
            <h1>Dashboard</h1>
            <p className="page-head__sub">Your balance, proxy credentials and Web Unlocker access in one place.</p>
          </div>{' '}
          <a className="btn btn--primary" href="#funds">
            <svg className="ic" aria-hidden="true">
              <use href="#i-plus" />
            </svg>
            Add funds
          </a>
        </header>{' '}
        <section className="hero-card" id="overview" aria-labelledby="balance-title">
          <div className="hero-card__top">
            <h2 className="hero-card__label" id="balance-title">
              <svg className="ic" aria-hidden="true">
                <use href="#i-wallet" />
              </svg>
              Balance
            </h2>{' '}
            <span className="status">
              <i className="dot" />
              Prepaid balance
            </span>
          </div>
          <p className="balance" data-field="wallet">
            …
          </p>
          <ul className="prices" aria-label="Pricing">
            <li>
              <svg className="ic" aria-hidden="true">
                <use href="#i-internet" />
              </svg>
              <span>Residential</span>
              <b data-field="price-res">…</b>
            </li>
            <li data-chip-mobile="" hidden>
              <svg className="ic" aria-hidden="true">
                <use href="#i-phone" />
              </svg>
              <span>Mobile</span>
              <b data-field="price-mob">…</b>
            </li>
            <li data-chip-unlocker="" hidden>
              <svg className="ic" aria-hidden="true">
                <use href="#i-api" />
              </svg>
              <span>Web Unlocker</span>
              <b data-field="price-unl">…</b>
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
        </section>{' '}
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
        {/* Data Feeds */}
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
                Subscribe to a feed, configure your SFTP or webhook, and receive fresh data automatically.
              </p>
            </div>
          </header>
          <p className="notice notice--ok" data-feed-sub-ok="" hidden role="status">
            <svg className="ic" aria-hidden="true">
              <use href="#i-ok" />
            </svg>
            Subscription activated! Set up your delivery method below to start receiving data.
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
          <div className="delivery-panel" data-delivery-panel="" hidden>
            <div className="divider" />
            <header className="card__head card__head--sub">
              <span className="chip-ic chip-ic--accent">
                <svg className="ic" aria-hidden="true">
                  <use href="#i-info" />
                </svg>
              </span>{' '}
              <div>
                <h3>Configure delivery — <span data-delivery-feed-name="" /></h3>
                <p>Choose how you want to receive your data.</p>
              </div>
              <button className="btn btn--ghost btn--sm" type="button" data-delivery-close="" aria-label="Close" style={{ marginLeft: 'auto' }}>&times;</button>
            </header>
            <div className="pay-methods" data-delivery-tabs="">
              <button className="pay-tab pay-tab--active" type="button" data-delivery-tab="sftp">SFTP</button>
              <button className="pay-tab" type="button" data-delivery-tab="webhook">Webhook</button>
            </div>
            <form className="delivery-form" data-delivery-form="" noValidate>
              <input type="hidden" name="subscription_id" />
              <input type="hidden" name="delivery_method" value="sftp" />
              <div data-delivery-fields-sftp="">
                <label className="field">
                  <span className="field__label">SFTP Host</span>
                  <input type="text" name="sftp_host" maxLength={255} autoComplete="off" placeholder="sftp.example.com" />
                </label>{' '}
                <label className="field">
                  <span className="field__label">Port</span>
                  <input type="number" name="sftp_port" defaultValue={22} min={1} max={65535} />
                </label>{' '}
                <label className="field">
                  <span className="field__label">Username</span>
                  <input type="text" name="sftp_username" maxLength={128} autoComplete="off" />
                </label>{' '}
                <label className="field">
                  <span className="field__label">Password</span>
                  <input type="password" name="sftp_password" maxLength={256} autoComplete="off" />
                </label>{' '}
                <label className="field">
                  <span className="field__label">Remote path</span>
                  <input type="text" name="sftp_path" maxLength={512} autoComplete="off" placeholder="/data/feeds/" />
                </label>
              </div>
              <div data-delivery-fields-webhook="" hidden>
                <label className="field">
                  <span className="field__label">Webhook URL</span>
                  <input type="url" name="webhook_url" maxLength={512} autoComplete="off" placeholder="https://api.example.com/feeds/ingest" />
                </label>{' '}
                <label className="field">
                  <span className="field__label">Signing secret <span className="muted">(optional)</span></span>
                  <input type="text" name="webhook_secret" maxLength={256} autoComplete="off" placeholder="whsec_..." />
                </label>
                <p className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                  We&rsquo;ll POST a JSON payload to this URL on each delivery. The signing secret lets you verify requests come from Veyora.
                </p>
              </div>
              <button className="btn btn--primary" type="submit" style={{ marginTop: '12px' }}>
                Save delivery settings
              </button>
            </form>
            <p className="notice notice--ok" data-delivery-ok="" hidden role="status">
              <svg className="ic" aria-hidden="true">
                <use href="#i-ok" />
              </svg>
              Delivery configuration saved. Data will be delivered on the next scheduled run.
            </p>
            <p className="notice notice--err form__error" data-delivery-error="" role="alert" hidden />
          </div>
          <div className="card__actions">
            <a className="btn btn--secondary" href="/data-feeds">
              <svg className="ic" aria-hidden="true">
                <use href="#i-database" />
              </svg>
              <span className="lbl">Browse catalog</span>
            </a>
          </div>
        </section>{' '}

        {/* Usage */}
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

        {/* Payments */}
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

        <footer className="foot">
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/acceptable-use">Acceptable use</a>
          <a href="/refund-policy">Refund policy</a>
        </footer>
      </main>
    </>
  );
}
