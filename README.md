# fx005

A self-hosted, single-store retail management app (a scoped-down clone of billz.io) built for running your own shop: point-of-sale checkout, inventory, a public online storefront, basic CRM, and sales reporting.

## Stack

- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (Postgres + Auth) — project `billz-store-clone`
- Recharts for reporting charts

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
npm run dev
```

Then open `http://localhost:3000/admin/login` to create your owner account (Supabase will email a confirmation link to the address you sign up with — click it before logging in), and `http://localhost:3000/` for the public storefront.

Environment variables (already in `.env.local` for this project, see `.env.example` for the shape) point at the Supabase project `billz-store-clone` (id `xukeftgutsbwooaoopaf`). The database schema and RPC functions (`checkout_order`, `create_pos_sale`, `cancel_online_order`, `get_order_status`, `owner_exists`) already live in that project — no migration step needed to get started.

## Deploying

Deploy the Next.js app anywhere that supports it (e.g. Vercel), and set the two env vars from `.env.local` in that platform's project settings. No server-side secrets are required — everything runs through Supabase's public anon key plus Row Level Security policies and `SECURITY DEFINER` RPC functions that gate what the public storefront can read/write.

## Notes on the data model

- `sales` unifies POS and online orders via a `channel` column (`pos` | `online`) and a `status` column (`pending` | `completed` | `cancelled`), so reporting is a single query across both.
- `sale_items` snapshots `product_name`/`unit_cost`/`unit_price` at the time of sale, so historical reports stay accurate even if a product's price changes or it's later archived.
- Storefront checkout and POS sale creation both go through atomic RPC functions (`checkout_order`, `create_pos_sale`) that lock stock rows, validate quantities, and write the sale + decrement stock in one transaction.
