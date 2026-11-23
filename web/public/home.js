(() => {
'use strict';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- accessible tabs: click, arrow keys, Home/End ---------- */
function tabs(list, onSelect) {
  const items = $$('[role="tab"]', list);
  const select = (tab, focus) => {
    items.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    onSelect(tab);
  };
  items.forEach(t => t.addEventListener('click', () => select(t, false)));
  list.addEventListener('keydown', e => {
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(items[(next + items.length) % items.length], true);
  });
}

/* ---------- how it works: one pane per product ---------- */
const howTabs = $('[data-how-tabs]');
if (howTabs) {
  const panes = $$('[data-how-pane]');
  document.documentElement.classList.add('how-tabs');
  tabs(howTabs, tab => {
    panes.forEach(p => p.classList.toggle('is-on', p.dataset.howPane === tab.dataset.how));
  });
}

/* ---------- sample data preview ---------- */
const root = $('[data-sample-root]');
if (root) {
  const cache = new Map();
  const table = $('[data-sample-table]', root);
  const total = $('[data-sample-total]', root);
  const fieldCount = $('[data-sample-fields]', root);
  const size = $('[data-sample-size]', root);
  const fieldList = $('[data-sample-fieldlist]', root);
  const download = $('[data-sample-download]', root);
  const SKIP = /url|photo|image|picture|link|signature|^id$|reference|description/i;
  const nf = new Intl.NumberFormat('en');
  let current = '';

  const label = f => f.replace(/^excel_/, '').replace(/_/g, ' ');
  const cell = v => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'number') return nf.format(v);
    const s = String(v);
    return s.length > 42 ? s.slice(0, 40) + '…' : s;
  };
  const sizeText = mb => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : mb >= 1 ? `${Math.round(mb)} MB` : `${Math.max(1, Math.round(mb * 1000))} KB`);

  function render(d) {
    total.textContent = nf.format(d.total_records);
    fieldCount.textContent = String(d.field_count);
    size.textContent = sizeText(d.file_size_mb);
    const cols = d.fields.filter(f => !SKIP.test(f)).slice(0, 6);
    const rows = d.records.slice(0, 5);
    const t = document.createElement('table');
    const head = t.createTHead().insertRow();
    cols.forEach(c => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label(c); head.appendChild(th); });
    const body = t.createTBody();
    rows.forEach(r => {
      const tr = body.insertRow();
      cols.forEach(c => { tr.insertCell().textContent = cell(r[c]); });
    });
    const cap = t.createCaption();
    cap.className = 'sr-only';
    cap.textContent = `First ${rows.length} records from the ${d.feed_id} feed`;
    table.replaceChildren(t);
    table.classList.remove('is-swap');
    void table.offsetWidth;
    table.classList.add('is-swap');
    const strong = Object.assign(document.createElement('strong'), { textContent: 'All fields' });
    const rest = Object.assign(document.createElement('span'), { textContent: d.fields.map(label).join(' · ') });
    fieldList.replaceChildren(strong, rest);
  }

  // The server exposes samples through the feeds API; the static copy covers local dev.
  async function load(id) {
    for (const url of [`/api/feeds/${id}/sample`, `/samples/${id}.json`]) {
      try {
        const res = await fetch(url);
        if (res.ok && (res.headers.get('content-type') || '').includes('json')) return { url, data: await res.json() };
      } catch {}
    }
    throw new Error('sample unavailable');
  }

  async function show(id) {
    current = id;
    download.setAttribute('download', `veyora-${id}-sample.json`);
    root.setAttribute('aria-busy', 'true');
    try {
      if (!cache.has(id)) cache.set(id, await load(id));
      download.href = cache.get(id).url;
      if (current === id) render(cache.get(id).data);
    } catch {
      if (current === id) table.replaceChildren(Object.assign(document.createElement('p'), { className: 'sample__empty', textContent: 'This sample could not be loaded. Download it with the button below.' }));
    } finally {
      if (current === id) root.removeAttribute('aria-busy');
    }
  }

  const list = $('[role="tablist"]', root);
  tabs(list, tab => show(tab.dataset.sample));
  // Fetch only when the section is close to the viewport.
  const first = () => show($('[aria-selected="true"]', list).dataset.sample);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); first(); } }, { rootMargin: '400px 0px' });
    io.observe(root);
  } else first();
}

/* ---------- hero pipeline: the highlighted source walks down the list ---------- */
const sources = $$('.pipe__logos li');
if (sources.length && !reduced) {
  let i = 0, timer = 0;
  const tick = () => {
    sources[i].classList.remove('is-on');
    i = (i + 1) % sources.length;
    sources[i].classList.add('is-on');
  };
  const hero = $('#top');
  const run = on => { clearInterval(timer); if (on) timer = setInterval(tick, 1800); };
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(es => run(es[0].isIntersecting)).observe(hero);
  } else run(true);
}
})();
