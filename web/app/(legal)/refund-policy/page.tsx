import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy — Veyora',
  description: 'Veyora refund, cancellation, and dispute policy for card and cryptocurrency payments.',
};

export default function RefundPolicyPage() {
  return (
    <>
      <main>
        <article className="legal">
          <div className="container">
            <p className="eyebrow">Legal</p>
            <h1>Refund Policy</h1>
            <p className="meta">Effective November 20, 2026</p>
            <p className="lead">
              This policy explains how refunds, cancellations, and payment disputes are handled for card and
              cryptocurrency purchases on Veyora.
            </p>
            <h2>Card payments (Stripe)</h2>
            <h3>Balance top-ups</h3>
            <p>
              Prepaid balance top-ups paid by card are generally non-refundable once the balance has been used. If you
              request a refund before using any of the credited balance, we will review and process a full refund within
              7 business days. Partially used balances may be eligible for a prorated refund at our discretion.
            </p>
            <h3>Managed Data Feed subscriptions</h3>
            <p>
              Data Feed subscriptions renew monthly. You may cancel at any time from your dashboard; cancellation takes
              effect at the end of the current billing period and no further charges will be made. We do not provide
              partial-month refunds for the remaining days of a billing period after cancellation.
            </p>
            <p>
              If you cancel within 48 hours of your first subscription payment and no data has been delivered, you are
              eligible for a full refund. Contact us through the <a href="/support">support form</a>.
            </p>
            <h3>Service issues</h3>
            <p>
              If a confirmed card payment is not credited correctly, or if the service is materially unavailable for an
              extended period affecting your paid subscription, contact <a href="/support">support</a>. We will
              investigate and, where appropriate, issue a refund or account credit. Refunds for card payments are
              returned to the original payment method.
            </p>
            <h2>Cryptocurrency payments</h2>
            <p>
              Cryptocurrency payments (USDT) are non-refundable due to the irreversible nature of blockchain
              transactions. Before sending payment, confirm the amount, cryptocurrency, blockchain network, and
              destination address. If a confirmed crypto payment is not credited to your account, contact{' '}
              <a href="/support">support</a> and we will investigate and correct verified crediting errors.
            </p>
            <h2>Chargebacks and disputes</h2>
            <p>
              If you believe a charge is unauthorized or incorrect, please contact us through{' '}
              <a href="/support">support</a> before filing a dispute with your bank. We respond to all disputes
              promptly. Filing a chargeback for legitimate charges may result in account suspension pending resolution.
            </p>
            <h2>How to request a refund</h2>
            <p>
              Submit a request through our <a href="/support">support form</a> and select "Billing or payment." Include
              your account email and a description of the issue. We aim to respond within 2 business days.
            </p>
            <h2>Contact</h2>
            <p>
              For billing questions or refund requests, use our <a href="/support">support form</a>.
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
