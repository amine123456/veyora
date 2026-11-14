"""
Camoufox-based page fetcher.  Runs as a subprocess from Node.js.

Input: JSON on stdin with keys:
  url, proxy {server, username, password}, country, cookie, referer,
  useReferer, timeoutMs, maxBytes, addons[]

Output: JSON on stdout with keys:
  status, headers {}, body (base64), wireBytes, finalUrl, error?
"""

import sys, json, time, base64, random, warnings, os
warnings.filterwarnings("ignore")

def main():
    conf = json.loads(sys.stdin.read())
    url = conf["url"]
    proxy_conf = conf.get("proxy")
    country = conf.get("country", "")
    cookie = conf.get("cookie", "")
    referer = conf.get("referer", "")
    use_referer = conf.get("useReferer", False)
    timeout_ms = conf.get("timeoutMs", 45000)
    max_bytes = conf.get("maxBytes", 5_000_000)
    addons = conf.get("addons", [])

    from camoufox.sync_api import Camoufox
    from camoufox.virtdisplay import VirtualDisplay

    locales = {
        "fr": ("fr-FR", "Europe/Paris"),
        "de": ("de-DE", "Europe/Berlin"),
        "es": ("es-ES", "Europe/Madrid"),
        "it": ("it-IT", "Europe/Rome"),
        "nl": ("nl-NL", "Europe/Amsterdam"),
        "br": ("pt-BR", "America/Sao_Paulo"),
        "jp": ("ja-JP", "Asia/Tokyo"),
    }
    locale, tz = locales.get(country, ("en-US", "America/New_York"))

    google_domains = {
        "fr": "google.fr", "de": "google.de", "es": "google.es",
        "it": "google.it", "nl": "google.nl", "br": "google.com.br",
        "jp": "google.co.jp",
    }

    vd = VirtualDisplay()
    display = vd.get()

    from camoufox.addons import DefaultAddons

    kwargs = dict(
        humanize=True,
        geoip=True,
        block_webrtc=True,
        os=["windows", "macos"],
        i_know_what_im_doing=True,
        headless=False,
        virtual_display=display,
        exclude_addons=[DefaultAddons.UBO],
    )
    if proxy_conf:
        kwargs["proxy"] = proxy_conf
    if addons:
        kwargs["addons"] = addons

    timeout_s = timeout_ms / 1000

    try:
        with Camoufox(**kwargs) as browser:
            context = browser.new_context(
                viewport={"width": 1366 + random.randint(-50, 50),
                          "height": 768 + random.randint(-30, 30)},
                locale=locale,
                timezone_id=tz,
            )
            page = context.new_page()

            if cookie:
                from urllib.parse import urlparse
                parsed = urlparse(url)
                cookies = []
                for pair in cookie.split("; "):
                    if "=" not in pair:
                        continue
                    name, _, value = pair.partition("=")
                    cookies.append({"name": name, "value": value,
                                    "domain": parsed.hostname, "path": "/"})
                if cookies:
                    context.add_cookies(cookies)

            if use_referer:
                gdomain = google_domains.get(country, "google.com")
                try:
                    page.goto(f"https://www.{gdomain}/",
                              wait_until="domcontentloaded",
                              timeout=min(10000, timeout_ms // 3))
                    page.wait_for_timeout(500 + random.randint(0, 1000))
                    _simulate_human(page)
                except Exception:
                    pass

            nav_referer = "https://www.google.com/" if use_referer else (referer or None)

            resp = page.goto(url, wait_until="domcontentloaded",
                             timeout=timeout_ms, referer=nav_referer)

            _simulate_human(page)

            # Settle loop: wait for challenges / DataDome / Akamai / Turnstile
            settle_end = time.time() + min(30, timeout_s - 5)
            akamai_reloaded = False
            turnstile_clicked = False
            while time.time() < settle_end:
                page.wait_for_timeout(2000)

                # Check for DataDome challenge
                dd = page.evaluate("""() => {
                    const frames = document.querySelectorAll('iframe[src*="captcha-delivery"], iframe[src*="datadome"]');
                    if (frames.length) return 'captcha';
                    const html = document.documentElement.outerHTML;
                    if (html.length < 5000 && /captcha-delivery|datadome/i.test(html)) return 'block';
                    return 'none';
                }""")
                if dd == "none":
                    challenge_info = page.evaluate("""() => {
                        const html = document.documentElement.outerHTML;
                        if (html.length > 10000) return {isChallenge: false, isAkamai: false, isTurnstile: false};
                        const meta = document.querySelector('meta[http-equiv="refresh"]');
                        const title = document.title.toLowerCase();
                        const isTurnstile = !!document.querySelector('iframe[src*="challenges.cloudflare.com"]')
                            || !!document.querySelector('.cf-turnstile');
                        const isChallenge = !!(meta || /captcha|challenge|verify|blocked/i.test(html)
                                  || title.includes('just a moment') || title.includes('checking')
                                  || isTurnstile);
                        const isAkamai = /access.denied|zugriff.verweigert/i.test(title)
                            || /akamaighost/i.test(html)
                            || /errors\\.edgesuite\\.net/i.test(html)
                            || /\\/_sec\\/cp_challenge/i.test(html);
                        return {isChallenge: isChallenge, isAkamai: isAkamai, isTurnstile: isTurnstile};
                    }""")
                    if not challenge_info.get("isChallenge", False):
                        break

                    # Cloudflare Turnstile: click the verification checkbox
                    if challenge_info.get("isTurnstile", False) and not turnstile_clicked:
                        turnstile_clicked = True
                        for frame in page.frames:
                            if "challenges.cloudflare.com" in frame.url:
                                try:
                                    cb = frame.query_selector("input[type='checkbox']") or frame.query_selector(".mark")
                                    if cb:
                                        box = cb.bounding_box()
                                        if box:
                                            page.mouse.click(box["x"] + box["width"] / 2,
                                                             box["y"] + box["height"] / 2)
                                            page.wait_for_timeout(3000 + random.randint(0, 2000))
                                except Exception:
                                    pass
                                break
                        continue

                    # Akamai: sensor JS sets _abck cookie, then page must reload
                    if challenge_info.get("isAkamai", False) and not akamai_reloaded:
                        akamai_reloaded = True
                        page.wait_for_timeout(3000 + random.randint(0, 2000))
                        try:
                            _simulate_human(page)
                            page.reload(wait_until="domcontentloaded",
                                        timeout=min(15000, int((settle_end - time.time()) * 1000)))
                            _simulate_human(page)
                        except Exception:
                            pass
                        continue
                # else continue waiting

            final_url = page.url
            html = page.content()
            body = html.encode("utf-8")
            if len(body) > max_bytes:
                _output({"error": "TOO_LARGE"})
                return

            status = resp.status if resp else 200
            headers = dict(resp.headers) if resp else {}
            headers["content-type"] = "text/html; charset=utf-8"
            headers.pop("content-encoding", None)
            headers.pop("content-length", None)

            cookies_out = context.cookies()
            if cookies_out:
                headers["set-cookie"] = "; ".join(
                    f"{c['name']}={c['value']}" for c in cookies_out
                )

            _output({
                "status": status,
                "headers": headers,
                "body": base64.b64encode(body).decode(),
                "wireBytes": len(body),
                "finalUrl": final_url,
            })

    except Exception as e:
        code = "TIMEOUT" if "timeout" in str(e).lower() else "NETWORK"
        _output({"error": code, "message": str(e)[:500]})
    finally:
        try:
            vd.kill()
        except Exception:
            pass


def _simulate_human(page):
    try:
        vp = page.viewport_size or {"width": 1366, "height": 768}
        for _ in range(random.randint(2, 5)):
            page.mouse.move(
                random.randint(100, vp["width"] - 100),
                random.randint(100, vp["height"] - 100),
            )
            page.wait_for_timeout(random.randint(50, 200))
        page.wait_for_timeout(random.randint(300, 800))
    except Exception:
        pass


def _output(data):
    sys.stdout.write(json.dumps(data))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
