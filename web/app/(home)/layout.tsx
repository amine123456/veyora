import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { LegacyScripts } from '@/components/legacy-scripts';
import { SiteHead } from '@/components/site-head';

export const metadata: Metadata = { icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } } };
export const viewport: Viewport = { themeColor: '#161615' };

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <SiteHead
        fonts="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Lora:ital,wght@1,500&display=swap"
        stylesheets={['/styles.css']}
      />
      <body>{children}</body>
    </html>
  );
}
