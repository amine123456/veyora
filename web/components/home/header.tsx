export function HomeHeader() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="nav" id="nav">
        <div className="nav__in">
          <span className="nav__spacer" aria-hidden="true" />{' '}
          <nav className="nav__center" aria-label="Primary">
            <ul className="nav__links nav__links--l">
              <li>
                <a href="#products">Products</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
            </ul>{' '}
            <a className="brand" href="#top" aria-label="Veyora, back to top">
              <svg className="brand__mark" aria-hidden="true">
                <use href="#i-logo" />
              </svg>
              <span>veyora</span>
            </a>{' '}
            <ul className="nav__links nav__links--r">
              <li>
                <a href="#compare">Network</a>
              </li>
              <li>
                <a href="/docs">Docs</a>
              </li>
            </ul>
          </nav>
          <div className="nav__actions">
            <a className="nav__login" href="/login">
              Log in
            </a>{' '}
            <a className="btn btn--ink btn--sm" href="#pricing">
              Get proxies
            </a>{' '}
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
          <a className="brand" href="#top" aria-label="Veyora, back to top">
            <svg className="brand__mark" aria-hidden="true">
              <use href="#i-logo" />
            </svg>
            <span>veyora</span>
          </a>{' '}
          <ul className="navpill__links">
            <li>
              <a href="#products">Products</a>
            </li>
            <li>
              <a href="#pricing">Pricing</a>
            </li>
            <li>
              <a href="#compare">Network</a>
            </li>
            <li>
              <a href="/docs">Docs</a>
            </li>
          </ul>{' '}
          <a className="navpill__login" href="/login">
            Log in
          </a>{' '}
          <a className="btn btn--ink btn--sm" href="#pricing">
            Get proxies
          </a>
        </nav>
        <div className="sheet" id="sheet" hidden>
          <ul>
            <li>
              <a href="#products">Products</a>
            </li>
            <li>
              <a href="#pricing">Pricing</a>
            </li>
            <li>
              <a href="#compare">Network</a>
            </li>
            <li>
              <a href="/docs">Docs</a>
            </li>
            <li>
              <a href="/login">Log in</a>
            </li>
          </ul>{' '}
          <a className="btn btn--yellow btn--lg" href="#pricing">
            Get proxies
          </a>
        </div>
      </header>
    </>
  );
}
