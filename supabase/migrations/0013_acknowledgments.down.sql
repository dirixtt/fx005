-- Rollback of 0013_acknowledgments.sql.

begin;

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

alter table telegram_chats drop column if exists last_ack_notified_at;
alter table assistant_settings drop column if exists acknowledge_unanswered;

commit;
