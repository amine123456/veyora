export function HomeUnlocker() {
  return (
    <>
      <section className="unlocker container" id="unlocker" aria-labelledby="unlocker-title">
        <div className="unlocker__grid">
          <div className="unlocker__copy">
            <p className="pill">
              <span className="dot" />
              Web Unlocker
            </p>
            <h2 className="h2" id="unlocker-title" data-split="">
              Send a URL. <em className="serif">Get the page back.</em>
            </h2>
            <p className="sub sub--ink sub--left">
              The Web Unlocker API fetches a public page for you with a single request. Just{' '}
              <b>$0.20 per 1,000 requests</b> — the cheapest in the market. Every new account gets{' '}
              <b>$1.00 free credit</b>, enough for 5,000 requests with no payment needed.
            </p>
            <ul className="ufeat">
              <li data-reveal="">
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                <div>
                  <b>$0.20 per 1,000 requests</b>
                  <span>5–25× cheaper than Bright Data, Oxylabs and ScrapingBee. Paid from your prepaid wallet.</span>
                </div>
              </li>
              <li data-reveal="" style={{ ['--d' as string]: '70ms' }}>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                <div>
                  <b>5,000 free requests on signup</b>
                  <span>
                    Every account starts with $1.00 free credit. No card, no commitment — just sign up and start
                    scraping.
                  </span>
                </div>
              </li>
              <li data-reveal="" style={{ ['--d' as string]: '140ms' }}>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                <div>
                  <b>Blocked? It retries automatically</b>
                  <span>Blocked requests are retried on new residential and mobile IPs until the page comes back.</span>
                </div>
              </li>
              <li data-reveal="" style={{ ['--d' as string]: '210ms' }}>
                <i>
                  <svg>
                    <use href="#i-check" />
                  </svg>
                </i>
                <div>
                  <b>Sessions keep their cookies</b>
                  <span>Name a session to keep the same exit and cookies across requests.</span>
                </div>
              </li>
            </ul>
            <div className="cta-row cta-row--left">
              <a className="btn btn--ink btn--lg" href="/signup">
                Get an API key
              </a>{' '}
              <a className="btn btn--outline btn--lg" href="/login">
                Open dashboard
              </a>
            </div>
          </div>
          <div className="ucode" data-reveal="" style={{ ['--d' as string]: '120ms' }}>
            <p className="well__h well__h--dark">
              <span>Request</span>
              <em className="tagv">Example</em>
            </p>
            <pre className="ucode__pre" tabIndex={0} aria-label="Example Web Unlocker request">
              <code>
                <span className="k">{'curl'}</span>
                {' -X POST https://YOUR_HOST/v1/unlock \\\n  -H '}
                <span className="s">{'"Authorization: Bearer YOUR_API_KEY"'}</span>
                {' \\\n  -H '}
                <span className="s">{'"Content-Type: application/json"'}</span>
                {' \\\n  -d '}
                <span className="s">{'\'{"url": "https://example.com/", "country": "fr"}\''}</span>
              </code>
            </pre>
            <p className="ucode__resp">
              <span>
                <i className="dot" />
                <b>200 OK</b>
              </span>
              <small>page returned · example</small>
            </p>
            <div className="ucode__fields">
              <p className="well__h well__h--dark">
                <span>Request fields</span>
              </p>
              <ul>
                <li>
                  <code>url</code>
                  <span>The page to fetch</span>
                </li>
                <li>
                  <code>country</code>
                  <span>Optional exit country</span>
                </li>
                <li>
                  <code>session</code>
                  <span>Optional name to keep the exit and cookies</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
