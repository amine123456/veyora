import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { HomeIcons } from '@/components/home/icons';
import { HomeHeader } from '@/components/home/header';

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
  },
  twitter: {
    card: 'summary',
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
      brand: {
        '@type': 'Organization',
        name: 'Veyora',
        url: 'https://veyora.pro',
      },
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
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What are managed data feeds?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Managed data feeds are pre-built datasets from hard-to-scrape websites. Veyora crawls these sites daily with custom infrastructure and delivers clean, structured data (JSON/CSV) to your SFTP endpoint. No scraping setup needed.',
          },
        },
        {
          '@type': 'Question',
          name: 'What data categories are available?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Veyora offers data feeds across cars (mobile.de, LaCentrale, car.gr, Milanuncios, and more), real estate (QuintoAndar), jobs (Keejob, EmploiTunisie, TanitJobs), and software reviews (Capterra). New feeds are added regularly.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is the data delivered?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Data is delivered daily via SFTP as structured JSON or CSV files. Each delivery includes a full snapshot of the dataset. Webhook notifications are also available.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much do data feeds cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Data feed subscriptions start from €100/month depending on the site, data volume, and delivery frequency. Each feed is priced individually. Payment is via Stripe (card) in EUR.',
          },
        },
      ],
    },
  ],
};

export default function DataFeedsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeIcons />
      <HomeHeader />
      <main id="main" className="feeds-page">
        <section className="feeds-hero">
          <div className="container">
            <p className="eyebrow">Managed Data Feeds</p>
            <h1>Structured data from<br />hard-to-scrape sites</h1>
            <p className="feeds-hero__sub">
              Some sites block every proxy and unlocker. We crawl them daily with custom
              infrastructure and deliver clean, structured data to your endpoint.
            </p>
          </div>
        </section>

        <section className="feeds-catalog" id="catalog">
          <div className="container">
            <div className="feeds-tabs" role="tablist" aria-label="Filter by vertical" data-feeds-tabs="">
              <button type="button" role="tab" aria-selected="true" data-vertical="all">All</button>
              <button type="button" role="tab" aria-selected="false" data-vertical="cars">Cars</button>
              <button type="button" role="tab" aria-selected="false" data-vertical="real_estate">Real Estate</button>
              <button type="button" role="tab" aria-selected="false" data-vertical="jobs">Jobs</button>
              <button type="button" role="tab" aria-selected="false" data-vertical="reviews">Reviews</button>
              <button type="button" role="tab" aria-selected="false" data-vertical="analytics">Analytics</button>
            </div>
            <div className="feeds-grid" data-feeds-grid="" aria-busy="true">
              <div className="feeds-loading">Loading feeds...</div>
            </div>
          </div>
        </section>

        <section className="feeds-custom" id="custom">
          <div className="container">
            <h2>Need a site that is not listed?</h2>
            <p>
              We build custom crawlers for any public website. Tell us what data you need
              and we will set up a dedicated pipeline with the delivery schedule and format
              you require.
            </p>
            <a className="btn btn--primary btn--lg" href="/support">
              Contact us for a custom SLA
            </a>
          </div>
        </section>

        <section className="feeds-how" id="how">
          <div className="container">
            <h2>How it works</h2>
            <ol className="feeds-steps">
              <li>
                <span className="feeds-step__num">1</span>
                <div>
                  <h3>Browse the catalog</h3>
                  <p>Pick the sites you need. Filter by vertical, country or data volume.</p>
                </div>
              </li>
              <li>
                <span className="feeds-step__num">2</span>
                <div>
                  <h3>Subscribe and configure</h3>
                  <p>Choose your delivery frequency and provide your SFTP or webhook endpoint.</p>
                </div>
              </li>
              <li>
                <span className="feeds-step__num">3</span>
                <div>
                  <h3>Receive data automatically</h3>
                  <p>Fresh structured data lands in your endpoint on schedule. Track every delivery in your dashboard.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <footer className="foot">
          <div className="container">
            <a href="/support">Support</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/acceptable-use">Acceptable use</a>
            <a href="/refund-policy">Refund policy</a>
          </div>
        </footer>
      </main>
      <LegacyScripts sources={['/feeds.js']} />
    </>
  );
}
