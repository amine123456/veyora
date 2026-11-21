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
export const metadata: Metadata = {
  title: 'Veyora — Data Feeds, Market Intelligence & Web Data Platform',
  description:
    'Subscribe to structured data feeds from hard-to-scrape sites. Cars, real estate, jobs, reviews — delivered daily via SFTP, S3, Snowflake, or API. Plus a Web Unlocker API and 5M residential proxies for DIY collection.',
  alternates: { canonical: 'https://veyora.pro/' },
  openGraph: {
    title: 'Veyora — Data Feeds, Market Intelligence & Web Data Platform',
    description:
      'Never think about getting your data again. Subscribe to a feed, set your delivery, and receive structured datasets daily from hard-to-scrape sites.',
    url: 'https://veyora.pro/',
    siteName: 'Veyora',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Veyora — Data Feeds & Market Intelligence Platform',
    description:
      'Structured data feeds from hard-to-scrape sites. Cars, real estate, jobs — delivered daily. Subscribe to data, not to scrapers.',
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
        price: '49',
        url: 'https://veyora.pro/data-feeds',
        description: 'Monthly subscription for managed data delivery — structured datasets via SFTP',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does billing work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Plans are monthly subscriptions that load your account with a traffic allowance (8 GB or 40 GB). You can also buy one-off top-ups from $10 in the dashboard. Both methods credit the same prepaid balance.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does my traffic expire?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Unused traffic rolls over indefinitely. Your balance stays until you use it, whether it came from a plan or a top-up.',
          },
        },
        {
          '@type': 'Question',
          name: 'What payment methods do you accept?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Visa, Mastercard, and American Express via Stripe, or USDT on BNB Smart Chain (BEP-20). All payments are prepaid.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I cancel or change plans anytime?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Upgrade, downgrade, or cancel from the dashboard. No contracts, no lock-in. Any remaining balance stays in your account.',
          },
        },
        {
          '@type': 'Question',
          name: 'What happens after I create an account?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You get $1.00 free credit immediately — enough for 5,000 Web Unlocker requests. No card needed. Your API credentials and proxy gateway details appear in the dashboard.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I get support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Email support is included on every plan. Pro and Enterprise customers get priority response. We typically respond within a few hours during business days.',
          },
        },
      ],
    },
  ],
};

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
        <HomeDataFeeds />
        <HomeHow />
        <HomeUnlocker />
        <HomePricing />
        <HomeCta />
      </main>
      <LegacyScripts sources={['/app.js']} />
    </>
  );
}
