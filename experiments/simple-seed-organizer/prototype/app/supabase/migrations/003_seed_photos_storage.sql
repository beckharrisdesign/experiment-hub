-- Migrate seed photos from base64 in DB to Supabase Storage
-- Run in Supabase SQL Editor after 002_add_user_id_and_rls.sql
--
-- FIRST: Create bucket via Dashboard → Storage → New bucket
--   - Name: seed-photos
--   - Public: Yes
--   - File size limit: 512 KB (optional)
--   - Allowed MIME types: image/jpeg, image/png, image/webp (optional)

-- 1. Add path columns (keep photo_front, photo_back for migration period)
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS photo_front_path TEXT;
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS photo_back_path TEXT;

-- 2. RLS: Users can only access their own folder (path: {user_id}/{seed_id}/filename)
CREATE POLICY "Users can upload own seed photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'seed-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own seed photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'seed-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own seed photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'seed-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own seed photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'seed-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
