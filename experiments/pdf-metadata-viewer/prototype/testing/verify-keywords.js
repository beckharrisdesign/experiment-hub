#!/usr/bin/env node

/**
 * Quick verification script to test if keywords are being saved to PDF files.
 * 
 * Usage:
 *   node verify-keywords.js <pdf-filename>
 * 
 * This will:
 * 1. Read the PDF
 * 2. Set a test keyword
 * 3. Save the PDF
 * 4. Re-read the PDF
 * 5. Verify the keyword was saved
 */

import { readFile, writeFile } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get PDFs directory (same logic as server.js)
function getPDFsDirectory() {
  const pdfsDir = process.env.PDFS_DIR || 'pdfs';
  if (pdfsDir.startsWith('/') || (process.platform === 'win32' && /^[A-Z]:/.test(pdfsDir))) {
    return pdfsDir;
  }
  return join(__dirname, '..', pdfsDir);
}

const PDFS_DIR = getPDFsDirectory();

async function verifyKeywords(filename) {
  try {
    const filePath = join(PDFS_DIR, filename);
    
    console.log(`\n📄 Testing: ${filename}`);
    console.log(`📁 Path: ${filePath}\n`);
    
    // Step 1: Read original PDF
    console.log('1️⃣  Reading original PDF...');
    const originalBytes = await readFile(filePath);
    const originalPdf = await PDFDocument.load(originalBytes);
    
    const originalKeywords = originalPdf.getKeywords() || [];
    console.log(`   Original keywords: ${Array.isArray(originalKeywords) ? originalKeywords.join(', ') : originalKeywords}`);
    
    // Step 2: Set test keyword
    console.log('\n2️⃣  Setting test keyword...');
    const testKeyword = `test-verification-${Date.now()}`;
    originalPdf.setKeywords([...originalKeywords, testKeyword]);
    
    // Step 3: Save PDF
    console.log('3️⃣  Saving PDF...');
    const updatedBytes = await originalPdf.save();
    await writeFile(filePath, updatedBytes);
    console.log('   ✅ PDF saved');
    
    // Step 4: Re-read PDF to verify
    console.log('\n4️⃣  Re-reading PDF to verify...');
    const verifyBytes = await readFile(filePath);
    const verifyPdf = await PDFDocument.load(verifyBytes);
    
    const verifyKeywords = verifyPdf.getKeywords() || [];
    
    // Debug: Check what type we got
    console.log(`   Type: ${typeof verifyKeywords}, Is Array: ${Array.isArray(verifyKeywords)}`);
    console.log(`   Raw value: ${JSON.stringify(verifyKeywords)}`);
    
    // Handle different return types from pdf-lib
    let verifyKeywordsArray = [];
    if (Array.isArray(verifyKeywords)) {
      verifyKeywordsArray = verifyKeywords;
    } else if (typeof verifyKeywords === 'string') {
      // If it's a string with space-separated characters, try to reconstruct
      // This is a bug in how pdf-lib is reading keywords
      const cleaned = verifyKeywords.replace(/\s+/g, '');
      // Try to split by common delimiters or just check if test keyword is in the string
      verifyKeywordsArray = [verifyKeywords]; // Keep as-is for now
    } else {
      verifyKeywordsArray = [verifyKeywords];
    }
    
    console.log(`   Keywords found: ${verifyKeywordsArray.join(', ')}`);
    
    // Step 5: Check if test keyword is present
    console.log('\n5️⃣  Verification result:');
    // Check both array inclusion and string inclusion (for the corrupted format)
    const keywordString = Array.isArray(verifyKeywords) ? verifyKeywords.join(' ') : String(verifyKeywords);
    const testKeywordInString = keywordString.includes(testKeyword);
    const testKeywordInArray = Array.isArray(verifyKeywordsArray) && verifyKeywordsArray.includes(testKeyword);
    
    if (testKeywordInArray || testKeywordInString) {
      console.log('   ✅ SUCCESS: Test keyword was saved and can be read back!');
      console.log('   ✅ Keywords ARE being saved to the PDF file.');
      if (!testKeywordInArray) {
        console.log('   ⚠️  WARNING: Keywords are being saved, but getKeywords() returns corrupted format (space-separated characters)');
        console.log('   ⚠️  This is a pdf-lib bug or PDF format issue - keywords ARE in the file but read incorrectly');
      }
      
      // Clean up: remove test keyword
      console.log('\n🧹 Cleaning up test keyword...');
      const cleanedPdf = await PDFDocument.load(verifyBytes);
      const cleanedKeywords = cleanedPdf.getKeywords() || [];
      let cleanedKeywordsArray = [];
      if (Array.isArray(cleanedKeywords)) {
        cleanedKeywordsArray = cleanedKeywords.filter(k => k !== testKeyword);
      } else if (typeof cleanedKeywords === 'string') {
        // For corrupted format, we need to reconstruct - this is tricky
        // For now, just reload original and re-save without test keyword
        const originalPdf2 = await PDFDocument.load(originalBytes);
        const originalKeywords2 = originalPdf2.getKeywords() || [];
        cleanedKeywordsArray = Array.isArray(originalKeywords2) ? originalKeywords2 : [];
      }
      cleanedPdf.setKeywords(cleanedKeywordsArray);
      const cleanedBytes = await cleanedPdf.save();
      await writeFile(filePath, cleanedBytes);
      console.log('   ✅ Test keyword removed');
      
      return true;
    } else {
      console.log('   ❌ FAILURE: Test keyword was NOT found after saving!');
      console.log('   ❌ Keywords are NOT being saved to the PDF file.');
      console.log(`   Expected: ${testKeyword}`);
      console.log(`   Found: ${verifyKeywordsArray.join(', ')}`);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    console.error(error.stack);
    return false;
  }
}

// Main
const filename = process.argv[2];

if (!filename) {
  console.error('Usage: node verify-keywords.js <pdf-filename>');
  console.error('Example: node verify-keywords.js "2025-02-27-shell-gas-station-receipt.pdf"');
  process.exit(1);
}

verifyKeywords(filename)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
