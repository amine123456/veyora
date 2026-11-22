import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/shell';
import { DeliveryFormSection } from '@/components/dashboard/delivery-form';

export const metadata: Metadata = { title: 'Delivery setup | Veyora', robots: 'noindex' };

export default function DeliverySetupPage() {
  return (
    <DashboardShell
      page="feeds"
      eyebrow="Data Feeds"
      title="Delivery setup"
      sub="Choose where each snapshot of this feed is sent."
      back={{ href: '/account/feeds', label: 'My feeds' }}
    >
      <DeliveryFormSection />
    </DashboardShell>
  );
}
