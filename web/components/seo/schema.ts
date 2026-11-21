const SITE = 'https://veyora.pro';
const ORG = { '@id': `${SITE}/#org` };

export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE}/#org`,
  name: 'Veyora',
  url: SITE,
  logo: { '@type': 'ImageObject', url: `${SITE}/logo.png`, width: 512, height: 512 },
  description:
    'Residential proxy provider with 5 million IPs in 195 countries, a Web Unlocker API, and a managed data feeds marketplace for hard-to-scrape sites.',
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: `${SITE}/support` },
};

export const PROXIES_PRODUCT = {
  '@type': 'Product',
  '@id': `${SITE}/residential-proxies#product`,
  name: 'Veyora Residential Proxies',
  description:
    '5 million residential IPs from real ISPs in 195 countries. HTTP, HTTPS and SOCKS5. Sticky or rotating sessions.',
  url: `${SITE}/residential-proxies`,
  image: `${SITE}/og-residential-proxies.png`,
  brand: ORG,
  category: 'Residential proxies',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'USD',
    price: '29',
    url: `${SITE}/#pricing`,
    description: 'Starter plan — 8 GB residential traffic per month',
    availability: 'https://schema.org/InStock',
  },
};

export const UNLOCKER_PRODUCT = {
  '@type': 'Product',
  '@id': `${SITE}/web-unlocker#product`,
  name: 'Veyora Web Unlocker API',
  description:
    'Send a URL, get the page back. Automatic residential IP rotation and retries. $0.20 per 1,000 requests, with $1.00 free credit on signup.',
  url: `${SITE}/web-unlocker`,
  image: `${SITE}/og-web-unlocker.png`,
  brand: ORG,
  category: 'Web scraping API',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'USD',
    price: '0.20',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: '0.20',
      priceCurrency: 'USD',
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1000, unitText: 'requests' },
    },
    url: `${SITE}/signup`,
    description: '$0.20 per 1,000 requests. Every account starts with $1.00 free credit (about 5,000 requests).',
    availability: 'https://schema.org/InStock',
  },
};

export const FEEDS_PRODUCT = {
  '@type': 'Product',
  '@id': `${SITE}/data-feeds#product`,
  name: 'Veyora Managed Data Feeds',
  description:
    'Ready-to-use structured data from hard-to-scrape sites. Cars, real estate, jobs, reviews — delivered daily via SFTP. A data marketplace for companies that need reliable, fresh datasets without building scrapers.',
  url: `${SITE}/data-feeds`,
  image: `${SITE}/og-data-feeds.png`,
  brand: ORG,
  category: 'Data feeds',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'EUR',
    price: '100',
    url: `${SITE}/data-feeds`,
    description: 'Monthly subscription per feed, from €100 — structured datasets delivered daily',
    availability: 'https://schema.org/InStock',
  },
};

export function breadcrumbs(name: string, path: string) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE}${path}` },
    ],
  };
}

export function shareImage(file: string, alt: string) {
  const url = `${SITE}/${file}`;
  return {
    openGraph: { images: [{ url, width: 1200, height: 630, alt }] },
    twitter: { card: 'summary_large_image' as const, images: [url] },
  };
}
