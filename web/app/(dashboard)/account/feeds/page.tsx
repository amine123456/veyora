import type { Metadata } from 'next';
import { DashboardShell, HeadAction } from '@/components/dashboard/shell';
import { FeedsSection } from '@/components/dashboard/sections';

export const metadata: Metadata = { title: 'My feeds | Veyora', robots: 'noindex' };

export default function FeedsPage() {
  return (
    <DashboardShell
      page="feeds"
      eyebrow="Data Feeds"
      title="My feeds"
      sub="Your feed subscriptions, their delivery settings and the last snapshot each one received."
      action={<HeadAction href="/data-feeds" icon="plus" label="Add a feed" />}
    >
      <FeedsSection />
    </DashboardShell>
  );
}
