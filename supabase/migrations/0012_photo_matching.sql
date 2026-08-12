-- Step 4 follow-up — a customer who sends a photo with no words at all ("this
-- one, do you have it?") could not be answered before: the webhook already
-- discarded any message with no text, and there was no path from a photo to a
-- product.
--
-- Off by default, like can_place_orders: this is the least certain capability in
-- the system by construction. Vision only ever returns a closed set of category
-- and colour tags — never a product name — so the pipeline still cannot invent
-- what is in stock, but "closest visual match in the catalogue" is a weaker
-- claim than "the customer typed this exact word", and the seller should turn it
-- on deliberately once they trust it, the same way they do with order-taking.
--
-- Rollback: see 0012_photo_matching.down.sql

begin;

alter table assistant_settings
  add column can_match_photos boolean not null default false;

commit;
