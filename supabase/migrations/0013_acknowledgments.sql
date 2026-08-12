-- The bot going fully silent whenever it cannot answer was a real gap: a
-- customer who gets nothing back cannot tell "the shop is ignoring me" from
-- "my message didn't arrive". This adds a fixed, bilingual "give me a moment"
-- reply for every path that used to just return, plus an immediate ping to the
-- seller instead of waiting for the next /api/cron/unanswered run.
--
-- The hard part is not sending the message — it's sending it without breaking
-- Step 6. unanswered_chats() decides "is this chat waiting?" by looking at the
-- direction of the newest message; if the acknowledgment were logged as an
-- ordinary outbound reply, the chat would look answered the instant it went
-- out, and the customer's real, still-unanswered question would vanish from
-- the seller's list. So the acknowledgment is tagged distinctly in `raw`, and
-- unanswered_chats() is told to look straight through that tag.
--
-- Rollback: see 0013_acknowledgments.down.sql

begin;

alter table assistant_settings
  add column acknowledge_unanswered boolean not null default true;

-- Throttles the immediate seller ping, independent of last_reminded_at (which
-- belongs to the periodic cron and must keep its own timing). A customer firing
-- off three unclear messages in a row should ring the seller's phone once, not
-- three times — /admin/telegram already shows everything in between.
alter table telegram_chats
  add column last_ack_notified_at timestamptz;

create or replace function unanswered_chats(p_minutes int default 15)
returns table (
  chat_id bigint,
  business_connection_id text,
  last_text text,
  waiting_minutes int
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with latest as (
    select distinct on (m.chat_id)
           m.chat_id, m.business_connection_id, m.direction, m.text, m.created_at
      from telegram_messages m
     -- An acknowledgment is not an answer — it is the bot saying "someone will
     -- get back to you", which is precisely the promise this reminder exists to
     -- keep. Excluding it here means the customer's original question is still
     -- what counts as "the newest message" for this chat.
     where coalesce(m.raw ->> 'source', '') <> 'assistant_ack'
     order by m.chat_id, m.created_at desc
  )
  select l.chat_id,
         l.business_connection_id,
         l.text,
         (extract(epoch from (now() - l.created_at)) / 60)::int
    from latest l
    left join telegram_chats c on c.chat_id = l.chat_id
   where l.direction = 'in'
     and l.created_at < now() - make_interval(mins => p_minutes)
     and (c.last_reminded_at is null or c.last_reminded_at < l.created_at)
   order by l.created_at;
$function$;

commit;
