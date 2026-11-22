export type DashboardPage =
  | 'overview' | 'feeds' | 'deliveries' | 'api-keys' | 'playground' | 'proxies' | 'usage' | 'billing';

type NavItem = { page: DashboardPage; href: string; icon: string; label: string; unlocker?: boolean };

const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'Workspace', items: [{ page: 'overview', href: '/account', icon: 'dash', label: 'Overview' }] },
  {
    label: 'Data Feeds',
    items: [
      { page: 'feeds', href: '/account/feeds', icon: 'database', label: 'My feeds' },
      { page: 'deliveries', href: '/account/feeds/deliveries', icon: 'timer', label: 'Deliveries' },
    ],
  },
  {
    label: 'Web Unlocker',
    items: [
      { page: 'api-keys', href: '/account/api-keys', icon: 'key', label: 'API keys', unlocker: true },
      { page: 'playground', href: '/account/playground', icon: 'terminal', label: 'Playground', unlocker: true },
    ],
  },
  { label: 'Proxies', items: [{ page: 'proxies', href: '/account/proxies', icon: 'router', label: 'Proxy setup' }] },
  {
    label: 'Account',
    items: [
      { page: 'usage', href: '/account/usage', icon: 'chart', label: 'Usage' },
      { page: 'billing', href: '/account/billing', icon: 'coins', label: 'Billing' },
    ],
  },
];

export function DashboardSidebar({ active }: { active: DashboardPage }) {
  return (
    <aside className="side">
      <a className="brand" href="/" aria-label="Veyora home">
        <svg className="brand__mark" aria-hidden="true">
          <use href="#i-logo" />
        </svg>
        <span>veyora</span>
      </a>{' '}
      <nav className="snav" aria-label="Dashboard">
        {GROUPS.map((group) => (
          <div className="snav__group" key={group.label} data-unlocker-nav={group.items.every((i) => i.unlocker) ? '' : undefined} hidden={group.items.every((i) => i.unlocker) || undefined}>
            <p className="snav__label">{group.label}</p>
            {group.items.map((item) => (
              <a
                key={item.page}
                className={`snav__a${item.page === active ? ' is-active' : ''}`}
                href={item.href}
                aria-current={item.page === active ? 'page' : undefined}
              >
                <svg className="ic" aria-hidden="true">
                  <use href={`#i-${item.icon}`} />
                </svg>
                {item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="side__foot">
        <a className="snav__a" href="/support">
          <svg className="ic" aria-hidden="true">
            <use href="#i-support" />
          </svg>
          Support
        </a>{' '}
        <div className="me">
          <span className="me__av" data-field="initial" aria-hidden="true">
            V
          </span>{' '}
          <span className="me__txt">
            <small>Signed in as</small>
            <span className="me__mail" data-field="email" />
          </span>
        </div>{' '}
        <button className="btn btn--ghost btn--block" type="button" data-logout="">
          <svg className="ic" aria-hidden="true">
            <use href="#i-logout" />
          </svg>
          <span className="lbl">Log out</span>
        </button>
      </div>
    </aside>
  );
}
