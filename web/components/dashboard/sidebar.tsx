export function DashboardSidebar() {
  return (
    <>
      <aside className="side">
        <a className="brand" href="/" aria-label="Veyora home">
          <svg className="brand__mark" aria-hidden="true">
            <use href="#i-logo" />
          </svg>
          <span>veyora</span>
        </a>{' '}
        <nav className="snav" aria-label="Dashboard sections">
          <p className="snav__label">Workspace</p>{' '}
          <a className="snav__a is-active" href="#overview" aria-current="true">
            <svg className="ic" aria-hidden="true">
              <use href="#i-dash" />
            </svg>
            Overview
          </a>{' '}
          <a className="snav__a" href="#funds">
            <svg className="ic" aria-hidden="true">
              <use href="#i-walletadd" />
            </svg>
            Add funds
          </a>{' '}
          <a className="snav__a" href="#connection">
            <svg className="ic" aria-hidden="true">
              <use href="#i-router" />
            </svg>
            Connection
          </a>{' '}
          <a className="snav__a" href="#targeting">
            <svg className="ic" aria-hidden="true">
              <use href="#i-globe" />
            </svg>
            Targeting
          </a>{' '}
          <a className="snav__a" href="#test">
            <svg className="ic" aria-hidden="true">
              <use href="#i-terminal" />
            </svg>
            Test it
          </a>{' '}
          <p className="snav__label">Activity</p>{' '}
          <a className="snav__a" href="#usage">
            <svg className="ic" aria-hidden="true">
              <use href="#i-chart" />
            </svg>
            Usage
          </a>{' '}
          <a className="snav__a" href="#payments">
            <svg className="ic" aria-hidden="true">
              <use href="#i-coins" />
            </svg>
            Payments
          </a>{' '}
          <p className="snav__label">Developers</p>{' '}
          <a className="snav__a" href="#unlocker" data-unlocker-nav="" hidden>
            <svg className="ic" aria-hidden="true">
              <use href="#i-api" />
            </svg>
            Web Unlocker
          </a>{' '}
          <a className="snav__a" href="#keys" data-unlocker-nav="" hidden>
            <svg className="ic" aria-hidden="true">
              <use href="#i-key" />
            </svg>
            API keys
          </a>
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
    </>
  );
}
