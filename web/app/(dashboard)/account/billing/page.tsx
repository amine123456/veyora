import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/shell';
import { BalanceSection, FundsSection, PaymentsSection } from '@/components/dashboard/sections';

export const metadata: Metadata = { title: 'Billing | Veyora', robots: 'noindex' };

export default function BillingPage() {
  return (
    <DashboardShell
      page="billing"
      eyebrow="Account"
      title="Billing"
      sub="Top up your prepaid balance with card or USDT and see every payment credited to it."
    >
      <BalanceSection />
      <FundsSection />
      <PaymentsSection />
    </DashboardShell>
  );
}
