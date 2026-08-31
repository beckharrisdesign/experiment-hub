-- elk-listing-evaluation 3.5e: listing-kit fulfillment stores manifest.json
-- beside the images (the order/download routes serve any kit shape from it).
-- The elk-outputs bucket was image/jpeg-only, which rejected the manifest and
-- failed the first live kit order (2026-08-31, auto-refunded). Allow JSON.
update storage.buckets
  set allowed_mime_types = array['image/jpeg', 'application/json']
  where id = 'elk-outputs';
