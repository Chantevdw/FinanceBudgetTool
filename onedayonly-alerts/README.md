# OneDayOnly → WhatsApp deal alerts

Checks [onedayonly.co.za](https://www.onedayonly.co.za) every day and sends you
a WhatsApp message when a deal is:

- **under R50**, or
- **70% off or more**.

It runs for free on GitHub Actions — nothing to install and no server needed.
Each deal is only alerted once, and it checks twice a day: just after midnight
(when the new deals go live) and again at 09:00 as a catch-up.

## One-time setup (5 minutes, on your phone)

### 1. Get a CallMeBot WhatsApp key (free)

CallMeBot is a free service that lets scripts send WhatsApp messages **to your
own number only** — so it can't spam anyone else.

1. Save this number in your phone contacts: **+34 644 51 95 23** (CallMeBot).
2. Send it this WhatsApp message: `I allow callmebot to send me messages`
3. It replies within a couple of minutes with your **API key** (a number like
   `123456`).

> If that number doesn't respond, check the current bot number at
> https://www.callmebot.com/blog/free-api-whatsapp-messages/ — it changes
> occasionally.

### 2. Add two secrets to this GitHub repo

On github.com open this repo → **Settings → Secrets and variables → Actions →
New repository secret**, and add:

| Name | Value |
|------|-------|
| `CALLMEBOT_PHONE` | your WhatsApp number with country code, e.g. `+27821234567` |
| `CALLMEBOT_APIKEY` | the key CallMeBot sent you |

### 3. Turn it on

The schedule only runs from the repo's **default branch**, so once this code is
on `main` it starts working by itself. To test it immediately: repo →
**Actions → OneDayOnly deal alerts → Run workflow** (tick *dry run* to see the
alerts in the log without sending WhatsApp).

## Changing the thresholds

Edit `.github/workflows/onedayonly-alerts.yml`:

```yaml
MAX_PRICE: '50'        # alert if cheaper than this (rand)
MIN_DISCOUNT_PCT: '70' # alert if discount is at least this (%)
```

## How it works

- `check_deals.py` (plain Python, no dependencies) downloads the OneDayOnly
  pages and reads the product data embedded in them (JSON-LD / app state).
- Matching deals are sent to your WhatsApp via CallMeBot, batched a few per
  message, cheapest first.
- `state/alerted.json` remembers what you've already been told about (kept for
  3 days — deals only last a day anyway) and is committed back by the workflow.
- If the site changes its layout and no products can be parsed, the run fails
  visibly and uploads the fetched pages as a debug artifact so it's easy to fix.

Run it locally to test: `DRY_RUN=1 python3 check_deals.py`
Parser self-check: `python3 check_deals.py --selftest`
