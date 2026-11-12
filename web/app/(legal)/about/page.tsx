import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Veyora',
  description: 'Learn what Veyora provides and how to contact the team.',
};

export default function AboutPage() {
  return (
    <>
      <main>
        <article className="legal">
          <div className="container">
            <p className="eyebrow">About Veyora</p>
            <h1>Proxy access without the mystery.</h1>
            <p className="lead">
              Veyora provides usage-based residential proxy access through a customer account, with visible traffic
              balances and straightforward connection details.
            </p>
            <div className="card">
              <h2>What we are building</h2>
              <p>
                Our focus is a practical service: create an account, purchase traffic, receive proxy credentials, and
                see how much data remains. We publish the rules that govern the service and provide a direct support
                path when something goes wrong.
              </p>
            </div>
            <h2>Transparency matters</h2>
            <p>
              Proxy services require trust from both customers and network participants. We prohibit abusive activity,
              investigate credible reports, and may restrict access when use threatens people, systems, or the service.
              Read our <a href="/acceptable-use">Acceptable Use Policy</a> for details.
            </p>
            <h2>Contact us</h2>
            <p>
              Questions about the product, an account, billing, or a potential abuse issue can be submitted through our{' '}
              <a href="/support">support form</a>. Each submission receives a reference number.
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
