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
            <span className="dot" />Data Feeds · Web Unlocker · Proxies
          </p>
          <h1 className="h1" id="hero-title" data-split="">
            The data platform that{' '}
            <br className="br-d" />
            <span className="y">
              <em className="serif">powers decisions.</em>
            </span>
          </h1>
          <p className="sub">
            Structured data feeds from hard-to-scrape sites, delivered daily to your pipeline.
            A Web Unlocker API and 5 million residential IPs when you need to collect it yourself.
          </p>
          <div className="cta-row">
            <a className="btn btn--yellow btn--lg" href="/data-feeds">
              Browse data feeds
            </a>{' '}
            <a className="btn btn--ghost-dark btn--lg" href="#pricing">
              View pricing
            </a>
          </div>
          <p className="hero__pill">
            2.4 million records collected daily · 26 live sources · delivered to your pipeline every morning.
          </p>
        </div>
        <div
          className="dash-wrap"
          role="img"
          aria-label="Data pipeline: sources like mobile.de, LaCentrale, car.gr feed into Veyora and deliver structured data via SFTP, S3, Snowflake, and API."
        >
          <div className="dash dash--pipeline" aria-hidden="true">
            <div className="pipe__col pipe__sources">
              <div className="dash__h"><b>Sources</b><span>12+ live</span></div>
              <ul className="pipe__logos">
                <li className="is-on"><span className="pipe__dot pipe__dot--green" />mobile.de<span>1.2M</span></li>
                <li><span className="pipe__dot pipe__dot--green" />LaCentrale<span>782K</span></li>
                <li><span className="pipe__dot pipe__dot--green" />car.gr<span>245K</span></li>
                <li><span className="pipe__dot pipe__dot--green" />Milanuncios<span>198K</span></li>
                <li><span className="pipe__dot pipe__dot--blue" />QuintoAndar<span>44K</span></li>
                <li><span className="pipe__dot pipe__dot--amber" />Capterra<span>8K</span></li>
              </ul>
            </div>
            <div className="pipe__col pipe__center">
              <div className="dash__h"><b>Veyora Pipeline</b><span>today</span></div>
              <div className="pipe__stats">
                <div><small>Records collected</small><b>2.4M</b></div>
                <div><small>Sources crawled</small><b>26</b></div>
                <div><small>Delivery success</small><b>99.8%</b></div>
              </div>
              <div className="pipe__flow">
                <span className="pipe__step">Crawl</span>
                <span className="pipe__arrow">→</span>
                <span className="pipe__step">Clean</span>
                <span className="pipe__arrow">→</span>
                <span className="pipe__step">Deliver</span>
              </div>
            </div>
            <div className="pipe__col pipe__output">
              <div className="dash__h"><b>Delivery</b><span>daily</span></div>
              <ul className="pipe__methods">
                <li className="is-on"><span className="pipe__dot pipe__dot--green" />SFTP<small>pushed 06:00</small></li>
                <li><span className="pipe__dot pipe__dot--green" />Amazon S3<small>pushed 06:02</small></li>
                <li><span className="pipe__dot pipe__dot--blue" />Snowflake<small>loaded 06:05</small></li>
                <li><span className="pipe__dot pipe__dot--amber" />API<small>ready</small></li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
