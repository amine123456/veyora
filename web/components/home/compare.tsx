export function HomeCompare() {
  return (
    <>
      <section className="compare container" id="compare" aria-labelledby="compare-title">
        <p className="pill">
          <span className="dot" />
          Compare
        </p>
        <h2 className="h2" id="compare-title" data-split="">
          Built different from <span className="grey">the usual proxy pitch.</span>
        </h2>
        <p className="sub sub--ink sub--left">
          A side-by-side against the patterns teams usually hit with generic residential providers. Columns marked{' '}
          <em className="tagv tagv--sm">example</em> are illustrative positioning, not a named competitor audit.
        </p>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Comparison table">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Typical residential</th>
                <th scope="col">Datacenter</th>
                <th scope="col" className="is-us">
                  Veyora
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Looks like a household ASN</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Usually
                </td>
                <td>Rarely</td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Yes
                </td>
              </tr>
              <tr>
                <th scope="row">HTTP + SOCKS5 on one gate</th>
                <td>Often split</td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Common
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Both
                </td>
              </tr>
              <tr>
                <th scope="row">Published per-GB marketing tiers</th>
                <td>Opaque pools</td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Sometimes
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  $29 / $99
                </td>
              </tr>
              <tr>
                <th scope="row">Sticky + rotating sessions</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Varies
                </td>
                <td>Sticky only</td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Both
                </td>
              </tr>
              <tr>
                <th scope="row">Country targeting</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Paid add-on
                </td>
                <td>Limited</td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Every plan
                </td>
              </tr>
              <tr>
                <th scope="row">
                  Crypto top-ups <em className="tagv tagv--sm">example framing</em>
                </th>
                <td>Rare</td>
                <td>Rare</td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  USDT on BSC
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="foot">
          Pricing columns use the public marketing tiers. Competitor behaviours are generalised{' '}
          <em className="tagv tagv--sm">example</em> patterns — not claims about a specific vendor.
        </p>
      </section>
    </>
  );
}
