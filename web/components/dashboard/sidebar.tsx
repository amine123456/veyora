// Dashboard sidebar (CLAUDE-PROMPT.md §5.1, reference 01-dashboard-overview-a.html).
// Markup/classes restyled; behaviour (active route, data-unlocker-nav group hide/show,
// data-logout handler in public/auth.js) is unchanged.
export type DashboardPage =
  | 'overview' | 'feeds' | 'deliveries' | 'api-keys' | 'playground' | 'proxies' | 'usage' | 'billing';

type NavItem = { page: DashboardPage; href: string; icon: string; label: string; unlocker?: boolean };

const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'Workspace', items: [{ page: 'overview', href: '/account', icon: 'nav-overview', label: 'Overview' }] },
  {
    label: 'Data Feeds',
    items: [
      { page: 'feeds', href: '/account/feeds', icon: 'nav-my-feeds', label: 'My feeds' },
      { page: 'deliveries', href: '/account/feeds/deliveries', icon: 'nav-deliveries', label: 'Deliveries' },
    ],
  },
  {
    label: 'Web Unlocker',
    items: [
      { page: 'api-keys', href: '/account/api-keys', icon: 'nav-api-keys', label: 'API keys', unlocker: true },
      { page: 'playground', href: '/account/playground', icon: 'nav-playground', label: 'Playground', unlocker: true },
    ],
  },
  { label: 'Proxies', items: [{ page: 'proxies', href: '/account/proxies', icon: 'nav-proxy-setup', label: 'Proxy setup' }] },
  {
    label: 'Account',
    items: [
      { page: 'usage', href: '/account/usage', icon: 'nav-usage', label: 'Usage' },
      { page: 'billing', href: '/account/billing', icon: 'nav-billing', label: 'Billing' },
    ],
  },
];

const ICON = (name: string) => `/design/04-illustrations/icons/dashboard-nav/${name}.svg`;

export function DashboardSidebar({ active }: { active: DashboardPage }) {
  return (
    <aside className="side">
      <div>
        <div className="sb-brand">
          <a href="/" aria-label="Veyora home">
            <img
              src="/design/03-logo/3d/veyora-logo-3d-ink-24h@1x.png"
              srcSet="/design/03-logo/3d/veyora-logo-3d-ink-24h@1x.png 1x, /design/03-logo/3d/veyora-logo-3d-ink-24h@2x.png 2x"
              height={24}
              alt="Veyora"
            />
          </a>
          <span className="sb-ver mono">V1</span>
        </div>
        <nav className="snav" aria-label="Dashboard">
          {GROUPS.map((group) => (
            <div
              className="snav__group"
              key={group.label}
              data-unlocker-nav={group.items.every((i) => i.unlocker) ? '' : undefined}
              hidden={group.items.every((i) => i.unlocker) || undefined}
            >
              <p className="snav__label mono">{group.label}</p>
              {group.items.map((item) => (
                <a
                  key={item.page}
                  className={`snav__a${item.page === active ? ' is-active' : ''}`}
                  href={item.href}
                  aria-current={item.page === active ? 'page' : undefined}
                >
                  <span className="ni-l">
                    <img className="ic" src={ICON(item.icon)} alt="" aria-hidden="true" />
                    {item.label}
                  </span>
                  {item.page === active && <span className="ni-ar">↗</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className="side__foot">
        <a className="snav__a" href="/support">
          <span className="ni-l">
            <img className="ic" src={ICON('nav-support')} alt="" aria-hidden="true" />
            Support
          </span>
        </a>
        <div className="user-box">
          <span className="user-sq mono" data-field="initial" aria-hidden="true">
            V
          </span>
          <span className="user-meta">
            <span className="user-lbl mono">Signed in as</span>
            <span className="user-email" data-field="email" />
          </span>
        </div>
        <button className="logout-btn" type="button" data-logout="">
          <span>Log out</span>
          <img className="ic" src={ICON('nav-log-out')} alt="" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
