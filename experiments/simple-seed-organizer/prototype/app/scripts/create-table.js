/**
 * Create Supabase seeds table via API
 * This requires a service role key (admin access)
 * 
 * Usage:
 *   node scripts/create-table.js
 * 
 * Or set SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load .env.local from multiple locations
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Creating seeds table in Supabase...\n');

// Read the SQL migration file
const sqlPath = path.join(__dirname, '../supabase/migrations/001_create_seeds_table.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('📄 SQL Migration:');
console.log('─'.repeat(60));
console.log(sql);
console.log('─'.repeat(60));
console.log('\n');

// If we have service role key, try to execute via API
async function createTableViaAPI() {
  if (serviceRoleKey) {
    console.log('🔑 Using service role key to create table via API...\n');
    console.log('⚠️  Note: Supabase doesn\'t support DDL via REST API.');
    console.log('   You need to run the SQL manually in the SQL Editor.\n');
    return;
  } else {
    console.log('ℹ️  No service role key found. Using manual SQL execution.\n');
  }
}

createTableViaAPI();

console.log('\n📋 MANUAL SETUP INSTRUCTIONS:');
console.log('─'.repeat(60));
console.log('1. Go to: https://app.supabase.com/project/orlpgxqbesxvlhlkbnqy');
console.log('2. Click "SQL Editor" in the left sidebar');
console.log('3. Click "New query"');
console.log('4. Copy and paste the SQL above');
console.log('5. Click "Run" (or press Cmd/Ctrl + Enter)');
console.log('6. You should see "Success. No rows returned"');
console.log('\n💡 Tip: To use API creation, add SUPABASE_SERVICE_ROLE_KEY to .env.local');
console.log('   (Get it from: Settings → API → service_role key)');
console.log('─'.repeat(60));
