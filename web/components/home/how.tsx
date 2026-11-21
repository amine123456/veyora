export function HomeHow() {
  return (
    <>
      <section className="how" id="how" aria-labelledby="how-title">
        <header className="head head--center">
          <p className="pill">
            <span className="dot" />
            How Veyora works
          </p>
          <h2 className="h2" id="how-title" data-split="">
            From sign-up{' '}
            <span className="y">
              <em className="serif">to data in hand.</em>
            </span>
          </h2>
          <p className="sub sub--ink">Three steps, whichever product you pick.</p>
          <div className="how__tabs" role="tablist" aria-label="Choose a product" data-how-tabs="">
            <button type="button" role="tab" id="how-tab-feeds" aria-controls="how-feeds" aria-selected="true" data-how="feeds">
              Data Feeds
            </button>
            <button type="button" role="tab" id="how-tab-unlocker" aria-controls="how-unlocker" aria-selected="false" tabIndex={-1} data-how="unlocker">
              Web Unlocker
            </button>
            <button type="button" role="tab" id="how-tab-proxies" aria-controls="how-proxies" aria-selected="false" tabIndex={-1} data-how="proxies">
              Proxies
            </button>
          </div>
        </header>
        <div className="panel how__panel">
          <svg className="how__line" viewBox="0 0 300 120" aria-hidden="true">
            <path d="M20 10C40 70 100 100 170 118" />
          </svg>{' '}
          <span className="tile tile--orange h1t" aria-hidden="true">
            <svg>
              <use href="#i-sun" />
            </svg>
          </span>{' '}
          <span className="tile tile--blue h3t" aria-hidden="true">
            <svg>
              <use href="#i-link" />
            </svg>
          </span>{' '}

          <div className="how__pane is-on" id="how-feeds" role="tabpanel" aria-labelledby="how-tab-feeds" data-how-pane="feeds">
            <h3 className="sr-only">Data Feeds</h3>
            <ol className="steps">
              <li className="step card">
                <span className="num">1</span> <h3>Pick a feed</h3>
                <p>Browse the catalog by vertical or country, and open the free sample to check every field.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Fields in the mobile.de feed</span>
                    <em className="tagv">Sample</em>
                  </p>
                  <ul className="topups">
                    <li>make</li>
                    <li>model</li>
                    <li>year</li>
                    <li>price</li>
                    <li>mileage</li>
                    <li>+18 more</li>
                  </ul>
                </div>
              </li>
              <li className="step card" style={{ ['--d' as string]: '80ms' }}>
                <span className="num">2</span> <h3>Set your delivery</h3>
                <p>Tell us where the files go and how often. Change it any time from the dashboard.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Delivery</span>
                    <em className="tagv">Example</em>
                  </p>
                  <p className="field mono">sftp://data.yourco.com/veyora/</p>
                  <p className="field">Daily · JSON · Webhook on every delivery</p>
                </div>
              </li>
              <li className="step card" style={{ ['--d' as string]: '160ms' }}>
                <span className="num">3</span> <h3>Get fresh files</h3>
                <p>A full, cleaned snapshot lands every morning. Every delivery is logged in your dashboard.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Last delivery</span>
                    <em className="tagv">Example</em>
                  </p>
                  <p className="field field--split">
                    <span>
                      <i className="dot" />
                      mobilede_20261121.json
                    </span>
                    <small>06:00</small>
                  </p>
                  <p className="field">SFTP · S3 · Snowflake · Webhook · API</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="how__pane" id="how-unlocker" role="tabpanel" aria-labelledby="how-tab-unlocker" data-how-pane="unlocker">
            <h3 className="sr-only">Web Unlocker</h3>
            <ol className="steps">
              <li className="step card">
                <span className="num">1</span> <h3>Create an account</h3>
                <p>Sign up with your email. $1.00 of free credit is added straight away, no card needed.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Wallet</span>
                    <em className="tagv">On signup</em>
                  </p>
                  <p className="field field--split">
                    <span>
                      <i className="dot" />
                      $1.00 free credit
                    </span>
                    <small>about 5,000 requests</small>
                  </p>
                </div>
              </li>
              <li className="step card" style={{ ['--d' as string]: '80ms' }}>
                <span className="num">2</span> <h3>Create an API key</h3>
                <p>Generate a key in the dashboard. Test keys fetch a few real pages a day for free.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Keys</span>
                    <em className="tagv">Example</em>
                  </p>
                  <p className="field mono">vy_live_••••••••••••</p>
                  <p className="field mono">vy_test_••••••••••••</p>
                </div>
              </li>
              <li className="step card" style={{ ['--d' as string]: '160ms' }}>
                <span className="num">3</span> <h3>Send a URL</h3>
                <p>POST the URL and get the page back. Blocked attempts are retried on fresh IPs for you.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Request</span>
                    <em className="tagv">Example</em>
                  </p>
                  <p className="field mono">POST /v1/unlock</p>
                  <p className="field field--split">
                    <span>
                      <i className="dot" />
                      200 OK
                    </span>
                    <small>page returned</small>
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="how__pane" id="how-proxies" role="tabpanel" aria-labelledby="how-tab-proxies" data-how-pane="proxies">
            <h3 className="sr-only">Residential Proxies</h3>
            <ol className="steps">
              <li className="step card">
                <span className="num">1</span> <h3>Create your user</h3>
                <p>Generate credentials in the dashboard or through the API. Top up with card or USDT — prepaid from $10.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Live top-ups</span>
                    <em className="tagv">From /packages</em>
                  </p>
                  <ul className="topups">
                    <li>$10</li>
                    <li>$25</li>
                    <li>$50</li>
                    <li>
                      $100 <b>+5%</b>
                    </li>
                    <li>
                      $500 <b>+10%</b>
                    </li>
                  </ul>
                  <p className="field">
                    <span className="dot" />
                    Card or USDT on BNB Smart Chain (BEP-20)
                  </p>
                </div>
              </li>
              <li className="step card" style={{ ['--d' as string]: '80ms' }}>
                <span className="num">2</span> <h3>Choose a country</h3>
                <p>Add a country flag to your username, or leave it off to use the whole 195-country pool.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Username pattern</span>
                    <em className="tagv">Example</em>
                  </p>
                  <p className="field mono">user-country-fr</p>
                  <p className="field mono">user-session-cart</p>
                  <p className="field mono">user-mobile</p>
                  <p className="well__f">
                    Flags, in order: -mobile, -country-xx, -session-name. Sticky sessions last 10 minutes.
                  </p>
                </div>
              </li>
              <li className="step card" style={{ ['--d' as string]: '160ms' }}>
                <span className="num">3</span> <h3>Send the request</h3>
                <p>Point your client at the gateway. If it speaks HTTP, HTTPS or SOCKS5, it works with Veyora.</p>
                <div className="well">
                  <p className="well__h">
                    <span>Gateway</span>
                    <em className="tagv">Example host</em>
                  </p>
                  <p className="field mono">gate.veyora.pro:8443</p>
                  <p className="field field--split">
                    <span>
                      <i className="dot" />
                      200 OK
                    </span>
                    <small>412ms · example</small>
                  </p>
                  <p className="field">cURL · Python · Node · Playwright</p>
                </div>
              </li>
            </ol>
          </div>
          <p className="how__note">No contract. Card or USDT. See <a href="/refund-policy">refund policy</a>.</p>
        </div>
      </section>
    </>
  );
}
