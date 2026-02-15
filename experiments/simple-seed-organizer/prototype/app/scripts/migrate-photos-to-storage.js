/**
 * Migrate existing base64 photos to Supabase Storage.
 * Run: node scripts/migrate-photos-to-storage.js
 * Dry run: DRY_RUN=1 node scripts/migrate-photos-to-storage.js
 *
 * Requires: SUPABASE_SCRIPT_EMAIL + SUPABASE_SCRIPT_PASSWORD in .env.local (for RLS)
 * Or run after 003 migration with permissive policies.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const BUCKET = 'seed-photos';
const MAX_BYTES = 512 * 1024;

const envPaths = [
  path.join(__dirname, '../../../../.env.local'),
  path.join(__dirname, '../../../.env.local'),
  path.join(__dirname, '../../.env.local'),
  '.env.local',
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://orlpgxqbesxvlhlkbnqy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const scriptEmail = process.env.SUPABASE_SCRIPT_EMAIL;
const scriptPassword = process.env.SUPABASE_SCRIPT_PASSWORD;
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!supabaseKey) {
  console.error('❌ Missing Supabase key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  return match ? Buffer.from(match[1], 'base64') : null;
}

async function compressToJpeg(buffer) {
  let quality = 80;
  let width = 1024;
  while (quality >= 25) {
    const result = await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (result.length <= MAX_BYTES) return result;
    quality -= 15;
    if (quality < 25 && width > 512) {
      width = Math.max(512, Math.floor(width * 0.75));
      quality = 80;
    }
  }
  return sharp(buffer).resize(512).jpeg({ quality: 50 }).toBuffer();
}

function getStoragePath(userId, seedId, side) {
  return `${userId}/${seedId}/${side}.jpg`;
}

async function main() {
  console.log('📤 Migrating base64 photos to Supabase Storage...\n');

  if (scriptEmail && scriptPassword) {
    const { error } = await supabase.auth.signInWithPassword({ email: scriptEmail, password: scriptPassword });
    if (error) {
      console.error('❌ Sign-in failed:', error.message);
      process.exit(1);
    }
    console.log(`   Signed in as ${scriptEmail}\n`);
  }

  if (dryRun) console.log('   (DRY RUN - no changes)\n');

  const { data: seeds, error } = await supabase
    .from('seeds')
    .select('id, user_id, name, variety, photo_front, photo_back, photo_front_path, photo_back_path')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Fetch error:', error.message);
    process.exit(1);
  }

  const toMigrate = (seeds || []).filter(
    (s) =>
      s.user_id &&
      ((s.photo_front && !s.photo_front_path) || (s.photo_back && !s.photo_back_path))
  );

  if (toMigrate.length === 0) {
    console.log('ℹ️  No seeds need migration (all have storage paths or no photos).');
    return;
  }

  console.log(`📊 Found ${toMigrate.length} seeds to migrate\n`);

  let migrated = 0;
  let failed = 0;

  for (const seed of toMigrate) {
    const userId = seed.user_id;
    if (!userId) {
      console.log(`   ⏭️  ${seed.name}: no user_id, skipping`);
      continue;
    }

    const name = `${seed.name} (${seed.variety})`;
    let photoFrontPath = seed.photo_front_path;
    let photoBackPath = seed.photo_back_path;
    let updated = false;

    try {
      if (seed.photo_front && !photoFrontPath) {
        const buf = parseDataUrl(seed.photo_front);
        if (buf) {
          const jpeg = await compressToJpeg(buf);
          const storagePath = getStoragePath(userId, seed.id, 'front');
          if (!dryRun) {
            const { error: uploadError } = await supabase.storage
              .from(BUCKET)
              .upload(storagePath, jpeg, { contentType: 'image/jpeg', upsert: true });
            if (uploadError) throw uploadError;
          }
          photoFrontPath = storagePath;
          updated = true;
          console.log(`   ✓ ${name} front → storage`);
        }
      }

      if (seed.photo_back && !photoBackPath) {
        const buf = parseDataUrl(seed.photo_back);
        if (buf) {
          const jpeg = await compressToJpeg(buf);
          const storagePath = getStoragePath(userId, seed.id, 'back');
          if (!dryRun) {
            const { error: uploadError } = await supabase.storage
              .from(BUCKET)
              .upload(storagePath, jpeg, { contentType: 'image/jpeg', upsert: true });
            if (uploadError) throw uploadError;
          }
          photoBackPath = storagePath;
          updated = true;
          console.log(`   ✓ ${name} back → storage`);
        }
      }

      if (updated && !dryRun) {
        const { error: updateError } = await supabase
          .from('seeds')
          .update({
            photo_front_path: photoFrontPath || null,
            photo_back_path: photoBackPath || null,
            photo_front: null,
            photo_back: null,
          })
          .eq('id', seed.id);

        if (updateError) throw updateError;
        migrated++;
      } else if (updated && dryRun) {
        migrated++;
      }
    } catch (err) {
      console.error(`   ✗ ${name}:`, err.message);
      failed++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Migrated: ${migrated}`);
  if (failed) console.log(`❌ Failed: ${failed}`);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
