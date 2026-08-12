-- Step 1 of the roadmap: prove the Telegram Business integration actually works.
--
-- Deliberately minimal. No tenancy, no variants, no intent handling — this exists
-- only so inbound business_connection and business_message updates can be observed
-- before any logic is built on top of them.
--
-- Messages are logged to Postgres rather than stdout for two reasons: Vercel's
-- function logs are ephemeral and unqueryable, and the "unanswered for N minutes"
-- reminder in Step 6 is a query over exactly this table. Logging is not a debugging
-- aid here, it is the beginning of the data model.
--
-- Rollback: see 0001_telegram.down.sql

begin;

-- One row per business account the bot is attached to. Single-store for now, so
-- there is no tenant column; when several sellers arrive this table is where the
-- store reference belongs, because Telegram identifies the seller here and nowhere
-- else in the update payload.
create table telegram_connections (
  id uuid primary key default gen_random_uuid(),

  business_connection_id text not null unique,
  telegram_user_id bigint not null,

  -- Telegram sends is_enabled=false when the seller detaches the bot; the row is
  -- kept rather than deleted so past messages stay attributable.
  is_enabled boolean not null default true,
  can_reply boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table telegram_messages (
  id uuid primary key default gen_random_uuid(),

  business_connection_id text,
  chat_id bigint not null,
  telegram_user_id bigint,
  telegram_message_id bigint,

  direction text not null check (direction in ('in', 'out')),
  text text,

  -- The whole update is kept. At this stage the exact payload shape is the thing
  -- being learned, and a column list chosen now would certainly be wrong.
  raw jsonb not null,

  created_at timestamptz not null default now()
);

-- Newest message per conversation: what both the inbox view and the Step 6
-- reminder query will ask for.
create index telegram_messages_chat_idx on telegram_messages (chat_id, created_at desc);
create index telegram_messages_connection_idx on telegram_messages (business_connection_id, created_at desc);

alter table telegram_connections enable row level security;
alter table telegram_messages    enable row level security;

-- Matches the single-owner model the rest of the schema already uses: the one
-- signed-in owner reads everything, anon reads nothing.
--
-- Read-only on purpose. Both tables are written solely by /api/telegram/webhook
-- using the service-role key, which bypasses RLS. A SECURITY DEFINER insert
-- reachable with the public anon key would let anyone forge inbound customer
-- messages, so the webhook gets a real server-side secret instead.
create policy "owner reads telegram_connections" on telegram_connections
  for select to authenticated using (true);

create policy "owner reads telegram_messages" on telegram_messages
  for select to authenticated using (true);

commit;
