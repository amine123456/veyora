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
    <section className="sample container" id="sample" aria-labelledby="sample-title">
      <header className="head head--center">
        <p className="pill">
          <span className="dot" />
          Real rows, not mock-ups
        </p>
        <h2 className="h2" id="sample-title" data-split="">
          See the data{' '}
          <em className="serif">before you pay.</em>
        </h2>
        <p className="sub sub--ink">
          These rows come straight from our live feeds. Pick a source to preview its fields,
          then download the sample and load it into your own tools.
        </p>
      </header>
      <div className="sample__box" data-reveal="" data-sample-root="">
        <div className="sample__tabs" role="tablist" aria-label="Choose a data source">
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
            >
              {s.label}
              <small>{s.flag}</small>
            </button>
          ))}
        </div>
        <div className="sample__panel" id="sample-panel" role="tabpanel" aria-live="polite">
          <dl className="sample__meta">
            <div>
              <dt>Records in feed</dt>
              <dd data-sample-total="">–</dd>
            </div>
            <div>
              <dt>Fields per record</dt>
              <dd data-sample-fields="">–</dd>
            </div>
            <div>
              <dt>Full snapshot</dt>
              <dd data-sample-size="">–</dd>
            </div>
          </dl>
          <div className="sample__table" tabIndex={0} aria-label="Sample records" data-sample-table="">
            <p className="sample__empty">Loading sample rows…</p>
          </div>
          <div className="sample__foot">
            <p className="sample__fieldlist" data-sample-fieldlist="" />
            <a className="btn btn--ink" href="/api/feeds/mobilede/sample" download="" data-sample-download="">
              Download this sample (JSON)
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
