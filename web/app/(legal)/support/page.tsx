import type { Metadata } from 'next';
import { LegacyScripts } from '@/components/legacy-scripts';

export const metadata: Metadata = {
  title: 'Contact & Support — Veyora',
  description: 'Contact Veyora about product, account, billing, technical, or abuse concerns.',
};

export default function SupportPage() {
  return (
    <>
      <main>
        <article className="legal">
          <div className="container">
            <p className="eyebrow">Contact & support</p>
            <h1>How can we help?</h1>
            <p className="lead">
              Send the details below. Your request is stored securely for the Veyora team and you will receive a
              reference number on submission.
            </p>
            <div className="card">
              <form id="support-form">
                <label>
                  Name (optional)
                  <input name="name" autoComplete="name" maxLength={80} />
                </label>{' '}
                <label>
                  Email address
                  <input name="email" type="email" autoComplete="email" maxLength={254} required />
                </label>{' '}
                <label>
                  Topic
                  <select name="topic">
                    <option value="general">Product question</option>
                    <option value="account">Account</option>
                    <option value="billing">Billing or payment</option>
                    <option value="technical">Technical issue</option>
                    <option value="abuse">Report abuse</option>
                  </select>
                </label>{' '}
                <label>
                  Message
                  <textarea
                    name="message"
                    minLength={20}
                    maxLength={4000}
                    required
                    placeholder="Include the relevant account email, transaction reference, or technical details. Do not include passwords."
                  />
                </label>{' '}
                <button type="submit">Send request</button>{' '}
                <p id="form-status" className="message" role="status" aria-live="polite" />
              </form>
            </div>
            <p className="meta">
              Do not send passwords, proxy credentials, payment card data, or other sensitive secrets in this form.
            </p>
          </div>
        </article>
      </main>
      <LegacyScripts sources={['/support.js']} />
    </>
  );
}
