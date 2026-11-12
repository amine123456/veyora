import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'No Refund Policy — Veyora',
  description: 'Veyora no refund policy: all cryptocurrency purchases are final.',
};

export default function RefundPolicyPage() {
  return (
    <>
      <main>
        <article className="legal">
          <div className="container">
            <p className="eyebrow">Legal</p>
            <h1>No Refund Policy</h1>
            <p className="meta">Effective October 29, 2026</p>
            <p className="lead">
              Veyora accepts cryptocurrency payments only. All purchases are final and non-refundable.
            </p>
            <div className="card">
              <h2>All sales are final</h2>
              <p>
                We do not provide refunds, returns, reversals, or exchanges after a cryptocurrency payment is sent. This
                applies to unused or partially used traffic, repeat purchases, service incompatibility with your
                intended use, cryptocurrency price changes, and accounts restricted for violating our terms.
              </p>
            </div>
            <h2>Check before paying</h2>
            <p>
              Before sending payment, confirm the selected plan, traffic amount, cryptocurrency, blockchain network,
              destination address, and transaction amount. You are responsible for payments sent using the wrong
              currency, network, address, or amount.
            </p>
            <h2>Payment or service problems</h2>
            <p>
              If a confirmed payment is not credited correctly or you experience a technical issue, submit the{' '}
              <a href="/support">support form</a> and choose "Billing or payment." We will investigate and correct
              verified account-crediting errors, but this does not create a right to a cryptocurrency refund. Nothing in
              this policy limits rights that cannot legally be excluded.
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
