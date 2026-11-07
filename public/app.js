(() => {
'use strict';

/* ================= helpers ================= */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const smoothstep = (a, b, v) => smooth(clamp((v - a) / (b - a), 0, 1));
const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const root = document.documentElement;
root.classList.add('js');

const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
const mqMobile = matchMedia('(max-width: 899px)');

/* ================= global state ================= */
const state = {
  scrollY: window.scrollY, smoothY: window.scrollY, vh: innerHeight, vw: innerWidth,
  docH: 1, progress: 0, dir: 1, time: 0,
  mouse: { x: 0, y: 0, sx: 0, sy: 0, cx: innerWidth / 2, cy: innerHeight / 2 },
  reduced: mqReduce.matches, fine: mqFine.matches, mobile: mqMobile.matches
};
root.classList.toggle('reduce-motion', state.reduced);

/* ================= single rAF engine ================= */
const tasks = [], resizers = [], tweens = new Set();
const onFrame = fn => tasks.push(fn);
const onResize = fn => resizers.push(fn);
function tween(ms, fn, done) {
  const tw = { t: 0, ms, fn, done, stop() { tweens.delete(tw); } };
  tweens.add(tw); return tw;
}
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  state.time += dt;
  const k = state.reduced ? 1 : 1 - Math.pow(1 - 0.09, dt * 60);
  state.smoothY = lerp(state.smoothY, state.scrollY, k);
  if (Math.abs(state.smoothY - state.scrollY) < 0.05) state.smoothY = state.scrollY;
  const mk = 1 - Math.pow(1 - 0.08, dt * 60);
  state.mouse.sx = lerp(state.mouse.sx, state.mouse.x, mk);
  state.mouse.sy = lerp(state.mouse.sy, state.mouse.y, mk);
  for (let i = 0; i < tasks.length; i++) tasks[i](state, dt);
  tweens.forEach(tw => {
    tw.t += dt * 1000;
    const p = clamp(tw.t / tw.ms, 0, 1);
    tw.fn(p);
    if (p >= 1) { tweens.delete(tw); if (tw.done) tw.done(); }
  });
  requestAnimationFrame(frame);
}

/* visibility flag helper */
function watch(el, margin = '160px') {
  const o = { in: false };
  new IntersectionObserver(es => { o.in = es[es.length - 1].isIntersecting; }, { rootMargin: margin + ' 0px' }).observe(el);
  return o;
}

/* pause looping CSS animations in sections that are off-screen */
function initOffscreenPause() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-offscreen', !e.isIntersecting)), { rootMargin: '100px 0px' });
  $$('.section, .footer').forEach(el => io.observe(el));
}

/* ================= measure ================= */
function measureAll() {
  state.vh = innerHeight; state.vw = innerWidth;
  state.mobile = mqMobile.matches; state.fine = mqFine.matches;
  state.docH = Math.max(1, document.documentElement.scrollHeight - state.vh);
  resizers.forEach(fn => fn());
}
let rzT;
const debouncedMeasure = () => { clearTimeout(rzT); rzT = setTimeout(measureAll, 120); };

/* ================= input ================= */
addEventListener('scroll', () => {
  const y = window.scrollY;
  state.dir = y >= state.scrollY ? 1 : -1;
  state.scrollY = y;
  state.progress = clamp(y / state.docH, 0, 1);
}, { passive: true });
addEventListener('pointermove', e => {
  state.mouse.x = (e.clientX / state.vw) * 2 - 1;
  state.mouse.y = (e.clientY / state.vh) * 2 - 1;
  state.mouse.cx = e.clientX; state.mouse.cy = e.clientY;
}, { passive: true });
addEventListener('resize', debouncedMeasure);
mqReduce.addEventListener && mqReduce.addEventListener('change', e => {
  state.reduced = e.matches; root.classList.toggle('reduce-motion', e.matches);
});

/* ================= buttons: text-swap wrapper + magnetic ================= */
function initButtons() {
  $$('.btn').forEach(b => {
    if ($('.btn__txt', b)) return;
    const label = b.textContent.trim();
    b.innerHTML = `<span class="btn__txt"><span>${label}</span><span aria-hidden="true">${label}</span></span>`;
  });
  if (state.reduced || !state.fine) return;
  const items = $$('[data-magnetic]').map(el => ({ el, x: 0, y: 0, tx: 0, ty: 0 }));
  items.forEach(it => {
    it.el.addEventListener('pointermove', e => {
      const r = it.el.getBoundingClientRect();
      it.tx = clamp((e.clientX - (r.left + r.width / 2)) * 0.28, -9, 9);
      it.ty = clamp((e.clientY - (r.top + r.height / 2)) * 0.34, -7, 7);
    });
    it.el.addEventListener('pointerleave', () => { it.tx = 0; it.ty = 0; });
  });
  onFrame(() => items.forEach(it => {
    if (Math.abs(it.x - it.tx) < 0.05 && Math.abs(it.y - it.ty) < 0.05 && !it.tx && !it.ty) { if (it.x || it.y) { it.x = it.y = 0; it.el.style.translate = 'none'; } return; }
    it.x = lerp(it.x, it.tx, 0.18); it.y = lerp(it.y, it.ty, 0.18);
    it.el.style.translate = `${it.x.toFixed(2)}px ${it.y.toFixed(2)}px`;
  }));
}

/* ================= glass specular follows pointer ================= */
function initGlass() {
  if (!state.fine) return;
  document.addEventListener('pointermove', e => {
    const g = e.target.closest && e.target.closest('.glass');
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    g.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }, { passive: true });
}

/* ================= header ================= */
function initHeader() {
  const nav = $('#nav'), bar = $('#progressBar'), toggle = $('#navToggle');
  const links = $$('[data-spy]');
  const targets = links.map(a => $(a.getAttribute('href')));
  let spans = [], lastY = 0, active = -1, open = false;
  const measure = () => {
    spans = targets.map(t => { if (!t) return null; const r = t.getBoundingClientRect(); return [r.top + state.scrollY, r.bottom + state.scrollY]; });
  };
  onResize(measure); measure();
  const setOpen = v => { open = v; nav.classList.toggle('is-open', v); toggle.setAttribute('aria-expanded', String(v)); };
  toggle.addEventListener('click', () => setOpen(!open));
  links.forEach(a => a.addEventListener('click', () => setOpen(false)));
  $$('.nav__mobile-actions a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && open) { setOpen(false); toggle.focus(); } });

  onFrame(s => {
    const y = s.scrollY;
    nav.classList.toggle('is-compact', y > 80);
    if (Math.abs(y - lastY) > 6) {
      nav.classList.toggle('is-hidden', y > lastY && y > 480 && !open);
      lastY = y;
    }
    bar.style.transform = `scaleX(${s.progress.toFixed(4)})`;
    const mid = y + s.vh * 0.4; let act = -1;
    spans.forEach((sp, i) => { if (sp && mid >= sp[0] && mid < sp[1]) act = i; });
    if (act !== active) {
      active = act;
      links.forEach((a, i) => { a.classList.toggle('is-active', i === act); if (i === act) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }
  });
}

/* ================= text split + reveals ================= */
function splitWords(el) {
  const label = el.textContent.trim().replace(/\s+/g, ' ');
  let idx = 0;
  const walk = node => {
    Array.from(node.childNodes).forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.className = 'w__i';
          i.textContent = tok; i.style.setProperty('--i', idx++);
          w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  el.setAttribute('aria-label', label);
}
function initReveal() {
  $$('.split').forEach(splitWords);
  const els = $$('.split, [data-reveal], .reveal, [data-card], .plan');
  if (state.reduced || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  els.forEach(e => { if (!e.classList.contains('bento__res')) io.observe(e); });
}

/* ================= parallax (translate property, no conflicts) ================= */
function initParallax() {
  const els = $$('[data-speed],[data-depth]').map(el => ({
    el, speed: parseFloat(el.dataset.speed) || 0, depth: parseFloat(el.dataset.depth) || 0, base: 0, vis: watch(el, '240px')
  }));
  const measure = () => els.forEach(o => {
    o.el.style.translate = 'none';
    const r = o.el.getBoundingClientRect();
    o.base = r.top + state.scrollY + r.height / 2;
  });
  onResize(measure); measure();
  onFrame(s => {
    if (s.reduced) return;
    els.forEach(o => {
      if (!o.vis.in) return;
      const off = s.smoothY + s.vh / 2 - o.base;
      const d = s.mobile ? 0 : o.depth * 18;
      o.el.style.translate = `${(s.mouse.sx * d).toFixed(1)}px ${(off * o.speed + s.mouse.sy * d).toFixed(1)}px`;
    });
  });
}

/* ================= tilt cards ================= */
function initTilt() {
  if (state.reduced || !state.fine) return;
  const items = $$('[data-tilt]').map(el => ({ el, max: el.classList.contains('plan') ? 5 : 8, rx: 0, ry: 0, tx: 0, ty: 0, l: 0, tl: 0, on: false }));
  items.forEach(it => {
    const el = it.el;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      it.ty = (px - 0.5) * 2 * it.max; it.tx = -(py - 0.5) * 2 * it.max; it.tl = 24; it.on = true;
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', () => { it.tx = it.ty = it.tl = 0; });
  });
  onFrame(() => items.forEach(it => {
    if (!it.on) return;
    it.rx = lerp(it.rx, it.tx, 0.12); it.ry = lerp(it.ry, it.ty, 0.12); it.l = lerp(it.l, it.tl, 0.12);
    const st = it.el.style;
    st.setProperty('--rx', it.rx.toFixed(2) + 'deg');
    st.setProperty('--ry', it.ry.toFixed(2) + 'deg');
    st.setProperty('--lift', it.l.toFixed(1) + 'px');
    if (!it.tx && !it.ty && Math.abs(it.rx) < 0.02 && Math.abs(it.ry) < 0.02 && it.l < 0.1) {
      it.on = false; st.setProperty('--rx', '0deg'); st.setProperty('--ry', '0deg'); st.setProperty('--lift', '0px');
    }
  }));
}

/* ================= chips + hero scene ================= */
function mountChips() {
  const tpl = $('#chipTpl');
  $$('[data-chip-slot]').forEach(slot => {
    slot.appendChild(tpl.content.cloneNode(true));
    const pins = $('.chip__pins', slot);
    if (pins) pins.innerHTML = Array.from({ length: 12 }, () => '<i></i>').join('');
  });
}
function initScene() {
  const scene = $('#scene'); if (!scene) return;
  const board = $('#sceneBoard');
  const vis = watch(scene, '200px');
  let top = 0;
  const measure = () => { top = scene.getBoundingClientRect().top + state.scrollY; };
  onResize(measure); measure();
  onFrame(s => {
    if (!vis.in) return;
    const p = clamp((s.vh - (top - s.scrollY)) / (s.vh * 0.95), 0, 1);
    const still = s.reduced || s.mobile;
    const rx = lerp(62, 48, smooth(p)) + (still ? 0 : -s.mouse.sy * 5);
    const rz = still ? 0 : s.mouse.sx * 7;
    board.style.setProperty('--rx', rx.toFixed(2));
    board.style.setProperty('--rz', rz.toFixed(2));
  });
  // signature load sequence
  document.addEventListener('veyora:ready', () => {
    setTimeout(() => scene.classList.add('is-assembled'), 700);
    setTimeout(() => scene.classList.add('is-lit'), 1700);
  });
  // CTA chip assembles when you arrive
  const frame = $('#ctaFrame');
  if (frame) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        frame.classList.add('is-assembled'); setTimeout(() => frame.classList.add('is-lit'), 900); io.disconnect();
      }
    }), { threshold: 0.3 });
    io.observe(frame);
  }
  if (state.reduced) $$('svg').forEach(sv => sv.pauseAnimations && sv.pauseAnimations());
}
const GEO = [['es', 'Madrid, ES'], ['de', 'Berlin, DE'], ['us', 'Austin, US'], ['jp', 'Osaka, JP'], ['br', 'Recife, BR'], ['fr', 'Lyon, FR']];
function initLive() {
  const ms = $('#liveMs'), city = $('#liveCity'), flag = $('#liveFlag use'), st = $('#liveStatus');
  if (!ms) return;
  setInterval(() => {
    if (state.reduced || document.hidden) return;
    const g = pick(GEO);
    ms.textContent = Math.round(rand(280, 640)) + 'ms';
    st.textContent = Math.random() < 0.94 ? '200 OK' : '304 OK';
    city.textContent = g[1];
    flag.setAttribute('href', '#f-' + g[0]);
  }, 2600);
}

/* ================= bento: fan-in from a pile ================= */
function initBento() {
  const grid = $('#bento'); if (!grid) return;
  const cards = $$('[data-card]', grid);
  const setPile = () => {
    const g = grid.getBoundingClientRect(), gx = g.left + g.width / 2, gy = g.top + g.height / 2;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--fx', (gx - (r.left + r.width / 2)).toFixed(0) + 'px');
      c.style.setProperty('--fy', (gy - (r.top + r.height / 2)).toFixed(0) + 'px');
      c.style.setProperty('--fr', ((i - 1.5) * 3).toFixed(1) + 'deg');
      c.style.setProperty('--fi', i);
    });
  };
  setPile(); onResize(() => { if (!grid.classList.contains('is-in')) setPile(); });
  if (state.reduced) { grid.classList.add('is-in'); cards.forEach(c => c.classList.add('is-in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      grid.classList.add('is-in');
      cards.forEach((c, i) => setTimeout(() => c.classList.add('is-in'), i * 110));
      io.disconnect();
    }
  }), { threshold: 0.2 });
  io.observe(grid);
}

/* ================= tickers & small demos ================= */
const randIp = () => `${Math.floor(rand(11, 223))}.${Math.floor(rand(1, 254))}.xx.${Math.floor(rand(2, 254))}`;
const mkRow = () => { const g = pick(GEO); return { cc: g[0], city: g[1].split(',')[0], ip: randIp() }; };
function initTickers() {
  const lists = $$('[data-ticker]').map(ul => ({ ul, vis: watch(ul), rows: $$('li', ul).map(() => mkRow()) }));
  const paint = L => {
    L.ul.innerHTML = L.rows.map((r, i) =>
      `<li${i === L.rows.length - 1 ? ' class="is-new"' : ''}><svg class="flag"><use href="#f-${r.cc}"/></svg><span class="mono">${r.ip}</span><em>${r.city}</em></li>`).join('');
  };
  setInterval(() => {
    if (state.reduced || document.hidden) return;
    lists.forEach(L => { if (!L.vis.in) return; L.rows.shift(); L.rows.push(mkRow()); paint(L); });
  }, 1800);
}
function initChips() {
  const wrap = $('#geoChips'); if (!wrap) return;
  const btns = $$('button', wrap), vis = watch(wrap);
  let touched = false, i = 0;
  const set = k => btns.forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
  btns.forEach((b, j) => b.addEventListener('click', () => { touched = true; set(j); }));
  setInterval(() => { if (touched || !vis.in || state.reduced) return; i = (i + 1) % btns.length; set(i); }, 1700);
}
function initSession() {
  const out = $('#sessTime'), ring = $('#sessRing'); if (!out) return;
  let sec = 24 * 3600 - 1;
  const pad = n => String(n).padStart(2, '0');
  const paint = () => {
    out.textContent = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
    ring.style.strokeDashoffset = String(100 - ((sec % 60) / 60) * 100);
  };
  paint();
  setInterval(() => { if (state.reduced || document.hidden) return; sec = sec <= 0 ? 24 * 3600 - 1 : sec - 1; paint(); }, 1000);
}

/* ================= initSticky (S3) ================= */
function initSticky() {
  const wrap = $('#stickyWrap'); if (!wrap) return;
  const path = $('#curvePath'), glow = $('#curveGlow'), node = $('#curveNode'), label = $('#nodeLabel'), stations = $('#curveStations');
  const slides = $$('.panel__slide'), btns = $$('.fstep');
  const len = path.getTotalLength();
  glow.style.strokeDasharray = len; glow.style.strokeDashoffset = len;
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 4; i++) {
    const pt = path.getPointAtLength(len * (i / 3));
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', 5); c.setAttribute('class', 'curve__station');
    stations.appendChild(c);
  }
  let top = 0, travel = 1, active = -1;
  const measure = () => { top = wrap.getBoundingClientRect().top + state.scrollY; travel = Math.max(1, wrap.offsetHeight - state.vh); };
  onResize(measure); measure();

  const setActive = i => {
    if (i === active) return; active = i;
    slides.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-past', k < i); s.setAttribute('aria-hidden', String(k !== i)); });
    btns.forEach((b, k) => { b.classList.toggle('is-active', k === i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    label.textContent = 'Step ' + (i + 1);
    $$('.curve__station', stations).forEach((c, k) => c.classList.toggle('is-done', k <= i));
  };
  btns.forEach((b, i) => b.addEventListener('click', () => {
    if (state.mobile) { slides[i].scrollIntoView({ behavior: state.reduced ? 'auto' : 'smooth', block: 'center' }); return; }
    scrollTo({ top: top + (i / 3) * travel + 2, behavior: state.reduced ? 'auto' : 'smooth' });
  }));
  const vis = watch(wrap, '300px');
  onFrame(s => {
    if (s.mobile) {
      if (active !== -2) { active = -2; slides.forEach(sl => sl.removeAttribute('aria-hidden')); }
      return;
    }
    if (!vis.in) return;
    const p = clamp((s.smoothY - top) / travel, 0, 1);
    glow.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
    const pt = path.getPointAtLength(len * p);
    node.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    setActive(Math.round(p * 3));
  });
}

/* ================= dotted world map (S4) ================= */
const LAND = [
  [-150, 64, 14, 8], [-105, 58, 30, 12], [-72, 52, 14, 10], [-98, 38, 26, 12], [-80, 36, 10, 10], [-102, 24, 10, 9], [-84, 12, 8, 4],
  [-42, 72, 18, 11], [-60, -8, 17, 16], [-62, -28, 11, 12], [-68, -46, 5, 10],
  [10, 50, 20, 10], [18, 63, 10, 8], [-4, 40, 7, 5], [-2, 54, 4, 5], [45, 58, 25, 10],
  [10, 22, 28, 14], [22, 0, 18, 18], [24, -22, 13, 12], [42, 8, 7, 7], [47, -19, 3, 6],
  [45, 24, 11, 9], [95, 62, 50, 12], [70, 44, 25, 10], [105, 34, 20, 13], [78, 16, 5, 9], [79, 24, 8, 8],
  [102, 14, 8, 12], [112, -3, 16, 4], [138, 37, 4, 9], [127, 37, 3, 5], [122, 12, 3, 5],
  [134, -25, 20, 12], [172, -42, 4, 5]
];
const isLand = (lon, lat) => LAND.some(([cx, cy, rx, ry]) => ((lon - cx) / rx) ** 2 + ((lat - cy) / ry) ** 2 <= 1);
function buildDots(host, step) {
  const f = document.createDocumentFragment(); let n = 0;
  for (let lat = 78; lat >= -58; lat -= step) {
    for (let lon = -178; lon <= 180; lon += step) {
      if (!isLand(lon, lat)) continue;
      const d = document.createElement('i');
      d.style.left = (((lon + 180) / 360) * 100).toFixed(2) + '%';
      d.style.top = (((80 - lat) / 140) * 100).toFixed(2) + '%';
      if (n++ % 23 === 0) { d.className = 'twinkle'; d.style.setProperty('--td', rand(0, 4).toFixed(1) + 's'); }
      f.appendChild(d);
    }
  }
  host.appendChild(f);
}
function initMap() {
  const mini = $('#miniMap'); if (mini) buildDots(mini, 9);
  const host = $('#mapDots'); if (!host) return;
  buildDots(host, 4.5);
  const cities = [['Los Angeles', 34.1, -118.2], ['New York', 40.7, -74], ['São Paulo', -23.5, -46.6], ['London', 51.5, -0.1], ['Berlin', 52.5, 13.4], ['Paris', 48.9, 2.3],
    ['Dubai', 25.2, 55.3], ['Mumbai', 19, 72.8], ['Singapore', 1.3, 103.8], ['Tokyo', 35.7, 139.7], ['Sydney', -33.9, 151.2], ['Johannesburg', -26.2, 28]];
  const pos = cities.map(([n, la, lo]) => ({ n, px: (lo + 180) / 360, py: (80 - la) / 140 }));
  $('#mapNodes').innerHTML = pos.map((p, i) =>
    `<span class="map__node" style="left:${(p.px * 100).toFixed(2)}%;top:${(p.py * 100).toFixed(2)}%;--nd:${(i * 0.3).toFixed(1)}s" tabindex="0" role="img" aria-label="${p.n}"><i></i><b>${p.n}</b></span>`).join('');
  const links = [[0, 1], [1, 3], [3, 4], [4, 6], [6, 7], [7, 8], [8, 9], [9, 10], [1, 2], [3, 5], [5, 11], [2, 5]];
  $('#mapArcs').innerHTML = links.map(([a, b], i) => {
    const x1 = pos[a].px * 1000, y1 = pos[a].py * 389, x2 = pos[b].px * 1000, y2 = pos[b].py * 389;
    const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - Math.hypot(x2 - x1, y2 - y1) * 0.28;
    return `<path class="arc" pathLength="1" style="--ad:${(i * 0.6).toFixed(1)}s" d="M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
  }).join('');
}

/* ================= initWordArc (S4) ================= */
function initWordArc() {
  const host = $('#wordArc'); if (!host) return;
  const words = ['Residential', 'Rotating', 'Sticky', 'Geo-aware', 'Clean', 'Fast', 'Private', 'Reliable', 'Global'];
  const els = words.map(w => { const s = document.createElement('span'); s.className = 'wordarc__w'; s.textContent = w; host.appendChild(s); return s; });
  const n = words.length, vis = watch(host, '120px');
  const draw = s => {
    const roll = s.reduced ? 0 : s.smoothY * 0.0045 + s.time * 0.28;
    const gap = (host.clientHeight || 520) / 6, R = gap * 7.5;
    els.forEach((el, i) => {
      let p = (((i - roll) % n) + n) % n; if (p > n / 2) p -= n;
      const ap = Math.abs(p), y = p * gap, x = -R * (1 - Math.cos(y / R));
      const rot = clamp(-p * 6, -18, 8), op = Math.max(0, 1 - Math.pow(ap / 3.6, 1.7)), sc = clamp(1 - ap * 0.085, 0.55, 1);
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      el.style.opacity = op.toFixed(3);
      el.style.filter = ap < 0.05 ? 'none' : `blur(${Math.min(ap * 1.3, 5).toFixed(1)}px)`;
      el.classList.toggle('is-active', ap < 0.5);
    });
  };
  draw(state);
  onFrame(s => { if (vis.in) draw(s); });
}

/* ================= orbit pill bar (S5) ================= */
function initOrbit() {
  const track = $('#orbit'); if (!track) return;
  const items = $$('.orbit__item', track), nameEl = $('#orbitName');
  const S = 76, T = items.length * S, vis = watch(track);
  let W = track.clientWidth, cur = -1;
  onResize(() => { W = track.clientWidth; });
  const draw = s => {
    const o = s.reduced ? 0 : s.time * 22 + s.smoothY * 0.12;
    let best = 0, bd = 1e9;
    items.forEach((it, i) => {
      const x = ((((i * S - o) % T) + T) % T) - S;
      const d = Math.abs(x + S / 2 - W / 2), k = Math.max(0, 1 - d / 120);
      it.style.transform = `translate3d(${x.toFixed(1)}px,-50%,0) scale(${(1 + 0.5 * smooth(k)).toFixed(3)})`;
      it.style.zIndex = Math.round(k * 10);
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== cur) {
      cur = best;
      items.forEach((it, i) => it.classList.toggle('is-center', i === best));
      nameEl.textContent = items[best].dataset.name;
    }
  };
  draw(state);
  onFrame(s => { if (vis.in) draw(s); });
}

/* ================= initCode (S5 terminal) ================= */
const SNIPPETS = {
  curl: 'curl -x "http://USER-country-es:PASS@gate.veyora.io:7777" \\\n  -H "Accept: application/json" \\\n  "https://api.ipify.org?format=json"',
  python: 'import requests\n\nproxy = "http://USER-country-es:PASS@gate.veyora.io:7777"\nr = requests.get(\n    "https://api.ipify.org?format=json",\n    proxies={"http": proxy, "https": proxy},\n    timeout=15,\n)\nprint(r.status_code, r.json())',
  node: 'import { ProxyAgent, fetch } from "undici";\n\nconst agent = new ProxyAgent("http://USER-country-es:PASS@gate.veyora.io:7777");\nconst res = await fetch("https://api.ipify.org?format=json", { dispatcher: agent });\nconsole.log(res.status, await res.json());'
};
const TOK = /("(?:[^"\\]|\\.)*")|(\b(?:import|from|const|await|print|as|curl)\b)|(\s-[xH]\b)|(\b\d+\b)|(\b(?:requests|ProxyAgent|fetch|console)\b)/g;
function tokenize(code) {
  const out = []; let last = 0, m; TOK.lastIndex = 0;
  while ((m = TOK.exec(code))) {
    if (m.index > last) out.push(['', code.slice(last, m.index)]);
    out.push([m[1] ? 'tk-s' : m[2] ? 'tk-k' : m[3] ? 'tk-f' : m[4] ? 'tk-n' : 'tk-b', m[0]]);
    last = TOK.lastIndex;
  }
  if (last < code.length) out.push(['', code.slice(last)]);
  return out;
}
function initCode() {
  const term = $('#terminal'); if (!term) return;
  const code = $('#codeEl'), resp = $('#codeResp'), tabs = $$('[role=tab]', term), panel = $('#codeOut');
  let lang = 'curl', tw = null, started = false;
  const finish = () => {
    const g = pick(GEO);
    $('#respMs').textContent = Math.round(rand(310, 520)) + 'ms';
    $('#respIp').textContent = `IP ${randIp().replace('xx.xx', 'xx.xx')} (${g[1].split(',')[0]})`;
    resp.classList.add('is-in');
  };
  const render = animate => {
    if (tw) tw.stop();
    resp.classList.remove('is-in'); code.innerHTML = '';
    const spans = tokenize(SNIPPETS[lang]).map(([c, t]) => { const s = document.createElement('span'); if (c) s.className = c; code.appendChild(s); return { s, t }; });
    const total = spans.reduce((a, o) => a + o.t.length, 0);
    const show = n => { let left = n; spans.forEach(o => { const k = clamp(left, 0, o.t.length); o.s.textContent = o.t.slice(0, k); left -= k; }); };
    if (!animate || state.reduced) { show(total); finish(); return; }
    code.classList.add('is-typing');
    tw = tween(total / 120 * 1000, p => show(Math.floor(p * total)), () => { code.classList.remove('is-typing'); finish(); });
  };
  const select = (l, focus) => {
    lang = l;
    tabs.forEach(t => { const on = t.dataset.lang === l; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on) { panel.setAttribute('aria-labelledby', t.id); if (focus) t.focus(); } });
    render(true);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.lang));
    t.addEventListener('keydown', e => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length].dataset.lang, true); }
    });
  });
  $('#copyBtn').addEventListener('click', () => {
    const txt = SNIPPETS[lang];
    const ok = () => { $('#copyTxt').textContent = 'Copied'; $('#copyStatus').textContent = 'Code copied to clipboard'; setTimeout(() => { $('#copyTxt').textContent = 'Copy'; }, 1600); };
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
  });
  render(false);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !started) { started = true; render(true); io.disconnect(); } }), { threshold: 0.4 });
  io.observe(term);
}

/* ================= counters ================= */
function initCounters() {
  const els = $$('[data-count]');
  if (!els.length || state.reduced) return;
  const fmt = (el, v) => { el.textContent = (el.dataset.prefix || '') + v.toFixed(+el.dataset.decimals || 0) + (el.dataset.suffix || ''); };
  els.forEach(el => fmt(el, 0));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.count);
    tween(1600, p => fmt(el, to * easeOutExpo(p)));
  }), { threshold: 0.4 });
  els.forEach(el => io.observe(el));
}

/* ================= initPricing ================= */
function buildOdo(el, len) {
  el.innerHTML = '';
  for (let i = 0; i < len; i++) {
    const col = document.createElement('span'); col.className = 'odo__col';
    const strip = document.createElement('span'); strip.className = 'odo__strip';
    strip.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<span>${d}</span>`).join('');
    col.appendChild(strip); el.appendChild(col);
  }
}
function setOdo(el, val) {
  const s = String(val).padStart(2, '0');
  if (el.children.length !== s.length) buildOdo(el, s.length);
  Array.from(el.children).forEach((col, i) => {
    const strip = col.firstChild;
    strip.style.transitionDelay = i * 60 + 'ms';
    strip.style.transform = `translateY(${-(+s[i]) * 10}%)`;
  });
}
function initPricing() {
  const seg = $('#billing'); if (!seg) return;
  const btns = $$('[role=radio]', seg), plans = $$('.plan[data-monthly]');
  let period = 'monthly';
  const thumb = () => {
    const b = btns.find(x => x.getAttribute('aria-checked') === 'true');
    seg.style.setProperty('--tx', b.offsetLeft + 'px');
    seg.style.setProperty('--tw', b.offsetWidth + 'px');
  };
  const paint = () => {
    plans.forEach(p => {
      const price = +p.dataset[period], gb = +p.dataset.gb;
      setOdo($('[data-odo]', p), price);
      $('.plan__sr', p).textContent = `$${price} per month`;
      $('.plan__rate', p).textContent = `About $${(price / gb).toFixed(2)} per GB`;
      const b = $('.plan__billed', p); b.textContent = b.dataset[period === 'monthly' ? 'monthlyT' : 'annualT'];
    });
    est();
  };
  const set = per => {
    period = per;
    btns.forEach(b => { const on = b.dataset.period === per; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    thumb(); paint();
  };
  btns.forEach((b, i) => {
    b.addEventListener('click', () => set(b.dataset.period));
    b.addEventListener('keydown', e => {
      const k = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (k) { e.preventDefault(); const nb = btns[(i + k + btns.length) % btns.length]; set(nb.dataset.period); nb.focus(); }
    });
  });
  // GB estimator: rate falls as volume grows (8 GB = $29, 40 GB = $99)
  const slider = $('#gb'), out = $('#gbOut'), price = $('#estPrice'), rate = $('#estRate'), note = $('#estNote');
  function est() {
    const gb = +slider.value, r = Math.max(0.9, 3.625 * Math.pow(gb / 8, -0.238));
    const total = Math.round(gb * r * (period === 'annual' ? 0.8 : 1));
    out.textContent = gb + ' GB';
    price.textContent = '$' + total.toLocaleString('en-US');
    rate.textContent = '$' + (total / gb).toFixed(2) + ' per GB';
    note.textContent = gb >= 300 ? 'Above 300 GB? Talk to sales for custom volume pricing.' : gb === 40 ? 'Matches the Pro plan.' : gb === 8 ? 'Matches the Starter plan.' : 'Estimated monthly cost for this much traffic.';
    slider.style.setProperty('--p', ((gb - slider.min) / (slider.max - slider.min) * 100).toFixed(1) + '%');
  }
  slider.addEventListener('input', est);
  onResize(thumb);
  btns.forEach(b => b.setAttribute('aria-checked', b.dataset.period === 'monthly' ? 'true' : 'false'));
  plans.forEach(p => buildOdo($('[data-odo]', p), 2));
  paint();
  requestAnimationFrame(thumb);
}

/* ================= initFAQ ================= */
function initFAQ() {
  $$('.qa').forEach(d => {
    const sum = $('summary', d), body = $('.qa__body', d);
    let anim = null;
    sum.addEventListener('click', e => {
      e.preventDefault();
      const opening = !d.open;
      d.dataset.state = opening ? 'open' : 'closed';
      if (state.reduced) { d.open = opening; return; }
      if (anim) anim.cancel();
      if (opening) {
        d.open = true;
        const h = body.offsetHeight;
        anim = body.animate({ height: ['0px', h + 'px'] }, { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
        anim.onfinish = () => { anim = null; };
      } else {
        const h = body.offsetHeight;
        anim = body.animate({ height: [h + 'px', '0px'] }, { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
        const a = anim;
        a.onfinish = () => { d.open = false; a.cancel(); if (anim === a) anim = null; };
      }
    });
  });
}

/* ================= boot ================= */
function boot() {
  // DOM that other modules depend on
  mountChips();
  initMap();
  initBento();

  // engine + global behaviours
  initButtons();
  initGlass();
  initOffscreenPause();
  initHeader();
  initParallax();
  initTilt();

  // sections
  initScene();
  initLive();
  initTickers();
  initSticky();
  initChips();
  initSession();
  initWordArc();
  initCounters();
  initOrbit();
  initCode();
  initPricing();
  initFAQ();

  // keep anchors accurate when layout changes (accordion, fonts, images)
  if ('ResizeObserver' in window) new ResizeObserver(debouncedMeasure).observe(document.body);
  addEventListener('load', measureAll);

  measureAll();
  requestAnimationFrame(frame);

  // wait for fonts, then split headings, re-measure and start the hero sequence
  const fontsReady = Promise.race([
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
    new Promise(r => setTimeout(r, 1400))
  ]);
  fontsReady.then(() => {
    initReveal();
    measureAll();
    requestAnimationFrame(() => {
      root.classList.add('is-ready');
      document.dispatchEvent(new Event('veyora:ready'));
    });
  });
}

boot();
})();
