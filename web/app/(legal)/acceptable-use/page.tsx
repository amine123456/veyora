import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — Veyora',
  description: 'Veyora acceptable use policy: rules for lawful, authorized proxy usage.',
};

export default function AcceptableUsePage() {
  return (
    <>
      <main>
        <article className="legal">
          <div className="container">
            <p className="eyebrow">Legal</p>
            <h1>Acceptable Use Policy</h1>
            <p className="meta">Effective November 7, 2026</p>
            <p className="lead">
              Use Veyora only for lawful, authorized activity that respects people, systems, and network resources.
            </p>
            <h2>Prohibited activity</h2>
            <p>
              You may not use the service for unlawful activity; unauthorized access, scanning, exploitation, malware,
              botnets, or denial-of-service activity; phishing, impersonation, fraud, spam, or deceptive traffic;
              harassment, threats, exploitation, or distribution of illegal content; infringement of privacy,
              intellectual property, or other rights; bypassing security controls, access restrictions, or platform
              rules without authorization; manipulation of advertising, engagement, marketplaces, ticketing, or
              financial systems; or activity that degrades the service or exposes infrastructure or network participants
              to unreasonable risk.
            </p>
            <h2>Web Unlocker</h2>
            <p>
              The Web Unlocker is for collecting publicly available pages, such as prices, listings, search results and
              news. It must not be used to sign in to accounts you do not own or are not authorized to use, take over or
              test credentials, reach content behind a login or paywall, buy or reserve limited items (including ticket,
              sneaker or other drop bots), or overload a site. Requests are limited to GET on standard web ports and
              cannot carry your own cookies or credentials. Some sites are refused by default, including ticket resale
              and sneaker launch platforms, and we may add sites to that list at any time. Automated requests must
              respect a reasonable rate for the destination.
            </p>
            <h2>Your responsibilities</h2>
            <p>
              Obtain required authorization, follow applicable laws and destination terms, secure your credentials,
              limit collection to data you are entitled to process, and honor requests from affected parties. Do not
              conceal prohibited activity behind Veyora.
            </p>
            <h2>Enforcement</h2>
            <p>
              We may investigate credible reports, preserve relevant records, rate-limit traffic, suspend credentials,
              or close accounts. Severe or repeated violations may result in immediate termination without refund where
              permitted by law. We may cooperate with lawful requests from authorities.
            </p>
            <h2>Report abuse</h2>
            <p>
              Use the <a href="/support">support form</a> and choose "Report abuse." Include timestamps, target
              hostnames or IPs, request details, and any Veyora-related evidence you have. Do not include passwords or
              unnecessary personal data.
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
