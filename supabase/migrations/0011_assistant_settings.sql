-- The control panel for the assistant — Step 6 of the plan discussed with the
-- seller: they see the bot's conversations in /admin/telegram, but until now had
-- no way to shape what it does short of asking a developer to change code.
--
-- Every field here is wired to real behaviour in assistant.ts and intent.ts.
-- Deliberately not included: a discount/bargain setting and a computed
-- "quiet hours" mode. Both were discussed, both would need new intents,
-- templates, or a way to compute "is it currently after hours" from freeform
-- text — real feature work, not a config toggle. A setting nothing reads is
-- worse than no setting: it tells the seller they configured something that
-- silently does nothing.
--
-- Rollback: see 0011_assistant_settings.down.sql

begin;

create table assistant_settings (
  id boolean primary key default true check (id),

  -- The master switch. Off means handleInboundMessage returns before spending a
  -- model call on anything — not just "answers less", genuinely does nothing.
  enabled boolean not null default true,

  -- Each capability gates one branch of dispatch(). A customer whose intent maps
  -- to a disabled capability gets exactly what an unrecognised message gets:
  -- silence, and a line on the seller's unanswered list. This is deliberate —
  -- there is no separate "I can't help with that" template to maintain, and the
  -- seller sees every such message the same way they see every other one they
  -- need to answer by hand.
  can_answer_availability boolean not null default true,
  can_answer_price boolean not null default true,
  can_answer_order_status boolean not null default true,
  can_answer_shop_info boolean not null default true,
  -- Off by default, unlike the four read-only capabilities above: this is the
  -- one branch that moves stock and creates a real sale. A seller turns it on
  -- once they have watched /admin/telegram long enough to trust the read-only
  -- answers.
  can_place_orders boolean not null default false,

  -- How long an inbound message waits before /api/cron/unanswered nags the
  -- seller about it. The route still accepts a ?minutes= override for a manual
  -- one-off check.
  reminder_minutes int not null default 15 check (reminder_minutes > 0),

  -- 'auto' answers in whatever language the classifier detected per message
  -- (the norm — customers switch mid-conversation). Forcing 'ru' or 'uz'
  -- overrides that per-message detection everywhere a reply is sent.
  language_mode text not null default 'auto' check (language_mode in ('auto', 'ru', 'uz')),

  -- Appended to every customer-facing reply, verbatim. Null means nothing is
  -- appended — most sellers will leave this empty.
  signature text,

  -- Read only by the classifier's system prompt, and only to help it recognise
  -- what customers mean — 'клиенты называют кроссовки словом кеды', 'артикулы
  -- у нас четырёхзначные'. This cannot change what the bot is capable of saying:
  -- answers still come from templates filled with database values, never from
  -- free text the model was allowed to write. That boundary is not a setting.
  extra_instructions text,

  updated_at timestamptz not null default now()
);
insert into assistant_settings (id) values (true);

alter table assistant_settings enable row level security;

create policy "owner full access assistant_settings"
  on assistant_settings for all
  to authenticated
  using (true) with check (true);

commit;
