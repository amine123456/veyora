import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';
import { HomeIcons } from '@/components/home/icons';
import { HomeHeader } from '@/components/home/header';
import { HomeTop } from '@/components/home/top';
import { HomeHow } from '@/components/home/how';
import { HomeUnlocker } from '@/components/home/unlocker';
import { HomeAlso } from '@/components/home/also';
import { HomeCompare } from '@/components/home/compare';
import { HomePricing } from '@/components/home/pricing';
import { HomeCta } from '@/components/home/cta';
export const metadata: Metadata = {
  title: 'Veyora | Residential proxies',
  description:
    'Veyora gives you 5 million residential IPs from real home ISPs in 195 countries for scraping, ad verification, AI data collection and e-commerce.',
};

export default function HomePage() {
  return (
    <>
      <HomeIcons />
      <HomeHeader />
      <main id="main">
        <HomeTop />
        <HomeHow />
        <HomeUnlocker />
        <HomeAlso />
        <HomeCompare />
        <HomePricing />
        <HomeCta />
      </main>
      <LegacyScripts sources={['/app.js']} />
    </>
  );
}
