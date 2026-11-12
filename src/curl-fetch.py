#!/usr/bin/env python3
"""Fetch a URL through an upstream CONNECT proxy using curl_cffi's Chrome
TLS impersonation.  Communicates with the Node caller via JSON on
stdin/stdout so no npm dependency is needed.

Input  (JSON on stdin):
  url, proxyUrl, timeoutMs, maxBytes, headers (list of [name,value] pairs)

Output (JSON on stdout):
  status, headers (object), bodyBase64, wireBytes, protocol
  OR  error, code
"""

import json, sys, base64

def main():
    try:
        req = json.load(sys.stdin)
    except Exception:
        json.dump({"error": "Bad JSON input", "code": "INPUT"}, sys.stdout)
        return

    url = req.get("url", "")
    proxy_url = req.get("proxyUrl", "")
    timeout_s = max(1, req.get("timeoutMs", 15000) / 1000)
    max_bytes = req.get("maxBytes", 5 * 1024 * 1024)
    header_pairs = req.get("headers", [])

    headers = {}
    for name, value in header_pairs:
        headers[name] = value

    try:
        from curl_cffi import requests as cffi_requests

        proxies = {"http": proxy_url, "https": proxy_url} if proxy_url else None

        r = cffi_requests.get(
            url,
            headers=headers,
            proxies=proxies,
            timeout=timeout_s,
            impersonate="chrome",
            max_recv_speed=max_bytes * 2,
            allow_redirects=False,
        )

        body = r.content
        if len(body) > max_bytes:
            json.dump({"error": "Response too large", "code": "TOO_LARGE"}, sys.stdout)
            return

        resp_headers = {}
        for name in r.headers:
            lower = name.lower()
            if lower in resp_headers:
                existing = resp_headers[lower]
                if isinstance(existing, list):
                    existing.append(r.headers[name])
                else:
                    resp_headers[lower] = [existing, r.headers[name]]
            else:
                resp_headers[lower] = r.headers[name]

        json.dump({
            "status": r.status_code,
            "headers": resp_headers,
            "bodyBase64": base64.b64encode(body).decode("ascii"),
            "wireBytes": len(body),
            "protocol": "h2" if r.http_version == 2 else "http/1.1",
            "finalUrl": str(r.url),
        }, sys.stdout)

    except Exception as e:
        msg = str(e)
        code = "NETWORK"
        if "timeout" in msg.lower() or "timed out" in msg.lower():
            code = "TIMEOUT"
        elif "proxy" in msg.lower() or "407" in msg or "CONNECT" in msg:
            code = "PROXY"
        elif "too large" in msg.lower():
            code = "TOO_LARGE"
        elif "ssl" in msg.lower() or "tls" in msg.lower() or "certificate" in msg.lower():
            code = "TLS"
        json.dump({"error": msg, "code": code}, sys.stdout)

if __name__ == "__main__":
    main()
