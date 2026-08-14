# Budget Bru — Technical Deconstruction & Rebuild Blueprint

*Prepared 14 August 2026. Target site: https://budgetbru.life/*

This document deconstructs Budget Bru — a South African envelope-budgeting web app — into its product, UX, and technical architecture, then lays out a blueprint for building your own equivalent (`FinanceBudgetTool`).

**How this was produced:** public pages were crawled; the JavaScript bundle and its ~160 code-split chunks were fetched and statically analysed; a free account was created and the logged-in app was explored with live network capture. Every architecture claim below traces to captured evidence (network logs, bundle contents, in-app screens). Inferences are labelled as such.

---

## 1. Product overview

**What it is.** An envelope-budgeting app aimed squarely at South African consumers. You divide income into named "envelopes" (Groceries, Rent, Emergency Fund…), spend against them, and the app scores how well you stick to the plan. Around that core it stacks a wide feature surface: AI bank-statement analysis, gamified savings challenges, social "battles", specialised planners (wedding / travel / events), and a small-business invoicing suite.

**Positioning.** Behaviour-first money management ("Smart envelope budgeting made simple"), local-market fit (Rand, VAT invoices, PayFast, WhatsApp sharing), and a friendly, gamified tone ("Duolingo, but for stacking cash").

**Target users.** Budget-conscious individuals and couples; people planning weddings/trips/events; and SA sole traders / micro-businesses who want simple invoicing alongside personal budgeting.

**Business model.** Freemium subscription (monthly, ZAR) plus an AI-credit micro-currency, plus one-off product sales (a card game, a spreadsheet template, an ebook). Payments run through PayFast.

### Pricing (from the pricing page)

| Tier | Price | Key inclusions |
|---|---|---|
| **Free** | R0 | Monthly envelopes only, manual logging, basic dashboard, Bru Battles (2 free AI), referrals |
| **Budget** | R79/mo | Unlimited envelopes & transactions, all budget periods, full reports, goals, wedding & event planners, basic Business Suite (10 exports/mo, 5 customers), **1 AI credit/mo** |
| **Pro** *(most popular)* | R129/mo | Everything in Budget + unlimited business exports w/ AI writer, bank reconciliation, unlimited CRM, AI bank-statement analysis, **10 AI credits/mo**, priority support |
| **Power** | R249/mo | Everything in Pro + **50 AI credits/mo** for heavy AI users |

- **AI credit top-ups:** R12/credit, minimum 3, never expire. Used for statement analysis, insights, and AI Q&A.
- Subscriptions auto-renew; top-ups don't. No free trial. Legacy customers keep access until expiry.

---

## 2. Feature inventory

Grouped as the in-app left navigation presents them.

**Budget (core)**
- **Dashboard** — Budget Health score, "Money Left Per Day", "Will I Go Over?" prediction, Monthly Budget progress, Daily Allowance, Unallocated, Fixed/Variable Income, Total Spent, Savings Rate.
- **Envelopes** — preset picker grouped into Savings & Investing / Fixed Expenses / Variable Expenses, each with an emoji icon. Configure name, type, budget period (Daily/Weekly/Monthly/Yearly — *free plan is monthly-only*), and amount. Card and Spreadsheet views. Auto-reset budgets monthly.
- **Transactions / Log Expense**, **Manage Income**, **Reports** (gated).

**Insights**
- **Money Health** — a 0–100 score (details in §4) with sub-scores and a Payday Simulator.
- **AI Features** — "Where Did My Money Go?": upload a PDF bank statement, get a categorised spend breakdown (Bills, Groceries, Savings, Transport, Shopping, Entertainment, Dining, Subscriptions) and AI Q&A. "Money Shock Moments": surfaced "did you know?" insights. Metered in AI credits.
- **Subscriptions** — manage plan/billing.

**Plan (specialised budgets)**
- **Savings** challenges — "pick from 10 challenge types" (52-week, 100-envelope, streak/no-spend days), gamified.
- **Travel**, **Events**, **Wedding** — each a full budget module with categories, subcategories, expenses, and vendors.

**AI Tools**
- **Challenges** — AI designs a tailored 7-day savings mission based on your weak spots.
- **Bru Battles** — compare spending with friends as scores ("no rands, just scores"), AI-generated cards, shared via WhatsApp. 2 free AI uses.

**Business Suite** *(new)*
- Financial tracker (income/expense/profit charts), SA-ready VAT invoices with 6 templates, quotes, customer CRM (notes, files, products), bank reconciliation (Pro+), and an AI writer for invoice/quote text.

**Account** — Upgrade, Referrals (earn 2 AI credits per confirmed referral), Security (optional TOTP 2FA), Help.

**Standalone products** — Money Talks card game (R99 once-off), budgeting spreadsheet template, an ebook.

---

## 3. UX flow deconstruction

- **Onboarding.** Sign up (Google OAuth or email/password) → **immediately signed in** (email confirmation is disabled) → 6-step welcome carousel → empty dashboard nudging "Create Your First Envelope". Business Suite has its own light onboarding ("What's your business called?", with full VAT/bank details deferred until the first invoice).
- **Core loop.** Add income → create envelopes → log expenses against them → dashboard + Money Health react → prediction ("Will I Go Over?") and daily-allowance guidance close the loop. Budgets auto-reset monthly.
- **Gamification hooks.** A visible health *score* with named sub-scores creates a "raise the number" pull; savings challenges and Bru Battles add streaks and social competition; referrals and credits create a reward economy. The framing ("Duolingo for cash") is deliberate.
- **Monetisation hooks.** Persistent "You're on the Free Plan" banner, locked Reports, monthly-only budget periods on free, and AI features that visibly consume credits — every high-value surface routes toward upgrade or top-up.

---

## 4. Technical architecture

### Frontend
- **React single-page app**, bundled with **Vite** (content-hashed assets, e.g. `index-wqo107Lw.js`; ~160 lazy-loaded chunks). Root `<div id="root">`.
- **Component/UI:** Radix UI primitives in a **shadcn/ui** style, **lucide** icons, **sonner** toasts.
- **Data layer:** **TanStack React Query** over the **supabase-js** client.
- **PDF generation:** **jsPDF + html2canvas** (client-side invoice/report rendering).
- **Build origin:** the app was **generated with Lovable** (confirmed by `lovable` references in the served HTML and a `~flock.js` tagging script). This is the tell-tale Lovable stack: React + Vite + shadcn + Supabase.

### Backend — Supabase (project `jslxynbipwcsyqafskmm.supabase.co`)
The client talks **directly to Supabase PostgREST**, secured by **Row-Level Security**. Confirmed live requests filter by `user_id` and use PostgREST features (`select=`, `order=`, `eq.` filters, embedded joins like `envelope_predictions?select=*,envelopes(name,icon)`). There is **no custom REST API tier** for CRUD — the database *is* the API.

- **Auth:** Supabase Auth — email/password + Google OAuth; optional TOTP 2FA. Email confirmation currently disabled.
- **RBAC:** a `user_roles` table (an admin check `role=eq.admin` is issued on load) — roles live in a table, not JWT claims.
- **Storage:** Supabase Storage buckets for bank-statement PDFs, ebook/preview images, and template images.
- **Privileged logic — 28 Deno Edge Functions**, grouped:
  - *AI:* `generate-insight(s)`, `parse-bank-statement`, `business-parse-pdf-statement`, `spending-breakdown`, `money-personality`, `generate-challenge`, `suggest-budgets`, `predict-envelope-overspend`, `generate-shock-moments` / `shocking-insights`, `battle-ai-insight`, `battle-generate-cards`, `business-ai-writer`, `wedding-ai-insight`, `business-reconcile`, `bank-statement-audit`.
  - *Payments/billing:* `payfast-config`, `payfast-itn` (ITN webhook), `topup-checkout`, `cancel-subscription`.
  - *Other:* `send-transactional-email`, `assign-invoice-number`, `attach-referral`, `recompute-referral`, `ebook-download`, `battle-join`, `battle-score`.
- **Stored procedures — 14 Postgres RPCs**, e.g. `refresh_monthly_credits`, `redeem_gift_code` / `gift_credits_to_friend` / `escrow_invite_gift`, `consume_business_export` / `next_business_number`, `add_battle_challenge` / `battle_press_reveal` / `set_battle_username`. These enforce atomic, server-side operations (credit accounting, sequential invoice numbers, gifting escrow) that RLS alone can't.

### AI integration
AI runs **server-side inside edge functions** and is **metered by an AI-credit ledger** (`ai_credit_balances`, `ai_credit_packs`, `ai_credit_transactions`; monthly allocation refreshed via `refresh_monthly_credits`). The model provider is not exposed to the client. *Inference:* Lovable apps most commonly call the **Lovable AI Gateway (Google Gemini models)** or **OpenAI**; PDF parsing implies a statement-extraction step feeding an LLM categoriser.

### Payments, analytics, email
- **PayFast** (SA gateway) via edge functions, with an ITN webhook (`payfast-itn`) for asynchronous payment confirmation. Billing state in `user_subscriptions`, `access_passes`, `orders`, `subscription_audit_log`.
- **Google Analytics** (`gtag`) plus Lovable's `~flock.js` tagging.
- **Transactional email** via `send-transactional-email` edge function (provider not exposed).

### Inferred data model (63 tables)
- **Core budgeting:** `envelopes` (has a `scope` column → personal/business), `transactions`, `income_entries`, `profiles` (payday, expected income), `user_category_overrides`, `envelope_predictions`.
- **AI credits:** `ai_credit_balances`, `ai_credit_packs`, `ai_credit_transactions`.
- **Billing:** `user_subscriptions`, `access_passes`, `orders`, `subscription_audit_log`.
- **Statements/reconciliation:** `bank_statements`, `statement_transactions`, `reconciliation_sessions`, `reconciliation_transactions`.
- **Business suite:** `business_profiles`, `business_customers`, `business_customer_notes`, `business_customer_files`, `business_products`, `business_invoices`, `business_quotes`, `business_transactions`, `business_custom_categories`, `invoices`.
- **Scoring/personality:** `health_scores`, `money_personalities`.
- **Challenges:** `savings_challenges`, `savings_no_spend_days`, `milestone_rewards`.
- **Battles:** `battles`, `battle_cards`, `battle_challenges`, `battle_participants`.
- **Planners (repeat pattern ×3):** `wedding_*`, `event_*`, `trip_*` → each with `budgets`, `categories`, `subcategories`, `expenses`, `vendors`.
- **Referrals & gifting:** `referral_codes`, `referral_relationships`, `referral_activity`, `referral_rewards`, `gift_codes`.
- **Content/marketing:** `ebook_downloads`, `ebook_preview_images`, `spreadsheet_template_images`, `pretty_privilege_subscribers`, `site_settings`.
- **RBAC:** `user_roles`.

### Money Health score (fully exposed algorithm, 100 pts)
| Component | Max | Basis |
|---|---|---|
| Envelope adherence | 40 | % of envelopes within budget |
| Savings rate | 25 | % of income saved (target 20%+) |
| Logging consistency | 15 | transactions logged in last 14 days |
| Emergency fund | 10 | months of expenses covered (target 3+) |
| Net balance | 10 | monthly net positive |

---

## 5. Critique

**Strengths**
- Coherent, low-cost stack (Lovable + Supabase + PayFast) that ships a *lot* of surface area fast; RLS-direct-to-DB removes a whole API tier.
- Strong local fit: ZAR, VAT invoices, PayFast, WhatsApp battles.
- Clever monetisation: subscription *and* a credit micro-currency that meters the expensive (AI) operations directly to cost.
- Genuinely good behavioural design: a transparent, sub-scored health metric plus gamified challenges.

**Weaknesses / risks**
- **Very broad, possibly thin.** Weddings, travel, events, business invoicing, battles, ebook, card game — a large maintenance surface for what looks like a small team. Focus risk.
- **Security posture leans entirely on RLS.** With direct PostgREST access, one missing/weak RLS policy exposes data. 2FA is off by default and email confirmation is disabled — the latter lets anyone sign up under any address and weakens referral/credit anti-abuse.
- **Prediction endpoint returned a 400** on an empty account (`envelope_predictions` query) — edge-case robustness gaps.
- **No PWA manifest / offline** despite being a mobile-money use case.
- **AI cost exposure** is controlled by credits, but PDF-parsing + LLM categorisation accuracy is the product's believability — hard to get right across SA bank statement formats.

**Opportunities (where you could differentiate)**
- Real **bank feeds / open-banking** (Stitch, Mono) instead of manual PDF upload.
- **Offline-first PWA** with sync.
- Tighter, deeper *personal* budgeting rather than spreading into business + events + weddings.
- Shared household budgets as a first-class feature.

---

## 6. Rebuild blueprint for `FinanceBudgetTool`

**Recommended stack (mirrors what works here, with upgrades).**
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Query. (Same as Budget Bru — proven, fast.) Add a **PWA manifest + service worker** from day one.
- **Backend:** **Supabase** — Postgres + RLS, Auth (email/password + Google), Storage, Edge Functions (Deno). Keep the "DB-is-the-API" pattern for CRUD, but **write RLS policies test-first** and add a policy test suite.
- **Payments:** PayFast for SA (or Paystack/Stripe if going wider). Confirm via ITN/webhook → server-verified subscription state.
- **AI:** Claude via the Anthropic API inside an edge function, metered by a credit ledger. Use Claude for statement categorisation, insights, and challenge generation.

**Minimal viable data model (start here, grow later)**
`profiles`, `envelopes` (scope, type, period, amount), `transactions`, `income_entries`, plus `health_scores` (or compute on the fly). Defer business/planners/battles until the core loop is loved.

**MVP feature cut (build in this order)**
1. Auth + profile + income setup.
2. Envelopes (presets + custom) with monthly reset.
3. Log expenses → dashboard (budget vs spent, daily allowance).
4. Money Health score (reuse the exposed 40/25/15/10/10 rubric as a starting point).
5. One AI feature: statement upload → categorised breakdown, credit-metered.

**Then, phased:** reports & export → one gamification hook (savings challenges) → specialised planners *or* business suite (pick one, not both) → social/referrals.

**Where to win vs Budget Bru:** go **narrow and deep** on personal budgeting + **real bank feeds** + **offline PWA + shared household budgets**, rather than matching their breadth.

**Verification plan for your build:** unit-test RLS policies (attempt cross-user reads and assert denial); e2e the core loop (create envelope → log expense → score updates); test the ITN webhook with PayFast sandbox; and validate the AI categoriser against a set of real SA bank-statement PDFs before charging credits for it.

---

*Evidence base: homepage + feature/pricing pages; static analysis of the Vite bundle and ~160 chunks (table/function/RPC names extracted directly); a live free-tier session with network capture confirming direct PostgREST + RLS access and the Supabase project ID. Server-side model provider and exact edge-function source are not publicly observable and are labelled as inference where mentioned.*
