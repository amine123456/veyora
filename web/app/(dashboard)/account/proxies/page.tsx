import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/shell';
import { ConnectionSection, TargetingSection, TestSection } from '@/components/dashboard/sections';

export const metadata: Metadata = { title: 'Proxy setup | Veyora', robots: 'noindex' };

export default function ProxiesPage() {
  return (
    <DashboardShell
      page="proxies"
      eyebrow="Proxies"
      title="Proxy setup"
      sub="Your gateway credentials, the username options for country, mobile and sticky IPs, and a command to test them."
    >
      <ConnectionSection />
      <TargetingSection />
      <TestSection />
    </DashboardShell>
  );
}
