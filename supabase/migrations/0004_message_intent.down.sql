-- Rollback of 0004_message_intent.sql.
--
-- Drops the recorded classifications. The messages themselves are untouched, so a
-- re-applied 0004 can be backfilled by replaying them through the classifier.

begin;

drop index if exists telegram_messages_intent_idx;

alter table telegram_messages
  drop column if exists intent,
  drop column if exists intent_data;

commit;
