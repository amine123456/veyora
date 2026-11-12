export function HomeHow() {
  return (
    <>
      <section className="how" id="how" aria-labelledby="how-title">
        <header className="head head--center">
          <p className="pill">
            <span className="dot" />
            How it works
          </p>
          <h2 className="h2" id="how-title" data-split="">
            From a username{' '}
            <span className="y">
              <em className="serif">to a live request.</em>
            </span>
          </h2>
          <p className="sub sub--ink">
            Create credentials, pick a country if you want one, and point any HTTP or SOCKS5 client at the gateway.
          </p>
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
          <ol className="steps">
            <li className="step card" data-reveal="">
              <span className="num">1</span> <h3>Create your user</h3>
              <p>Generate credentials in the dashboard or through the API. Top up with USDT — prepaid from $10.</p>
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
                  USDT on BNB Smart Chain (BEP-20)
                </p>
              </div>
            </li>
            <li className="step card" data-reveal="" style={{ ['--d' as string]: '80ms' }}>
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
            <li className="step card" data-reveal="" style={{ ['--d' as string]: '160ms' }}>
              <span className="num">3</span> <h3>Send the request</h3>
              <p>Point your client at the gateway. If it speaks HTTP, HTTPS or SOCKS5, it works with Veyora.</p>
              <div className="well">
                <p className="well__h">
                  <span>Gateway</span>
                  <em className="tagv">Example host</em>
                </p>
                <p className="field mono">gate.veyora.io:8080</p>
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
          <p className="how__note">No contract. Cryptocurrency only. All sales final.</p>
        </div>
      </section>
    </>
  );
}
