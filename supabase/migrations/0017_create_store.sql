-- Multi-tenant pivot, phase 3: store creation on first login.
--
-- One transaction: the store row, plus the default assistant_settings/shop_info
-- rows every store needs (previously seeded once by migration for the single
-- tenant; now there's no migration moment to seed at, since stores are created
-- at runtime). security definer because the caller has no store yet — nothing
-- in RLS would otherwise let them insert one for themselves.
--
-- Rollback: see 0017_create_store.down.sql

begin;

create function create_store(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from stores where owner_user_id = auth.uid()) then
    raise exception 'This account already has a store';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Store name is required';
  end if;
  if p_slug !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'Slug must be 2-40 lowercase letters, digits, or hyphens';
  end if;

  insert into stores (name, slug, owner_user_id)
  values (trim(p_name), p_slug, auth.uid())
  returning id into v_store_id;

  insert into assistant_settings (store_id) values (v_store_id);
  insert into shop_info (store_id) values (v_store_id);

  return v_store_id;
end;
$$;

revoke all on function create_store(text, text) from public;
grant execute on function create_store(text, text) to authenticated;

commit;
