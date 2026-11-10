(() => {
'use strict';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
root.classList.add('js');

/* ---------- headline word split: each word rises 12px + fades, 60ms stagger ---------- */
function splitWords(el) {
  let i = 0;
  const walk = node => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          // Keep trailing punctuation glued to the word it follows (e.g. an italic phrase then a comma).
          const prev = child.previousSibling;
          const lastW = prev && prev.nodeType === 1 && prev.querySelectorAll('.w');
          if (frag.childNodes.length === 0 && lastW && lastW.length && /^[,.;:!?]+$/.test(part)) {
            const p = document.createElement('span');
            p.className = 'p'; p.textContent = part;
            lastW[lastW.length - 1].appendChild(p);
            return;
          }
          const w = document.createElement('span');
          w.className = 'w'; w.style.setProperty('--i', String(i++)); w.textContent = part;
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    });
  };
  walk(el);
  el.classList.add('is-split');
}
$$('[data-split]').forEach(splitWords);

/* ---------- reveal on scroll ---------- */
const targets = $$('[data-reveal], [data-split]');
if (reduced || !('IntersectionObserver' in window)) {
  targets.forEach(t => t.classList.add('is-in'));
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(t => io.observe(t));
}

/* ---------- mobile / tablet menu ---------- */
const toggle = $('#navToggle'), sheet = $('#sheet');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  sheet.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
$$('a', sheet).forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) { setMenu(false); toggle.focus(); } });
matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) setMenu(false); });


/* ---------- nav: full bar at the top, floating pill once scrolled ---------- */
(() => {
  const nav = $('#nav'), bar = $('.nav__in'), pill = $('#navPill');
  if (!nav || !bar || !pill) return;
  const wide = matchMedia('(min-width: 1024px)');
  let compact = null;
  const apply = () => {
    const c = scrollY > 40;
    if (c !== compact) { compact = c; nav.classList.toggle('is-compact', c); }
    bar.inert = c && wide.matches;
    pill.inert = !(c && wide.matches);
  };
  addEventListener('scroll', apply, { passive: true });
  wide.addEventListener('change', apply);
  apply();
})();

/* ---------- monthly / yearly toggle ---------- */
const seg = $('#billing');
const thumb = $('.seg__thumb', seg);
const buttons = $$('button', seg);
const plans = $$('.plan[data-monthly]');
let period = 'monthly';

function moveThumb() {
  const b = buttons.find(x => x.getAttribute('aria-pressed') === 'true');
  if (!b) return;
  thumb.style.setProperty('--x', (b.offsetLeft - 5) + 'px');
  thumb.style.setProperty('--w', b.offsetWidth + 'px');
}
function countTo(el, to) {
  const from = Number(el.textContent) || to;
  if (reduced || from === to) { el.textContent = String(to); return; }
  const t0 = performance.now(), ms = 450;
  const step = now => {
    const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function applyPeriod() {
  plans.forEach(p => {
    const price = Number(p.dataset[period]);
    const gb = Number(p.dataset.gb);
    countTo($('[data-price]', p), price);
    $('[data-price-sr]', p).textContent = ` $${price} per month`;
    const billed = period === 'yearly' ? `Billed yearly ($${p.dataset.total}).` : 'Billed monthly.';
    $('[data-desc]', p).textContent = `${p.dataset.tag} ${billed}`;
    $('[data-rate]', p).textContent = `About $${(price / gb).toFixed(2)} per GB`;
  });
}
buttons.forEach(b => b.addEventListener('click', () => {
  period = b.dataset.period;
  buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  moveThumb(); applyPeriod();
}));
moveThumb();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveThumb);
if ('ResizeObserver' in window) new ResizeObserver(moveThumb).observe(seg);
addEventListener('resize', moveThumb);

/* ---------- hero connector lines ----------
   One curve per floating tile, ending on the dashboard's top edge. Sequence per line:
   1. the tile pops in (CSS), 2. the line draws itself out of the tile (masked reveal, ease-in-out),
   3. dashes march toward the dashboard (CSS), 4. a comet travels the line and pings where it lands.
   Geometry is rebuilt from real element positions on resize; the loop pauses off-screen. */
(() => {
  const hero = $('#top'), svg = $('#heroLines'), wrap = $('.dash-wrap');
  if (!hero || !svg || !wrap) return;
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const inOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const sine = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(k => n.setAttribute(k, attrs[k]));
    (parent || svg).appendChild(n); return n;
  };

  const DRAW = 1.5, TRAVEL = 1.7, CYCLE = 4.6, TRAIL = 72;
  let lines = [], raf = 0, visible = true, t0 = 0, built = false;

  function build(keepClock) {
    cancelAnimationFrame(raf); raf = 0;
    svg.textContent = ''; lines = []; built = false;
    if (innerWidth < 768) return;

    const W = hero.clientWidth, H = hero.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const defs = el('defs', {});
    const top = wrap.offsetTop, left = wrap.offsetLeft, right = left + wrap.offsetWidth;
    const tiles = $$('.tile, .bubble', hero).filter(t => t.offsetParent).map(t => ({
      t, cx: t.offsetLeft + t.offsetWidth / 2,
      cy: t.classList.contains('bubble') ? t.offsetTop + t.offsetHeight - 2 : t.offsetTop + t.offsetHeight / 2,
      delay: parseFloat(getComputedStyle(t).getPropertyValue('--in')) || 0
    }));
    const L = tiles.filter(o => o.cx < W / 2).sort((a, b) => a.cx - b.cx);
    const R = tiles.filter(o => o.cx >= W / 2).sort((a, b) => a.cx - b.cx);
    // lines fall almost straight, drifting a little toward the centre, and land on the dashboard's top edge
    L.concat(R).forEach(o => { o.ex = clamp(o.cx + (W / 2 - o.cx) * .07, left + 24, right - 24); });

    L.concat(R).forEach((o, i) => {
      const k = (top - o.cy) * .55;
      const d = `M${o.cx} ${o.cy}C${o.cx} ${o.cy + k} ${o.ex} ${top - k} ${o.ex} ${top}`;
      // masked reveal: the dashed path is only visible where the mask stroke has been drawn
      const mask = el('mask', { id: 'hl-m' + i, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
      const reveal = el('path', { d, stroke: '#fff', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, mask);
      const len = reveal.getTotalLength();
      reveal.setAttribute('stroke-dasharray', len); reveal.setAttribute('stroke-dashoffset', len);
      const base = el('path', { d, class: 'base', mask: `url(#hl-m${i})` });
      const trail = el('path', { d, class: 'trail', 'stroke-dasharray': `${TRAIL} ${len * 2}` });
      const ring = el('ellipse', { class: 'ring', cx: o.ex, cy: top, rx: 3, ry: 1.2 });
      const head = el('circle', { class: 'head', r: 3 });
      lines.push({ i, len, reveal, base, trail, ring, head, ex: o.ex, top, start: o.delay + .55 });
    });
    built = true;
    if (keepClock !== true) t0 = performance.now();
    if (reduced) { lines.forEach(l => l.reveal.setAttribute('stroke-dashoffset', 0)); return; }
    schedule();
  }

  function frame(now) {
    raf = 0;
    if (!visible || !built) return;
    const t = (now - t0) / 1000;
    lines.forEach(l => {
      const p = clamp((t - l.start) / DRAW, 0, 1);
      l.reveal.setAttribute('stroke-dashoffset', l.len * (1 - inOut(p)));
      // dashes travel with the page: scrolling down pushes them toward the dashboard, scrolling up pulls them back
      l.base.setAttribute('stroke-dashoffset', -(t * 8 + scrollY * .55));
      const phase = t - (l.start + DRAW + .3 + l.i * .55);
      const k = phase < 0 ? -1 : phase % CYCLE;
      if (k >= 0 && k < TRAVEL) {
        const pos = sine(k / TRAVEL) * l.len;
        const pt = l.base.getPointAtLength(pos);
        const fade = Math.min(1, k / .25, (TRAVEL - k) / .35);
        l.trail.setAttribute('stroke-dashoffset', TRAIL - pos);
        l.trail.style.opacity = (.8 * fade).toFixed(3);
        l.head.setAttribute('cx', pt.x); l.head.setAttribute('cy', pt.y);
        l.head.style.opacity = fade.toFixed(3);
        l.ring.style.opacity = 0;
      } else {
        l.trail.style.opacity = 0; l.head.style.opacity = 0;
        const q = k >= TRAVEL ? (k - TRAVEL) / .9 : 2; // arrival ping
        if (q >= 0 && q <= 1) {
          l.ring.setAttribute('rx', 3 + q * 20); l.ring.setAttribute('ry', 1.2 + q * 7);
          l.ring.style.opacity = (.55 * (1 - q)).toFixed(3);
        } else l.ring.style.opacity = 0;
      }
    });
    schedule();
  }
  function schedule() { if (!raf && visible && !reduced) raf = requestAnimationFrame(frame); }

  // Tie the line clock to the tiles' real entrance (CSS animation start), so they never run ahead of the tiles.
  let synced = false;
  hero.addEventListener('animationstart', e => {
    if (synced || e.animationName !== 'tilein' || !e.target.classList.contains('tile')) return;
    synced = true;
    const inDelay = parseFloat(getComputedStyle(e.target).getPropertyValue('--in')) || 0;
    t0 = performance.now() - inDelay * 1000;
  });
  build();
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => build(true), 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => build(true));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) schedule(); }, { threshold: 0 }).observe(hero);
  }
})();

/* ---------- "Also included" circuit section ----------
   Traces are authored in the reference's 1800-unit design space and scaled by the SVG viewBox.
   Each trace draws on when its block enters view, a lit pulse then runs along it (pure CSS),
   glowing nodes breathe as the pulse arrives, and sparks drift off the node positions. */
(() => {
  const sec = $('#also');
  if (!sec) return;
  const NS = 'http://www.w3.org/2000/svg';
  const mir = pts => pts.map(([x, y]) => [1800 - x, y]);
  const stepL = (y0, endY, lead) => [[lead, y0], [90, y0], [90, y0 + 92], [230, y0 + 92], [230, y0 + 185], [90, y0 + 185], [90, endY], [148, endY]];
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const CFG = {
    a: { h: 1080,
      paths: [stepL(127, 497, 461), mir(stepL(127, 497, 461)), { pts: [[923, 265], [923, 1080]], spine: true, dl: 1.2 }],
      nodes: [[125, 497], [1675, 497], [923, 480]],
      emit: [[125, 497, -1], [1675, 497, 1], [923, 480, 0], [90, 300, -1], [1710, 300, 1]] },
    b: { h: 520,
      paths: [[[90, 0], [90, 170], [230, 170], [230, 290], [90, 290], [90, 470], [150, 470]], mir([[90, 0], [90, 170], [230, 170], [230, 290], [90, 290], [90, 470], [150, 470]]),
        { pts: rect(273, 60, 1525, 434), dl: .6 }, { pts: [[923, 0], [923, 60]], spine: true }, { pts: [[923, 434], [923, 520]], spine: true }],
      nodes: [[923, 60], [923, 434], [700, 434], [1146, 434], [125, 470], [1675, 470]],
      emit: [[923, 434, 0], [700, 434, 0], [1146, 434, 0], [125, 470, -1], [1675, 470, 1]] },
    d: { h: 760,
      paths: [[[90, 0], [90, 120], [230, 120], [230, 260], [90, 260], [90, 640], [150, 640]], mir([[90, 0], [90, 120], [230, 120], [230, 260], [90, 260], [90, 640], [150, 640]]),
        { pts: [[923, 0], [923, 760]], spine: true, dl: .4 }],
      nodes: [[125, 640], [1675, 640], [923, 330], [923, 640]],
      emit: [[125, 640, -1], [1675, 640, 1], [923, 330, 0], [923, 640, 0]] },
    c: { h: 800,
      paths: [[[90, 0], [90, 160], [230, 160], [230, 300], [90, 300], [90, 620], [150, 620]], mir([[90, 0], [90, 160], [230, 160], [230, 300], [90, 300], [90, 620], [150, 620]]),
        { pts: rect(230, 70, 1570, 708), dl: .6 }, { pts: [[923, 0], [923, 70]], spine: true }],
      nodes: [[923, 70], [230, 250], [1570, 250], [700, 708], [1146, 708], [125, 620], [1675, 620]],
      emit: [[923, 708, 0], [230, 250, -1], [1570, 250, 1], [125, 620, -1], [1675, 620, 1]] }
  };
  const svgEl = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const d = pts => 'M' + pts.map(p => p.join(' ')).join('L');
  const rnd = (a, b) => a + Math.random() * (b - a);

  $$('.cir', sec).forEach((host, bi) => {
    const c = CFG[host.dataset.circuit]; if (!c) return;
    host._items = [];
    const svg = svgEl('svg', { viewBox: `0 0 1800 ${c.h}`, preserveAspectRatio: 'xMidYMin meet' }, host);
    if (bi === 0) {
      const defs = svgEl('defs', {}, svg);
      const g = svgEl('radialGradient', { id: 'alGlow' }, defs);
      svgEl('stop', { offset: '0', 'stop-color': '#FAE526', 'stop-opacity': '.85' }, g);
      svgEl('stop', { offset: '1', 'stop-color': '#FAE526', 'stop-opacity': '0' }, g);
    }
    c.paths.forEach((p, i) => {
      const o = Array.isArray(p) ? { pts: p } : p;
      const dl = (o.dl || 0) + (i * .35) + 's';
      const base = svgEl('path', { class: 'tr' + (o.spine ? ' tr--spine' : ''), d: d(o.pts), pathLength: 1 }, svg);
      base.style.setProperty('--dl', dl);
      const pl = svgEl('path', { class: 'pl', d: d(o.pts), pathLength: 100 }, svg);
      pl.style.setProperty('--dl', (1.6 + i * .9) + 's');
      let len = 0; for (let j = 1; j < o.pts.length; j++) len += Math.abs(o.pts[j][0] - o.pts[j - 1][0]) + Math.abs(o.pts[j][1] - o.pts[j - 1][1]);
      host._items.push({ base, i, spine: !!o.spine, y0: o.pts[0][1], len });
    });
    c.nodes.forEach((n, i) => {
      const halo = svgEl('circle', { class: 'halo', cx: n[0], cy: n[1], r: 26 }, svg);
      halo.style.setProperty('--dl', (1.6 + (i % 4) * .9 + 3.6) + 's');
      svgEl('circle', { class: 'core', cx: n[0], cy: n[1], r: 5.5 }, svg);
    });
    if (!reduced) c.emit.forEach(([x, y, dir]) => {
      for (let i = 0; i < 9; i++) {
        const s = document.createElement('i'); s.className = 'sp';
        const spread = rnd(10, 70);
        s.style.cssText = `left:${(x + rnd(-30, 30)) / 18}%;top:${(y + rnd(-14, 40)) / c.h * 100}%;` +
          `--s:${rnd(1.4, 3).toFixed(1)}px;--dx:${(dir * rnd(5, spread) + rnd(-14, 14)).toFixed(0)}px;--dy:${rnd(10, 46).toFixed(0)}px;` +
          `--t:${rnd(2.6, 5).toFixed(1)}s;--d:${rnd(0, 5).toFixed(1)}s`;
        host.appendChild(s);
      }
    });
  });

  // Scroll-linked: traces draw as their block scrolls in and retract when you scroll back up.
  // Spines follow the viewport so the lit part of the line tracks where you are reading.
  const hosts = $$('.cir', sec);
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let live = false, ticking = 0;
  const paint = () => {
    ticking = 0;
    const vh = innerHeight;
    hosts.forEach(host => {
      const r = host.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      const k = r.width / 1800;
      const pb = reduced ? 1 : Math.min(1, Math.max(0, (vh * .9 - r.top) / (r.height * .65)));
      host._items.forEach(it => {
        let p;
        if (reduced) p = 1;
        else if (it.spine) p = Math.min(1, Math.max(0, (vh * .62 - (r.top + it.y0 * k)) / (it.len * k)));
        else p = Math.min(1, Math.max(0, pb * 1.5 - it.i * .18));
        it.base.style.strokeDashoffset = (1 - ease(p)).toFixed(4);
      });
      host.classList.toggle('on', pb > .72);
    });
  };
  const req = () => { if (!ticking && live) ticking = requestAnimationFrame(paint); };
  if ('IntersectionObserver' in window && !reduced) {
    new IntersectionObserver(es => es.forEach(e => { live = e.isIntersecting; sec.classList.toggle('is-live', live); if (live) req(); }), { rootMargin: '300px 0px' }).observe(sec);
  } else { live = true; sec.classList.add('is-live'); }
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
  live = true; paint(); live = reduced;

  /* statement: words light up with scroll progress (phrase first, then the rest) */
  const bq = $('[data-quote]', sec);
  if (bq) {
    const words = [];
    const wrap = node => Array.from(node.childNodes).forEach(ch => {
      if (ch.nodeType === 3) {
        const f = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { f.appendChild(document.createTextNode(t)); return; }
          const s = document.createElement('span'); s.className = 'qw'; s.textContent = t; words.push(s); f.appendChild(s);
        });
        ch.replaceWith(f);
      } else if (ch.nodeType === 1) wrap(ch);
    });
    wrap(bq);
    let tick = 0;
    const update = () => {
      tick = 0;
      const r = bq.getBoundingClientRect(), vh = innerHeight;
      const p = reduced ? 1 : Math.min(1, Math.max(0, (vh * .88 - r.top) / (vh * .5)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    const req = () => { if (!tick) tick = requestAnimationFrame(update); };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req);
    update();
  }
})();
})();
