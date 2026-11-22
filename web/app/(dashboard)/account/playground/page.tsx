import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/shell';
import { SandboxSection, UnlockerOffNotice } from '@/components/dashboard/sections';

export const metadata: Metadata = { title: 'Playground | Veyora', robots: 'noindex' };

export default function PlaygroundPage() {
  return (
    <DashboardShell
      page="playground"
      eyebrow="Web Unlocker"
      title="Playground"
      sub="Try the Web Unlocker for free: fetch a real page on your daily allowance or run a simulated scenario."
    >
      <UnlockerOffNotice />
      <SandboxSection />
    </DashboardShell>
  );
}
