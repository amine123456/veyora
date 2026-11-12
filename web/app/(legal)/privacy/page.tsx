import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Veyora',
  description: 'Veyora privacy policy: what we collect, how we use it, and your choices.',
};

export default function PrivacyPage() {
  return (
    <>
      <main>
        <article className="legal">
          <div className="container">
            <p className="eyebrow">Legal</p>
            <h1>Privacy Policy</h1>
            <p className="meta">Effective October 29, 2026</p>
            <p className="lead">
              This policy explains what information Veyora collects, why we use it, and the choices available to you.
            </p>
            <h2>Information we collect</h2>
            <p>
              We collect account information you provide, including your email address and securely hashed
              authentication data; purchase and transaction references needed to credit your account; proxy usage
              totals, connection metadata, and security logs needed to operate and protect the service; and information
              you submit through our support form.
            </p>
            <h2>How we use information</h2>
            <p>
              We use this information to create and secure accounts, deliver purchased traffic, process and reconcile
              payments, provide support, prevent abuse and fraud, diagnose reliability issues, comply with legal
              obligations, and enforce our terms. We do not sell personal information.
            </p>
            <h2>Payments and service providers</h2>
            <p>
              Payments may be processed by third-party payment providers. They handle payment information under their
              own privacy terms; Veyora receives transaction status and identifiers needed to fulfill purchases. We may
              use infrastructure and security providers that process limited information on our behalf.
            </p>
            <h2>Retention and security</h2>
            <p>
              We retain information only as long as reasonably necessary for service, security, accounting, dispute, and
              legal purposes. No system can guarantee absolute security, but we use access controls, transport
              encryption, and restricted credential storage designed to protect your data.
            </p>
            <h2>Your choices</h2>
            <p>
              You may ask to access, correct, or delete personal information associated with your account, subject to
              security verification and lawful retention requirements. Submit a request through{' '}
              <a href="/support">support</a>. You can also stop using the service and avoid submitting optional
              information.
            </p>
            <h2>Cookies</h2>
            <p>
              We use an essential, secure session cookie to keep signed-in accounts authenticated. We do not currently
              use advertising cookies on this site.
            </p>
            <h2>Changes and contact</h2>
            <p>
              We may update this policy as the service changes. The effective date above identifies the current version.
              For privacy questions or requests, use our <a href="/support">support form</a>.
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
