import http from "node:http";
import http2 from "node:http2";
import net from "node:net";
import tls from "node:tls";
import zlib from "node:zlib";

// One GET through the upstream proxy, shaped like desktop Chrome as far as Node allows.
// The TLS ClientHello uses Chrome's cipher, curve and signature order and offers h2;
// Node cannot reproduce GREASE or Chrome's extension order, so sites that pin the full
// JA3/JA4 fingerprint can still tell. The unlocker takes the fetch function as a
// parameter, so a curl-impersonate or browser fetcher can replace this one later.

export const CHROME_MAJOR = "142";
const USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_MAJOR}.0.0.0 Safari/537.36`;
const SEC_CH_UA = `"Chromium";v="${CHROME_MAJOR}", "Google Chrome";v="${CHROME_MAJOR}", "Not_A Brand";v="99"`;

const CHROME_CIPHERS = [
  "TLS_AES_128_GCM_SHA256", "TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256",
  "ECDHE-ECDSA-AES128-GCM-SHA256", "ECDHE-RSA-AES128-GCM-SHA256", "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384", "ECDHE-ECDSA-CHACHA20-POLY1305", "ECDHE-RSA-CHACHA20-POLY1305",
  "ECDHE-RSA-AES128-SHA", "ECDHE-RSA-AES256-SHA", "AES128-GCM-SHA256", "AES256-GCM-SHA384",
  "AES128-SHA", "AES256-SHA",
].join(":");
const CHROME_SIGALGS = [
  "ecdsa_secp256r1_sha256", "rsa_pss_rsae_sha256", "rsa_pkcs1_sha256", "ecdsa_secp384r1_sha384",
  "rsa_pss_rsae_sha384", "rsa_pkcs1_sha384", "rsa_pss_rsae_sha512", "rsa_pkcs1_sha512",
].join(":");
const CHROME_CURVES = "X25519:P-256:P-384";
// Chrome's HTTP/2 SETTINGS frame.
const CHROME_H2_CONNECTION_WINDOW = 15_728_640;
const CHROME_H2_SETTINGS = { headerTableSize: 65_536, enablePush: false, initialWindowSize: 6_291_456, maxHeaderListSize: 262_144 };

const MAX_PROXY_HANDSHAKE_BYTES = 16 * 1024;

export class FetchError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Chrome's navigation headers, in Chrome's order. HTTP/1.1 keeps this casing; HTTP/2
// sends them lower-cased after the pseudo-headers.
export function chromeHeaders({ cookie = "", referer = "" } = {}) {
  const headers = [
    ["sec-ch-ua", SEC_CH_UA],
    ["sec-ch-ua-mobile", "?0"],
    ["sec-ch-ua-platform", '"Windows"'],
    ["Upgrade-Insecure-Requests", "1"],
    ["User-Agent", USER_AGENT],
    ["Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"],
    ["Sec-Fetch-Site", referer ? "same-origin" : "none"],
    ["Sec-Fetch-Mode", "navigate"],
    ["Sec-Fetch-User", "?1"],
    ["Sec-Fetch-Dest", "document"],
  ];
  if (referer) headers.push(["Referer", referer]);
  // Always compressed: it is the cheapest traffic and what a real browser asks for.
  headers.push(["Accept-Encoding", "gzip, deflate, br"]);
  headers.push(["Accept-Language", "en-US,en;q=0.9"]);
  if (cookie) headers.push(["Cookie", cookie]);
  return headers;
}

function decoderFor(encoding) {
  switch (String(encoding ?? "").trim().toLowerCase()) {
    case "":
    case "identity":
      return null;
    case "br":
      return zlib.createBrotliDecompress();
    case "gzip":
    case "x-gzip":
      return zlib.createGunzip();
    case "deflate":
      return zlib.createInflate();
    default:
      throw new FetchError("ENCODING", `Unsupported content encoding: ${encoding}`);
  }
}

// Reads a body stream, decompressing it, and fails once either the compressed or the
// decompressed size passes maxBytes (a small compressed bomb cannot exhaust memory).
function readBody(stream, encoding, maxBytes) {
  return new Promise((resolve, reject) => {
    let decoder;
    try { decoder = decoderFor(encoding); } catch (error) { reject(error); stream.destroy(); return; }
    const chunks = [];
    let rawSize = 0;
    let size = 0;
    let done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      if (error) {
        stream.destroy();
        decoder?.destroy();
        reject(error);
      } else {
        resolve(value);
      }
    };
    const collect = (chunk) => {
      size += chunk.length;
      if (size > maxBytes) return finish(new FetchError("TOO_LARGE", "Response is too large"));
      chunks.push(chunk);
    };
    stream.on("data", (chunk) => {
      rawSize += chunk.length;
      if (rawSize > maxBytes) return finish(new FetchError("TOO_LARGE", "Response is too large"));
      if (decoder) decoder.write(chunk);
      else collect(chunk);
    });
    stream.on("error", (error) => finish(error.code ? error : new FetchError("NETWORK", error.message)));
    stream.on("aborted", () => finish(new FetchError("NETWORK", "Response aborted")));
    if (decoder) {
      decoder.on("data", collect);
      decoder.on("error", () => finish(new FetchError("ENCODING", "Response body could not be decompressed")));
      decoder.on("end", () => finish(null, Buffer.concat(chunks)));
      stream.on("end", () => decoder.end());
    } else {
      stream.on("end", () => finish(null, Buffer.concat(chunks)));
    }
  });
}

function plainHeaders(source) {
  const headers = {};
  for (const [name, value] of Object.entries(source)) {
    if (name.startsWith(":")) continue;
    headers[name.toLowerCase()] = value;
  }
  return headers;
}

function openProxySocket(proxy) {
  return proxy.tls
    ? tls.connect({
        host: proxy.host,
        port: proxy.port,
        servername: net.isIP(proxy.host) ? undefined : proxy.host,
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
        ...proxy.tlsOptions,
      })
    : net.connect(proxy.port, proxy.host);
}

// Sends CONNECT and resolves once the proxy answers 200. Anything else is a provider
// failure (bad exit, no capacity), which is worth retrying on another IP or pool.
function openTunnel(socket, proxy, authority) {
  return new Promise((resolve, reject) => {
    let buffered = Buffer.alloc(0);
    const ready = proxy.tls ? "secureConnect" : "connect";
    socket.once(ready, () => {
      socket.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\nProxy-Authorization: ${proxy.authorization}\r\n\r\n`);
    });
    const onError = (error) => reject(new FetchError("PROXY", `Upstream proxy connection failed: ${error.message}`));
    const onData = (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
      const end = buffered.indexOf("\r\n\r\n");
      if (end === -1) {
        if (buffered.length > MAX_PROXY_HANDSHAKE_BYTES) reject(new FetchError("PROXY", "Upstream proxy handshake too large"));
        return;
      }
      socket.off("data", onData);
      socket.off("error", onError);
      const statusLine = buffered.subarray(0, end).toString("latin1").split("\r\n")[0];
      const match = /^HTTP\/1\.[01] (\d{3})/.exec(statusLine);
      if (!match || match[1] !== "200") {
        reject(new FetchError("PROXY", `Upstream proxy refused the tunnel (${match?.[1] ?? "bad response"})`));
        return;
      }
      const rest = buffered.subarray(end + 4);
      if (rest.length) socket.unshift(rest);
      socket.pause();
      resolve();
    };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", () => reject(new FetchError("PROXY", "Upstream proxy closed the connection")));
  });
}

function http1Request({ createConnection, path, headers, maxBytes }) {
  return new Promise((resolve, reject) => {
    const request = http.request({ method: "GET", path, headers: headers.flat(), createConnection }, (response) => {
      readBody(response, response.headers["content-encoding"], maxBytes).then((body) => {
        resolve({ status: response.statusCode, headers: plainHeaders(response.headers), body, protocol: "http/1.1" });
      }, reject);
    });
    request.on("error", (error) => reject(error instanceof FetchError ? error : new FetchError("NETWORK", error.message)));
    request.end();
  });
}

function http2Request({ secureSocket, url, headers, maxBytes }) {
  return new Promise((resolve, reject) => {
    const session = http2.connect(url.origin, { createConnection: () => secureSocket, settings: CHROME_H2_SETTINGS });
    const fail = (error) => {
      session.destroy();
      reject(error instanceof FetchError ? error : new FetchError("NETWORK", error.message));
    };
    session.on("error", fail);
    // Chrome raises the connection window to 15 MB with a WINDOW_UPDATE right away.
    session.once("connect", () => session.setLocalWindowSize(CHROME_H2_CONNECTION_WINDOW));
    const requestHeaders = {
      ":method": "GET",
      ":authority": url.host,
      ":scheme": "https",
      ":path": `${url.pathname}${url.search}`,
    };
    for (const [name, value] of headers) requestHeaders[name.toLowerCase()] = value;
    const stream = session.request(requestHeaders, { endStream: true });
    stream.on("error", fail);
    stream.once("response", (responseHeaders) => {
      readBody(stream, responseHeaders["content-encoding"], maxBytes).then((body) => {
        session.close();
        resolve({ status: Number(responseHeaders[":status"]), headers: plainHeaders(responseHeaders), body, protocol: "h2" });
      }, fail);
    });
  });
}

// proxy: { host, port, tls, authorization, tlsOptions? }. tlsOptions (for example a test
// CA) apply to the target connection; they never turn certificate checks off.
export async function fetchThroughProxy({ url, proxy, timeoutMs, maxBytes, cookie = "", referer = "", tlsOptions = {} }) {
  const target = url instanceof URL ? url : new URL(url);
  const socket = openProxySocket(proxy);
  let secureSocket = null;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new FetchError("TIMEOUT", "Target did not answer in time")), timeoutMs);
  });
  const headers = chromeHeaders({ cookie, referer });
  const run = async () => {
    if (target.protocol === "http:") {
      // Plain HTTP goes to the proxy as an absolute-URI request, like the gateway does.
      const port = target.port || "80";
      return http1Request({
        createConnection: () => socket,
        path: `http://${target.hostname}:${port}${target.pathname}${target.search}`,
        headers: [["Host", target.host], ["Proxy-Authorization", proxy.authorization], ...headers],
        maxBytes,
      });
    }
    const port = target.port || "443";
    const authority = `${net.isIPv6(target.hostname) ? `[${target.hostname}]` : target.hostname}:${port}`;
    await openTunnel(socket, proxy, authority);
    secureSocket = tls.connect({
      socket,
      servername: net.isIP(target.hostname) ? undefined : target.hostname,
      ALPNProtocols: ["h2", "http/1.1"],
      ciphers: CHROME_CIPHERS,
      sigalgs: CHROME_SIGALGS,
      ecdhCurve: CHROME_CURVES,
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      ...tlsOptions,
    });
    await new Promise((resolve, reject) => {
      secureSocket.once("secureConnect", resolve);
      secureSocket.once("error", (error) => reject(new FetchError("TLS", `TLS handshake failed: ${error.message}`)));
    });
    if (secureSocket.alpnProtocol === "h2") return http2Request({ secureSocket, url: target, headers, maxBytes });
    return http1Request({
      createConnection: () => secureSocket,
      path: `${target.pathname}${target.search}`,
      headers: [["Host", target.host], ["Connection", "keep-alive"], ...headers],
      maxBytes,
    });
  };
  try {
    const work = run();
    work.catch(() => {}); // if the deadline wins, the late failure must not go unhandled
    const result = await Promise.race([work, deadline]);
    return { ...result, wireBytes: socket.bytesRead + socket.bytesWritten };
  } catch (error) {
    error.wireBytes = socket.bytesRead + socket.bytesWritten;
    throw error;
  } finally {
    clearTimeout(timer);
    secureSocket?.destroy();
    socket.destroy();
  }
}
