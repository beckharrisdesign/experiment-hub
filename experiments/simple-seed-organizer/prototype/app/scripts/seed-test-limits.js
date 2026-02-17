/**
 * Add sample data to bring a user close to Home Garden limits for testing gates.
 * Home Garden: 300 seeds, 20 AI completions/month.
 * Target: 298 seeds, 18 AI completions (2 uses short of each limit).
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Usage: node scripts/seed-test-limits.js
 *        SEED_TEST_EMAIL=katybeck@gmail.com node scripts/seed-test-limits.js
 */

const path = require('path');
const envPaths = [
  path.join(__dirname, '../.env.local'),
  path.join(__dirname, '../../../../.env.local'),
  '.env.local',
];
for (const p of envPaths) {
  if (require('fs').existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_TEST_EMAIL || 'katybeck@gmail.com';

const HOME_GARDEN_SEED_LIMIT = 300;
const HOME_GARDEN_AI_LIMIT = 20;
const TARGET_SEEDS = 298;  // 2 short of limit
const TARGET_AI = 18;      // 2 short of limit

const SAMPLE_NAMES = [
  'Tomato', 'Basil', 'Cucumber', 'Zucchini', 'Pepper', 'Lettuce', 'Carrot',
  'Radish', 'Spinach', 'Kale', 'Beans', 'Peas', 'Squash', 'Melon', 'Onion',
  'Garlic', 'Cilantro', 'Parsley', 'Dill', 'Oregano', 'Thyme', 'Rosemary',
  'Marigold', 'Sunflower', 'Nasturtium', 'Lavender', 'Chamomile', 'Calendula',
];

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  console.log(`\n🔍 Looking up user: ${email}\n`);

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }

  const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  const userId = user.id;
  console.log(`✓ Found user: ${user.email} (${userId})\n`);

  // 1. Seed count - add until we have TARGET_SEEDS
  const { count: currentSeedCount, error: countError } = await supabase
    .from('seeds')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    console.error('❌ Failed to count seeds:', countError.message);
    process.exit(1);
  }

  const seedsToAdd = Math.max(0, TARGET_SEEDS - (currentSeedCount ?? 0));
  console.log(`Seeds: ${currentSeedCount ?? 0} current, target ${TARGET_SEEDS}, adding ${seedsToAdd}`);

  if (seedsToAdd > 0) {
    const now = new Date().toISOString();
    const inserts = [];
    for (let i = 0; i < seedsToAdd; i++) {
      const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
      inserts.push({
        user_id: userId,
        name: `${name} (Test ${i + 1})`,
        variety: 'Sample',
        type: ['vegetable', 'herb', 'flower', 'fruit', 'other'][i % 5],
        created_at: now,
        updated_at: now,
      });
    }

    const { error: insertError } = await supabase.from('seeds').insert(inserts);
    if (insertError) {
      console.error('❌ Failed to insert seeds:', insertError.message);
      process.exit(1);
    }
    console.log(`✓ Added ${seedsToAdd} sample seeds\n`);
  } else {
    console.log(`✓ Already at or above target seed count\n`);
  }

  // 2. AI usage - set to TARGET_AI for current month
  const period = getCurrentPeriod();
  const { error: upsertError } = await supabase
    .from('ai_usage')
    .upsert(
      {
        user_id: userId,
        period,
        completions: TARGET_AI,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,period' }
    );

  if (upsertError) {
    console.error('❌ Failed to set AI usage:', upsertError.message);
    process.exit(1);
  }

  console.log(`✓ Set AI completions to ${TARGET_AI} for ${period}\n`);
  console.log('📋 Summary:');
  console.log(`   Seeds: ${TARGET_SEEDS} / ${HOME_GARDEN_SEED_LIMIT} (2 more until limit)`);
  console.log(`   AI: ${TARGET_AI} / ${HOME_GARDEN_AI_LIMIT} (2 more until limit)`);
  console.log('\n✓ Done. Switch to Home Garden tier and test the gates.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
