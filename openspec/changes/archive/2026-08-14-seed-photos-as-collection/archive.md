# Archive — seed-photos-as-collection

**Archived:** 2026-08-14 · **Created:** 2026-06-01 · **Last touched:** 2026-06-01 · **Tasks:** 18/21

**Outcome: SHIPPED (never archived).**
Dropped the front/back photo model in favour of a photo collection per seed, with data read from every photo into one common field set.

**Evidence:** SSO migration `009_seed_photos_collection.sql`, plus `lib/seed-photos.ts` and `lib/seedPhotoSavePolicy.ts` in `experiments/simple-seed-organizer/prototype/app/`.

**Left open:** the `seed-photo-collection` spec delta was never promoted into `openspec/specs/`, so the shipped behavior has no canonical spec.
