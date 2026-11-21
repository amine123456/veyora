export function HomeCompare() {
  return (
    <>
      <section className="compare container" id="compare" aria-labelledby="compare-title">
        <p className="pill">
          <span className="dot" />
          What you get
        </p>
        <h2 className="h2" id="compare-title" data-split="">
          Everything included, <span className="grey">no hidden extras.</span>
        </h2>
        <p className="sub sub--ink sub--left">
          Every plan includes the full feature set. No paid add-ons for country targeting, no extra fees for SOCKS5,
          no minimum commitments.
        </p>
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Feature list">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Starter</th>
                <th scope="col">Pro</th>
                <th scope="col" className="is-us">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Residential IPs</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  5M+ pool
                </td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  5M+ pool
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Private pools
                </td>
              </tr>
              <tr>
                <th scope="row">Countries</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  195
                </td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  195
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  195
                </td>
              </tr>
              <tr>
                <th scope="row">Protocols</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  HTTP + SOCKS5
                </td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  HTTP + SOCKS5
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  HTTP + SOCKS5
                </td>
              </tr>
              <tr>
                <th scope="row">Sticky sessions</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  10 min
                </td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  10 min
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Custom
                </td>
              </tr>
              <tr>
                <th scope="row">Web Unlocker API</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Included
                </td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Included
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Included
                </td>
              </tr>
              <tr>
                <th scope="row">Concurrent sessions</th>
                <td>Unlimited</td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Unlimited
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Unlimited
                </td>
              </tr>
              <tr>
                <th scope="row">Payment methods</th>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Card &amp; USDT
                </td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Card &amp; USDT
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Invoicing
                </td>
              </tr>
              <tr>
                <th scope="row">Support</th>
                <td>Email</td>
                <td className="yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Priority
                </td>
                <td className="is-us yes">
                  <i>
                    <svg>
                      <use href="#i-check" />
                    </svg>
                  </i>
                  Dedicated
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
