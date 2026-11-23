import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { LegacyScripts } from '@/components/legacy-scripts';
import { SiteHead, SITE_ICONS } from '@/components/site-head';

export const metadata: Metadata = { ...SITE_ICONS };
export const viewport: Viewport = { themeColor: '#161615' };

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <SiteHead
        stylesheets={['/styles.css', '/trust.css', '/docs.css']}
      />
      <body className="legal-body">{children}</body>
    </html>
  );
}
