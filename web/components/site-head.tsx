import type { Metadata } from 'next';

// The favicon set from the design kit (03-logo/favicon/), shared by every layout's
// `metadata.icons` + `metadata.manifest`. Spread this into each route group's
// `export const metadata` object.
export const SITE_ICONS: Pick<Metadata, 'icons' | 'manifest'> = {
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
};

// Design tokens, fonts and the site's stylesheets, in cascade order: tokens first (so
// `var(--vy-*)` and the global flatten reset are available to every stylesheet after it),
// then fonts, then the per-surface stylesheets exactly as the static pages did.
// Fonts are self-hosted (Inter, Inter Text, Inter Display, JetBrains Mono) — no Google
// Fonts request leaves the browser, and no Geist or Lora loads anywhere.
export function SiteHead({ stylesheets }: { stylesheets: string[] }) {
  return (
    <head>
      <link rel="stylesheet" href="/tokens.css" />
      <link rel="stylesheet" href="/fonts.css" />
      <link rel="stylesheet" href="/primitives.css" />
      {stylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
    </head>
  );
}
