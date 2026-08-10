-- Telegram Business plumbing.
--
-- Messages are logged to Postgres rather than stdout for two reasons: Vercel's
-- function logs are ephemeral and unqueryable, and the "nobody answered this
-- customer for N minutes" reminder in a later step is a query over exactly this
-- table. Logging is not a debugging aid here, it is the data model.
--
-- Rollback: see 0003_telegram.down.sql

-- Deliberately outside the transaction below. Postgres allows ALTER TYPE ... ADD
-- VALUE inside a transaction from v12 on, but the new label cannot be *used* until
-- that transaction commits — keeping it separate avoids that trap entirely if a
-- later statement in this file ever needs to reference 'telegram'.
alter type sale_channel add value if not exists 'telegram';

begin;

create table telegram_connections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,

  -- Telegram's identifier for "this bot is attached to that business account".
  business_connection_id text not null unique,
  telegram_user_id bigint not null,

  -- Telegram sends is_enabled=false when the seller detaches the bot; the row is
  -- kept so history and past messages stay attributable.
  is_enabled boolean not null default true,
  can_reply boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index telegram_connections_store_idx on telegram_connections (store_id);

create table telegram_messages (
  id uuid primary key default gen_random_uuid(),

  -- Nullable on purpose: a message can arrive over a connection that has not been
  -- paired to a store yet. Dropping it would destroy the evidence needed to debug
  -- exactly that case, so it is logged unattributed instead.
  store_id uuid references stores (id) on delete cascade,
  business_connection_id text,

  chat_id bigint not null,
  telegram_user_id bigint,
  telegram_message_id bigint,

  direction text not null check (direction in ('in', 'out')),
  text text,
  raw jsonb not null,

  created_at timestamptz not null default now()
);

-- Drives the reminder query: newest inbound message per chat within a store.
create index telegram_messages_store_chat_idx
  on telegram_messages (store_id, chat_id, created_at desc);
create index telegram_messages_connection_idx
  on telegram_messages (business_connection_id, created_at desc);

alter table telegram_connections enable row level security;
alter table telegram_messages    enable row level security;

-- Seller-facing access is read-only, and no policy is granted to anon at all.
--
-- Both tables are written solely by /api/telegram/webhook using the service-role
-- key, which bypasses RLS. That key is a genuine server-side secret — the first in
-- this project — and is required precisely because the alternative (a SECURITY
-- DEFINER insert callable with the public anon key) would let anyone holding that
-- public key forge inbound customer messages and fake order conversations.
create policy "tenant reads telegram_connections" on telegram_connections
  for select to authenticated using (store_id = auth_store_id());

create policy "tenant reads telegram_messages" on telegram_messages
  for select to authenticated using (store_id = auth_store_id());

commit;
