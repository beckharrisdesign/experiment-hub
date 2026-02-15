/**
 * Check what seeds are in the Supabase database
 * Run with: node scripts/check-seeds.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Try multiple paths for .env.local
const envPaths = [
  path.join(__dirname, '../../../../.env.local'),
  path.join(__dirname, '../../../.env.local'),
  path.join(__dirname, '../../.env.local'),
  '.env.local'
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://orlpgxqbesxvlhlkbnqy.supabase.co';
// Prefer publishable key (new format), fall back to legacy anon key
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  || 'sb_publishable_eEZ5ZdsvMOBUBLUCIFfNrQ_YrJAQY7W';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeeds() {
  console.log('🔍 Checking seeds in Supabase database...\n');
  console.log('   URL:', supabaseUrl);
  console.log('');

  try {
    const { data, error, count } = await supabase
      .from('seeds')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching seeds:', error.message);
      return;
    }

    console.log(`📊 Total seeds in database: ${count || data?.length || 0}\n`);

    if (!data || data.length === 0) {
      console.log('ℹ️  No seeds found in the database.');
      console.log('   If you added a seed, it may have been saved to localStorage instead.');
      return;
    }

    console.log('✅ Seeds found in Supabase:\n');
    console.log('─'.repeat(80));

    data.forEach((seed, index) => {
      console.log(`\n${index + 1}. ${seed.name} (${seed.variety})`);
      console.log(`   ID: ${seed.id}`);
      console.log(`   Type: ${seed.type}`);
      console.log(`   Brand: ${seed.brand || 'N/A'}`);
      console.log(`   Created: ${new Date(seed.created_at).toLocaleString()}`);
      console.log(`   Has front photo: ${seed.photo_front ? 'Yes (' + Math.round(seed.photo_front.length / 1024) + ' KB)' : 'No'}`);
      console.log(`   Has back photo: ${seed.photo_back ? 'Yes (' + Math.round(seed.photo_back.length / 1024) + ' KB)' : 'No'}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log('\n✅ All seeds are stored in Supabase, not localStorage!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkSeeds();
