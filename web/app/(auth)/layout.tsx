import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { LegacyScripts } from '@/components/legacy-scripts';
import { SiteHead, SITE_ICONS } from '@/components/site-head';

export const metadata: Metadata = { ...SITE_ICONS };
export const viewport: Viewport = { themeColor: '#F6F5F1' };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <SiteHead
        stylesheets={['/auth.css']}
      />
      <body className="authpage">{children}</body>
    </html>
  );
}
