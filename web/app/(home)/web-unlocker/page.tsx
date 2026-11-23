import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { HomeIcons } from '@/components/home/icons';
import { HomeHeader } from '@/components/home/header';
import { HomeUnlocker } from '@/components/home/unlocker';
import { HomeCta } from '@/components/home/cta';
import { ProductDetails, ProductHero } from '@/components/home/product-page';
import { ORGANIZATION, UNLOCKER_PRODUCT, breadcrumbs, shareImage } from '@/components/seo/schema';

const SHARE = shareImage('og-web-unlocker.png', 'Veyora Web Unlocker API');
const jsonLd = { '@context': 'https://schema.org', '@graph': [ORGANIZATION, UNLOCKER_PRODUCT, breadcrumbs('Web Unlocker', '/web-unlocker')] };

export const metadata: Metadata = {
  title: 'Web Unlocker API — Veyora | $0.20 per 1,000 Requests',
  description:
    'Send a URL, get the page back. Veyora Web Unlocker fetches supported public pages through residential IPs with automatic retries. $0.20 per 1,000 requests.',
  alternates: { canonical: 'https://veyora.pro/web-unlocker' },
  openGraph: {
    title: 'Web Unlocker API — Veyora',
    description: 'Send a URL, get the page back. Residential IP rotation, automatic retries. $0.20/1k requests.',
    url: 'https://veyora.pro/web-unlocker',
    siteName: 'Veyora',
    type: 'website',
    images: SHARE.openGraph.images,
  },
  twitter: {
    ...SHARE.twitter,
    title: 'Web Unlocker API — Veyora',
    description: 'Send a URL, get the page back. Residential IP rotation, automatic retries. $0.20/1k requests.',
  },
};

const DETAILS = [
  { q: 'Automatic retries', a: 'If the target site blocks a request, the API automatically retries on a new residential IP. You are billed when the page is fetched — including if the target returns a 404. Blocked and failed requests are not charged.' },
  { q: 'Pricing', a: '$0.20 per 1,000 successful requests, deducted from your prepaid wallet. Pages that require a CAPTCHA solve cost an additional $0.005 per request. Every new account gets $1.00 free credit — enough for 5,000 requests with no payment needed.' },
  { q: 'Authentication', a: 'Create an API key in the dashboard. Pass it as a Bearer token in the Authorization header. Keys can be scoped and revoked at any time.' },
  { q: 'Sessions', a: 'Name a session to keep the same exit IP and cookies across requests. This is useful for multi-step flows like login, search, and checkout sequences.' },
  { q: 'JavaScript rendering', a: <>Set <code>render: true</code> to get the fully rendered page after JavaScript execution. Useful for SPAs and pages that load content dynamically.</> },
  { q: 'Response format', a: 'The API returns the page HTML as a string, along with the final HTTP status code, response headers, and metadata about the request (exit country, latency, retries).' },
];

export default function WebUnlockerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeIcons />
      <HomeHeader variant="ink" active="unlocker" />
      <main id="main" className="feeds-page vy-type-display">
        <ProductHero
          spec="Web Unlocker / 01"
          chip="Web Unlocker API"
          title="One API call. Any public page."
          sub="The Web Unlocker API fetches supported public pages through residential IPs. Blocked requests are retried automatically on new exits until the page comes back. Just $0.20 per 1,000 successful requests."
          primary={{ href: '/signup', label: 'Get an API key' }}
          secondary={{ href: '/docs#unlocker', label: 'Read the docs' }}
          note="No credit card required · 5,000 free requests on signup ($1.00 credit)"
        />
      </main>
      <HomeUnlocker />
      <ProductDetails spec="Details / 03" label="How the Web Unlocker works" title="How it works" items={DETAILS} />
      <HomeCta />
      <LegacyScripts sources={SCRIPTS} />
    </>
  );
}

const SCRIPTS = ['/nav.js'];
