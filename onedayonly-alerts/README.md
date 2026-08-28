# OneDayOnly deal alerts on your phone

Checks [onedayonly.co.za](https://www.onedayonly.co.za) and pings your phone
when a deal is:

- **under R50**, or
- **70% off or more**.

It runs for free on GitHub Actions — nothing to install and no server needed.
It checks **every hour** — the main drop is just after midnight, but new deals
that appear during the day get caught too. Each deal is only alerted once.

## One-time setup (a few minutes, on your phone)

Alerts can go to either (or both) of these channels — set up at least one.

### Option A — ntfy push notifications (recommended)

[ntfy](https://ntfy.sh) is a free, open-source notification app. Alerts pop up
on your phone instantly, just like a WhatsApp message. No account or phone
number needed.

1. Install the **ntfy** app (Play Store / App Store).
2. In the app: **+ → Subscribe to topic**, and type a secret made-up name,
   e.g. `odo-deals-yourname-x7k2`. Make it hard to guess — anyone who knows
   the exact name could see (or send) messages on it. Don't put anything
   sensitive in the name.
3. On github.com open this repo → **Settings → Secrets and variables →
   Actions → New repository secret** and add:

   | Name | Value |
   |------|-------|
   | `NTFY_TOPIC` | the topic name from step 2 |

Tip: in the app, allow ntfy to run without battery restrictions
(it prompts you) so notifications aren't delayed.

### Option B — WhatsApp via CallMeBot

CallMeBot is a free hobby service that can send WhatsApp messages **to your
own number only**. At the time of writing its bot was full and not accepting
new registrations — check
https://www.callmebot.com/blog/free-api-whatsapp-messages/ for the current
bot number. If you get a key:

1. Save the bot's number as a contact and WhatsApp it:
   `I allow callmebot to send me messages` — it replies with an **API key**.
2. Add two repo secrets (same place as above):

   | Name | Value |
   |------|-------|
   | `CALLMEBOT_PHONE` | your WhatsApp number with country code, e.g. `+27821234567` |
   | `CALLMEBOT_APIKEY` | the key CallMeBot sent you |

### Turn it on

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
- Matching deals are sent to every channel you configured (ntfy push and/or
  WhatsApp via CallMeBot), batched a few per message, cheapest first.
- `state/alerted.json` remembers what you've already been told about (kept for
  3 days — deals only last a day anyway) and is committed back by the workflow.
- If the site changes its layout and no products can be parsed, the run fails
  visibly and uploads the fetched pages as a debug artifact so it's easy to fix.

Run it locally to test: `DRY_RUN=1 python3 check_deals.py`
Parser self-check: `python3 check_deals.py --selftest`
