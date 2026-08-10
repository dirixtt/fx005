-- Rollback of 0010_shop_info.sql.

begin;

drop table if exists delivery_zones;
drop table if exists shop_info;

commit;
