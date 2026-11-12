export function HomeTop() {
  return (
    <>
      <section className="panel hero" id="top" aria-labelledby="hero-title">
        <div id="products" className="anchor" /> <svg className="hero__lines" id="heroLines" aria-hidden="true" />{' '}
        <span className="tile tile--orange t1" aria-hidden="true">
          <svg>
            <use href="#i-sun" />
          </svg>
        </span>{' '}
        <span className="tile tile--teal t2" aria-hidden="true">
          <svg>
            <use href="#i-code" />
          </svg>
        </span>{' '}
        <span className="tile tile--blue t3" aria-hidden="true">
          <svg>
            <use href="#i-link" />
          </svg>
        </span>{' '}
        <span className="tile tile--dark t4" aria-hidden="true">
          <svg>
            <use href="#i-cube" />
          </svg>
        </span>{' '}
        <span className="tile tile--white t5" aria-hidden="true">
          <svg>
            <use href="#i-spark" />
          </svg>
        </span>{' '}
        <span className="tile tile--white t6" aria-hidden="true">
          <svg>
            <use href="#i-home" />
          </svg>
        </span>{' '}
        <span className="bubble b-fr" aria-hidden="true">
          <svg>
            <use href="#f-fr" />
          </svg>
          <em>Lyon</em>
        </span>{' '}
        <span className="bubble b-jp" aria-hidden="true">
          <svg>
            <use href="#f-jp" />
          </svg>
          <em>Tokyo</em>
        </span>{' '}
        <div className="hero__copy">
          <p className="chip">
            <span className="dot" />5 million residential IPs · 195 countries
          </p>
          <h1 className="h1" id="hero-title" data-split="">
            Proxies that look like <br className="br-d" />
            <span className="y">
              <em className="serif">real people</em>, at any scale.
            </span>
          </h1>
          <p className="sub">
            5 million residential IPs across 195 countries, sticky or a fresh IP every request. HTTP, HTTPS and SOCKS5.
            Prepaid in USDT.
          </p>
          <div className="cta-row">
            <a className="btn btn--yellow btn--lg" href="#pricing">
              Get proxies
            </a>{' '}
            <a className="btn btn--ghost-dark btn--lg" href="#pricing">
              View pricing
            </a>
          </div>
          <p className="hero__pill">
            Every account starts with $1.00 free credit — 5,000 Web Unlocker requests, no payment needed.
          </p>
        </div>
        <div
          className="dash-wrap"
          role="img"
          aria-label="Example dashboard preview: a Gate sidebar with locations, a requests list, and a detail panel for GET /checkout returning 200 OK in 412ms over SOCKS5 with a sticky 10-minute session."
        >
          <div className="dash" aria-hidden="true">
            <div className="dash__rail">
              <svg className="dash__logo">
                <use href="#i-logo" />
              </svg>{' '}
              <span className="dash__plus">
                <svg>
                  <use href="#i-spark" />
                </svg>
              </span>{' '}
              <svg className="dash__ic">
                <use href="#i-home" />
              </svg>{' '}
              <svg className="dash__ic">
                <use href="#i-globe" />
              </svg>{' '}
              <svg className="dash__ic">
                <use href="#i-user" />
              </svg>
            </div>
            <div className="dash__col dash__gate">
              <div className="dash__h">
                <b>Gate</b>
                <span>live</span>
              </div>
              <div className="dash__search">
                <svg>
                  <use href="#i-search" />
                </svg>
                All locations
              </div>
              <p className="dash__k">Countries</p>
              <ul className="dash__list">
                <li className="is-on">
                  <svg className="flag">
                    <use href="#f-fr" />
                  </svg>
                  France
                  <span>12</span>
                </li>
                <li>
                  <svg className="flag">
                    <use href="#f-jp" />
                  </svg>
                  Japan
                  <span>9</span>
                </li>
                <li>
                  <svg className="flag">
                    <use href="#f-de" />
                  </svg>
                  Germany
                  <span>7</span>
                </li>
              </ul>
            </div>
            <div className="dash__col dash__reqs">
              <div className="dash__h">
                <b>Requests</b>
                <span>4 live · example</span>
              </div>
              <div className="dash__tabs">
                <span className="is-on">All</span>
                <span>Sticky</span>
                <span>Rotating</span>
              </div>
              <ul className="dash__rows">
                <li className="is-on">
                  <span className="get">GET</span>
                  <b>/checkout</b>
                  <time>5:41 PM</time>
                  <small>
                    <i />
                    200 OK · Lyon, FR · 412ms
                  </small>
                </li>
                <li>
                  <span className="get">GET</span>
                  <b>/search</b>
                  <time>1:56 PM</time>
                  <small>
                    <i />
                    200 OK · Lyon, FR · 257ms
                  </small>
                </li>
                <li>
                  <span className="get">GET</span>
                  <b>/ads/verify</b>
                  <time>1:52 PM</time>
                  <small>
                    <i />
                    200 OK · Tokyo, JP · 301ms
                  </small>
                </li>
              </ul>
            </div>
            <div className="dash__col dash__detail">
              <div className="dash__h">
                <span className="get">GET</span>
                <b className="dash__path">example-shopid · sticky</b>
                <span>1 of 4 · example</span>
              </div>
              <h3>GET /checkout</h3>
              <p>
                Routed through a residential exit in <u>Lyon, FR</u> · 10-minute sticky session
              </p>
              <div className="dash__badges">
                <span className="ok">
                  <i />
                  200 OK
                </span>
                <span>412ms</span>
                <span className="ex">Example</span>
              </div>
              <div className="dash__facts">
                <div>
                  <small>Protocol</small>
                  <b>SOCKS5</b>
                </div>
                <div>
                  <small>Session</small>
                  <b>Sticky · 10 min</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
