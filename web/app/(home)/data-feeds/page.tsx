import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { HomeIcons } from '@/components/home/icons';
import { HomeHeader } from '@/components/home/header';
import { HomeCta } from '@/components/home/cta';
import { LIVE_FEEDS } from '@/components/feeds/live-feeds';

const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Germany', FR: 'France', IE: 'Ireland', FI: 'Finland', HU: 'Hungary', RO: 'Romania',
  ES: 'Spain', GB: 'United Kingdom', BE: 'Belgium', TN: 'Tunisia', BR: 'Brazil',
  GR: 'Greece', PT: 'Portugal', TR: 'Turkey', MULTI: 'Global',
};
const VERTICAL_NAMES: Record<string, string> = {
  cars: 'Cars', real_estate: 'Real Estate', jobs: 'Jobs', reviews: 'Reviews', analytics: 'Analytics',
};
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

const FEEDS_FAQ = [
  {
    q: 'What are managed data feeds?',
    a: 'Managed data feeds are pre-built datasets from hard-to-scrape websites. Veyora crawls these sites daily with custom infrastructure and delivers clean, structured data (JSON/CSV) to your SFTP endpoint. No scraping setup needed.',
  },
  {
    q: 'What data categories are available?',
    a: 'Veyora offers data feeds across cars (mobile.de, LaCentrale, car.gr, Milanuncios, and more), real estate (QuintoAndar), jobs (Keejob, EmploiTunisie, TanitJobs), and software reviews (Capterra). New feeds are added regularly.',
  },
  {
    q: 'How is the data delivered?',
    a: 'Data is delivered daily via SFTP as structured JSON or CSV files. Each delivery includes a full snapshot of the dataset. Webhook notifications are also available.',
  },
  {
    q: 'How much do data feeds cost?',
    a: 'Data feed subscriptions start from €100/month depending on the site, data volume, and delivery frequency. Each feed is priced individually. Payment is via Stripe (card) in EUR.',
  },
];

export const metadata: Metadata = {
  title: 'Managed Data Feeds — Veyora | Cars, Real Estate, Jobs',
  description:
    'Managed data feeds from hard-to-scrape sites. Cars, real estate, jobs, reviews — structured data delivered daily to your SFTP.',
  alternates: { canonical: 'https://veyora.pro/data-feeds' },
  openGraph: {
    title: 'Managed Data Feeds — Veyora',
    description: 'Structured data from hard-to-scrape sites. Cars, real estate, jobs, reviews — delivered daily via SFTP.',
    url: 'https://veyora.pro/data-feeds',
    siteName: 'Veyora',
    type: 'website',
    images: [{ url: 'https://veyora.pro/og-data-feeds.png', width: 1200, height: 630, alt: 'Veyora managed data feeds' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://veyora.pro/og-data-feeds.png'],
    title: 'Managed Data Feeds — Veyora',
    description: 'Structured data from hard-to-scrape sites delivered daily via SFTP.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      name: 'Veyora Managed Data Feeds',
      description:
        'Ready-to-use structured data from hard-to-scrape sites. Cars, real estate, jobs, software reviews — delivered daily via SFTP. Subscribe to the feeds you need and get fresh, clean datasets without building scrapers.',
      url: 'https://veyora.pro/data-feeds',
      image: 'https://veyora.pro/og-data-feeds.png',
      brand: { '@type': 'Organization', name: 'Veyora', url: 'https://veyora.pro' },
      category: 'Data Services',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'EUR',
        lowPrice: '100',
        highPrice: '499',
        offerCount: '26',
        url: 'https://veyora.pro/data-feeds',
        description: 'Monthly subscriptions for managed data feeds — cars, real estate, jobs, reviews',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://veyora.pro/' },
        { '@type': 'ListItem', position: 2, name: 'Data Feeds', item: 'https://veyora.pro/data-feeds' },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'Live data feeds',
      itemListElement: LIVE_FEEDS.map((feed, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${feed.site_name} data feed`,
        description: feed.description,
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: FEEDS_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'cars', label: 'Cars' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'analytics', label: 'Analytics' },
] as const;

const CATEGORY_ICON: Record<string, string> = {
  cars: 'feed-cars', real_estate: 'feed-real-estate', jobs: 'feed-jobs', reviews: 'feed-reviews', analytics: 'feed-reviews',
};

// CLAUDE-PROMPT.md §6: data-feeds catalog page (screens 06 → 05, ink nav variant).
// All feed data stays live-bound (LIVE_FEEDS); the filter-tabs behaviour (public/feeds.js,
// data-feeds-tabs/data-vertical/data-feeds-grid/data-feed-vertical) is unchanged.
export default function DataFeedsPage() {
  const flagship = LIVE_FEEDS.slice(0, 3);
  const rest = LIVE_FEEDS.slice(3);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeIcons />
      <HomeHeader variant="ink" active="feeds" />
      <main id="main" className="feeds-page vy-type-display">
        <section className="hero-band" aria-labelledby="feeds-title">
          <img className="hero-svg" src="/design/05-backgrounds/sections/feeds-hero-ink-horizon-1440x430.svg" alt="" aria-hidden="true" />
          <div className="wrap">
            <div className="hero-spec mono">
              <span className="l">
                <i />
                Catalog / 01
              </span>
              <span className="r">Veyora · Infrastructure</span>
            </div>
            <div className="hero-center">
              <span className="vy-label-chip vy-label-chip--dark">
                <span className="vy-label-chip__sq">
                  <i />
                </span>
                <span className="vy-label-chip__txt">Managed data feeds</span>
              </span>
              <h1 id="feeds-title">Structured data from hard-to-scrape sites</h1>
              <p className="sub">
                Some sites block every proxy and unlocker. We crawl them daily with custom infrastructure and deliver clean,
                structured data to your endpoint.
              </p>
            </div>
          </div>
        </section>

        <section className="catalog-stage" id="catalog">
          <img className="stage-bg" src="/design/05-backgrounds/sections/feeds-catalog-lilac-stage-1440x1927.svg" alt="" aria-hidden="true" />
          <div className="wrap">
            <div className="stage-spec mono">
              <span>
                <i />
                Spec sheet · Managed feeds
              </span>
              <span>Daily · Weekly · Monthly snapshots</span>
            </div>
            <div className="catalog-sheet">
              <div className="filter-bar">
                <div className="tabs" role="tablist" aria-label="Filter by vertical" data-feeds-tabs="">
                  {TABS.map((t, i) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      className={`tab mono${i === 0 ? ' active' : ''}`}
                      aria-selected={i === 0 ? 'true' : 'false'}
                      data-vertical={t.key}
                    >
                      {t.label}
                      {i === 0 && ' ↗'}
                    </button>
                  ))}
                </div>
                <div className="filter-meta mono">
                  <span>
                    <i className="sq-ind" />
                    Active feed
                  </span>
                  <span>
                    <i className="sq-ind lil" />
                    Multi-vertical
                  </span>
                  <span>JSON / CSV</span>
                </div>
              </div>

              {/* One data-feeds-grid container for both the flagship tiles and the spec
                  table: public/feeds.js replaces its whole innerHTML on a successful
                  /api/feeds fetch, and its tab filter toggles any .feed-card inside it
                  by data-feed-vertical — both groups carry that class so filtering works
                  on this SSR/no-JS content too, and nothing goes stale if JS replaces it. */}
              <div data-feeds-grid="" aria-busy="true">
              <div className="feat-grid">
                {flagship.map((feed, i) => (
                  <article className={`ftile feed-card ${i === 0 ? 'yel' : i === 1 ? 'dark' : 'white'}`} data-feed-vertical={feed.vertical} key={feed.feed_id}>
                    <div className="ftile-top mono">
                      <span className="ftile-idx">
                        {String(i + 1).padStart(2, '0')} / {VERTICAL_NAMES[feed.vertical] ?? feed.vertical} · {COUNTRY_NAMES[feed.country] ?? feed.country} ↗
                      </span>
                    </div>
                    <div className="ftile-body">
                      <div className="ftile-head">
                        <div>
                          <h2 className="ftile-name">{feed.site_name} data feed</h2>
                          <div className="ftile-dom mono">{feed.site_domain}</div>
                        </div>
                        <span className="ftile-icon">
                          <img src={`/design/04-illustrations/icons/feed-category/${CATEGORY_ICON[feed.vertical] ?? 'feed-cars'}.svg`} alt="" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="ftile-stat">
                        <span className="ftile-num">{compact.format(feed.record_count)}</span>
                        <span className="ftile-unit mono">Records</span>
                      </div>
                      <div className="ftile-chips">
                        <span className="mchip">
                          <i className="dot" />
                          Active
                        </span>
                        <span className="mchip">{feed.frequency}</span>
                        <span className="mchip">{VERTICAL_NAMES[feed.vertical] ?? feed.vertical}</span>
                        <span className="mchip">{COUNTRY_NAMES[feed.country] ?? feed.country}</span>
                      </div>
                      <p className="ftile-desc">{feed.description}</p>
                    </div>
                    {feed.sample_fields.length > 0 && (
                      <p className="ftile-fields mono">
                        <b>Fields:</b> {feed.sample_fields.join(', ')}
                      </p>
                    )}
                  </article>
                ))}
              </div>

              <div className="spec-head mono">
                <div>#</div>
                <div>Feed / Domain</div>
                <div>Records</div>
                <div>Status · Meta</div>
                <div>Description &amp; schema fields</div>
              </div>
              {rest.map((feed, i) => (
                <div className="spec-row feed-card" data-feed-vertical={feed.vertical} key={feed.feed_id}>
                  <div className="c-idx">
                    <span className="num mono">{String(i + 4).padStart(2, '0')}</span>
                  </div>
                  <div className="c-feed">
                    <img className="row-icon" src={`/design/04-illustrations/icons/feed-category/${CATEGORY_ICON[feed.vertical] ?? 'feed-cars'}.svg`} alt="" aria-hidden="true" />
                    <h2 className="fn">{feed.site_name} data feed</h2>
                    <div className="fd mono">{feed.site_domain}</div>
                  </div>
                  <div className="c-vol">
                    <span className="vn">{compact.format(feed.record_count)}</span>
                    <span className="vu mono">Records</span>
                  </div>
                  <div className="c-meta">
                    <div className="chip-line">
                      <span className="tchip act mono">
                        <i />
                        Active
                      </span>
                      <span className="tchip mono">{feed.frequency}</span>
                      <span className={`tchip mono${feed.vertical === 'real_estate' ? ' vert-re' : feed.vertical === 'reviews' ? ' vert-rev' : feed.vertical === 'analytics' ? ' vert-ana' : ''}`}>
                        {VERTICAL_NAMES[feed.vertical] ?? feed.vertical}
                      </span>
                      <span className="tchip mono">{COUNTRY_NAMES[feed.country] ?? feed.country}</span>
                    </div>
                  </div>
                  <div className="c-desc">
                    <p className="dd">{feed.description}</p>
                    {feed.sample_fields.length > 0 && (
                      <p className="df mono">
                        <b>Fields:</b> {feed.sample_fields.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>

        <section className="custom-band" id="custom">
          <img className="custom-bg" src="/design/05-backgrounds/sections/feeds-custom-sla-ink-brick-bars-1440x440.svg" alt="" aria-hidden="true" />
          <div className="wrap">
            <div className="custom-spec mono">
              <span>
                <i />
                Custom / 02
              </span>
              <span>Dedicated crawler infrastructure</span>
            </div>
            <div className="custom-grid">
              <div className="custom-left">
                <span className="vy-label-chip">
                  <span className="vy-label-chip__sq">
                    <i />
                  </span>
                  <span className="vy-label-chip__txt">Custom SLA · Any public website</span>
                </span>
                <h2>Need a site that is not listed?</h2>
                <p>
                  We build custom crawlers for any public website. Tell us what data you need and we will set up a dedicated
                  pipeline with the delivery schedule and format you require.
                </p>
                <div className="custom-cta">
                  <a className="vy-btn vy-btn--primary vy-btn--lg" href="/support">
                    Contact us for a custom SLA <span className="ar">↗</span>
                  </a>
                </div>
              </div>
              <div className="custom-right">
                <div className="cube-box">
                  <div className="cube-bar mono">
                    <span>
                      <i className="sq" />
                      Dedicated schedule &amp; format
                    </span>
                  </div>
                  <img src="/design/04-illustrations/radar/radar-rings-on-ink.svg" alt="" aria-hidden="true" style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="how-band" id="how">
          <img className="how-bg" src="/design/05-backgrounds/sections/feeds-how-it-works-bg-1440x470.svg" alt="" aria-hidden="true" />
          <div className="wrap">
            <div className="how-spec mono">
              <span>
                <i />
                Workflow / 03
              </span>
              <span>3 steps · Automated delivery</span>
            </div>
            <header className="how-head">
              <span className="vy-label-chip">
                <span className="vy-label-chip__sq">
                  <i />
                </span>
                <span className="vy-label-chip__txt">Pipeline workflow</span>
              </span>
              <h2>How it works</h2>
            </header>
            <div className="steps-grid">
              <article className="scard">
                <div className="scard-top">
                  <div className="scard-step mono">
                    <span className="snum s1">1</span>
                    <span>Step 01 / Select</span>
                  </div>
                </div>
                <div className="scard-body">
                  <h3>Browse the catalog</h3>
                  <p>Pick the sites you need. Filter by vertical, country or data volume.</p>
                </div>
                <div className="pcard-foot mono">
                  <span>Vertical · Country · Volume</span>
                  <span>→</span>
                </div>
              </article>
              <article className="scard">
                <div className="scard-top">
                  <div className="scard-step mono">
                    <span className="snum s2">2</span>
                    <span>Step 02 / Configure</span>
                  </div>
                </div>
                <div className="scard-body">
                  <h3>Subscribe and configure</h3>
                  <p>Choose your delivery frequency and provide your SFTP or webhook endpoint.</p>
                </div>
                <div className="pcard-foot mono">
                  <span>Frequency · SFTP · Webhook</span>
                  <span>→</span>
                </div>
              </article>
              <article className="scard">
                <div className="scard-top">
                  <div className="scard-step mono">
                    <span className="snum s3">3</span>
                    <span>Step 03 / Deliver</span>
                  </div>
                </div>
                <div className="scard-body">
                  <h3>Receive data automatically</h3>
                  <p>Fresh structured data lands in your endpoint on schedule. Track every delivery in your dashboard.</p>
                </div>
                <div className="pcard-foot mono">
                  <span>Scheduled snapshot · Dashboard</span>
                  <span>■</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="faq-sec vy-type-text" aria-labelledby="feeds-faq-title">
          <div className="vy-wrap">
            <header className="sec-head">
              <h2 id="feeds-faq-title">Data feed questions.</h2>
            </header>
            <div className="faq__list">
              {FEEDS_FAQ.map((item) => (
                <details className="faq__item" key={item.q}>
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

        <HomeCta />
      </main>
      <LegacyScripts sources={['/feeds.js']} />
    </>
  );
}
