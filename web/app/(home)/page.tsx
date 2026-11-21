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

export const metadata: Metadata = {
  title: 'Data Feeds from Hard-to-Scrape Sites & Web Unlocker | Veyora',
  description:
    'Daily datasets from mobile.de, La Centrale and other sites that block scrapers, delivered to SFTP, S3 or Snowflake. Plus a $0.20/1K Web Unlocker API and 5M residential IPs.',
  alternates: { canonical: 'https://veyora.pro/' },
  openGraph: {
    title: 'Veyora: get the web data, skip the scraping',
    description:
      'Subscribe to a data feed and receive structured datasets every morning, call one API to unlock any page, or run your own scrapers on 5 million residential IPs.',
    url: 'https://veyora.pro/',
    siteName: 'Veyora',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Veyora: get the web data, skip the scraping',
    description:
      'Structured data feeds from hard-to-scrape sites, a Web Unlocker API and residential proxies. Free samples before you pay.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://veyora.pro/#org',
      name: 'Veyora',
      url: 'https://veyora.pro',
      logo: 'https://veyora.pro/favicon.svg',
      description:
        'Residential proxy provider with 5 million IPs in 195 countries, a Web Unlocker API, and a managed data feeds marketplace for hard-to-scrape sites.',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: 'https://veyora.pro/support',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://veyora.pro/#website',
      url: 'https://veyora.pro',
      name: 'Veyora',
      publisher: { '@id': 'https://veyora.pro/#org' },
    },
    {
      '@type': 'Product',
      name: 'Veyora Residential Proxies',
      description:
        '5 million residential IPs from real ISPs in 195 countries. HTTP, HTTPS and SOCKS5. Sticky or rotating sessions.',
      url: 'https://veyora.pro/residential-proxies',
      brand: { '@id': 'https://veyora.pro/#org' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: '29',
        url: 'https://veyora.pro/#pricing',
        description: 'Starter plan — 8 GB residential traffic',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'Product',
      name: 'Veyora Web Unlocker API',
      description:
        'Send a URL, get the page back. Automatic residential IP rotation and retries. $0.20 per 1,000 requests.',
      url: 'https://veyora.pro/web-unlocker',
      brand: { '@id': 'https://veyora.pro/#org' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: '0',
        url: 'https://veyora.pro/signup',
        description: 'Free $1.00 credit on signup — 5,000 requests',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'Product',
      name: 'Veyora Managed Data Feeds',
      description:
        'Ready-to-use structured data from hard-to-scrape sites. Cars, real estate, jobs, reviews — delivered daily via SFTP. A data marketplace for companies that need reliable, fresh datasets without building scrapers.',
      url: 'https://veyora.pro/data-feeds',
      brand: { '@id': 'https://veyora.pro/#org' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: '100',
        url: 'https://veyora.pro/data-feeds',
        description: 'Monthly subscription for managed data delivery — structured datasets via SFTP',
        availability: 'https://schema.org/InStock',
      },
    },
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
