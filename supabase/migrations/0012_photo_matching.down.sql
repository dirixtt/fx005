-- Rollback of 0012_photo_matching.sql.

begin;

alter table assistant_settings drop column if exists can_match_photos;

commit;
