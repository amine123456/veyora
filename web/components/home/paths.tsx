const PATHS = [
  {
    id: 'feeds',
    icon: '#i-cube',
    tone: 'path--dark',
    name: 'Data Feeds',
    who: 'For analysts and data teams',
    effort: 'We do all of it',
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
    icon: '#i-code',
    tone: 'path--yellow',
    name: 'Web Unlocker',
    who: 'For developers',
    effort: 'We handle the blocks',
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
    icon: '#i-globe',
    tone: '',
    name: 'Residential Proxies',
    who: 'For teams with their own scrapers',
    effort: 'You run the scraper',
    title: 'Real IPs for your own code.',
    text: 'Route any HTTP or SOCKS5 client through 5 million residential IPs. Pick a country per request or keep the same IP for a whole session.',
    price: '$29',
    unit: '/month for 8 GB',
    checks: ['195 countries, rotating or sticky', 'HTTP, HTTPS and SOCKS5', 'Plans or prepaid top-ups from $10'],
    cta: { label: 'Get proxies', href: '/signup' },
    more: { label: 'Proxy details', href: '/residential-proxies' },
  },
];

export function HomePaths() {
  return (
    <section className="paths container" id="products" aria-labelledby="paths-title">
      <header className="head head--center">
        <p className="pill">
          <span className="dot" />
          Three ways in
        </p>
        <h2 className="h2" id="paths-title" data-split="">
          Choose how much of the work{' '}
          <em className="serif">you want to do.</em>
        </h2>
        <p className="sub sub--ink">
          Buy the finished dataset, call one API, or run your own scrapers on our network.
          One account covers all three.
        </p>
      </header>
      <div className="paths__grid">
        {PATHS.map((p, i) => (
          <article
            key={p.id}
            className={`path card ${p.tone}`}
            data-reveal=""
            style={{ ['--d' as string]: `${i * 70}ms` }}
          >
            <span className="path__effort">{p.effort}</span>
            <div className="path__top">
              <span className="path__icon" aria-hidden="true">
                <svg>
                  <use href={p.icon} />
                </svg>
              </span>
              <div>
                <h3 className="path__name">{p.name}</h3>
                <p className="path__who">{p.who}</p>
              </div>
            </div>
            <p className="path__title">{p.title}</p>
            <p className="path__text">{p.text}</p>
            <p className="path__price">
              <b>{p.price}</b> <span>{p.unit}</span>
            </p>
            <ul className="path__checks">
              {p.checks.map((c) => (
                <li key={c}>
                  <i aria-hidden="true">
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  {c}
                </li>
              ))}
            </ul>
            <div className="path__actions">
              <a className={`btn btn--block ${p.tone === 'path--dark' ? 'btn--yellow' : 'btn--ink'}`} href={p.cta.href}>
                {p.cta.label}
              </a>
              <a className="path__more" href={p.more.href}>
                {p.more.label} →
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
