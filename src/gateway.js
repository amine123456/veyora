import dns from "node:dns/promises";
import fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { domainToASCII } from "node:url";
import { AUTH_BUSY, createClientAuthParser, upstreamAuthorization, upstreamEndpoint } from "./auth.js";
import { meter } from "./meter.js";

const FIXED_HOP_HEADERS = new Set([
  "connection", "proxy-connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
]);

const blockedAddresses = new net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
]) blockedAddresses.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96],
  ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 32], ["2001:2::", 48],
  ["2001:10::", 28], ["2001:20::", 28], ["2001:db8::", 32], ["2002::", 16],
  ["5f00::", 16], ["fc00::", 7], ["fec0::", 10], ["fe80::", 10], ["ff00::", 8],
]) blockedAddresses.addSubnet(address, prefix, "ipv6");

function reject(responseOrSocket, status = 407, message = "Proxy authentication required") {
  if (responseOrSocket.destroyed || responseOrSocket.writableEnded) return;
  const headers = {
    Connection: "close",
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (status === 407) headers["Proxy-Authenticate"] = 'Basic realm="Private Gateway"';
  if ("writeHead" in responseOrSocket) {
    if (responseOrSocket.headersSent) {
      responseOrSocket.end();
      return;
    }
    responseOrSocket.writeHead(status, headers);
    responseOrSocket.end(message);
  } else {
    const reason = http.STATUS_CODES[status] ?? "Error";
    const extra = status === 407 ? 'Proxy-Authenticate: Basic realm="Private Gateway"\r\n' : "";
    responseOrSocket.end(`HTTP/1.1 ${status} ${reason}\r\n${extra}Connection: close\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`);
  }
}

function sanitizeHeaders(headers, replacements = {}) {
  const connectionTokens = new Set();
  for (const name of ["connection", "proxy-connection"]) {
    const value = headers[name];
    if (typeof value === "string") {
      for (const token of value.split(",")) connectionTokens.add(token.trim().toLowerCase());
    }
  }
  const clean = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (FIXED_HOP_HEADERS.has(lower) || connectionTokens.has(lower) || value === undefined) continue;
    clean[lower] = value;
  }
  return { ...clean, ...replacements };
}

function allowedHostname(hostname, allowlist) {
  if (allowlist.length === 0) return true;
  return allowlist.some((entry) => {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1);
      return hostname.endsWith(suffix) && hostname.length > suffix.length;
    }
    return hostname === entry;
  });
}

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (!family) return false;
  if (family === 6 && address.toLowerCase().startsWith("::ffff:")) {
    return isPublicAddress(address.slice(7));
  }
  return !blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6");
}

async function resolveTarget(hostname, config, lookup) {
  const ascii = domainToASCII(hostname.replace(/^\[|\]$/g, "")).toLowerCase();
  if (!ascii || ascii.length > 253 || ascii === "localhost" || ascii.endsWith(".local")) return null;
  if (!allowedHostname(ascii, config.destinationAllowlist)) return null;

  const directFamily = net.isIP(ascii);
  if (directFamily) return isPublicAddress(ascii) ? { hostname: ascii, address: ascii } : null;

  let timer;
  try {
    const timeout = new Promise((_, rejectPromise) => {
      timer = setTimeout(() => rejectPromise(new Error("DNS timeout")), config.dnsTimeoutMs);
    });
    const records = await Promise.race([lookup(ascii, { all: true, verbatim: true }), timeout]);
    if (records.length === 0 || records.some(({ address }) => !isPublicAddress(address))) return null;
    return { hostname: ascii, address: records[0].address };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseAuthority(authority) {
  if (typeof authority !== "string" || authority.length > 512 || /[\s/@?#]/.test(authority)) return null;
  const match = authority.startsWith("[")
    ? /^\[([^\]]+)]:(\d{1,5})$/.exec(authority)
    : /^([^:]+):(\d{1,5})$/.exec(authority);
  if (!match) return null;
  const port = Number(match[2]);
  if (port < 1 || port > 65535) return null;
  return { hostname: match[1], port };
}

function formatAuthority(address, port) {
  return `${net.isIPv6(address) ? `[${address}]` : address}:${port}`;
}

function authLimiter(maxPerMinute) {
  const buckets = new Map();
  const maxTrackedAddresses = 10_000;
  const keyFor = (address) => address ?? "unknown";
  const freshBucket = (bucket, now) => bucket && now - bucket.startedAt < 60_000;
  const cleanup = (now) => {
    for (const [bucketKey, value] of buckets) {
      if (!freshBucket(value, now)) buckets.delete(bucketKey);
    }
  };
  const canTrack = (key, now) => {
    if (buckets.has(key)) return true;
    if (buckets.size >= maxTrackedAddresses) cleanup(now);
    return buckets.size < maxTrackedAddresses;
  };
  return {
    allowed(address) {
      const key = keyFor(address);
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!freshBucket(bucket, now)) return canTrack(key, now);
      return bucket.count < maxPerMinute;
    },
    fail(address) {
      const key = keyFor(address);
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!freshBucket(bucket, now)) {
        if (!canTrack(key, now)) return;
        buckets.set(key, { startedAt: now, count: 1 });
        return;
      }
      bucket.count += 1;
    },
  };
}

function connectionLimiter(config) {
  let total = 0;
  const perClient = new Map();
  return (username) => {
    const current = perClient.get(username) ?? 0;
    if (total >= config.maxConnectionsGlobal || current >= config.maxConnectionsPerClient) return null;
    total += 1;
    perClient.set(username, current + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      total -= 1;
      const next = (perClient.get(username) ?? 1) - 1;
      if (next <= 0) perClient.delete(username); else perClient.set(username, next);
    };
  };
}

function connectToUpstream(config, pool) {
  const { host, port } = upstreamEndpoint(config, pool);
  return config.upstreamTls
    ? tls.connect({
        host,
        port,
        servername: net.isIP(host) ? undefined : host,
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      })
    : net.connect(port, host);
}

// How a client's traffic is paid for. Residential spends prepaid GB first, then the
// wallet; mobile is wallet-only, because prepaid GB were sold at the residential price.
function billingFor(client, pricing) {
  if (client.routing?.pool === "mobile") {
    return { pool: "mobile", pricePerGbMicros: pricing?.mobilePerGbMicros ?? 0, allowQuota: false };
  }
  return { pool: "residential", pricePerGbMicros: pricing?.residentialPerGbMicros ?? 0, allowQuota: true };
}

function canPay(client, billing) {
  return (billing.allowQuota && client.remainingBytes > 0)
    || (billing.pricePerGbMicros > 0 && (client.balanceMicros ?? 0) > 0);
}

export async function createGateway(config, { lookup = dns.lookup, pricing = null } = {}) {
  if (typeof lookup !== "function") throw new TypeError("lookup must be a function");
  const parseClientAuth = createClientAuthParser(config.maxConcurrentAuth);
  const authAttempts = authLimiter(config.authAttemptsPerMinute);
  const acquireConnection = connectionLimiter(config);

  const handleRequest = async (request, response) => {
    if (!authAttempts.allowed(request.socket.remoteAddress)) return reject(response, 429, "Too many authentication attempts");
    const client = await parseClientAuth(request.headers["proxy-authorization"]);
    if (client === AUTH_BUSY) return reject(response, 503, "Gateway busy, retry shortly");
    if (!client) {
      authAttempts.fail(request.socket.remoteAddress);
      return reject(response);
    }
    const billing = billingFor(client, pricing);
    if (billing.pool === "mobile" && !config.upstreamMobile) return reject(response, 403, "Mobile proxies are not available");
    if (!canPay(client, billing)) return reject(response, 403, "Traffic quota exhausted");
    const upstreamAuth = upstreamAuthorization(config, { username: client.username, ...client.routing });
    const releaseConnection = acquireConnection(client.username);
    if (!releaseConnection) return reject(response, 429, "Connection limit reached");
    response.once("close", releaseConnection);
    response.once("finish", releaseConnection);

    let target;
    try { target = new URL(request.url); } catch { return reject(response, 400, "Absolute HTTP URL required"); }
    if (target.protocol !== "http:" || target.username || target.password) return reject(response, 400, "Absolute HTTP URL required");
    const port = target.port ? Number(target.port) : 80;
    if (!config.destinationPorts.has(port)) return reject(response, 403, "Destination port blocked");
    const resolved = await resolveTarget(target.hostname, config, lookup);
    if (!resolved) return reject(response, 403, "Destination blocked");

    // The upstream provider connects to the destination, not this server, so it gets the
    // hostname: Host-based sites need it, and exit-side DNS picks the right regional servers.
    // The lookup above still refuses names that resolve to private addresses.
    const upstreamUrl = `http://${formatAuthority(resolved.hostname, port)}${target.pathname}${target.search}`;
    const headers = sanitizeHeaders(request.headers, {
      host: target.host,
      "proxy-authorization": upstreamAuth,
      connection: "close",
    });
    const requestModule = config.upstreamTls ? https : http;
    const endpoint = upstreamEndpoint(config, billing.pool);
    let responseStartTimer;
    let down;
    const upstreamRequest = requestModule.request({
      host: endpoint.host,
      port: endpoint.port,
      method: request.method,
      path: upstreamUrl,
      headers,
      servername: config.upstreamTls && !net.isIP(endpoint.host)
        ? endpoint.host
        : undefined,
      rejectUnauthorized: config.upstreamTls ? true : undefined,
      minVersion: config.upstreamTls ? "TLSv1.2" : undefined,
    }, (upstreamResponse) => {
      clearTimeout(responseStartTimer);
      upstreamResponse.setTimeout(config.idleTimeoutMs, () => upstreamResponse.destroy(new Error("Upstream response timeout")));
      upstreamResponse.on("error", fail);
      response.writeHead(upstreamResponse.statusCode ?? 502, sanitizeHeaders(upstreamResponse.headers, { connection: "close" }));
      const close = () => upstreamRequest.destroy();
      down = meter(client.username, true, close, config.quotaReservationBytes, billing);
      down.on("error", () => response.destroy());
      upstreamResponse.pipe(down).pipe(response);
    });
    const fail = () => {
      clearTimeout(responseStartTimer);
      if (response.destroyed || response.writableEnded) return;
      if (!response.headersSent) response.writeHead(502, { Connection: "close" });
      response.end();
    };
    responseStartTimer = setTimeout(() => upstreamRequest.destroy(new Error("Upstream response timeout")), config.requestTimeoutMs);
    responseStartTimer.unref?.();
    upstreamRequest.setTimeout(config.idleTimeoutMs, () => upstreamRequest.destroy(new Error("Upstream idle timeout")));
    upstreamRequest.on("error", fail);
    upstreamRequest.on("close", () => clearTimeout(responseStartTimer));
    request.setTimeout(config.idleTimeoutMs, () => request.destroy(new Error("Client timeout")));
    request.on("aborted", () => upstreamRequest.destroy());
    request.on("error", () => upstreamRequest.destroy());
    response.on("error", () => upstreamRequest.destroy());
    const up = meter(client.username, config.billingMode === "total", () => upstreamRequest.destroy(), config.quotaReservationBytes, billing);
    up.on("error", () => upstreamRequest.destroy());
    // Meters only return unused reservations when they end or are destroyed. An aborted
    // client never ends them, so destroy them when the response closes for any reason.
    response.once("close", () => {
      up.destroy();
      down?.destroy();
      upstreamRequest.destroy();
    });
    request.pipe(up).pipe(upstreamRequest);
  };

  const listener = (request, response) => {
    request.pause();
    void handleRequest(request, response).catch(() => reject(response, 500, "Gateway error"));
  };
  let server;
  if (config.tlsCertFile && config.tlsKeyFile) {
    const [cert, key] = await Promise.all([fs.readFile(config.tlsCertFile), fs.readFile(config.tlsKeyFile)]);
    server = https.createServer({ cert, key, minVersion: "TLSv1.2" }, listener);
  } else {
    server = http.createServer(listener);
  }

  server.on("connect", (request, clientSocket, head) => {
    clientSocket.pause();
    // The HTTP server stops handling errors on a socket it hands to "connect". Without this,
    // a client that resets the connection (after a 407, say) crashes the whole process.
    clientSocket.on("error", () => clientSocket.destroy());
    void (async () => {
      if (!authAttempts.allowed(clientSocket.remoteAddress)) return reject(clientSocket, 429, "Too many authentication attempts");
      const client = await parseClientAuth(request.headers["proxy-authorization"]);
      if (client === AUTH_BUSY) return reject(clientSocket, 503, "Gateway busy, retry shortly");
      if (!client) {
        authAttempts.fail(clientSocket.remoteAddress);
        return reject(clientSocket);
      }
      const billing = billingFor(client, pricing);
      if (billing.pool === "mobile" && !config.upstreamMobile) return reject(clientSocket, 403, "Mobile proxies are not available");
      if (!canPay(client, billing)) return reject(clientSocket, 403, "Traffic quota exhausted");
      const upstreamAuth = upstreamAuthorization(config, { username: client.username, ...client.routing });
      const releaseConnection = acquireConnection(client.username);
      if (!releaseConnection) return reject(clientSocket, 429, "Connection limit reached");
      clientSocket.once("close", releaseConnection);

      const authority = parseAuthority(request.url);
      if (!authority || !config.destinationPorts.has(authority.port)) return reject(clientSocket, 403, "Destination blocked");
      const resolved = await resolveTarget(authority.hostname, config, lookup);
      if (!resolved) return reject(clientSocket, 403, "Destination blocked");
      const upstreamTarget = formatAuthority(resolved.hostname, authority.port);

      const upstreamSocket = connectToUpstream(config, billing.pool);
      let handshake = Buffer.alloc(0);
      let handshakeTimer;
      let up;
      let down;
      const closeBoth = () => {
        clearTimeout(handshakeTimer);
        clientSocket.destroy();
        upstreamSocket.destroy();
      };
      const lifetimeTimer = setTimeout(closeBoth, config.maxTunnelLifetimeMs);
      lifetimeTimer.unref?.();
      handshakeTimer = setTimeout(closeBoth, config.requestTimeoutMs);
      handshakeTimer.unref?.();
      clientSocket.setTimeout(config.idleTimeoutMs, closeBoth);
      upstreamSocket.setTimeout(config.requestTimeoutMs, () => upstreamSocket.destroy(new Error("Upstream timeout")));
      clientSocket.once("close", () => {
        clearTimeout(lifetimeTimer);
        clearTimeout(handshakeTimer);
        // A client that drops never ends the meters; destroying them returns unused
        // reservations, and the upstream tunnel has no one left to serve.
        up?.destroy();
        down?.destroy();
        upstreamSocket.destroy();
      });
      upstreamSocket.once("close", () => {
        clearTimeout(handshakeTimer);
        if (!clientSocket.destroyed) clientSocket.destroy();
      });
      const readyEvent = config.upstreamTls ? "secureConnect" : "connect";
      upstreamSocket.once(readyEvent, () => {
        upstreamSocket.write(`CONNECT ${upstreamTarget} HTTP/1.1\r\nHost: ${upstreamTarget}\r\nProxy-Authorization: ${upstreamAuth}\r\nConnection: keep-alive\r\n\r\n`);
      });
      const onHandshake = (chunk) => {
        const combined = Buffer.concat([handshake, chunk]);
        const end = combined.indexOf("\r\n\r\n");
        if ((end === -1 && combined.length > config.connectHandshakeMaxBytes)
          || (end !== -1 && end + 4 > config.connectHandshakeMaxBytes)) {
          closeBoth();
          return;
        }
        handshake = combined;
        if (end === -1) {
          return;
        }
        upstreamSocket.off("data", onHandshake);
        clearTimeout(handshakeTimer);
        const firstLine = handshake.subarray(0, end).toString("latin1").split("\r\n")[0];
        if (!/^HTTP\/1\.[01] 200\b/.test(firstLine)) {
          reject(clientSocket, 502, "Upstream proxy rejected tunnel");
          upstreamSocket.destroy();
          return;
        }

        upstreamSocket.setTimeout(config.idleTimeoutMs, closeBoth);
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        up = meter(client.username, config.billingMode === "total", closeBoth, config.quotaReservationBytes, billing);
        down = meter(client.username, true, closeBoth, config.quotaReservationBytes, billing);
        up.on("error", closeBoth);
        down.on("error", closeBoth);
        up.pipe(upstreamSocket);
        down.pipe(clientSocket);
        if (head.length) up.write(head);
        const remainder = handshake.subarray(end + 4);
        if (remainder.length) down.write(remainder);
        clientSocket.pipe(up);
        upstreamSocket.pipe(down);
        clientSocket.resume();
      };
      upstreamSocket.on("data", onHandshake);
      upstreamSocket.on("error", closeBoth);
      clientSocket.on("error", closeBoth);
    })().catch(() => reject(clientSocket, 500, "Gateway error"));
  });

  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = Math.min(config.requestTimeoutMs, 60_000);
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 100;
  server.on("clientError", (error, socket) => {
    // An idle connection timing out has nothing to answer; a 400 could land on a fresh request.
    if (error.code === "ECONNRESET" || !socket.writable) return;
    if (error.code === "ERR_HTTP_REQUEST_TIMEOUT") {
      socket.destroy();
      return;
    }
    if (!socket.destroyed && !socket.writableEnded) {
      socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
    }
  });
  return server;
}
