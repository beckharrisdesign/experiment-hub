#!/usr/bin/env node

/**
 * Enhanced keyword verification script with statistics
 * 
 * Usage:
 *   node verify-keywords-stats.js
 * 
 * This will:
 * 1. Read all PDFs in PDFS_DIR
 * 2. Extract keywords from each
 * 3. Display all keywords found
 * 4. Generate statistics (average count, most used, etc.)
 */

import 'dotenv/config';
import { readFile, readdir } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

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

// Helper to reconstruct keywords from corrupted format
// pdf-lib returns keywords as a string like: "r e c e i p t   g r o c e r y   h e b"
// Where single spaces separate characters and multiple spaces (2+) separate keywords
function reconstructKeywords(corruptedString) {
  // First, extract test keywords (they're intact and may be concatenated)
  const testKeywordMatch = corruptedString.match(/test-verification-\d+/);
  let testKeyword = null;
  let stringWithoutTest = corruptedString;
  
  if (testKeywordMatch) {
    testKeyword = testKeywordMatch[0];
    // Remove test keyword from string (may be concatenated or separated)
    stringWithoutTest = corruptedString.substring(0, testKeywordMatch.index).trim();
  }
  
  // Split by multiple spaces (2 or more) to get individual keywords
  const keywordParts = stringWithoutTest.split(/\s{2,}/);
  
  const reconstructed = [];
  
  for (const part of keywordParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Remove single spaces to reconstruct the keyword
    const keyword = trimmed.replace(/\s+/g, '');
    if (keyword.length > 0) {
      reconstructed.push(keyword);
    }
  }
  
  // Add test keyword at the end if found
  if (testKeyword) {
    reconstructed.push(testKeyword);
  }
  
  return reconstructed;
}

// Helper to parse keywords from corrupted format
function parseKeywords(keywordsRaw) {
  if (!keywordsRaw) return [];
  
  if (typeof keywordsRaw === 'string') {
    // Check if it's corrupted format (space-separated characters with multiple spaces between keywords)
    // Pattern: "r e c e i p t   g r o c e r y" (single spaces between chars, 2+ spaces between keywords)
    if (keywordsRaw.match(/[a-z0-9-]\s[a-z0-9-]/i) && keywordsRaw.match(/\s{2,}/)) {
      // Corrupted format - reconstruct
      return reconstructKeywords(keywordsRaw);
    }
    
    // Normal string - try comma-separated
    if (keywordsRaw.includes(',')) {
      return keywordsRaw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    
    // Space-separated normal format (single spaces)
    return keywordsRaw.split(/\s+/).filter(k => k.trim().length > 0);
  }
  
  if (Array.isArray(keywordsRaw)) {
    // Check if array contains individual characters (corrupted format)
    const singleCharCount = keywordsRaw.filter(k => typeof k === 'string' && k.length === 1 && /[a-z0-9-]/i.test(k)).length;
    const multiCharCount = keywordsRaw.filter(k => typeof k === 'string' && k.length > 1).length;
    const isCorrupted = singleCharCount > multiCharCount && singleCharCount > 5;
    
    if (isCorrupted) {
      // Join array and reconstruct
      const joined = keywordsRaw.join(' ');
      return reconstructKeywords(joined);
    }
    
    // Normal array
    return keywordsRaw.filter(k => k && k.length > 0);
  }
  
  return [];
}

async function analyzeAllPDFs() {
  try {
    console.log('📊 PDF Keyword Analysis\n');
    console.log(`📁 Scanning directory: ${PDFS_DIR}\n`);
    
    if (!existsSync(PDFS_DIR)) {
      console.error(`❌ Directory not found: ${PDFS_DIR}`);
      process.exit(1);
    }
    
    const files = await readdir(PDFS_DIR);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found');
      process.exit(1);
    }
    
    console.log(`Found ${pdfFiles.length} PDF file(s)\n`);
    console.log('='.repeat(80));
    console.log('\n');
    
    const allKeywords = [];
    const fileResults = [];
    const keywordCounts = {};
    
    for (const filename of pdfFiles.sort()) {
      const filePath = join(PDFS_DIR, filename);
      
      try {
        const pdfBytes = await readFile(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        const keywordsRaw = pdfDoc.getKeywords() || [];
        const keywords = parseKeywords(keywordsRaw);
        
        // Track format issues
        let formatIssue = false;
        if (typeof keywordsRaw === 'string' && keywordsRaw.match(/^[a-z0-9-](\s[a-z0-9-])+$/i)) {
          formatIssue = true;
        }
        
        fileResults.push({
          filename,
          keywords,
          keywordCount: keywords.length,
          formatIssue,
          rawType: typeof keywordsRaw,
          isArray: Array.isArray(keywordsRaw),
          rawSample: typeof keywordsRaw === 'string' ? keywordsRaw.substring(0, 50) : JSON.stringify(keywordsRaw).substring(0, 50)
        });
        
        // Collect all keywords for statistics
        keywords.forEach(kw => {
          allKeywords.push(kw);
          keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
        });
        
        // Display per file
        console.log(`📄 ${filename}`);
        console.log(`   Keywords (${keywords.length}): ${keywords.length > 0 ? keywords.join(', ') : '(none)'}`);
        if (formatIssue) {
          console.log(`   ⚠️  Format Issue: Keywords appear corrupted (space-separated characters)`);
          console.log(`   Raw sample: ${keywordsRaw.substring(0, 60)}...`);
        }
        console.log('');
        
      } catch (error) {
        console.error(`❌ Error reading ${filename}:`, error.message);
        fileResults.push({
          filename,
          error: error.message,
          keywords: [],
          keywordCount: 0
        });
      }
    }
    
    // Statistics
    console.log('='.repeat(80));
    console.log('\n📊 STATISTICS\n');
    
    // Average keyword count
    const totalKeywords = fileResults.reduce((sum, f) => sum + f.keywordCount, 0);
    const avgKeywords = (totalKeywords / fileResults.length).toFixed(2);
    console.log(`Average keywords per file: ${avgKeywords}`);
    console.log(`Total keywords across all files: ${totalKeywords}`);
    console.log(`Unique keywords: ${Object.keys(keywordCounts).length}`);
    
    // Most used keywords
    console.log('\n🔝 Most Used Keywords:');
    const sortedKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    sortedKeywords.forEach(([keyword, count], index) => {
      const percentage = ((count / fileResults.length) * 100).toFixed(1);
      console.log(`   ${(index + 1).toString().padStart(2)}. ${keyword.padEnd(30)} (${count} files, ${percentage}%)`);
    });
    
    // Format issues
    const filesWithIssues = fileResults.filter(f => f.formatIssue).length;
    if (filesWithIssues > 0) {
      console.log(`\n⚠️  Format Issues: ${filesWithIssues} file(s) have corrupted keyword format`);
    }
    
    // Keyword distribution
    console.log('\n📈 Keyword Count Distribution:');
    const countDistribution = {};
    fileResults.forEach(f => {
      const count = f.keywordCount;
      countDistribution[count] = (countDistribution[count] || 0) + 1;
    });
    
    Object.keys(countDistribution)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(count => {
        const files = countDistribution[count];
        const bar = '█'.repeat(files);
        console.log(`   ${count.toString().padStart(2)} keywords: ${bar} (${files} file${files !== 1 ? 's' : ''})`);
      });
    
    // All unique keywords
    console.log('\n📋 All Unique Keywords (alphabetical):');
    const uniqueKeywords = Object.keys(keywordCounts).sort();
    uniqueKeywords.forEach((kw, index) => {
      const count = keywordCounts[kw];
      const percentage = ((count / fileResults.length) * 100).toFixed(1);
      console.log(`   ${(index + 1).toString().padStart(3)}. ${kw.padEnd(40)} (${count} file${count !== 1 ? 's' : ''}, ${percentage}%)`);
    });
    
    // Detailed per-file breakdown
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 DETAILED PER-FILE BREAKDOWN\n');
    
    fileResults.forEach((result, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${result.filename}`);
      if (result.error) {
        console.log(`    ❌ Error: ${result.error}`);
      } else {
        console.log(`    Keywords (${result.keywordCount}):`);
        if (result.keywords.length === 0) {
          console.log(`      (none)`);
        } else {
          result.keywords.forEach(kw => {
            const count = keywordCounts[kw];
            console.log(`      - ${kw.padEnd(35)} (used in ${count} file${count !== 1 ? 's' : ''})`);
          });
        }
        if (result.formatIssue) {
          console.log(`    ⚠️  Format: Corrupted (raw type: ${result.rawType}, isArray: ${result.isArray})`);
        }
      }
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\n✅ Analysis complete!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run analysis
analyzeAllPDFs();
