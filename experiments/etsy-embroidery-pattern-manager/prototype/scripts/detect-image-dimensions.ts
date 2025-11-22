import { initDatabase } from '../lib/db';
import { getAllPatterns } from '../lib/patterns';
import { getImageMetadata } from '../lib/image-metadata';
import path from 'path';

/**
 * Script to detect and log dimensions for all pixel-based images
 * This processes all patterns and extracts image metadata
 */
async function detectAllImageDimensions() {
  console.log('=== Starting Image Dimension Detection ===\n');
  
  // Initialize database
  initDatabase();
  
  // Get all patterns
  const patterns = getAllPatterns();
  console.log(`Found ${patterns.length} patterns to process\n`);
  
  let processed = 0;
  let withImages = 0;
  let withDimensions = 0;
  let errors = 0;
  
  for (const pattern of patterns) {
    processed++;
    console.log(`[${processed}/${patterns.length}] Processing: ${pattern.name} (${pattern.id})`);
    
    if (!pattern.imageUrl) {
      console.log('  ⚠️  No image URL\n');
      continue;
    }
    
    withImages++;
    
    try {
      // Convert URL path to file system path
      const imagePath = path.join(process.cwd(), 'public', pattern.imageUrl);
      console.log(`  📁 Image path: ${imagePath}`);
      
      // Get image metadata
      const metadata = await getImageMetadata(imagePath);
      
      if (!metadata) {
        console.log('  ❌ Could not read image metadata\n');
        errors++;
        continue;
      }
      
      console.log('  ✅ Metadata extracted:');
      console.log(`     Format: ${metadata.format || '—'}`);
      console.log(`     Size: ${metadata.fileSize ? `${(metadata.fileSize / 1024).toFixed(2)} KB` : '—'}`);
      
      if (metadata.width && metadata.height) {
        console.log(`     Dimensions: ${metadata.width}×${metadata.height} pixels`);
        withDimensions++;
      } else {
        console.log('     Dimensions: — (not available)');
      }
      
      if (metadata.resolution) {
        console.log(`     Resolution: ${metadata.resolution}`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`  ❌ Error processing image:`, error);
      errors++;
      console.log('');
    }
  }
  
  console.log('=== Summary ===');
  console.log(`Total patterns: ${patterns.length}`);
  console.log(`Patterns with images: ${withImages}`);
  console.log(`Patterns with dimensions: ${withDimensions}`);
  console.log(`Errors: ${errors}`);
  console.log(`\n✅ Processing complete!`);
}

// Run the script
detectAllImageDimensions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

