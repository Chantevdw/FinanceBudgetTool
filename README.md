# Our Money — a private budgeting tool for two

A free, offline, single-file budgeting app. Import your South African bank
statements (CSV), auto-categorise spending, and see where the money goes —
for you and your partner, combined or separately.

**Nothing is ever uploaded.** Everything you enter is stored only in the
browser on the device you're using. No accounts, no cloud, no cost.

## Run it

- **On your phone (recommended):** open the GitHub Pages link once it's enabled —
  `https://chantevdw.github.io/FinanceBudgetTool/` — and use **Add to Home
  Screen** for an app-like icon. This is a real web address, so it **saves your
  data reliably** between visits.
- **On a computer:** you can also just double-click **`index.html`** to open it
  in your browser. Try the **Import** tab with the included `sample-statement.csv`
  first.

> Your data is saved in the browser at whatever address you open it from, so
> pick one home and stick with it (the Pages link is best). Phone and laptop
> keep separate data — sync them with **Settings → Backup / Restore**.

## Getting a CSV from your bank

In your banking app or website: open the account → choose a date range →
**Download / Export** → pick **CSV**.

- **FNB:** the *app* only exports **PDF**. For **CSV/OFX**, use **FNB Online
  Banking** (on a computer, or the website in your phone's browser): account →
  **Transaction History → Download → CSV**. It comes as a `.zip` to extract, and
  is capped at ~90 days / 150 transactions per download.
- **Capitec, Investec, Discovery, TymeBank:** CSV/statement export available in
  online banking.

The Import screen auto-detects the columns; you just confirm them (once per bank).

## Using it on both our laptops / phones

The **code** syncs through this git repo; the **data** syncs through a backup file.

- **Code:** `git pull` (or re-open the Pages link) to get the latest tool.
- **Data:** **Settings → Download backup** on one device, move the file over,
  **Settings → Restore from backup** on the other.

> Backup files and real statements are kept **out of this repo** — `.gitignore`
> blocks `*-backup-*.json` and real `*.csv` so financial data is never committed.

## What's here

| File | What it is |
|------|------------|
| `index.html` | The app. Open this (or the Pages link). |
| `sample-statement.csv` | A fake statement to test the importer. |
| `budgetbru-teardown.md` | Technical teardown of budgetbru.life that inspired this. |
