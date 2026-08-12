-- Step 3 of the roadmap: record what the classifier understood.
--
-- The bot still says nothing to anyone. These columns exist so the classifier can
-- run against real customer messages and be judged on them before Step 4 wires up
-- replies — the alternative is discovering that "42 bormi" is misread on the day
-- the bot starts answering customers with it.
--
-- Only inbound messages are classified, so both columns stay null on the seller's
-- own replies.
--
-- Rollback: see 0004_message_intent.down.sql

begin;

alter table telegram_messages
  -- One of: check_availability, ask_price, place_order, other. Not a check
  -- constraint or an enum: this is a log of what a model said, and a value we did
  -- not anticipate must be recordable, not rejected at the door.
  add column intent text,

  -- The full parsed intent — size, colour, product, language, and for `other` the
  -- reason we landed there ('classified' vs 'unavailable' distinguishes a genuine
  -- greeting from an outage, which look identical from the seller's side).
  add column intent_data jsonb;

-- The Step 6 reminder asks "which inbound messages went unanswered?", and once
-- Step 4 lands it will want "...and which of those we understood but did not
-- answer". Partial index: outbound rows are never classified.
create index telegram_messages_intent_idx
  on telegram_messages (intent, created_at desc)
  where intent is not null;

commit;
