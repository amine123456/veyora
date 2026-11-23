// Live sample explorer (CLAUDE-PROMPT.md §4.3, reference 09-home-tiers-and-samples.html).
// Markup/classes restyled to the reference; every data-sample-* attribute, id, role and
// the tablist structure are unchanged — public/home.js drives all of this exactly as before.
const SOURCES = [
  { id: 'mobilede', label: 'mobile.de', flag: 'DE' },
  { id: 'lacentrale', label: 'La Centrale', flag: 'FR' },
  { id: 'donedeal', label: 'DoneDeal', flag: 'IE' },
  { id: 'zoomcar', label: 'Zoomcar', flag: 'FR' },
  { id: 'nettiauto', label: 'Nettiauto', flag: 'FI' },
  { id: 'aramisauto', label: 'Aramis Auto', flag: 'FR' },
  { id: 'similarweb', label: 'Similarweb', flag: 'Web' },
];

export function HomeSample() {
  return (
    <section className="samples-sec vy-type-display" id="sample" aria-labelledby="sample-title">
      <div className="samples-top">
        <img className="samples-top-bg" src="/design/05-backgrounds/sections/home-samples-top-bg-1440x331.svg" alt="" aria-hidden="true" />
        <div className="wrap">
          <div className="vy-specbar">
            <span>
              <i />
              Samples / 02
            </span>
            <span>Live feed preview · JSON</span>
          </div>
          <header className="sec-head">
            <span className="vy-label-chip">
              <span className="vy-label-chip__sq">
                <i />
              </span>
              <span className="vy-label-chip__txt">Free data samples</span>
            </span>
            <h2 id="sample-title">See the data before you pay.</h2>
            <p className="sub">
              These car listing and web traffic records come straight from our live data feeds. Pick a source to preview its
              fields, then download the sample and load it into your own tools.
            </p>
          </header>
        </div>
      </div>

      <div className="samples-stage">
        <img
          className="samples-stage-bg"
          src="/design/05-backgrounds/sections/home-samples-lilac-stage-1440x643.svg"
          alt=""
          aria-hidden="true"
        />
        <div className="explorer" data-reveal="" data-sample-root="">
          <div className="tabs-bar">
            <div className="tabs" role="tablist" aria-label="Choose a data source">
              {SOURCES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  id={`sample-tab-${s.id}`}
                  aria-controls="sample-panel"
                  aria-selected={i === 0 ? 'true' : 'false'}
                  tabIndex={i === 0 ? 0 : -1}
                  data-sample={s.id}
                  className={`tab${i === 0 ? ' active' : ''}`}
                >
                  <span>{s.label}</span>
                  <span className="geo mono">{s.flag}</span>
                  {i === 0 && <span className="ar">↗</span>}
                </button>
              ))}
            </div>
            <div className="tabs-meta">
              <i />
              <span>Snapshot · Daily</span>
            </div>
          </div>

          <div className="stats-grid" id="sample-panel" role="tabpanel" aria-live="polite">
            <div className="stat-box">
              <div>
                <div className="stat-lbl mono">Records in feed</div>
                <div className="stat-val" data-sample-total="">
                  –
                </div>
              </div>
              <img className="stat-px" src="/design/04-illustrations/icons/ui/ui-stat-mini-bars-a.svg" alt="" aria-hidden="true" />
            </div>
            <div className="stat-box">
              <div>
                <div className="stat-lbl mono">Fields per record</div>
                <div className="stat-val" data-sample-fields="">
                  –
                </div>
              </div>
              <img className="stat-px" src="/design/04-illustrations/icons/ui/ui-stat-mini-bars-b.svg" alt="" aria-hidden="true" />
            </div>
            <div className="stat-box">
              <div>
                <div className="stat-lbl mono">Full snapshot</div>
                <div className="stat-val" data-sample-size="">
                  –
                </div>
              </div>
              <img className="stat-px" src="/design/04-illustrations/icons/ui/ui-stat-mini-bars-c.svg" alt="" aria-hidden="true" />
            </div>
          </div>

          <div className="tbl-wrap">
            <div tabIndex={0} aria-label="Sample records" data-sample-table="">
              <p className="sample__empty">Loading sample rows…</p>
            </div>
          </div>

          <div className="exp-foot">
            <p className="fields-line" data-sample-fieldlist="" />
            <a className="dl-btn" href="/api/feeds/mobilede/sample" download="" data-sample-download="">
              <span>Download this sample (JSON)</span>
              <span className="ar">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
