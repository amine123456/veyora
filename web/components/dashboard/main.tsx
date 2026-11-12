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
              Prepaid in USDT
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
                Pay with USDT on BNB Smart Chain (BEP-20). The amount is added to your balance automatically once the
                payment is confirmed, usually within a few minutes. Larger top-ups include a bonus.
              </p>
            </div>
          </header>
          <p className="notice notice--ok" data-paid="" hidden role="status">
            <svg className="ic" aria-hidden="true">
              <use href="#i-ok" />
            </svg>
            Payment received. Your balance updates as soon as the network confirms it. You can refresh this page.
          </p>
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
            request. Want to pay another way? Ask us and we'll credit your account manually.
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
            <button className="btn btn--primary" type="submit">
              <svg className="ic" aria-hidden="true">
                <use href="#i-plus" />
              </svg>
              Create API key
            </button>
          </form>
          <p className="notice notice--err form__error" data-key-error="" role="alert" hidden />
        </section>
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
