/**
 * Test Supabase connection and table setup
 * Run with: node scripts/test-supabase.js
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

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    break;
  }
}

// Also try direct values if env vars aren't loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://orlpgxqbesxvlhlkbnqy.supabase.co';
// Prefer publishable key (new format), fall back to legacy anon key
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  || 'sb_publishable_eEZ5ZdsvMOBUBLUCIFfNrQ_YrJAQY7W';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are set');
  process.exit(1);
}

console.log('🔗 Testing Supabase connection...');
console.log('   URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Check if table exists
    console.log('\n📊 Checking if seeds table exists...');
    const { data, error } = await supabase
      .from('seeds')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('❌ Table does not exist yet!');
        console.log('\n📝 Next steps:');
        console.log('   1. Go to https://app.supabase.com');
        console.log('   2. Open your project');
        console.log('   3. Go to SQL Editor');
        console.log('   4. Click "New query"');
        console.log('   5. Copy and paste the SQL from: supabase/migrations/001_create_seeds_table.sql');
        console.log('   6. Click "Run" (or press Cmd/Ctrl + Enter)');
        console.log('   7. Run this test again: node scripts/test-supabase.js');
        return;
      }
      throw error;
    }

    console.log('✅ Table exists!');

    // Test 2: Try to insert a test record
    console.log('\n🧪 Testing insert...');
    const testSeed = {
      name: 'Test Seed',
      variety: 'Test Variety',
      type: 'vegetable',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabase
      .from('seeds')
      .insert([testSeed])
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      if (insertError.message.includes('permission') || insertError.message.includes('policy')) {
        console.log('\n⚠️  RLS (Row Level Security) issue. Check your policies in Supabase dashboard.');
      }
      return;
    }

    console.log('✅ Insert successful! Test seed ID:', insertData.id);

    // Test 3: Try to read it back
    console.log('\n📖 Testing read...');
    const { data: readData, error: readError } = await supabase
      .from('seeds')
      .select('*')
      .eq('id', insertData.id)
      .single();

    if (readError) {
      console.log('❌ Read failed:', readError.message);
      return;
    }

    console.log('✅ Read successful!');

    // Test 4: Clean up test record
    console.log('\n🧹 Cleaning up test record...');
    const { error: deleteError } = await supabase
      .from('seeds')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      console.log('⚠️  Delete failed (but that\'s okay):', deleteError.message);
    } else {
      console.log('✅ Cleanup successful!');
    }

    console.log('\n🎉 All tests passed! Supabase is ready to use.');
    console.log('   You can now add seeds in the app and they will be saved to Supabase.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testConnection();
