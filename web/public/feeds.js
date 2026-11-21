(function () {
  'use strict';

  var COUNTRY_FLAGS = {
    FR: '\u{1F1EB}\u{1F1F7}', DE: '\u{1F1E9}\u{1F1EA}', FI: '\u{1F1EB}\u{1F1EE}',
    IE: '\u{1F1EE}\u{1F1EA}', ES: '\u{1F1EA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}',
    BE: '\u{1F1E7}\u{1F1EA}', TN: '\u{1F1F9}\u{1F1F3}', BR: '\u{1F1E7}\u{1F1F7}',
    HU: '\u{1F1ED}\u{1F1FA}', RO: '\u{1F1F7}\u{1F1F4}', PT: '\u{1F1F5}\u{1F1F9}',
    GR: '\u{1F1EC}\u{1F1F7}',
    TR: '\u{1F1F9}\u{1F1F7}',
    MULTI: '\u{1F310}'
  };

  var VERTICAL_LABELS = {
    cars: 'Cars', real_estate: 'Real Estate', jobs: 'Jobs', reviews: 'Reviews', analytics: 'Analytics'
  };

  function formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return String(n);
  }

  function formatPrice(cents) {
    return '\u20ac' + (cents / 100).toFixed(0);
  }

  function formatSize(mb) {
    if (mb >= 1000) return (mb / 1000).toFixed(1) + ' GB';
    return mb.toFixed(0) + ' MB';
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  // ---- Syntax highlighting for JSON ----

  function highlightJson(obj) {
    var raw = esc(JSON.stringify(obj, null, 2));
    return raw.replace(
      /("(?:\\.|[^"\\])*")\s*:/g,
      '<span class="json-key">$1</span>:'
    ).replace(
      /:\s*("(?:\\.|[^"\\])*")/g,
      function (m, str) { return ': <span class="json-str">' + str + '</span>'; }
    ).replace(
      /:\s*(\d+(?:\.\d+)?)\b/g,
      ': <span class="json-num">$1</span>'
    ).replace(
      /:\s*(true|false|null)\b/g,
      ': <span class="json-bool">$1</span>'
    );
  }

  // ---- Feed card ----

  function renderCard(feed) {
    var coming = feed.status === 'coming_soon';
    var flag = COUNTRY_FLAGS[feed.country] || '\u{1F310}';
    var fields = (feed.sample_fields || []).join(', ');

    var html = '<div class="feed-card' + (coming ? ' feed-card--coming' : '') + '" data-feed-vertical="' + feed.vertical + '">'
      + '<div class="feed-card__top">'
      + '<span class="feed-card__flag">' + flag + '</span>'
      + '<div class="feed-card__info">'
      + '<div class="feed-card__name">' + esc(feed.site_name) + '</div>'
      + '<div class="feed-card__domain">' + esc(feed.site_domain) + '</div>'
      + '</div></div>'
      + '<div class="feed-card__meta">'
      + (coming
        ? '<span class="feed-chip feed-chip--coming">Coming Soon</span>'
        : '<span class="feed-chip feed-chip--active">Active</span>')
      + '<span class="feed-chip">' + esc(feed.frequency) + '</span>'
      + '<span class="feed-chip feed-chip--vol">' + formatCount(feed.record_count) + ' records</span>'
      + '<span class="feed-chip">' + esc(VERTICAL_LABELS[feed.vertical] || feed.vertical) + '</span>'
      + '</div>'
      + '<p class="feed-card__desc">' + esc(feed.description) + '</p>'
      + (fields ? '<p class="feed-card__fields">' + esc(fields) + '</p>' : '')
      + '<div class="feed-card__foot">'
      + '<span class="feed-card__price">' + formatPrice(feed.base_price_cents)
      + '<small> /month</small></span>'
      + '<div class="feed-card__actions">'
      + (coming
        ? '<span class="btn btn--ghost btn--sm" style="pointer-events:none;opacity:.5">Coming Soon</span>'
        : '<button class="btn btn--ghost btn--sm" data-preview-feed="' + esc(feed.feed_id) + '">Preview Data</button>'
          + '<button class="btn btn--primary btn--sm" data-subscribe-feed="' + esc(feed.feed_id) + '">Subscribe</button>')
      + '</div></div></div>';
    return html;
  }

  // ---- Preview modal ----

  var modal = null;
  var sampleCache = {};
  var currentIdx = 0;
  var currentData = null;

  function createModal() {
    if (modal) return;
    var overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = '<div class="preview-modal">'
      + '<div class="preview-modal__head">'
      + '<div class="preview-modal__title"></div>'
      + '<button class="preview-modal__close" aria-label="Close">&times;</button>'
      + '</div>'
      + '<div class="preview-modal__stats"></div>'
      + '<div class="preview-modal__nav">'
      + '<div class="preview-nav__label">Raw JSONL record</div>'
      + '<div class="preview-nav__controls">'
      + '<button class="preview-nav__btn" data-nav="prev" disabled>&larr;</button>'
      + '<span class="preview-nav__pos">1 / 5</span>'
      + '<button class="preview-nav__btn" data-nav="next">&rarr;</button>'
      + '</div>'
      + '<div class="preview-nav__hint">This is exactly what you receive — raw, unmodified JSONL</div>'
      + '</div>'
      + '<div class="preview-modal__body"></div>'
      + '<div class="preview-modal__foot">'
      + '<span class="preview-foot__format">Delivered as .jsonl (one JSON object per line)</span>'
      + '<button class="btn btn--primary" data-modal-subscribe="">Subscribe to this feed</button>'
      + '</div></div>';
    document.body.appendChild(overlay);
    modal = overlay;

    overlay.querySelector('.preview-modal__close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (!modal || !modal.classList.contains('preview-overlay--open')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    overlay.querySelector('[data-nav="prev"]').addEventListener('click', function () { navigate(-1); });
    overlay.querySelector('[data-nav="next"]').addEventListener('click', function () { navigate(1); });

    overlay.querySelector('[data-modal-subscribe]').addEventListener('click', function () {
      if (!currentData) return;
      var feedId = currentData.feed_id;
      var btn = overlay.querySelector('[data-modal-subscribe]');
      btn.disabled = true;
      btn.textContent = 'Processing...';
      fetch('/api/subscriptions', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId: feedId, frequency: 'daily', deliveryMethod: 'sftp' }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok) {
            if (res.data.error === 'Not signed in') { location.assign('/login'); return; }
            throw new Error(res.data.error || 'Subscribe failed');
          }
          if (res.data.checkoutUrl) {
            location.assign(res.data.checkoutUrl);
          } else {
            location.assign('/account?feed_sub=1#data-feeds');
          }
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = 'Subscribe to this feed';
          alert(err.message);
        });
    });
  }

  function navigate(dir) {
    if (!currentData) return;
    var n = currentData.records.length;
    var next = currentIdx + dir;
    if (next < 0 || next >= n) return;
    currentIdx = next;
    renderRecord();
  }

  function openPreview(feedId) {
    createModal();
    currentIdx = 0;
    currentData = null;
    var body = modal.querySelector('.preview-modal__body');
    var stats = modal.querySelector('.preview-modal__stats');
    var title = modal.querySelector('.preview-modal__title');
    title.textContent = 'Loading...';
    stats.innerHTML = '';
    body.innerHTML = '<div class="preview-loading"><div class="preview-spinner"></div>Loading raw data…</div>';
    modal.classList.add('preview-overlay--open');
    document.body.style.overflow = 'hidden';

    if (sampleCache[feedId]) {
      currentData = sampleCache[feedId];
      renderFull();
      return;
    }

    fetch('/api/feeds/' + feedId + '/sample')
      .then(function (r) {
        if (!r.ok) throw new Error('Sample not available for this feed yet');
        return r.json();
      })
      .then(function (data) {
        sampleCache[feedId] = data;
        currentData = data;
        renderFull();
      })
      .catch(function (err) {
        body.innerHTML = '<div class="preview-loading">' + esc(err.message) + '</div>';
      });
  }

  function renderFull() {
    var data = currentData;
    var title = modal.querySelector('.preview-modal__title');
    var stats = modal.querySelector('.preview-modal__stats');

    title.innerHTML = '<span class="preview-title__feed">' + esc(data.feed_id) + '</span>';

    var deepFields = data.deep_field_count || data.field_count;

    stats.innerHTML = '<div class="preview-stats">'
      + '<div class="preview-stat"><span class="preview-stat__val">' + formatCount(data.total_records) + '</span><span class="preview-stat__label">Total Records</span></div>'
      + '<div class="preview-stat"><span class="preview-stat__val">' + data.field_count + '</span><span class="preview-stat__label">Top-level Fields</span></div>'
      + (deepFields > data.field_count
        ? '<div class="preview-stat"><span class="preview-stat__val">' + deepFields + '</span><span class="preview-stat__label">Total Fields (nested)</span></div>'
        : '')
      + '<div class="preview-stat"><span class="preview-stat__val">' + formatSize(data.file_size_mb) + '</span><span class="preview-stat__label">Daily Snapshot Size</span></div>'
      + '</div>';

    renderRecord();
  }

  function renderRecord() {
    var data = currentData;
    var body = modal.querySelector('.preview-modal__body');
    var pos = modal.querySelector('.preview-nav__pos');
    var prevBtn = modal.querySelector('[data-nav="prev"]');
    var nextBtn = modal.querySelector('[data-nav="next"]');
    var records = data.records;
    var rec = records[currentIdx];

    pos.textContent = (currentIdx + 1) + ' / ' + records.length;
    prevBtn.disabled = currentIdx === 0;
    nextBtn.disabled = currentIdx === records.length - 1;

    body.innerHTML = '<div class="preview-json-wrap"><pre class="preview-json">'
      + highlightJson(rec)
      + '</pre></div>';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('preview-overlay--open');
    document.body.style.overflow = '';
    currentData = null;
  }

  // ---- Init ----

  function init() {
    var grid = document.querySelector('[data-feeds-grid]');
    var tabs = document.querySelectorAll('[data-feeds-tabs] button');
    if (!grid) return;

    fetch('/api/feeds')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var feeds = data.feeds || [];
        if (!feeds.length) {
          grid.innerHTML = '<div class="feeds-loading">No feeds available yet.</div>';
          return;
        }
        grid.setAttribute('aria-busy', 'false');
        grid.innerHTML = feeds.map(renderCard).join('');

        for (var i = 0; i < tabs.length; i++) {
          tabs[i].addEventListener('click', function () {
            var v = this.getAttribute('data-vertical');
            for (var j = 0; j < tabs.length; j++) tabs[j].setAttribute('aria-selected', 'false');
            this.setAttribute('aria-selected', 'true');
            var cards = grid.querySelectorAll('.feed-card');
            for (var k = 0; k < cards.length; k++) {
              var show = v === 'all' || cards[k].getAttribute('data-feed-vertical') === v;
              cards[k].style.display = show ? '' : 'none';
            }
          });
        }

        grid.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-preview-feed]');
          if (btn) {
            e.preventDefault();
            openPreview(btn.getAttribute('data-preview-feed'));
            return;
          }
          var subBtn = e.target.closest('[data-subscribe-feed]');
          if (subBtn) {
            e.preventDefault();
            var feedId = subBtn.getAttribute('data-subscribe-feed');
            subBtn.disabled = true;
            subBtn.textContent = 'Processing...';
            fetch('/api/subscriptions', {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedId: feedId, frequency: 'daily', deliveryMethod: 'sftp' }),
            })
              .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
              .then(function (res) {
                if (!res.ok) {
                  if (res.data.error === 'Not signed in') { location.assign('/login'); return; }
                  throw new Error(res.data.error || 'Subscribe failed');
                }
                if (res.data.checkoutUrl) {
                  location.assign(res.data.checkoutUrl);
                } else {
                  location.assign('/account?feed_sub=1#data-feeds');
                }
              })
              .catch(function (err) {
                subBtn.disabled = false;
                subBtn.textContent = 'Subscribe';
                alert(err.message);
              });
          }
        });
      })
      .catch(function () {
        grid.setAttribute('aria-busy', 'false');
        if (!grid.querySelector('.feed-card')) grid.innerHTML = '<div class="feeds-loading">Could not load feeds. Please try again later.</div>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
