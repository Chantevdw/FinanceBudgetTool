# Our Money — a private budgeting tool for two

A free, offline, single-file budgeting app. Import your South African bank
statements (CSV), auto-categorise spending, and see where the money goes —
for you and your partner, combined or separately.

**Nothing is ever uploaded.** Everything you enter is stored only in the
browser on the device you're using. No accounts, no cloud, no cost.

## Run it

1. Download or clone this repo.
2. Double-click **`finance-tool.html`** — it opens in your browser. That's it.
3. Try the **Import** tab with the included `sample-statement.csv` before using
   real data.

## Getting a CSV from your bank

In your banking app or website: open the account → choose a date range →
**Download / Export** → pick **CSV** (Excel/OFX also work). Supported at FNB,
Capitec, Investec, Discovery, TymeBank, and the big banks. The Import screen
auto-detects the columns; you just confirm them (once per bank — it remembers).

## Using it on both our laptops

The **code** syncs through this git repo; the **data** syncs through a backup file.

- **Code:** on each laptop, `git pull` (or re-download) to get the latest tool.
- **Data:** on the laptop that has your transactions, go to **Settings →
  Download backup**. Move that file to the other laptop and use **Settings →
  Restore from backup**. Your transactions live in each browser separately, so
  this is how you keep them in sync.

> Keep backup files **out of this repo** — `.gitignore` already blocks
> `*-backup-*.json` and real `*.csv` statements so financial data never gets
> committed. Put real statements in a `statements/` folder if you want them on
> disk; that folder is git-ignored too.

## Working on it in a remote Claude Code session

Because this is a plain git repo, a remote/cloud Claude Code session can clone
it, make changes, and push them back. Pull those changes on each laptop with
`git pull`. The tool itself needs no build step — it's one static HTML file.

## What's here

| File | What it is |
|------|------------|
| `finance-tool.html` | The app. Open this. |
| `sample-statement.csv` | A fake statement to test the importer. |
| `budgetbru-teardown.md` | Technical teardown of budgetbru.life that inspired this. |
