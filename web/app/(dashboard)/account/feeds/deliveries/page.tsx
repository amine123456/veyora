import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/shell';
import { DeliveriesSection } from '@/components/dashboard/sections';

export const metadata: Metadata = { title: 'Deliveries | Veyora', robots: 'noindex' };

export default function DeliveriesPage() {
  return (
    <DashboardShell
      page="deliveries"
      eyebrow="Data Feeds"
      title="Deliveries"
      sub="A log of every snapshot sent to you: when it arrived, how many records and whether it succeeded."
    >
      <DeliveriesSection />
    </DashboardShell>
  );
}
