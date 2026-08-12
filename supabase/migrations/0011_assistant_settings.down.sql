-- Rollback of 0011_assistant_settings.sql.
--
-- The assistant falls back to its hardcoded defaults once this table is gone —
-- see the DEFAULT_SETTINGS constant in src/lib/telegram/settings.ts — so removing
-- the table does not stop the bot from working, only from being configurable.

begin;

drop table if exists assistant_settings;

commit;
