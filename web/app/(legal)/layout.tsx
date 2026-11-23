import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { LegacyScripts } from '@/components/legacy-scripts';
import { SiteHead, SITE_ICONS } from '@/components/site-head';
import { HomeHeader } from '@/components/home/header';
import { SiteFooter } from '@/components/home/footer';
export const metadata: Metadata = { ...SITE_ICONS };
export const viewport: Viewport = { themeColor: '#161615' };

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <SiteHead
        stylesheets={['/styles.css', '/trust.css']}
      />
      <body className="legal-body">
        <HomeHeader />
        {children}
        <SiteFooter />
        <LegacyScripts sources={['/nav.js']} />
      </body>
    </html>
  );
}
