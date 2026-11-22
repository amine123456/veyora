import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/shell';
import { UsageSection } from '@/components/dashboard/sections';

export const metadata: Metadata = { title: 'Usage | Veyora', robots: 'noindex' };

export default function UsagePage() {
  return (
    <DashboardShell
      page="usage"
      eyebrow="Account"
      title="Usage"
      sub="Daily requests and spend over the last 30 days, and your most recent proxy and unlocker requests."
    >
      <UsageSection />
    </DashboardShell>
  );
}
