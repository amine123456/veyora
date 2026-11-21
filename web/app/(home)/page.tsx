import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { HomeIcons } from '@/components/home/icons';
import { HomeHeader } from '@/components/home/header';
import { HomeTop } from '@/components/home/top';
import { HomeHow } from '@/components/home/how';
import { HomeUnlocker } from '@/components/home/unlocker';
import { HomeDataFeeds } from '@/components/home/data-feeds';
import { HomePricing } from '@/components/home/pricing';
import { HomeCta } from '@/components/home/cta';
import { HomePaths } from '@/components/home/paths';
import { HomeSample } from '@/components/home/sample';
import { HomeFaq, HOME_FAQ } from '@/components/home/faq';
import { ORGANIZATION, PROXIES_PRODUCT, UNLOCKER_PRODUCT, FEEDS_PRODUCT, shareImage } from '@/components/seo/schema';

const SHARE = shareImage('og-home.png', 'Veyora: get the web data, skip the scraping');

export const metadata: Metadata = {
  title: 'Data Feeds from Hard-to-Scrape Sites & Web Unlocker | Veyora',
  description:
    'Daily car-listing datasets from mobile.de, La Centrale and more, delivered to your pipeline. Plus a $0.20/1K Web Unlocker API and 5M residential IPs.',
  alternates: { canonical: 'https://veyora.pro/' },
  openGraph: {
    title: 'Veyora: get the web data, skip the scraping',
    description:
      'Subscribe to a data feed and receive structured datasets every morning, call one API to unlock any page, or run your own scrapers on 5 million residential IPs.',
    url: 'https://veyora.pro/',
    siteName: 'Veyora',
    type: 'website',
    images: SHARE.openGraph.images,
  },
  twitter: {
    ...SHARE.twitter,
    title: 'Veyora: get the web data, skip the scraping',
    description:
      'Structured data feeds from hard-to-scrape sites, a Web Unlocker API and residential proxies. Free samples before you pay.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    ORGANIZATION,
    {
      '@type': 'WebSite',
      '@id': 'https://veyora.pro/#website',
      url: 'https://veyora.pro',
      name: 'Veyora',
      publisher: { '@id': 'https://veyora.pro/#org' },
    },
    PROXIES_PRODUCT,
    UNLOCKER_PRODUCT,
    FEEDS_PRODUCT,
    {
      '@type': 'FAQPage',
      mainEntity: HOME_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

const HOME_SCRIPTS = ['/app.js', '/home.js'];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeIcons />
      <HomeHeader />
      <main id="main">
        <HomeTop />
        <HomePaths />
        <HomeSample />
        <HomeDataFeeds />
        <HomeHow />
        <HomeUnlocker />
        <HomePricing />
        <HomeFaq />
        <HomeCta />
      </main>
      <LegacyScripts sources={HOME_SCRIPTS} />
    </>
  );
}
