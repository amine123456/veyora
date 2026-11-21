import type { ReactNode } from 'react';

export default function DataFeedsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/feeds.css" />
      {children}
    </>
  );
}
