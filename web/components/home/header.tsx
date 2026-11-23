// Marketing nav — light (paper, default) and ink (§3 "ink nav variant", feeds page,
// reference 06-feeds-catalog-b.html) variants. `active` highlights the current route's
// link (yellow fill) per §3's ".on" rule; omit it on pages not in the nav (e.g. home
// itself). Behaviour preserved as-is: #navToggle/#sheet (mobile drawer, public/app.js)
// and the #nav/.nav__in/#navPill scroll-shrink pill (also public/app.js) are untouched —
// only their classes' CSS and this markup's structure changed.
const LINKS = [
  { href: '/data-feeds', label: 'Data Feeds', key: 'feeds' },
  { href: '/web-unlocker', label: 'Web Unlocker', key: 'unlocker' },
  { href: '/residential-proxies', label: 'Proxies', key: 'proxies' },
  { href: '/#pricing', label: 'Pricing', key: 'pricing' },
  { href: '/docs', label: 'Docs', key: 'docs' },
] as const;

type NavKey = (typeof LINKS)[number]['key'];

export function HomeHeader({ active, variant = 'light' }: { active?: NavKey; variant?: 'light' | 'ink' } = {}) {
  const ink = variant === 'ink';
  const logoHeight27 = ink ? 'veyora-logo-3d-silver-27h' : 'veyora-logo-3d-ink-27h';
  const logoHeight24 = ink ? 'veyora-logo-3d-silver-24h' : 'veyora-logo-3d-ink-24h';
  const ctaClass = `vy-btn vy-btn--sm ${ink ? 'vy-btn--yellow' : 'vy-btn--primary'}`;
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className={`nav${ink ? ' nav--ink' : ''}`} id="nav">
        <div className="nav__in">
          <a className="brand" href="/" aria-label="Veyora home">
            <img
              className="brand__mark--3d"
              src={`/design/03-logo/3d/${logoHeight27}@1x.png`}
              srcSet={`/design/03-logo/3d/${logoHeight27}@1x.png 1x, /design/03-logo/3d/${logoHeight27}@2x.png 2x`}
              height={27}
              alt="Veyora"
            />
          </a>
          <nav className="nav__center" aria-label="Primary">
            <ul className="nav__links">
              {LINKS.map((l) => (
                <li key={l.key}>
                  <a href={l.href} className={l.key === active ? 'on' : undefined} aria-current={l.key === active ? 'page' : undefined}>
                    {l.label}
                    {l.key === active && ink && ' ↗'}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav__actions">
            <a className="nav__login" href="/login">
              Log in
            </a>
            <a className={ctaClass} href="/data-feeds">
              Browse data feeds <span className="ar">↗</span>
            </a>
            <button
              className="nav__toggle"
              id="navToggle"
              type="button"
              aria-expanded="false"
              aria-controls="sheet"
              aria-label="Open menu"
            >
              <i />
              <i />
            </button>
          </div>
        </div>
        <nav className="navpill" id="navPill" aria-label="Primary" inert>
          <a className="brand" href="/" aria-label="Veyora home">
            <img
              className="brand__mark--3d"
              src={`/design/03-logo/3d/${logoHeight24}@1x.png`}
              srcSet={`/design/03-logo/3d/${logoHeight24}@1x.png 1x, /design/03-logo/3d/${logoHeight24}@2x.png 2x`}
              height={24}
              alt="Veyora"
            />
          </a>
          <ul className="navpill__links">
            {LINKS.map((l) => (
              <li key={l.key}>
                <a href={l.href} className={l.key === active ? 'on' : undefined}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a className="navpill__login" href="/login">
            Log in
          </a>
          <a className={ctaClass} href="/data-feeds">
            Browse data feeds <span className="ar">↗</span>
          </a>
        </nav>
        <div className="sheet" id="sheet" hidden>
          <ul>
            {LINKS.map((l) => (
              <li key={l.key}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
            <li>
              <a href="/about">About</a>
            </li>
            <li>
              <a href="/support">Support</a>
            </li>
            <li>
              <a href="/login">Log in</a>
            </li>
          </ul>
          <a className="vy-btn vy-btn--primary vy-btn--block" href="/data-feeds">
            Browse data feeds <span className="ar">↗</span>
          </a>
        </div>
      </header>
    </>
  );
}
