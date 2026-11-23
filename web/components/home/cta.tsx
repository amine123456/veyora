// End CTA band + footer (CLAUDE-PROMPT.md §4.9, reference 08-footer-b.html). All footer
// links/hrefs and the live CTA copy are unchanged; only markup/classes restyled. The live
// lead paragraph under the CTAs is dropped per the approved design (§4.1 note) — it has no
// data hook in this codebase, so nothing is left dangling. The copyright year is kept as
// the live literal "2026" (not computed) — §4.9 only asks to keep it computed if it
// already is, and it is not.
import { SiteFooter } from '@/components/home/footer';

export function HomeCta() {
  return (
    <>
      <section className="cta-band" id="cta" aria-labelledby="cta-title">
        <img className="cta-band-bg" src="/design/05-backgrounds/sections/footer-cta-yellow-band-clouds-1440x340.svg" alt="" aria-hidden="true" />
        <div className="cta-band-in">
          <span className="lab mono">
            <i />
            26 live sources · 2.4 million records daily
          </span>
          <h2 id="cta-title">Never think about getting your data again.</h2>
          <div className="ctas">
            <a className="vy-btn vy-btn--primary vy-btn--lg" href="/data-feeds">
              Browse data feeds <span className="ar">↗</span>
            </a>
            <a className="vy-btn vy-btn--secondary vy-btn--lg on-yellow" href="/signup">
              Start free
            </a>
          </div>
          <p className="note mono">$1.00 free credit on signup · No credit card required</p>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
