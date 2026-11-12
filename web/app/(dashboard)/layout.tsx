import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { LegacyScripts } from '@/components/legacy-scripts';
import { SiteHead } from '@/components/site-head';

export const metadata: Metadata = { icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } } };
export const viewport: Viewport = { themeColor: '#F6F5F1' };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <SiteHead
        fonts="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
        stylesheets={['/dashboard.css']}
      />
      <body className="dashboard">{children}</body>
    </html>
  );
}
