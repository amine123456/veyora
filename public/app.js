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
    const tiles = $$('.tile', hero).filter(t => t.offsetParent).map(t => ({
      t, cx: t.offsetLeft + t.offsetWidth / 2, cy: t.offsetTop + t.offsetHeight / 2,
      delay: parseFloat(getComputedStyle(t).getPropertyValue('--in')) || 0
    }));
    const L = tiles.filter(o => o.cx < W / 2).sort((a, b) => a.cx - b.cx);
    const R = tiles.filter(o => o.cx >= W / 2).sort((a, b) => a.cx - b.cx);
    const step = Math.min(52, wrap.offsetWidth / 18);
    L.forEach((o, i) => { o.ex = left + step * (i + 1); });
    R.forEach((o, i) => { o.ex = right - step * (R.length - i); });

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
})();
