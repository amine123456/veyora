// Second FAQ block (CLAUDE-PROMPT.md §4.8 — no approved screen; the accordion style from
// §4.8, shared "FAQ / 07" section number per spec). No `id="faq"` here — `pricing.tsx`'s
// FAQ section already holds that id, and two elements must not share one HTML id; `#faq`
// still resolves exactly where it always did.
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
    q: 'Can you build a feed for a site you do not cover?',
    a: 'Yes. Tell us the site and the fields you need, and we set up a dedicated pipeline with the schedule and format you want. New sources are added every month.',
  },
];

export function HomeFaq() {
  return (
    <section className="faq-sec vy-type-text" aria-labelledby="faq2-title">
      <div className="vy-wrap">
        <div className="vy-specbar">
          <span>
            <i />
            FAQ / 07
          </span>
          <span>Data feeds, Web Unlocker &amp; proxy FAQ</span>
        </div>
        <header className="sec-head">
          <h2 id="faq2-title">Questions, answered.</h2>
        </header>
        <div className="faq__list">
          {HOME_FAQ.map((item) => (
            <details className="faq__item" key={item.q}>
              <summary>
                {item.q}
                <span className="faq__toggle" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <p className="faq__more">
          Still unsure?{' '}
          <a className="vy-link" href="/support">
            Ask us anything
          </a>{' '}
          or read the{' '}
          <a className="vy-link" href="/docs">
            documentation
          </a>
          .
        </p>
      </div>
    </section>
  );
}
