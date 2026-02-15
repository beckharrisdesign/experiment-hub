# Supabase Storage Setup for Seed Photos

Photos are stored in Supabase Storage instead of base64 in the database.

## 1. Create the bucket

1. Go to **Supabase Dashboard** → **Storage** → **New bucket**
2. Name: `seed-photos`
3. **Public bucket**: Yes (so images can be displayed via URL)
4. Optional: File size limit 512 KB, Allowed MIME types: image/jpeg, image/png, image/webp

## 2. Run the migration

1. Go to **SQL Editor** → New query
2. Paste contents of `supabase/migrations/003_seed_photos_storage.sql`
3. Run

## 3. Migrate existing photos (if you have base64 data)

```bash
# Add to .env.local if using RLS:
# SUPABASE_SCRIPT_EMAIL=your@email.com
# SUPABASE_SCRIPT_PASSWORD=your-password

node scripts/migrate-photos-to-storage.js
```

Dry run first: `DRY_RUN=1 node scripts/migrate-photos-to-storage.js`

## Path structure

- `{user_id}/{seed_id}/front.jpg`
- `{user_id}/{seed_id}/back.jpg`

RLS ensures users can only access their own folder.
