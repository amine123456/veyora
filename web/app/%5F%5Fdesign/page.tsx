import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Veyora design primitives', robots: 'noindex, nofollow' };

// Dev-only: 404s outside development so it never ships in the static export. Compare
// each section below against 06-components/crops/*.png while porting real pages.
export default function DesignPrimitivesPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <main style={{ display: 'grid', gap: 48, maxWidth: 1328 }}>
      <h1 style={{ fontSize: 28 }}>Veyora primitives — /__design (dev only, removed before ship)</h1>

      <Section title="Typographic modes (§2.3)">
        <p className="vy-type-app">vy-type-app — Inter, ss01/cv11 (dashboard, auth)</p>
        <p className="vy-type-text">vy-type-text — Inter Text opsz14 (hero, footer, unlocker, how)</p>
        <p className="vy-type-display">vy-type-display — Inter Display opsz32 (feeds, tiers/samples)</p>
        <p className="vy-mono">vy-mono — jetbrains mono uppercase forced, lowercase source text</p>
      </Section>

      <Section title="Spec bar (.vy-specbar)">
        <div className="vy-specbar">
          <span><i />Unlocker / 03</span>
          <span>Single request · Residential &amp; mobile retries · $0.20 / 1,000 req</span>
        </div>
        <div className="vy-specbar vy-specbar--plain">
          <span><i />Workflow / 04 (plain, no rule)</span>
          <span>3 steps</span>
        </div>
        <div style={{ background: 'var(--vy-ink)', padding: 16 }}>
          <div className="vy-specbar vy-specbar--dark">
            <span><i />Catalog / 01 (dark)</span>
            <span>Veyora · Infrastructure</span>
          </div>
        </div>
      </Section>

      <Section title="Label chip (.vy-label-chip)">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span className="vy-label-chip">
            <span className="vy-label-chip__sq"><i /></span>
            <span className="vy-label-chip__txt">Web Unlocker API</span>
          </span>
          <span className="vy-label-chip vy-label-chip--s">
            <span className="vy-label-chip__sq"><i /></span>
            <span className="vy-label-chip__txt">New account</span>
          </span>
          <span style={{ background: 'var(--vy-ink)', padding: 8, display: 'inline-flex' }} className="vy-label-chip vy-label-chip--dark">
            <span className="vy-label-chip__sq vy-label-chip__sq--lilac"><i /></span>
            <span className="vy-label-chip__txt">Custom SLA · Any public website</span>
          </span>
        </div>
      </Section>

      <Section title="Yellow highlight techniques">
        <h2 style={{ fontSize: 40, fontWeight: 400 }}>
          Send a URL.<br />
          <span className="vy-hl-block">Get the page back.</span>
        </h2>
        <h2 style={{ fontSize: 40, fontWeight: 400 }}>
          From sign-up <span className="vy-hl-inline">to data in hand.</span>
        </h2>
        <p style={{ fontSize: 64 }}>
          <span className="vy-hl-under">5M</span>
        </p>
      </Section>

      <Section title="Square bullets (.vy-li)">
        <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0, maxWidth: 420 }}>
          <li className="vy-li"><span className="sq" /><span>Cars, real estate, jobs and reviews</span></li>
          <li className="vy-li"><span className="sq" /><span>JSON, CSV, Parquet or JSONL</span></li>
        </ul>
      </Section>

      <Section title="Buttons (.vy-btn)">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="vy-btn vy-btn--primary vy-btn--sm">Log in</button>
          <button className="vy-btn vy-btn--primary">Get an API key <span className="ar">↗</span></button>
          <button className="vy-btn vy-btn--primary vy-btn--lg">Browse data feeds <span className="ar">↗</span></button>
          <button className="vy-btn vy-btn--secondary">Read the docs <span className="ar">→</span></button>
          <button className="vy-btn vy-btn--secondary on-yellow">Secondary on yellow</button>
          <div style={{ background: 'var(--vy-ink)', padding: 12, display: 'inline-flex', gap: 16 }}>
            <button className="vy-btn vy-btn--yellow">Contact us <span className="ar">↗</span></button>
          </div>
          <button className="vy-btn vy-btn--primary" disabled>Disabled</button>
        </div>
        <button className="vy-btn vy-btn--primary vy-btn--block" style={{ marginTop: 16, maxWidth: 320 }}>
          Create account <span className="ar">↗</span>
        </button>
      </Section>

      <Section title="Chips, badges (.vy-chip / .vy-badge)">
        <div className="vy-chip-row" style={{ marginBottom: 12 }}>
          <span className="vy-chip vy-chip--active"><i className="sq" />Live</span>
          <span className="vy-chip">2.4M records collected daily</span>
          <span className="vy-chip">26 live sources</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="vy-chip vy-chip--meta"><i className="dot" />Snapshot · Daily</span>
          <span className="vy-chip vy-chip--table">Active</span>
          <span className="vy-badge vy-badge--yellow">Most popular</span>
          <span className="vy-badge vy-badge--lilac">Pending</span>
          <span className="vy-badge vy-badge--white">Off</span>
        </div>
      </Section>

      <Section title="Tabs (.vy-tabs)">
        <div className="vy-tabs" role="tablist">
          <button className="vy-tab active" role="tab" aria-selected="true">Data Feeds ↗</button>
          <button className="vy-tab" role="tab" aria-selected="false">Web Unlocker</button>
          <button className="vy-tab" role="tab" aria-selected="false">Proxies</button>
        </div>
      </Section>

      <Section title="Cards (.vy-card)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 240px)', gap: 24 }}>
          <div className="vy-card">
            <div className="vy-card__top"><span>01 / Feeds</span><span className="vy-snum vy-snum--1">1</span></div>
            <div className="vy-card__body"><p>White card body</p></div>
            <div className="vy-card__foot"><span>Manage feeds →</span></div>
          </div>
          <div className="vy-card vy-card--yellow">
            <div className="vy-card__top"><span>02 / API</span><span className="vy-snum vy-snum--2">2</span></div>
            <div className="vy-card__body"><p>Yellow card body</p></div>
            <div className="vy-card__foot"><span>How it works →</span></div>
          </div>
          <div className="vy-card vy-card--ink">
            <div className="vy-card__top"><span>03 / Proxies</span><span className="vy-snum vy-snum--3">3</span></div>
            <div className="vy-card__body"><p>Ink card body</p></div>
            <div className="vy-card__foot"><span>Proxy details →</span></div>
          </div>
        </div>
      </Section>

      <Section title="Form fields + verify box (.vy-field / .vy-input / .vy-verify)">
        <div style={{ maxWidth: 360, display: 'grid', gap: 0 }}>
          <div className="vy-field">
            <label htmlFor="d-email">Email</label>
            <input id="d-email" className="vy-input" placeholder="Enter your email" />
            <p className="vy-helper">At least 10 characters.</p>
          </div>
          <div className="vy-field">
            <label htmlFor="d-pass">Password</label>
            <input id="d-pass" className="vy-input" aria-invalid="true" placeholder="Create a password" />
            <p className="vy-error">This field is required.</p>
          </div>
          <div className="vy-verify">
            <span className="vy-verify__l">Verifying…</span>
            <span className="vy-verify__tag">Human check</span>
          </div>
        </div>
      </Section>

      <Section title="Table (.vy-table)">
        <table className="vy-table" style={{ maxWidth: 520 }}>
          <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Sample rows</caption>
          <thead>
            <tr><th scope="col">Make</th><th scope="col">Model</th><th scope="col">Price</th></tr>
          </thead>
          <tbody>
            <tr><td>BMW</td><td>X5</td><td>52,000</td></tr>
            <tr><td>Ford</td><td>Focus</td><td>14,500</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Code block (.vy-code)">
        <pre className="vy-code">
{'curl -X POST https://veyora.pro/v1/unlock \\\n  -H "Authorization: Bearer YOUR_API_KEY"'}
        </pre>
      </Section>

      <Section title="Ticker (.vy-ticker)">
        <div className="vy-ticker">
          <span className="vy-ticker__lab">Live sources</span>
          <div className="vy-ticker__track">
            <span>mobile.de</span><i /><span>LaCentrale</span><i /><span>car.gr</span>
          </div>
        </div>
      </Section>

      <Section title="Links (.vy-link)">
        <p>
          See our <a className="vy-link" href="#">refund policy</a> for details.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h2 className="vy-mono" style={{ fontSize: 13, opacity: 0.68 }}>{title}</h2>
      {children}
    </section>
  );
}
