// Web Unlocker (CLAUDE-PROMPT.md §4.6, reference 03-web-unlocker-section-a.html).
// Copy, code sample and field descriptions are all live; only markup/classes restyled.
const CHECK = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M2 6L5 9L10 3" stroke="#161616" strokeWidth="1.8" strokeLinecap="square" />
  </svg>
);

const FEATURES = [
  {
    title: '$0.20 per 1,000 requests',
    desc: 'A fraction of what most web-scraping APIs charge. CAPTCHA pages add $0.005 each. Paid from your prepaid wallet.',
  },
  {
    title: '5,000 free requests on signup',
    desc: 'Every account starts with $1.00 free credit. No card, no commitment — just sign up and start scraping.',
  },
  {
    title: 'Blocked? It retries automatically',
    desc: 'Blocked requests are retried on new residential and mobile IPs until the page comes back.',
  },
  {
    title: 'Sessions keep their cookies',
    desc: 'Name a session to keep the same exit and cookies across requests.',
  },
];

export function HomeUnlocker() {
  return (
    <section className="unlocker-sec vy-type-text" id="unlocker" aria-labelledby="unlocker-title">
      <div className="vy-wrap">
        <div className="vy-specbar">
          <span>
            <i />
            Unlocker / 05
          </span>
          <span>Single request · Residential &amp; mobile retries · $0.20 / 1,000 req</span>
        </div>

        <div className="unl-grid">
          <div className="unl-left">
            <span className="vy-label-chip">
              <span className="vy-label-chip__sq">
                <i />
              </span>
              <span className="vy-label-chip__txt">Web Unlocker API</span>
            </span>

            <h2 id="unlocker-title">
              Send a URL.
              <br />
              <span className="vy-hl-block">Get the page back.</span>
            </h2>

            <p className="unl-body">
              The Web Unlocker API fetches a public page for you with a single request. Just <strong>$0.20 per 1,000 requests</strong>{' '}
              — significantly less than most alternatives. Every new account gets <strong>$1.00 free credit</strong>, enough for
              5,000 requests with no payment needed.
            </p>

            <div className="feat-list">
              {FEATURES.map((f) => (
                <div className="feat-row" key={f.title}>
                  <span className="chk-sq" aria-hidden="true">
                    {CHECK}
                  </span>
                  <div>
                    <div className="feat-title">{f.title}</div>
                    <div className="feat-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="unl-ctas">
              <a className="vy-btn vy-btn--primary" href="/signup">
                Get an API key <span className="ar">↗</span>
              </a>
              <a className="vy-btn vy-btn--secondary" href="/docs#unlocker">
                Read the docs <span className="ar">→</span>
              </a>
            </div>
          </div>

          <div className="unl-right">
            <div className="code-mat">
              <img className="mat-bg" src="/design/05-backgrounds/sections/unlocker-code-mat-lilac-bars-620x533.svg" alt="" aria-hidden="true" />

              <div className="mat-top mono">
                <span className="l">
                  <i />
                  POST /v1/unlock
                </span>
                <span className="r">Prepaid · No contract</span>
              </div>

              <div className="code-panel">
                <div className="cp-head">
                  <span className="cp-req mono">
                    <i />
                    Request
                  </span>
                  <span className="cp-ex mono">Example</span>
                </div>

                <div className="cp-code-box">
                  <pre className="cp-code" tabIndex={0} aria-label="Example Web Unlocker request">
                    <span className="tk-cmd">curl</span> <span className="tk-flag">-X POST</span>{' '}
                    <span className="tk-url">https://veyora.pro/v1/unlock</span> <span className="tk-dim">{'\\'}</span>
                    {'\n  '}
                    <span className="tk-flag">-H</span> <span className="tk-str">&quot;Authorization: Bearer YOUR_API_KEY&quot;</span>{' '}
                    <span className="tk-dim">{'\\'}</span>
                    {'\n  '}
                    <span className="tk-flag">-H</span> <span className="tk-str">&quot;Content-Type: application/json&quot;</span>{' '}
                    <span className="tk-dim">{'\\'}</span>
                    {'\n  '}
                    <span className="tk-flag">-d</span>{' '}
                    <span className="tk-str">
                      &apos;{'{"'}
                    </span>
                    <span className="tk-key">url</span>
                    <span className="tk-str">{'": "https://example.com/", "'}</span>
                    <span className="tk-key">country</span>
                    <span className="tk-str">{'": "fr"}\''}</span>
                  </pre>
                </div>

                <div className="cp-status">
                  <span className="st-l">
                    <i className="st-sq" />
                    200 OK
                  </span>
                  <span className="st-r">page returned · example</span>
                </div>

                <div className="cp-fields-wrap">
                  <div className="cp-fields-lbl mono">Request fields</div>
                  <div className="cp-fields">
                    <div className="cp-frow">
                      <span className="cp-fname">url</span>
                      <span className="cp-fdesc">The page to fetch</span>
                    </div>
                    <div className="cp-frow">
                      <span className="cp-fname">country</span>
                      <span className="cp-fdesc">Optional exit country</span>
                    </div>
                    <div className="cp-frow">
                      <span className="cp-fname">session</span>
                      <span className="cp-fdesc">Optional name to keep the exit and cookies</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mat-foot mono">
                <div className="mf-stats">
                  <span>5M+ residential IPs</span>
                  <span>·</span>
                  <span>Auto-retry</span>
                </div>
                <div className="mf-right">
                  <img src="/design/04-illustrations/icons/ui/ui-mini-bars-46x18.svg" alt="" aria-hidden="true" width={46} height={18} />
                  <span className="mf-tag">$1.00 free credit</span>
                </div>
              </div>
            </div>

            <div className="retry-card">
              <div className="rc-head mono">
                <span className="l">
                  <i />
                  Retry &amp; session engine
                </span>
                <span className="r">195 countries · Named sessions</span>
              </div>
              <div className="rc-body">
                <div className="rc-flow">
                  <div className="rc-node">
                    <div className="rn-top mono">01 / Call</div>
                    <div className="rn-val">POST URL</div>
                  </div>
                  <span className="rc-ar">→</span>
                  <div className="rc-node">
                    <div className="rn-top mono">02 / Rotate</div>
                    <div className="rn-val">Fresh IP</div>
                  </div>
                  <span className="rc-ar">→</span>
                  <div className="rc-node n-hi">
                    <div className="rn-top mono">03 / Return</div>
                    <div className="rn-val">200 HTML</div>
                  </div>
                </div>

                <div className="rc-metrics">
                  <div className="rc-m">
                    <strong>$0.20</strong>
                    <span>/ 1K req</span>
                  </div>
                  <div className="rc-m">
                    <strong>+$0.005</strong>
                    <span>CAPTCHA</span>
                  </div>
                  <div className="rc-m">
                    <strong>5,000</strong>
                    <span>Free req</span>
                  </div>
                </div>
              </div>
              <div className="rc-bar mono">
                <div className="tags">
                  <span>Residential + mobile</span>
                  <span>·</span>
                  <span>Sticky cookies</span>
                </div>
                <span>Prepaid wallet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
