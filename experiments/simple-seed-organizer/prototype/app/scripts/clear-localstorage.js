/**
 * Clear localStorage for seed organizer
 * Run this in browser console, or use the HTML file
 */

// Open the HTML file in your browser, or run this in the browser console:
// (Copy and paste into browser console when on your app page)

(function() {
  const STORAGE_KEY = 'simple-seed-organizer-seeds';
  const PROFILE_STORAGE_KEY = 'simple-seed-organizer-profile';

  console.log('🧹 Clearing localStorage...');
  
  // Check what exists
  const hadSeeds = localStorage.getItem(STORAGE_KEY);
  const hadProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
  
  if (hadSeeds) {
    const seeds = JSON.parse(hadSeeds);
    console.log(`   Found ${seeds.length} seeds in localStorage`);
  }
  
  // Clear seeds
  localStorage.removeItem(STORAGE_KEY);
  console.log('   ✅ Cleared seeds data');
  
  // Optionally clear profile (uncomment if needed)
  // localStorage.removeItem(PROFILE_STORAGE_KEY);
  // console.log('   ✅ Cleared profile data');
  
  // Verify
  const seedsAfter = localStorage.getItem(STORAGE_KEY);
  if (!seedsAfter) {
    console.log('✅ LocalStorage cleared successfully!');
    console.log('   Ready for end-to-end testing with Supabase.');
  } else {
    console.error('❌ Failed to clear localStorage');
  }
})();
