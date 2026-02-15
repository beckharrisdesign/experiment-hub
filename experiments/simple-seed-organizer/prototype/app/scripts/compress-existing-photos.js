/**
 * Compress existing seed packet photos to match new size limits (512KB max, JPEG).
 *
 * Run: node scripts/compress-existing-photos.js
 * Dry run: DRY_RUN=1 node scripts/compress-existing-photos.js
 *
 * Uses .env.local (same as check-seeds.js). If RLS returns 0 seeds, add:
 *   SUPABASE_SCRIPT_EMAIL=your@email.com
 *   SUPABASE_SCRIPT_PASSWORD=your-password
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const MAX_PHOTO_BYTES = 512 * 1024;
const MAX_WIDTH = 1024;

// Load .env.local (same as check-seeds.js)
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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const scriptEmail = process.env.SUPABASE_SCRIPT_EMAIL;
const scriptPassword = process.env.SUPABASE_SCRIPT_PASSWORD;

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  return match ? Buffer.from(match[1], 'base64') : null;
}

function toDataUrl(buffer) {
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

async function compressImage(buffer, label) {
  const metadata = await sharp(buffer).metadata();
  let width = Math.min(metadata.width || 1024, MAX_WIDTH);
  let quality = 80;

  while (quality >= 25) {
    let pipeline = sharp(buffer).resize(width, null, { withoutEnlargement: true });

    const result = await pipeline
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (result.length <= MAX_PHOTO_BYTES) {
      return toDataUrl(result);
    }

    quality -= 15;
    if (quality < 25 && width > 512) {
      width = Math.max(512, Math.floor(width * 0.75));
      quality = 80;
    }
  }

  throw new Error(`${label} still over ${MAX_PHOTO_BYTES / 1024}KB after compression`);
}

async function main() {
  console.log('🖼️  Compressing existing seed photos...\n');

  if (scriptEmail && scriptPassword) {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: scriptEmail,
      password: scriptPassword,
    });
    if (authError) {
      console.error('❌ Sign-in failed:', authError.message);
      process.exit(1);
    }
    console.log(`   Signed in as ${scriptEmail}\n`);
  } else {
    console.log('   (Add SUPABASE_SCRIPT_EMAIL + SUPABASE_SCRIPT_PASSWORD to .env.local if RLS returns 0 seeds)\n');
  }

  if (dryRun) console.log('   (DRY RUN - no changes will be written)\n');
  console.log(`   Max size: ${MAX_PHOTO_BYTES / 1024}KB per photo`);
  console.log(`   Max width: ${MAX_WIDTH}px`);
  console.log('');

  const { data: allSeeds, error: fetchError } = await supabase
    .from('seeds')
    .select('id, name, variety, photo_front, photo_back')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching seeds:', fetchError.message);
    process.exit(1);
  }

  const seeds = (allSeeds || []).filter(
    (s) => (s.photo_front && s.photo_front.length > 0) || (s.photo_back && s.photo_back.length > 0)
  );

  if (seeds.length === 0) {
    console.log('ℹ️  No seeds with photos found.');
    if (allSeeds?.length) {
      console.log(`   (${allSeeds.length} total seeds in DB, none have photo_front or photo_back)`);
    } else {
      console.log('   (No seeds returned - check RLS if you expect data)');
    }
    return;
  }

  console.log(`📊 Found ${seeds.length} seeds with photos (of ${allSeeds?.length || 0} total)\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const seed of seeds) {
    const name = `${seed.name} (${seed.variety})`;
    let photoFront = seed.photo_front;
    let photoBack = seed.photo_back;
    let changed = false;

    try {
      if (photoFront) {
        const buf = parseDataUrl(photoFront);
        if (buf) {
          const beforeKb = Math.round(buf.length / 1024);
          const compressed = await compressImage(buf, 'Front');
          const afterKb = Math.round((compressed.length - 30) * 0.75 / 1024);

          if (afterKb < beforeKb) {
            photoFront = compressed;
            changed = true;
            console.log(`   ✓ ${name} front: ${beforeKb}KB → ${afterKb}KB`);
          }
        }
      }

      if (photoBack) {
        const buf = parseDataUrl(photoBack);
        if (buf) {
          const beforeKb = Math.round(buf.length / 1024);
          const compressed = await compressImage(buf, 'Back');
          const afterKb = Math.round((compressed.length - 30) * 0.75 / 1024);

          if (afterKb < beforeKb) {
            photoBack = compressed;
            changed = true;
            console.log(`   ✓ ${name} back: ${beforeKb}KB → ${afterKb}KB`);
          }
        }
      }

      if (changed) {
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('seeds')
            .update({ photo_front: photoFront, photo_back: photoBack })
            .eq('id', seed.id);

          if (updateError) throw updateError;
        }
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`   ✗ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped (already small): ${skipped}`);
  if (failed) console.log(`❌ Failed: ${failed}`);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
