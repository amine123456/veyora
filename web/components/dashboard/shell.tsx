import type { ReactNode } from 'react';
import { LegacyScripts } from '@/components/legacy-scripts';
import { DashboardIcons } from '@/components/dashboard/icons';
import { DashboardSidebar, type DashboardPage } from '@/components/dashboard/sidebar';
import { DashboardFooter } from '@/components/dashboard/sections';

const SCRIPTS = ['/auth.js'];

type Props = {
  page: DashboardPage;
  eyebrow: string;
  title: string;
  sub: string;
  back?: { href: string; label: string };
  action?: ReactNode;
  children: ReactNode;
};

export function DashboardShell({ page, eyebrow, title, sub, back, action, children }: Props) {
  return (
    <>
      <DashboardIcons />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="app" data-dashboard="" data-page={page}>
        <DashboardSidebar active={page} />
        <main className="main" id="main">
          <header className="page-head">
            <div>
              {back ? (
                <a className="page-back" href={back.href}>
                  ← {back.label}
                </a>
              ) : (
                <p className="eyebrow">{eyebrow}</p>
              )}
              <h1>{title}</h1>
              <p className="page-head__sub">{sub}</p>
            </div>
            {action}
          </header>
          {children}
          <DashboardFooter />
        </main>
      </div>
      <LegacyScripts sources={SCRIPTS} />
    </>
  );
}

export function HeadAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a className="btn btn--primary" href={href}>
      <svg className="ic" aria-hidden="true">
        <use href={`#i-${icon}`} />
      </svg>
      {label}
    </a>
  );
}
