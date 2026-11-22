import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/shell';
import { UnlockerOffNotice, UnlockerSection } from '@/components/dashboard/sections';

export const metadata: Metadata = { title: 'API keys | Veyora', robots: 'noindex' };

export default function ApiKeysPage() {
  return (
    <DashboardShell
      page="api-keys"
      eyebrow="Web Unlocker"
      title="API keys"
      sub="Create a key per project, call the Web Unlocker from your code, and revoke keys you no longer use."
    >
      <UnlockerOffNotice />
      <UnlockerSection />
    </DashboardShell>
  );
}
