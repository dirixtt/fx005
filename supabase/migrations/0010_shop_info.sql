-- Delivery, payment and hours as data the bot can read — not as sentences typed
-- into a prompt somewhere. Until now these three questions were unanswerable not
-- because the bot misunderstood them, but because the answer did not exist
-- anywhere in the database. Same rule as everywhere else in this project: if it
-- is not a row, the bot does not say it.
--
-- Rollback: see 0010_shop_info.down.sql

begin;

-- One row, by design — a single shop, matching every other table here. The
-- boolean primary key with a check forcing it to `true` is the standard trick for
-- "this table has exactly one row": an insert of a second row violates the
-- primary key, not a trigger that has to be remembered.
create table shop_info (
  id boolean primary key default true check (id),
  payment_text text,
  hours_text text,
  updated_at timestamptz not null default now()
);
insert into shop_info (id) values (true);

create table delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null default 0,
  eta_days text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index delivery_zones_sort_idx on delivery_zones (sort_order);

alter table shop_info enable row level security;
alter table delivery_zones enable row level security;

-- Same shape as every other admin-editable table (see "owner full access
-- products"): the signed-in owner has full access, nothing else does. The bot
-- itself reads through the service-role client, which bypasses RLS regardless.
create policy "owner full access shop_info"
  on shop_info for all
  to authenticated
  using (true) with check (true);

create policy "owner full access delivery_zones"
  on delivery_zones for all
  to authenticated
  using (true) with check (true);

commit;
