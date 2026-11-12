export function HomeAlso() {
  return (
    <>
      <section className="panel al" id="also" aria-labelledby="al-title">
        <div className="al__in">
          {' '}
          <div className="al__blk al__a">
            <div className="cir" data-circuit="a" aria-hidden="true" />
            <header className="al__head">
              <p className="al__label">Also included</p>
              <h2 className="al__h" id="al-title" data-split="">
                Works with <span className="c-y">your tools</span>
                <br />
                and with <span className="c-b">your team</span>
              </h2>
            </header>
            <div className="al__grid">
              <article className="al__cell">
                <h3>
                  Works in
                  <br />
                  <span className="c-y">the client you already use</span>
                </h3>
                <p className="al__p">
                  Point cURL, Python, Node, Playwright or any HTTP, HTTPS or SOCKS5 client at the gateway. Sticky
                  sessions last 10 minutes.
                </p>
                <div className="mock" aria-label="Example proxy settings">
                  <p className="mock__h">
                    <b>Proxy settings</b>
                    <span>Example</span>
                  </p>
                  <dl className="mock__rows">
                    <div>
                      <dt>Host</dt>
                      <dd className="mono">gate.veyora.io:8080</dd>
                    </div>
                    <div>
                      <dt>Username</dt>
                      <dd className="mono">
                        user-country-fr <small>France</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Protocol</dt>
                      <dd className="mono">
                        SOCKS5 <small>or HTTP, HTTPS</small>
                      </dd>
                    </div>
                  </dl>
                  <p className="sel sel--y">
                    <i className="ok">
                      <svg>
                        <use href="#i-check" />
                      </svg>
                    </i>
                    Connected. Request returned 200 OK.
                  </p>
                  <p className="mock__chips">
                    <span>Also works in</span>
                    <em>cURL</em>
                    <em>Python</em>
                    <em>Node</em>
                    <em>Playwright</em>
                  </p>
                </div>
              </article>
              <article className="al__cell">
                <h3>
                  Countries and sessions
                  <br />
                  <span className="c-b">in your control</span>
                </h3>
                <p className="al__p">
                  Add a country flag to your username, or leave it off to use the whole 195-country pool. Name a session
                  to keep the same exit.
                </p>
                <div className="mock" aria-label="Example session timeline">
                  <p className="mock__h">
                    <b>Session timeline</b>
                    <span className="pill-b">
                      <i className="dot" />
                      Sticky · 10 min
                    </span>
                  </p>
                  <div className="tl">
                    <p>
                      <time>0:00</time>
                      <span />
                    </p>
                    <p>
                      <time>5:00</time>
                      <span className="sel sel--b tl__ev">
                        <b>user-session-cart</b>
                        <small>Lyon, FR · same IP kept</small>
                      </span>
                    </p>
                    <p>
                      <time>10:00</time>
                      <span />
                    </p>
                  </div>
                  <p className="mock__person">
                    <svg className="flag">
                      <use href="#f-fr" />
                    </svg>
                    <span>
                      <b>Lyon, FR</b>
                      <small>Exit reused while the session lasts</small>
                    </span>
                    <em>Sticky</em>
                  </p>
                </div>
              </article>
            </div>
          </div>{' '}
          <div className="al__blk al__b">
            <div className="cir" data-circuit="b" aria-hidden="true" />
            <figure className="al__quote">
              <blockquote data-quote="">
                <mark>Real home IPs, not datacenter ranges.</mark> Every residential address comes from a real ISP,
                across 195 countries, with sticky or rotating sessions.
              </blockquote>
              <figcaption className="mono">Veyora · residential network</figcaption>
            </figure>
          </div>{' '}
          <div className="al__blk al__d">
            <div className="cir" data-circuit="d" aria-hidden="true" />
            <div className="al__grid">
              <article className="al__cell">
                <h3>
                  Give your team
                  <br />
                  <span className="c-p">the right access</span>
                </h3>
                <p className="al__p">
                  Pro includes API access, sub-users and unlimited IP whitelisting, set up from the dashboard or the
                  API.
                </p>
                <div className="mock" aria-label="Example sub-users list">
                  <p className="mock__h">
                    <b>Sub-users</b>
                    <span className="pill-p">+ Add</span>
                  </p>
                  <ul className="mock__list">
                    <li>
                      <i className="av">OW</i>
                      <span>
                        <b>Owner</b>
                        <small>Main account</small>
                      </span>
                      <em>All access</em>
                    </li>
                    <li>
                      <i className="av">S1</i>
                      <span>
                        <b>sub-user</b>
                        <small>Created from the dashboard</small>
                      </span>
                      <em>IP whitelisted</em>
                    </li>
                    <li className="sel sel--p">
                      <i className="av">S2</i>
                      <span>
                        <b>New sub-user</b>
                        <small>Created through the API</small>
                      </span>
                      <em className="spin">Waiting</em>
                    </li>
                  </ul>
                  <p className="mock__foot">API access and sub-users are included on Pro.</p>
                </div>
              </article>
              <article className="al__cell">
                <h3>
                  Automate it
                  <br />
                  <span className="c-y">from code</span>
                </h3>
                <p className="al__p">
                  Send a URL to the Web Unlocker API and get the page back. Just $0.20 per 1,000 requests — you pay only
                  when the page comes back.
                </p>
                <div className="mock" aria-label="Example Web Unlocker request log">
                  <p className="mock__h">
                    <b>Web Unlocker</b>
                    <span className="mono">POST /v1/unlock</span>
                    <span className="act">
                      <i className="dot" />
                      Example
                    </span>
                  </p>
                  <ul className="log mono">
                    <li className="is-on">
                      <span>unlock</span>
                      <b>200</b>
                      <small>412 ms</small>
                      <time>10:42:07</time>
                    </li>
                    <li>
                      <span>unlock</span>
                      <b>200</b>
                      <small>386 ms</small>
                      <time>10:42:01</time>
                    </li>
                    <li>
                      <span>unlock</span>
                      <b>200</b>
                      <small>441 ms</small>
                      <time>10:39:44</time>
                    </li>
                  </ul>
                  <p className="sel sel--y code mono">
                    {'curl -X POST https://YOUR_HOST/v1/unlock'}
                    <br />
                    {'  -d \'{"url": "https://example.com/"}\''}
                  </p>
                </div>
              </article>
            </div>
          </div>{' '}
          <div className="al__blk al__c">
            <div className="cir" data-circuit="c" aria-hidden="true" />
            <header className="al__sec">
              <h3 data-split="">
                One balance <span className="c-b">pays for everything</span>
              </h3>
              <p>
                Residential and mobile traffic by the GB, Web Unlocker by the request. Top up in USDT on BNB Smart
                Chain.
              </p>
            </header>
            <div className="al__cards">
              <div className="mock mock--c" aria-label="Example prepaid balance">
                <p className="mock__h">
                  <b>Prepaid balance</b>
                  <span>Example</span>
                </p>
                <p className="bar" aria-hidden="true">
                  <i />
                </p>
                <ul className="mock__list mock__list--plain">
                  <li>
                    <i className="ic">
                      <svg>
                        <use href="#i-globe" />
                      </svg>
                    </i>
                    <span>
                      <b>Residential traffic</b>
                      <small>Billed by the GB</small>
                    </span>
                  </li>
                  <li>
                    <i className="ic">
                      <svg>
                        <use href="#i-spark" />
                      </svg>
                    </i>
                    <span>
                      <b>Mobile traffic</b>
                      <small>Billed by the GB</small>
                    </span>
                  </li>
                  <li>
                    <i className="ic">
                      <svg>
                        <use href="#i-code" />
                      </svg>
                    </i>
                    <span>
                      <b>Web Unlocker</b>
                      <small>$0.20 per 1,000 requests</small>
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mock mock--c" aria-label="Top-ups">
                <p className="mock__h">
                  <b>Top-ups</b>
                  <span className="pill-b">From /packages</span>
                </p>
                <ul className="mock__list mock__list--checks">
                  <li>
                    <i className="ck">
                      <svg>
                        <use href="#i-check" />
                      </svg>
                    </i>
                    <span>
                      <b>USDT on BNB Smart Chain (BEP-20)</b>
                      <small>Prepaid, from $10</small>
                    </span>
                  </li>
                  <li>
                    <i className="ck">
                      <svg>
                        <use href="#i-check" />
                      </svg>
                    </i>
                    <span>
                      <b>$100 · $500</b>
                      <small>+5% credit · +10% credit</small>
                    </span>
                  </li>
                  <li>
                    <i className="ck">
                      <svg>
                        <use href="#i-check" />
                      </svg>
                    </i>
                    <span>
                      <b>No contract</b>
                      <small>Cryptocurrency payments are final</small>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
