export const HOME_FAQ = [
  {
    q: 'Which product should I choose?',
    a: 'If you want the data itself, subscribe to a Data Feed and we deliver finished files. If you need pages from a site we do not cover, use the Web Unlocker API: send a URL, get the page. If you already run your own scrapers, use the residential proxies.',
  },
  {
    q: 'Can I see the data before I subscribe?',
    a: 'Yes. Every live feed has a free sample with real rows and the full field list. Preview it on this page or download the JSON and load it into your own tools.',
  },
  {
    q: 'How is feed data delivered?',
    a: 'Choose SFTP, Amazon S3, Google Cloud Storage, Snowflake, a webhook or the API, in JSON, CSV, Parquet or JSONL. Each delivery is a full snapshot and is logged in your dashboard.',
  },
  {
    q: 'How does billing work?',
    a: 'Data feeds are monthly subscriptions, priced per feed. The Web Unlocker and proxies draw from one prepaid balance: proxy plans load a monthly traffic allowance (8 GB or 40 GB), and you can buy one-off top-ups from $10 in the dashboard.',
  },
  {
    q: 'Does my traffic expire?',
    a: 'No. Unused traffic rolls over indefinitely. Your balance stays until you use it, whether it came from a plan or a top-up.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Visa, Mastercard, and American Express via Stripe, or USDT on BNB Smart Chain (BEP-20). All payments are prepaid.',
  },
  {
    q: 'Can I cancel or change plans anytime?',
    a: 'Yes. Upgrade, downgrade, or cancel from the dashboard. No contracts, no lock-in. Any remaining balance stays in your account.',
  },
  {
    q: 'How do I get support?',
    a: 'Email support is included on every plan. Pro and Enterprise customers get priority response. We typically respond within a few hours during business days.',
  },
  {
    q: 'What happens after I create an account?',
    a: 'You get $1.00 free credit immediately, enough for 5,000 Web Unlocker requests. No card needed. Your API credentials and proxy gateway details appear in the dashboard.',
  },
  {
    q: 'Can you build a feed for a site you do not cover?',
    a: 'Yes. Tell us the site and the fields you need, and we set up a dedicated pipeline with the schedule and format you want. New sources are added every month.',
  },
];

export function HomeFaq() {
  return (
    <section className="faq container" id="faq" aria-labelledby="faq-title">
      <h2 className="h2" id="faq-title" data-split="">
        Questions, <em className="serif">answered.</em>
      </h2>
      <div className="faq__list">
        {HOME_FAQ.map((item) => (
          <details className="faq__item" key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      <p className="faq__more">
        Still unsure? <a href="/support">Ask us anything</a> or read the <a href="/docs">documentation</a>.
      </p>
    </section>
  );
}
