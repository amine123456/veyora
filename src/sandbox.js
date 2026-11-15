// Sandbox scenarios: requests to the sandbox host never leave the server. Each path
// answers exactly as POST /v1/unlock would for that situation (same status codes, fields
// and headers), so an integration can exercise every branch for free and in milliseconds.

const HTML = "text/html; charset=utf-8";
const MAX_DELAY_MS = 10_000;

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function productPage({ country, session }) {
  const rows = Array.from({ length: 12 }, (_, index) => {
    const id = 1001 + index;
    return `<li class="product" data-id="${id}"><a href="/products/${id}"><h2>Sample product ${id}</h2></a><span class="price">${(19.9 + index * 7.5).toFixed(2)} EUR</span><span class="rating">${(3.6 + (index % 5) * 0.3).toFixed(1)}</span></li>`;
  }).join("\n      ");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Veyora sandbox shop</title>
    <meta name="description" content="A stable sample page for testing Web Unlocker integrations.">
  </head>
  <body>
    <h1>Sandbox shop</h1>
    <p id="exit">Exit country: ${escapeHtml(country ?? "any")} · Session: ${escapeHtml(session ?? "none")}</p>
    <ul id="products">
      ${rows}
    </ul>
  </body>
</html>
`;
}

// 1x1 transparent PNG, for testing the base64 body encoding.
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

const page = (status, body, { type = HTML, attempts = [{ pool: "residential", result: "ok", status }], solver = false, billable = true } = {}) =>
  ({ kind: "page", status, body: Buffer.isBuffer(body) ? body : Buffer.from(body), type, attempts, solver, billable });
const failure = (httpStatus, error, attempts, headers) => ({ kind: "error", httpStatus, error, attempts, headers });
const refusal = (httpStatus, error, headers) => ({ kind: "refusal", httpStatus, error, headers });

const blockedAttempt = (pool, extra = {}) => ({ pool, ...extra, result: "blocked", status: 403 });

export const SCENARIOS = [
  { path: "/ok", title: "Success", summary: "A normal page on the first try. 200, billed once.",
    run: (input) => page(200, productPage(input)) },
  { path: "/hard", title: "Protected site", summary: "Blocked twice, then unlocked by the CAPTCHA solver. Shows escalation and the solver surcharge.", delayMs: 1_500,
    run: (input) => page(200, productPage(input), { solver: true, attempts: [blockedAttempt("residential"), blockedAttempt("residential", { browser: true, camoufox: true }), { pool: "residential", solver: true, result: "ok", status: 200 }] }) },
  { path: "/blocked", title: "Blocked", summary: "Every attempt was blocked. HTTP 502, not charged.", delayMs: 800,
    run: () => failure(502, "The site blocked every attempt (3). You were not charged.", [blockedAttempt("residential"), blockedAttempt("residential", { browser: true, camoufox: true }), blockedAttempt("mobile")]) },
  { path: "/timeout", title: "Timeout", summary: "The site did not answer in time. HTTP 504, not charged.", delayMs: 1_200,
    run: () => failure(504, "The site did not answer in time. You were not charged.", [{ pool: "residential", result: "error", error: "TIMEOUT" }, { pool: "mobile", result: "error", error: "TIMEOUT" }]) },
  { path: "/unreachable", title: "Unreachable", summary: "The site could not be reached. HTTP 502, not charged.",
    run: () => failure(502, "Could not reach the site. You were not charged.", [{ pool: "residential", result: "error", error: "NETWORK" }]) },
  { path: "/not-found", title: "404 page", summary: "The site answered 404. That is the real answer, so it is returned and billed like a 200.",
    run: () => page(404, "<!doctype html><html><head><title>Not found</title></head><body><h1>404</h1><p>No such product.</p></body></html>") },
  { path: "/server-error", title: "Site error (5xx)", summary: "The site kept answering 500. The page is returned with success:false, not charged.",
    run: () => page(500, "<!doctype html><html><head><title>Error</title></head><body><h1>500 Internal Server Error</h1></body></html>", { billable: false, attempts: [{ pool: "residential", result: "retry", status: 500 }, { pool: "residential", result: "retry", status: 500 }] }) },
  { path: "/json", title: "JSON API", summary: "A JSON response, returned as text.",
    run: (input) => page(200, JSON.stringify({ products: [{ id: 1001, name: "Sample product 1001", price: 19.9 }], country: input.country ?? null }), { type: "application/json; charset=utf-8" }) },
  { path: "/binary", title: "Binary file", summary: "A PNG image. The body comes back base64-encoded (encoding: \"base64\").",
    run: () => page(200, PIXEL, { type: "image/png" }) },
  { path: "/large", title: "Large page", summary: "About 1 MB of HTML, for testing memory use and streaming.",
    run: (input) => page(200, productPage(input).replace("</ul>", `</ul>\n<!-- ${"padding ".repeat(131_072)}-->`)) },
  { path: "/slow", title: "Slow site", summary: "Succeeds after a delay. Use ?ms=5000 to choose it (10 s at most).", delayMs: 3_000,
    run: (input) => page(200, productPage(input)) },
  { path: "/echo", title: "Echo", summary: "Returns the options you sent (country, session) as JSON, to check your request.",
    run: (input) => page(200, JSON.stringify({ url: input.url.href, country: input.country, session: input.session }, null, 2), { type: "application/json; charset=utf-8" }) },
  { path: "/insufficient-balance", title: "Empty balance", summary: "HTTP 402: what a live key returns when the wallet is empty.",
    run: () => refusal(402, "Insufficient balance. Top up your wallet to keep unlocking.") },
  { path: "/rate-limited", title: "Rate limit", summary: "HTTP 429 with Retry-After.",
    run: () => refusal(429, "Rate limit exceeded", { "Retry-After": "60" }) },
  { path: "/busy", title: "Busy", summary: "HTTP 503 with Retry-After: retry shortly.",
    run: () => refusal(503, "Unlocker busy, retry shortly", { "Retry-After": "5" }) },
];

const byPath = new Map(SCENARIOS.map((scenario) => [scenario.path, scenario]));

export function scenarioList(host) {
  return SCENARIOS.map(({ path, title, summary }) => ({ url: `https://${host}${path}`, title, summary }));
}

// Returns the simulated outcome for a sandbox URL, or null for an unknown path.
export async function simulate(input, { sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const path = input.url.pathname === "/" ? "/ok" : input.url.pathname.replace(/\/$/, "");
  const scenario = byPath.get(path);
  if (!scenario) return null;
  const asked = Number(input.url.searchParams.get("ms"));
  const delayMs = input.url.searchParams.has("ms") && Number.isFinite(asked) ? Math.min(Math.max(asked, 0), MAX_DELAY_MS) : (scenario.delayMs ?? 0);
  if (delayMs > 0) await sleep(delayMs);
  return { scenario: path, ms: delayMs, ...scenario.run(input) };
}
