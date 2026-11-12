'use client';

import { useEffect } from 'react';

// The site's behaviour scripts (menus, forms, dashboard) are plain DOM scripts written for
// the static pages. They are loaded one after another once React has finished hydrating, so
// they never change the DOM underneath React.
export function LegacyScripts({ sources }: { sources: string[] }) {
  useEffect(() => {
    let cancelled = false;
    const added: HTMLScriptElement[] = [];
    const loadNext = (index: number) => {
      if (cancelled || index >= sources.length) return;
      const script = document.createElement('script');
      script.src = sources[index];
      script.onload = script.onerror = () => loadNext(index + 1);
      added.push(script);
      document.body.appendChild(script);
    };
    loadNext(0);
    return () => {
      cancelled = true;
      for (const script of added) script.remove();
    };
  }, [sources]);
  return null;
}
