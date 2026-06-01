-- Seed photos as an ordered collection (seed-photos-as-collection change).
-- Run in Supabase SQL Editor after 008_user_profiles.sql.
--
-- Additive and nullable. Legacy photo_front / photo_back (+ *_path) columns are
-- retained; a read-time shim in lib/seedConverters.ts synthesizes photos[] from
-- them until a row is saved, at which point photos[] is persisted here
-- (upgrade-in-place — no backfill).

ALTER TABLE seeds ADD COLUMN IF NOT EXISTS photos JSONB;

COMMENT ON COLUMN seeds.photos IS
  'Ordered SeedPhoto collection [{id,path,order,label?}]. Supersedes photo_front/back. NULL = legacy row not yet upgraded (read via shim).';
