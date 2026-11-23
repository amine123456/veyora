import type { ReactNode } from 'react';

export default function WebUnlockerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/feeds.css" />
      {children}
    </>
  );
}
