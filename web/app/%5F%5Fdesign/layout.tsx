import type { ReactNode } from 'react';
import { SiteHead } from '@/components/site-head';

// Dev-only primitive showcase (CLAUDE-PROMPT.md §12 step 4). Removed entirely in the
// final cleanup step (§12.10) — this whole app/__design/ directory goes away then.
export default function DesignLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <SiteHead stylesheets={[]} />
      <body style={{ padding: 40 }} className="vy-type-app">
        {children}
      </body>
    </html>
  );
}
