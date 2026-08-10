-- Steps 4-6 of the roadmap: answering from the database, taking orders, and
-- chasing conversations the seller has left hanging.
--
-- Three things are added here:
--   1. `telegram` as a sale channel, so bot orders are distinguishable from
--      storefront orders in every report rather than being quietly merged.
--   2. `telegram_chats` — one row per conversation. This is the assistant's only
--      memory. Without it "42 bormi" arriving after "почём бомбер" has nothing to
--      attach itself to, and the bot would have to guess which product is meant.
--   3. De-duplication for message logging, because the bot's own replies come
--      back to us over the webhook as well as being written when we send them.
--
-- Rollback: see 0005_telegram_assistant.down.sql

begin;

-- Orders taken by the bot are real orders, but they are not storefront orders:
-- they skip the cart, the address is often a district rather than a street, and
-- the seller confirms them by hand. Folding them into 'online' would make that
-- distinction unrecoverable the moment the first one lands.
alter type sale_channel add value if not exists 'telegram';

create table telegram_chats (
  -- The Telegram chat id is already unique and already the thing every lookup
  -- has in hand; a surrogate key would just add a join.
  chat_id bigint primary key,

  business_connection_id text,

  -- 'idle'             — normal question-and-answer.
  -- 'awaiting_contact' — the customer said they want to buy and we asked for a
  --                      name and phone; their next message is read as an answer
  --                      to that question, not as a new question.
  state text not null default 'idle' check (state in ('idle', 'awaiting_contact')),

  -- The pending order while state = 'awaiting_contact': variant_id and quantity.
  -- Cleared as soon as the order is created or abandoned.
  draft jsonb,

  -- The product this conversation is about. Customers ask "42 bormi" under a
  -- photo without naming anything, so the previous turn is usually the only clue
  -- there is. Null means we genuinely do not know — and then the bot says
  -- nothing rather than answering about a product nobody asked about.
  last_product_id uuid references products (id) on delete set null,

  -- When the seller was last nudged about this conversation. Compared against the
  -- newest inbound message so one nudge per unanswered question, not one per run.
  last_reminded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The bot sends its replies through the seller's business account, and Telegram
-- then delivers those same replies back to us as updates. Recording them twice
-- would make a conversation look answered twice — harmless — but would also let a
-- retried webhook re-run the assistant over a question already answered, which
-- means a second reply to the customer and, mid-order, a second order.
--
-- Not a partial index: nulls never conflict with each other in Postgres, so rows
-- without a message id are unaffected, and a plain index is one ON CONFLICT can
-- actually be inferred from.
create unique index telegram_messages_dedupe_idx
  on telegram_messages (chat_id, telegram_message_id);

alter table telegram_chats enable row level security;

-- Same posture as telegram_messages: no policies, so the anon and authenticated
-- keys see nothing at all. Every access goes through the service-role client in
-- the webhook or through the SECURITY DEFINER functions below.

commit;
