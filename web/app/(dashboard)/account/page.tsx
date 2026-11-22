import type { Metadata } from 'next';
import { DashboardShell, HeadAction } from '@/components/dashboard/shell';
import { BalanceSection, ProductsSection } from '@/components/dashboard/sections';

export const metadata: Metadata = { title: 'Overview | Veyora', robots: 'noindex' };

export default function OverviewPage() {
  return (
    <DashboardShell
      page="overview"
      eyebrow="Account"
      title="Overview"
      sub="Your balance and a shortcut to each product."
      action={<HeadAction href="/account/billing" icon="plus" label="Add funds" />}
    >
      <BalanceSection />
      <ProductsSection />
    </DashboardShell>
  );
}
