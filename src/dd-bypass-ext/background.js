// Intercept captcha-delivery.com JS responses and neutralize devtools detection.
// Uses Firefox's filterResponseData() — a native extension API, invisible to
// Playwright's automation layer and to DataDome's anti-tampering checks.

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const chunks = [];

    filter.ondata = (event) => {
      chunks.push(event.data);
    };

    filter.onstop = () => {
      const decoder = new TextDecoder("utf-8");
      const encoder = new TextEncoder();

      let body = "";
      for (const chunk of chunks) {
        body += decoder.decode(chunk, { stream: true });
      }
      body += decoder.decode();

      if (/[Dd]ev[Tt]ools/.test(body)) {
        body = body.replace(/DevTools/g, "XXXXXXXX");
        body = body.replace(/devtools/gi, "xxxxxxxx");
      }

      filter.write(encoder.encode(body));
      filter.close();
    };

    filter.onerror = () => {
      try { filter.disconnect(); } catch (e) {}
    };
  },
  { urls: ["*://*.captcha-delivery.com/*.js*"], types: ["script", "xmlhttprequest"] },
  ["blocking"]
);
