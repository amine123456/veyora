import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { DashboardIcons } from '@/components/dashboard/icons';
import { DashboardMain } from '@/components/dashboard/main';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
export const metadata: Metadata = { title: 'Dashboard | Veyora', robots: 'noindex' };

export default function AccountPage() {
  return (
    <>
      <DashboardIcons />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="app" data-dashboard="">
        <DashboardSidebar />
        <DashboardMain />
      </div>
      <LegacyScripts sources={['/auth.js']} />
    </>
  );
}
