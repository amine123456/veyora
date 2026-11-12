import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Veyora',
  description: 'Terms governing access to and use of Veyora proxy services.',
};

export default function TermsPage() {
  return (
    <>
      <main>
        <article className="legal">
          <div className="container">
            <p className="eyebrow">Legal</p>
            <h1>Terms of Service</h1>
            <p className="meta">Effective November 7, 2026</p>
            <p className="lead">
              These terms govern your access to and use of Veyora. By creating an account or using the service, you
              agree to them.
            </p>
            <h2>Eligibility and accounts</h2>
            <p>
              You must be legally able to enter into this agreement. You are responsible for accurate account
              information, safeguarding credentials, and activity performed through your account. Notify us through
              support if you suspect unauthorized access.
            </p>
            <h2>The service</h2>
            <p>
              Veyora provides metered residential and mobile proxy traffic, a Web Unlocker API that fetches public web
              pages on your behalf, and related account tools. Availability, routing, locations, and performance can
              vary because networks and third-party destinations change. We may modify the service to maintain security,
              reliability, or legal compliance.
            </p>
            <h2>Acceptable use</h2>
            <p>
              You must follow our <a href="/acceptable-use">Acceptable Use Policy</a>. You may not use the service to
              violate law, infringe rights, deceive people, compromise systems, or interfere with networks. We may
              suspend or terminate access when reasonably necessary to investigate or stop prohibited activity.
            </p>
            <h2>Purchases and payments</h2>
            <p>
              Veyora accepts cryptocurrency payments only. Payments add funds to a prepaid USD balance, credited after
              payment confirmation; larger top-ups may include a bonus shown before checkout. The balance pays for proxy
              traffic by the GB and for Web Unlocker requests per successful request (requests the site blocks or that
              fail are not charged). Prices are shown in your dashboard and may change for future usage. The balance is
              not cash, earns no interest, and cannot be withdrawn or transferred. Traffic packs bought before the
              balance existed remain valid and are used first for residential traffic. All purchases are final and
              non-refundable. You must verify the plan, amount, cryptocurrency, blockchain network, and destination
              address before paying. Balances, API keys and credentials may not be transferred or resold without written
              permission. See our <a href="/refund-policy">No Refund Policy</a>.
            </p>
            <h2>Availability and liability</h2>
            <p>
              The service is provided on an "as available" basis. To the extent permitted by law, Veyora disclaims
              implied warranties and is not liable for indirect, incidental, special, or consequential loss. Veyora's
              aggregate liability relating to the service will not exceed the amount you paid to Veyora during the three
              months before the event giving rise to the claim. Nothing here excludes liability that cannot legally be
              excluded.
            </p>
            <h2>Termination and changes</h2>
            <p>
              You may stop using the service at any time. We may restrict access for violations, security risks,
              nonpayment, or legal requirements. We may revise these terms; material changes will apply prospectively
              and the effective date will be updated.
            </p>
            <h2>Contact</h2>
            <p>
              Questions or notices can be submitted through our <a href="/support">support form</a>.
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
