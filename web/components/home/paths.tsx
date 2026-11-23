// Products / tiers (CLAUDE-PROMPT.md §4.2, reference 09-home-tiers-and-samples.html).
// Markup, classes and the three pixel-art card illustrations are ported verbatim from
// the reference; only the data below (already matching the live site) is bound through.
const TIERS = [
  {
    id: 'feeds',
    tone: 'dark',
    num: '01 / FEEDS',
    effort: 'We do all of it',
    name: 'Data Feeds',
    who: 'For analysts and data teams',
    title: 'Ready datasets, delivered daily.',
    text: 'Pick a site, choose where the files go, and get a fresh, structured snapshot every morning. No scrapers, no proxies, no maintenance.',
    price: 'From €100',
    unit: '/month per feed',
    checks: ['Cars, real estate, jobs and reviews', 'JSON, CSV, Parquet or JSONL', 'SFTP, S3, Snowflake, webhook or API'],
    cta: { label: 'Browse the catalog', href: '/data-feeds' },
    more: { label: 'Free samples below', href: '#sample' },
  },
  {
    id: 'unlocker',
    tone: 'yel',
    num: '02 / API',
    effort: 'We handle the blocks',
    name: 'Web Unlocker',
    who: 'For developers',
    title: 'Send a URL, get the page back.',
    text: 'One API call returns the HTML. Blocked requests are retried on fresh residential and mobile IPs until the page loads.',
    price: '$0.20',
    unit: 'per 1,000 requests',
    checks: ['$1.00 free credit, about 5,000 requests', 'Country targeting and named sessions', 'Paid from a prepaid wallet, no contract'],
    cta: { label: 'Get a free API key', href: '/signup' },
    more: { label: 'How the Unlocker works', href: '/web-unlocker' },
  },
  {
    id: 'proxies',
    tone: 'light',
    num: '03 / PROXIES',
    effort: 'You run the scraper',
    name: 'Residential Proxies',
    who: 'For teams with their own scrapers',
    title: 'Real IPs for your own code.',
    text: 'Route any HTTP or SOCKS5 client through 5 million residential IPs. Pick a country per request or keep the same IP for a whole session.',
    price: '$29',
    unit: '/month for 8 GB',
    checks: ['195 countries, rotating or sticky', 'HTTP, HTTPS and SOCKS5', 'Plans or prepaid top-ups from $10'],
    cta: { label: 'Get proxies', href: '/signup' },
    more: { label: 'Proxy details', href: '/residential-proxies' },
  },
] as const;

function PillusFeeds() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M0 16H96M0 32H96M0 48H96M0 64H96M16 0V80M32 0V80M48 0V80M64 0V80M80 0V80" stroke="#2A2A2A" strokeWidth="1" />
      <rect x="20" y="54" width="56" height="12" fill="#FAE401" stroke="#161616" strokeWidth="1" />
      <path d="M28 54V66M36 54V66M44 54V66M52 54V66M60 54V66M68 54V66" stroke="#161616" strokeWidth="1" />
      <rect x="24" y="38" width="48" height="14" fill="#DC9AFF" stroke="#161616" strokeWidth="1" />
      <path d="M32 38V52M40 38V52M48 38V52M56 38V52M64 38V52" stroke="#161616" strokeWidth="1" />
      <rect x="28" y="16" width="8" height="20" fill="#F2F2F2" stroke="#161616" strokeWidth="1" />
      <rect x="38" y="22" width="8" height="14" fill="#FAE401" stroke="#161616" strokeWidth="1" />
      <rect x="48" y="12" width="8" height="24" fill="#F2F2F2" stroke="#161616" strokeWidth="1" />
      <rect x="58" y="20" width="8" height="16" fill="#DC9AFF" stroke="#161616" strokeWidth="1" />
      <path d="M14 20H18V60H14M82 20H78V60H82" stroke="#FAE401" strokeWidth="1.5" />
    </svg>
  );
}

function PillusUnlocker() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" shapeRendering="crispEdges" aria-hidden="true">
      <path
        d="M8 8V72M16 18V72M24 12V72M72 14V72M80 22V72M88 10V72"
        stroke="#161616"
        strokeOpacity=".16"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      <rect x="16" y="60" width="64" height="10" fill="#FAE401" stroke="#161616" strokeWidth="1.2" />
      <rect x="24" y="50" width="48" height="10" fill="#FAE401" stroke="#161616" strokeWidth="1.2" />
      <rect x="32" y="40" width="32" height="10" fill="#FAE401" stroke="#161616" strokeWidth="1.2" />
      <path d="M24 60V70M32 60V70M40 60V70M48 60V70M56 60V70M64 60V70M72 60V70" stroke="#161616" strokeWidth="1" />
      <path d="M32 50V60M40 50V60M48 50V60M56 50V60M64 50V60" stroke="#161616" strokeWidth="1" />
      <rect x="38" y="14" width="20" height="22" fill="#DC9AFF" stroke="#161616" strokeWidth="1.2" />
      <rect x="34" y="18" width="28" height="14" fill="#DC9AFF" stroke="#161616" strokeWidth="1.2" />
      <path d="M48 14V36M34 25H62" stroke="#161616" strokeWidth="1" />
      <rect x="22" y="22" width="4" height="4" fill="#161616" />
      <rect x="70" y="18" width="4" height="4" fill="#FAE401" stroke="#161616" strokeWidth="1" />
    </svg>
  );
}

function PillusProxies() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" shapeRendering="crispEdges" aria-hidden="true">
      <circle cx="48" cy="40" r="32" stroke="#161616" strokeWidth="1.2" strokeDasharray="4 3" />
      <circle cx="48" cy="40" r="21" stroke="#161616" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx="48" cy="40" r="10" stroke="#161616" strokeWidth="1.2" />
      <path d="M48 4V76M12 40H84" stroke="#161616" strokeOpacity=".28" strokeWidth="1" strokeDasharray="3 3" />
      <rect x="44" y="36" width="8" height="8" fill="#161616" />
      <rect x="23" y="21" width="8" height="8" fill="#FAE401" stroke="#161616" strokeWidth="1.2" />
      <rect x="67" y="19" width="8" height="8" fill="#DC9AFF" stroke="#161616" strokeWidth="1.2" />
      <rect x="20" y="53" width="8" height="8" fill="#DC9AFF" stroke="#161616" strokeWidth="1.2" />
      <rect x="65" y="54" width="8" height="8" fill="#FAE401" stroke="#161616" strokeWidth="1.2" />
    </svg>
  );
}

const PILLUS = { feeds: PillusFeeds, unlocker: PillusUnlocker, proxies: PillusProxies };

export function HomePaths() {
  return (
    <section className="tiers-sec vy-type-display" id="products" aria-labelledby="paths-title">
      <img className="tiers-bg" src="/design/05-backgrounds/sections/home-tiers-bg-1440x1114.svg" alt="" aria-hidden="true" />
      <div className="vy-wrap">
        <div className="vy-specbar">
          <span>
            <i />
            Products / 01
          </span>
          <span>One account · Three tiers</span>
        </div>
        <header className="sec-head">
          <span className="vy-label-chip">
            <span className="vy-label-chip__sq">
              <i />
            </span>
            <span className="vy-label-chip__txt">Data Feeds · Web Unlocker API · Proxies</span>
          </span>
          <h2 id="paths-title">Choose how much of the work you want to do.</h2>
          <p className="sub">
            Buy the finished dataset, call one API, or run your own scrapers on our network. One account covers all three.
          </p>
        </header>
        <div className="tiers-grid">
          {TIERS.map((t) => {
            const Pillus = PILLUS[t.id as keyof typeof PILLUS];
            return (
              <article key={t.id} className={`tcard ${t.tone}`}>
                <div className="tcard-top">
                  <span className="tbadge">{t.effort}</span>
                  <span className="tnum mono">{t.num}</span>
                </div>
                <div className="tcard-hero">
                  <div>
                    <h3 className="tcard-title">{t.name}</h3>
                    <p className="tcard-aud">{t.who}</p>
                  </div>
                  <div className="pillus">
                    <Pillus />
                  </div>
                </div>
                <div className="tcard-copy">
                  <h4 className="tcard-h">{t.title}</h4>
                  <p className="tcard-b">{t.text}</p>
                </div>
                <div className="tcard-price">
                  <span className="amt">{t.price}</span>
                  <span className="unit">{t.unit}</span>
                </div>
                <div className="tcard-list">
                  {t.checks.map((c) => (
                    <div className="tcard-li" key={c}>
                      <span className="sq" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
                <div className="tcard-foot">
                  <a className="tbtn" href={t.cta.href}>
                    <span>{t.cta.label}</span>
                    <span className="ar">↗</span>
                  </a>
                  <a className="tlink" href={t.more.href}>
                    {t.more.label} →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
