# Javob

A self-hosted, single-store retail management app (a scoped-down clone of billz.io) built for running your own shop: point-of-sale checkout, inventory, a public online storefront, basic CRM, and sales reporting.

## Stack

- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (Postgres + Auth) — project `billz-store-clone`
- Recharts for reporting charts
- Vitest for unit tests, GitHub Actions for CI

Prices are stored and displayed in Uzbek som (UZS) — see `formatMoney` in
`src/lib/utils.ts` if you need a different currency.

## Features

- **POS** (`/admin/pos`) — scan/search products, build a cart, record cash/card sales, stock decrements atomically.
- **Inventory** (`/admin/inventory`) — products, categories, stock levels, barcode/SKU.
- **Online storefront** (`/`) — public product listing, cart, checkout. Orders land as "pending" for you to confirm payment and fulfill — there's no payment gateway wired up.
- **Orders** (`/admin/orders`) — fulfill or cancel (auto-restocks) pending online orders.
- **Customers** (`/admin/customers`) — customer records with purchase history across both POS and online sales.
- **Reports** (`/admin/reports`) — revenue, profit, top products, and stock valuation over a date range.

Single owner login only (no staff roles) — the first visit to `/admin/login` lets you create that one account.

## Getting started locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Checks, all of which CI runs on every pull request:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Then open `http://localhost:3000/admin/login` to create your owner account (Supabase will email a confirmation link to the address you sign up with — click it before logging in), and `http://localhost:3000/` for the public storefront.

Environment variables (already in `.env.local` for this project, see `.env.example` for the shape) point at the Supabase project `billz-store-clone` (id `xukeftgutsbwooaoopaf`). The database schema and RPC functions (`checkout_order`, `create_pos_sale`, `cancel_online_order`, `get_order_status`, `owner_exists`) already live in that project — no migration step needed to get started.

## Deploying

Deploy the Next.js app anywhere that supports it (e.g. Vercel), and set the variables from `.env.example` in that platform's project settings.

The app itself needs no privileged database credentials — everything runs through Supabase's public anon key plus Row Level Security policies and `SECURITY DEFINER` RPC functions that gate what the public storefront can read/write. Two deployment-only values do matter:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **required, and required at build time.** `/admin/login` is prerendered to static HTML, which constructs a Supabase client, so a build without these fails on that page rather than producing a broken deployment.
- `NEXT_PUBLIC_SITE_URL` — the canonical origin, used by `sitemap.xml`, `robots.txt` and Open Graph tags. Optional on Vercel: when unset the app falls back to the project's free `*.vercel.app` production domain, which Vercel injects into every build. Set it only once a custom domain is in play.
- `CRON_SECRET` — required by `/api/cron/low-stock`. The route refuses to run without it rather than leaving itself world-callable, so the scheduled Telegram alert stays silent until it is set.

## Notes on the data model

- `sales` unifies POS and online orders via a `channel` column (`pos` | `online`) and a `status` column (`pending` | `completed` | `cancelled`), so reporting is a single query across both.
- `sale_items` snapshots `product_name`/`unit_cost`/`unit_price` at the time of sale, so historical reports stay accurate even if a product's price changes or it's later archived.
- Storefront checkout and POS sale creation both go through atomic RPC functions (`checkout_order`, `create_pos_sale`) that lock stock rows, validate quantities, and write the sale + decrement stock in one transaction.
- Reporting reads `sale_items` by filtering through the `sale_id` foreign key rather than passing a list of sale ids, and caps each query at `REPORT_ROW_LIMIT`. If a period exceeds that cap the UI says the totals are incomplete instead of quietly under-reporting revenue. Past roughly that volume, move the aggregation into a Postgres function.

## Telegram Business assistant (in progress)

Step 1 of the roadmap only: the webhook receives `business_connection` and
`business_message` updates and records them in `telegram_connections` /
`telegram_messages`. It does not reply, recognise intent, or create orders yet.

Requires `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_WEBHOOK_SECRET` (see `.env.example`). The seller's Telegram account
needs Premium, since Business chatbots are a Premium feature.

Register the webhook once, after deploying:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://<your-domain>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["business_connection", "business_message", "edited_business_message"]
  }'
```

`allowed_updates` matters: Telegram does **not** send business updates unless they
are listed explicitly, so omitting it produces a webhook that silently receives
nothing.

Then attach the bot in Telegram: Settings → Business → Chatbots → select the bot.
Message the seller's account from a second account and the row should appear:

```sql
select direction, chat_id, text, created_at from telegram_messages order by created_at desc limit 5;
```

Messages the seller sends themselves are recorded with `direction = 'out'`, which
is what later lets the reminder step tell an answered conversation from an
abandoned one.

## Known follow-ups

- The 465 bulk-imported products have sequential slugs (`p-0001`) rather than descriptive ones, so their URLs carry no keywords. `slugify` now transliterates Cyrillic correctly for newly created products; backfilling the existing ones needs a migration plus redirects from the old paths.
- Single owner account, no staff roles — adding a cashier means reworking authorization, since the RLS policies currently grant any authenticated user full access.
- No payment gateway: online orders stay `pending` until the owner confirms payment by hand.
