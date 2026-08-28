#!/usr/bin/env python3
"""OneDayOnly deal watcher.

Fetches the day's deals from onedayonly.co.za and sends a WhatsApp alert
(via CallMeBot) for anything that is:
  - cheaper than MAX_PRICE rand (default R50), or
  - discounted by MIN_DISCOUNT_PCT or more (default 70%).

Runs on Python 3 standard library only — no pip installs needed.

Environment variables (set at least one alert channel):
  NTFY_TOPIC         ntfy.sh topic name — alerts arrive as phone push
                     notifications via the free ntfy app (see README)
  CALLMEBOT_PHONE    WhatsApp number in international format, e.g. +27821234567
  CALLMEBOT_APIKEY   API key CallMeBot sends you (see README)
  MAX_PRICE          price threshold in rand (default 50)
  MIN_DISCOUNT_PCT   discount threshold in percent (default 70)
  ODO_URLS           comma-separated pages to scan (default homepage + /shop/all)
  DRY_RUN            "1" = don't send WhatsApp, just print what would be sent

Usage:
  python3 check_deals.py             # normal run
  python3 check_deals.py --selftest  # run the parser against built-in sample data
"""

import gzip
import hashlib
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta

BASE_URL = "https://www.onedayonly.co.za"
DEFAULT_URLS = [BASE_URL + "/"]
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "state", "alerted.json")
DEBUG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "state", "debug")

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

NAME_KEYS = ("name", "title", "productName", "product_name", "shortName", "displayName")
PRICE_KEYS = (
    "price", "specialPrice", "special_price", "finalPrice", "final_price",
    "sellingPrice", "selling_price", "currentPrice", "current_price",
    "priceIncl", "salePrice", "sale_price", "dealPrice", "deal_price", "nowPrice",
)
ORIGINAL_KEYS = (
    "originalPrice", "original_price", "retailPrice", "retail_price", "retail",
    "regularPrice", "regular_price", "wasPrice", "was_price", "oldPrice",
    "old_price", "rrp", "listPrice", "list_price", "recommendedRetailPrice",
    "compareAtPrice", "compare_at_price", "strikethroughPrice",
)
URL_KEYS = ("url", "urlKey", "url_key", "slug", "link", "productUrl", "product_url", "canonicalUrl")


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


# ---------------------------------------------------------------- fetching

def fetch(url, timeout=45):
    req = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-ZA,en;q=0.9",
        "Accept-Encoding": "gzip",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip" or data[:2] == b"\x1f\x8b":
            data = gzip.GzipFile(fileobj=io.BytesIO(data)).read()
        return data.decode("utf-8", errors="replace")


# ---------------------------------------------------------------- parsing

def extract_json_blobs(html_text):
    """Pull every embedded JSON blob a storefront might ship: JSON-LD,
    __NEXT_DATA__, window.__STATE__-style assignments, Apollo state."""
    blobs = []

    for m in re.finditer(
        r'<script[^>]*type=["\']application/(?:ld\+)?json["\'][^>]*>(.*?)</script>',
        html_text, re.DOTALL | re.IGNORECASE,
    ):
        blobs.append(m.group(1))

    for m in re.finditer(
        r'window\.__[A-Z_]+__\s*=\s*(\{.*?\})\s*(?:;\s*</script>|;\s*window\.|</script>)',
        html_text, re.DOTALL,
    ):
        blobs.append(m.group(1))

    parsed = []
    for blob in blobs:
        blob = blob.strip()
        try:
            parsed.append(json.loads(blob))
        except json.JSONDecodeError:
            # Some sites JSON.parse("...") a string literal
            m = re.match(r'^JSON\.parse\((".*")\)$', blob, re.DOTALL)
            if m:
                try:
                    parsed.append(json.loads(json.loads(m.group(1))))
                except json.JSONDecodeError:
                    pass
    return parsed


def to_number(v):
    """Coerce a price-ish value ('R 1,299.00', 129900 cents, 49.0) to rand."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        n = float(v)
    elif isinstance(v, str):
        s = re.sub(r"[Rr]\s*|ZAR|\s|,", "", v.strip())
        if not re.fullmatch(r"\d+(\.\d+)?", s):
            return None
        n = float(s)
    elif isinstance(v, dict):
        # Magento-style {"value": 49, "currency": "ZAR"} or {"amount": {...}}
        for k in ("value", "amount"):
            if k in v:
                return to_number(v[k])
        return None
    else:
        return None
    if n <= 0 or n > 1_000_000:
        return None
    return n


def first_key(d, keys):
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    # case-insensitive fallback
    lower = {k.lower(): v for k, v in d.items() if v is not None}
    for k in keys:
        if k.lower() in lower:
            return lower[k.lower()]
    return None


def product_from_dict(d):
    """If this dict looks like a product with a price, normalise it."""
    name = first_key(d, NAME_KEYS)
    if not isinstance(name, str) or not (2 < len(name) < 300):
        return None

    # JSON-LD: price lives under "offers"
    offers = d.get("offers")
    if isinstance(offers, list) and offers:
        offers = offers[0]
    if isinstance(offers, dict):
        merged = dict(d)
        for k, v in offers.items():
            merged.setdefault(k, v)
        d = merged

    price = to_number(first_key(d, PRICE_KEYS))
    if price is None:
        pr = d.get("price_range") or d.get("priceRange")
        if isinstance(pr, dict):
            minimum = pr.get("minimum_price") or pr.get("minimumPrice") or pr
            if isinstance(minimum, dict):
                price = to_number((minimum.get("final_price") or minimum.get("finalPrice") or {}))
                if price is None:
                    price = to_number(minimum.get("regular_price") or minimum.get("regularPrice"))
    if price is None:
        return None

    original = to_number(first_key(d, ORIGINAL_KEYS))
    if original is not None and original <= price:
        original = None

    url = first_key(d, URL_KEYS)
    if isinstance(url, str) and url:
        if url.startswith("/"):
            url = BASE_URL + url
        elif not url.startswith("http"):
            url = BASE_URL + "/products/" + url.strip("/")
    else:
        url = BASE_URL

    pid = d.get("id") or d.get("sku") or d.get("productId") or d.get("uid")
    key_src = str(pid) if pid else f"{name}|{price}"
    return {
        "key": hashlib.sha1(key_src.encode()).hexdigest()[:16],
        "name": name.strip(),
        "price": price,
        "original": original,
        "url": url,
    }


def walk(node, found):
    if isinstance(node, dict):
        p = product_from_dict(node)
        if p:
            found[p["key"]] = p
        for v in node.values():
            walk(v, found)
    elif isinstance(node, list):
        for v in node:
            walk(v, found)


def parse_products(html_text):
    found = {}
    for blob in extract_json_blobs(html_text):
        walk(blob, found)
    return list(found.values())


# ---------------------------------------------------------------- filtering

def matching_deals(products, max_price, min_discount_pct):
    hits = []
    for p in products:
        pct = None
        if p["original"]:
            pct = round((1 - p["price"] / p["original"]) * 100)
        cheap = p["price"] < max_price
        steep = pct is not None and pct >= min_discount_pct
        if cheap or steep:
            p["discount_pct"] = pct
            hits.append(p)
    hits.sort(key=lambda p: p["price"])
    return hits


# ---------------------------------------------------------------- state

def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    cutoff = (date.today() - timedelta(days=3)).isoformat()
    state = {day: keys for day, keys in state.items() if day >= cutoff}
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=1, sort_keys=True)


# ---------------------------------------------------------------- alerts

def format_deal(p):
    line = f"• R{p['price']:.0f}" if p["price"] == int(p["price"]) else f"• R{p['price']:.2f}"
    if p["original"]:
        line += f" (was R{p['original']:.0f}"
        if p.get("discount_pct"):
            line += f", {p['discount_pct']}% off"
        line += ")"
    line += f" — {p['name']}\n  {p['url']}"
    return line


def send_whatsapp(text, phone, apikey):
    params = urllib.parse.urlencode({"phone": phone, "text": text, "apikey": apikey})
    url = f"https://api.callmebot.com/whatsapp.php?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        ok = resp.status == 200 and "ERROR" not in body.upper()
        log(f"CallMeBot response {resp.status}: {body[:200]}")
        return ok


def send_ntfy(header, text, topic):
    # Title goes in the query string: HTTP headers can't carry emoji/UTF-8.
    params = urllib.parse.urlencode({"title": header, "tags": "fire", "priority": "default"})
    req = urllib.request.Request(
        f"https://ntfy.sh/{urllib.parse.quote(topic)}?{params}",
        data=text.encode("utf-8"),
        headers={"User-Agent": USER_AGENT},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        log(f"ntfy response {resp.status}")
        return resp.status == 200


def send_message(header, text, cfg):
    """Send one alert through every configured channel; True if any succeeded."""
    if cfg["dry_run"]:
        log(f"DRY_RUN — would send:\n{header}\n{text}")
        return True
    sent = False
    if cfg["ntfy_topic"]:
        try:
            sent = send_ntfy(header, text, cfg["ntfy_topic"]) or sent
        except Exception as e:
            log(f"WARN: ntfy send failed: {e}")
    if cfg["phone"] and cfg["apikey"]:
        try:
            sent = send_whatsapp(f"{header}\n{text}", cfg["phone"], cfg["apikey"]) or sent
        except Exception as e:
            log(f"WARN: CallMeBot send failed: {e}")
    return sent


def send_alerts(deals, cfg, per_message=6):
    today = date.today().strftime("%d %b")
    ok = True
    for i in range(0, len(deals), per_message):
        chunk = deals[i:i + per_message]
        header = f"🔥 OneDayOnly deals ({today})"
        if len(deals) > per_message:
            header += f" [{i // per_message + 1}/{-(-len(deals) // per_message)}]"
        text = "\n".join(format_deal(p) for p in chunk)
        ok = send_message(header, text, cfg) and ok
    return ok


# ---------------------------------------------------------------- main

def run():
    max_price = float(os.environ.get("MAX_PRICE", "50"))
    min_discount = float(os.environ.get("MIN_DISCOUNT_PCT", "70"))
    cfg = {
        "ntfy_topic": os.environ.get("NTFY_TOPIC", "").strip(),
        "phone": os.environ.get("CALLMEBOT_PHONE", "").strip(),
        "apikey": os.environ.get("CALLMEBOT_APIKEY", "").strip(),
        "dry_run": os.environ.get("DRY_RUN") == "1",
    }
    urls = [u.strip() for u in os.environ.get("ODO_URLS", ",".join(DEFAULT_URLS)).split(",") if u.strip()]

    if not cfg["dry_run"] and not cfg["ntfy_topic"] and not (cfg["phone"] and cfg["apikey"]):
        log("ERROR: set NTFY_TOPIC and/or CALLMEBOT_PHONE + CALLMEBOT_APIKEY (or DRY_RUN=1).")
        return 2

    if os.environ.get("TEST_PING") == "1":
        ok = send_message(
            "✅ OneDayOnly alerts test",
            f"Test ping sent {datetime.now().strftime('%H:%M')} UTC — your phone is connected. "
            "Deal alerts will arrive here.",
            cfg,
        )
        log("Test ping sent." if ok else "ERROR: test ping failed.")
        return 0 if ok else 1

    products = {}
    pages = {}
    for url in urls:
        try:
            log(f"Fetching {url}")
            html_text = fetch(url)
            pages[url] = html_text
            for p in parse_products(html_text):
                products[p["key"]] = p
        except Exception as e:
            log(f"WARN: failed to fetch/parse {url}: {e}")

    log(f"Parsed {len(products)} products total.")
    if not products:
        os.makedirs(DEBUG_DIR, exist_ok=True)
        for i, (url, html_text) in enumerate(pages.items()):
            path = os.path.join(DEBUG_DIR, f"page{i}.html")
            with open(path, "w") as f:
                f.write(f"<!-- {url} -->\n{html_text}")
        log("ERROR: no products found — site layout may have changed. "
            f"Saved fetched pages to {DEBUG_DIR} for inspection.")
        return 1

    deals = matching_deals(list(products.values()), max_price, min_discount)
    log(f"{len(deals)} deals match (< R{max_price:.0f} or ≥ {min_discount:.0f}% off).")

    state = load_state()
    today_key = date.today().isoformat()
    already = set(k for keys in state.values() for k in keys)
    new_deals = [p for p in deals if p["key"] not in already]
    log(f"{len(new_deals)} of them not alerted before.")

    if not new_deals:
        return 0

    if send_alerts(new_deals, cfg):
        state.setdefault(today_key, [])
        state[today_key].extend(p["key"] for p in new_deals)
        save_state(state)
        log("Alerts sent and state saved.")
        return 0
    log("ERROR: sending alerts failed; state not saved so they retry next run.")
    return 1


# ---------------------------------------------------------------- selftest

SELFTEST_HTML = """
<html><head>
<script type="application/ld+json">
{"@type":"Product","name":"Bamboo Socks 3-Pack","sku":"SOCK1",
 "offers":{"price":"49.00","priceCurrency":"ZAR"},"url":"/products/bamboo-socks"}
</script>
<script type="application/json" id="__NEXT_DATA__">
{"props":{"pageProps":{"deals":[
 {"id":101,"name":"Chef Knife Set","price":299,"retailPrice":1499,"urlKey":"chef-knife-set"},
 {"id":102,"name":"Fancy Espresso Machine","price":4999,"originalPrice":6999,"urlKey":"espresso"},
 {"id":103,"name":"Kids Puzzle","price":{"value":45.5},"oldPrice":{"value":99},"slug":"kids-puzzle"}
]}}}
</script>
</head><body></body></html>
"""


def selftest():
    products = parse_products(SELFTEST_HTML)
    assert len(products) == 4, f"expected 4 products, got {len(products)}: {products}"
    deals = matching_deals(products, 50, 70)
    names = sorted(p["name"] for p in deals)
    # Socks R49 (<50), Knife Set 80% off, Puzzle R45.50 (<50); Espresso matches neither
    assert names == ["Bamboo Socks 3-Pack", "Chef Knife Set", "Kids Puzzle"], names
    knife = next(p for p in deals if "Knife" in p["name"])
    assert knife["discount_pct"] == 80, knife
    assert knife["url"] == BASE_URL + "/products/chef-knife-set", knife["url"]
    for p in deals:
        print(format_deal(p))
    print("SELFTEST OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        sys.exit(run())
