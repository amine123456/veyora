// Building blocks for the product pages (Web Unlocker, Residential Proxies), made from the
// design system's own pieces: the ink hero band of the feeds page (feeds.css) and the FAQ
// accordion of the home page (styles.css).
type Cta = { href: string; label: string };

export function ProductHero({ spec, chip, title, sub, primary, secondary, note }: {
  spec: string; chip: string; title: string; sub: string; primary: Cta; secondary: Cta; note: string;
}) {
  return (
    <section className="hero-band" aria-labelledby="product-title">
      <img className="hero-svg" src="/design/05-backgrounds/sections/feeds-hero-ink-horizon-1440x430.svg" alt="" aria-hidden="true" />
      <div className="vy-wrap">
        <div className="hero-spec mono">
          <span className="l">
            <i />
            {spec}
          </span>
          <span className="r">Veyora · Infrastructure</span>
        </div>
        <div className="hero-center">
          <span className="vy-label-chip vy-label-chip--dark">
            <span className="vy-label-chip__sq">
              <i />
            </span>
            <span className="vy-label-chip__txt">{chip}</span>
          </span>
          <h1 id="product-title">{title}</h1>
          <p className="sub">{sub}</p>
          <div className="hero-ctas">
            <a className="vy-btn vy-btn--yellow vy-btn--lg" href={primary.href}>
              {primary.label} <span className="ar">↗</span>
            </a>
            <a className="vy-btn vy-btn--secondary vy-btn--lg on-ink" href={secondary.href}>
              {secondary.label}
            </a>
          </div>
          <p className="hero-note mono">{note}</p>
        </div>
      </div>
    </section>
  );
}

export function ProductDetails({ spec, label, title, items }: {
  spec: string; label: string; title: string; items: { q: string; a: React.ReactNode }[];
}) {
  return (
    <section className="faq-sec vy-type-text" aria-labelledby="details-title">
      <div className="vy-wrap">
        <div className="vy-specbar">
          <span>
            <i />
            {spec}
          </span>
          <span>{label}</span>
        </div>
        <header className="sec-head">
          <h2 id="details-title">{title}</h2>
        </header>
        <div className="faq__list">
          {items.map((item, i) => (
            <details className="faq__item" key={item.q} open={i === 0}>
              <summary>
                {item.q}
                <span className="faq__toggle" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
