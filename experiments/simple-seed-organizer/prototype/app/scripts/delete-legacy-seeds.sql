-- Delete seeds that have base64 photos (pre-migration) so you can re-add them with storage
-- Run in Supabase SQL Editor (run the SELECT first to preview, then the DELETE)

-- Preview: which seeds will be deleted
SELECT id, name, variety, user_id,
  CASE WHEN photo_front IS NOT NULL THEN 'Yes' ELSE 'No' END as has_front,
  CASE WHEN photo_back IS NOT NULL THEN 'Yes' ELSE 'No' END as has_back
FROM seeds
WHERE (photo_front IS NOT NULL OR photo_back IS NOT NULL)
  AND (photo_front_path IS NULL AND photo_back_path IS NULL);

-- Delete: run this in a separate query after confirming the preview
DELETE FROM seeds
WHERE (photo_front IS NOT NULL OR photo_back IS NOT NULL)
  AND (photo_front_path IS NULL AND photo_back_path IS NULL);
