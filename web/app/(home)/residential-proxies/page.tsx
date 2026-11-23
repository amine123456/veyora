import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { HomeIcons } from '@/components/home/icons';
import { HomeHeader } from '@/components/home/header';
import { HomePricing } from '@/components/home/pricing';
import { HomeCta } from '@/components/home/cta';
import { ProductDetails, ProductHero } from '@/components/home/product-page';
import { ORGANIZATION, PROXIES_PRODUCT, breadcrumbs, shareImage } from '@/components/seo/schema';

const SHARE = shareImage('og-residential-proxies.png', 'Veyora residential proxies');
const jsonLd = { '@context': 'https://schema.org', '@graph': [ORGANIZATION, PROXIES_PRODUCT, breadcrumbs('Residential Proxies', '/residential-proxies')] };

export const metadata: Metadata = {
  title: 'Residential Proxies — Veyora | 5M IPs in 195 Countries',
  description:
    '5 million residential IPs from real ISPs in 195 countries. HTTP, HTTPS and SOCKS5 on one gateway. Sticky or rotating sessions. Prepaid from $2/GB.',
  alternates: { canonical: 'https://veyora.pro/residential-proxies' },
  openGraph: {
    title: 'Residential Proxies — Veyora',
    description: '5 million residential IPs in 195 countries. HTTP, HTTPS & SOCKS5. Sticky or rotating. From $2/GB.',
    url: 'https://veyora.pro/residential-proxies',
    siteName: 'Veyora',
    type: 'website',
    images: SHARE.openGraph.images,
  },
  twitter: {
    ...SHARE.twitter,
    title: 'Residential Proxies — Veyora',
    description: '5M residential IPs in 195 countries. HTTP, HTTPS & SOCKS5. Sticky or rotating. From $2/GB.',
  },
};

const DETAILS = [
  { q: 'Gateway connection', a: <>Point any HTTP client at <code>gate.veyora.pro:8080</code> (HTTP/SOCKS5) or <code>https://gate.veyora.pro:8443</code> (HTTPS CONNECT). Authenticate with the username and password from your dashboard.</> },
  { q: 'Country targeting', a: <>Append <code>-country-fr</code> to your username to exit through France (or any of 195 two-letter country codes). Leave it off to use the full global pool.</> },
  { q: 'Sticky sessions', a: <>Add <code>-session-mycart</code> to keep the same exit IP and cookies for up to 10 minutes. Without a session name, every request gets a fresh IP from the pool.</> },
  { q: 'Billing', a: 'Traffic is billed per GB from your prepaid balance. Plans start at $29/mo for 8 GB. You can also buy one-off top-ups from $10. Unused traffic never expires.' },
  { q: 'Protocols', a: 'HTTP, HTTPS (via CONNECT), and SOCKS5 are all available on the same gateway. Works with cURL, Python requests, Node.js, Playwright, Puppeteer, Scrapy, and any standard proxy client.' },
  { q: 'IP sourcing', a: 'Every exit address is a real residential IP from a consumer internet service provider. IPs are sourced from opt-in peer networks where users have explicitly consented to share their bandwidth.' },
];

export default function ResidentialProxiesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeIcons />
      <HomeHeader variant="ink" active="proxies" />
      <main id="main" className="feeds-page vy-type-display">
        <ProductHero
          spec="Proxies / 01"
          chip="Residential Proxies"
          title="5 million IPs from real home ISPs."
          sub="Route traffic through residential internet providers in 195 countries. HTTP, HTTPS, and SOCKS5 on a single gateway. Sticky sessions hold the same exit for 10 minutes; rotating sessions get a fresh IP every request."
          primary={{ href: '/signup', label: 'Start free' }}
          secondary={{ href: '/docs#proxy', label: 'Read the docs' }}
          note="No credit card required · Every account starts with $1.00 free credit"
        />
      </main>
      <ProductDetails spec="Details / 02" label="How the proxy gateway works" title="How it works" items={DETAILS} />
      <HomePricing />
      <HomeCta />
      <LegacyScripts sources={SCRIPTS} />
    </>
  );
}

const SCRIPTS = ['/app.js'];
