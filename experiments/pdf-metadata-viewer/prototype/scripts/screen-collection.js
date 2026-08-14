#!/usr/bin/env node

/**
 * PDF Collection Screening Script
 * 
 * Scans a collection of PDFs and identifies common issues:
 * - Files marked for splitting (multi-doc tag)
 * - Possible duplicates
 * - Files marked for deletion (needs-deleting tag)
 * - Files with already-split tag (original files that were split)
 * - Files with from-split tag (files created from splits)
 * - Files missing critical metadata
 * 
 * Usage: node scripts/screen-collection.js [options]
 * Options:
 *   --dir <path>     PDF directory (default: from .env PDFS_DIR)
 *   --output <file>  Output results to JSON file
 *   --verbose        Show detailed information for each file
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const PDFS_DIR = process.env.PDFS_DIR || join(__dirname, '..', 'pdfs');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : null;
};

const outputFile = getArg('--output');
const verbose = args.includes('--verbose');
const customDir = getArg('--dir');
const pdfsDir = customDir || PDFS_DIR;

// Helper function to parse keywords
function parseKeywords(keywordsRaw) {
  if (!keywordsRaw) return [];
  if (Array.isArray(keywordsRaw)) return keywordsRaw;
  if (typeof keywordsRaw === 'string') {
    if (keywordsRaw.includes(',')) {
      return keywordsRaw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    return keywordsRaw.split(/\s+/).filter(k => k.trim().length > 0);
  }
  return [];
}

// Helper function to check if keywords contain any of the target tags
function hasAnyKeyword(keywords, targetTags) {
  const keywordArray = parseKeywords(keywords);
  return targetTags.some(tag => keywordArray.includes(tag));
}

// Screen a single PDF file
async function screenFile(filename) {
  const filePath = join(pdfsDir, filename);
  
  try {
    const pdfBytes = await readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const keywords = pdfDoc.getKeywords() || [];
    const keywordArray = parseKeywords(keywords);
    
    const issues = {
      filename,
      needsSplitting: hasAnyKeyword(keywords, ['multi-doc']),
      possibleDuplicate: hasAnyKeyword(keywords, ['duplicate', 'possible-duplicate']),
      needsDeleting: hasAnyKeyword(keywords, ['needs-deleting']),
      alreadySplit: hasAnyKeyword(keywords, ['already-split']),
      fromSplit: hasAnyKeyword(keywords, ['from-split']),
      missingTitle: !pdfDoc.getTitle() || pdfDoc.getTitle().trim() === '',
      missingSubject: !pdfDoc.getSubject() || pdfDoc.getSubject().trim() === '',
      missingKeywords: keywordArray.length === 0,
      pageCount: pdfDoc.getPageCount(),
      title: pdfDoc.getTitle() || '',
      subject: pdfDoc.getSubject() || '',
      keywords: keywordArray,
      hasIssues: false
    };
    
    // Determine if file has any issues
    issues.hasIssues = 
      issues.needsSplitting ||
      issues.possibleDuplicate ||
      issues.needsDeleting ||
      issues.missingTitle ||
      issues.missingSubject ||
      issues.missingKeywords;
    
    return issues;
  } catch (error) {
    return {
      filename,
      error: error.message,
      hasIssues: true
    };
  }
}

// Main screening function
async function screenCollection() {
  console.log(`\n📋 Screening PDF collection in: ${pdfsDir}\n`);
  
  if (!existsSync(pdfsDir)) {
    console.error(`❌ Directory not found: ${pdfsDir}`);
    process.exit(1);
  }
  
  const files = await readdir(pdfsDir);
  const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
  
  if (pdfFiles.length === 0) {
    console.log('No PDF files found in directory.');
    return;
  }
  
  console.log(`Found ${pdfFiles.length} PDF file(s). Screening...\n`);
  
  // Screen all files
  const results = [];
  let processed = 0;
  
  for (const filename of pdfFiles) {
    process.stdout.write(`\rProcessing: ${filename}... (${processed + 1}/${pdfFiles.length})`);
    const issues = await screenFile(filename);
    results.push(issues);
    processed++;
  }
  
  process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line
  
  // Categorize results
  const needsSplitting = results.filter(r => r.needsSplitting);
  const possibleDuplicates = results.filter(r => r.possibleDuplicate);
  const needsDeleting = results.filter(r => r.needsDeleting);
  const alreadySplit = results.filter(r => r.alreadySplit);
  const fromSplit = results.filter(r => r.fromSplit);
  const missingMetadata = results.filter(r => r.missingTitle || r.missingSubject || r.missingKeywords);
  const hasErrors = results.filter(r => r.error);
  const filesWithIssues = results.filter(r => r.hasIssues);
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SCREENING RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal files scanned: ${pdfFiles.length}`);
  console.log(`Files with issues: ${filesWithIssues.length}`);
  console.log(`Files with errors: ${hasErrors.length}\n`);
  
  // Detailed breakdown
  if (needsSplitting.length > 0) {
    console.log(`\n🔀 FILES NEEDING SPLITTING (${needsSplitting.length}):`);
    console.log('-'.repeat(80));
    needsSplitting.forEach(file => {
      console.log(`  • ${file.filename}`);
      if (verbose) {
        console.log(`    Pages: ${file.pageCount}, Keywords: ${file.keywords.join(', ') || '(none)'}`);
      }
    });
  }
  
  if (possibleDuplicates.length > 0) {
    console.log(`\n🔄 POSSIBLE DUPLICATES (${possibleDuplicates.length}):`);
    console.log('-'.repeat(80));
    possibleDuplicates.forEach(file => {
      const dupTag = file.keywords.find(k => k === 'duplicate' || k === 'possible-duplicate');
      console.log(`  • ${file.filename} [${dupTag}]`);
      if (verbose) {
        console.log(`    Title: ${file.title || '(empty)'}, Subject: ${file.subject || '(empty)'}`);
        console.log(`    Keywords: ${file.keywords.join(', ') || '(none)'}`);
      }
    });
  }
  
  if (needsDeleting.length > 0) {
    console.log(`\n🗑️  FILES MARKED FOR DELETION (${needsDeleting.length}):`);
    console.log('-'.repeat(80));
    needsDeleting.forEach(file => {
      console.log(`  • ${file.filename}`);
      if (verbose) {
        console.log(`    Title: ${file.title || '(empty)'}, Pages: ${file.pageCount}`);
        console.log(`    Keywords: ${file.keywords.join(', ') || '(none)'}`);
      }
    });
  }
  
  if (alreadySplit.length > 0) {
    console.log(`\n✂️  ORIGINAL FILES (ALREADY SPLIT) (${alreadySplit.length}):`);
    console.log('-'.repeat(80));
    alreadySplit.forEach(file => {
      console.log(`  • ${file.filename}`);
      if (verbose) {
        console.log(`    Pages: ${file.pageCount}, Keywords: ${file.keywords.join(', ') || '(none)'}`);
      }
    });
  }
  
  if (fromSplit.length > 0) {
    console.log(`\n📄 FILES CREATED FROM SPLITS (${fromSplit.length}):`);
    console.log('-'.repeat(80));
    fromSplit.forEach(file => {
      console.log(`  • ${file.filename}`);
      if (verbose) {
        console.log(`    Pages: ${file.pageCount}, Title: ${file.title || '(empty)'}`);
      }
    });
  }
  
  if (missingMetadata.length > 0) {
    console.log(`\n📝 FILES MISSING METADATA (${missingMetadata.length}):`);
    console.log('-'.repeat(80));
    missingMetadata.forEach(file => {
      const missing = [];
      if (file.missingTitle) missing.push('title');
      if (file.missingSubject) missing.push('subject');
      if (file.missingKeywords) missing.push('keywords');
      console.log(`  • ${file.filename} [missing: ${missing.join(', ')}]`);
      if (verbose) {
        console.log(`    Title: "${file.title || '(empty)'}", Subject: "${file.subject || '(empty)'}"`);
        console.log(`    Keywords: ${file.keywords.length > 0 ? file.keywords.join(', ') : '(none)'}`);
      }
    });
  }
  
  if (hasErrors.length > 0) {
    console.log(`\n❌ FILES WITH ERRORS (${hasErrors.length}):`);
    console.log('-'.repeat(80));
    hasErrors.forEach(file => {
      console.log(`  • ${file.filename}: ${file.error}`);
    });
  }
  
  // Summary statistics
  console.log('\n' + '='.repeat(80));
  console.log('📈 STATISTICS');
  console.log('='.repeat(80));
  console.log(`Files needing splitting: ${needsSplitting.length}`);
  console.log(`Possible duplicates: ${possibleDuplicates.length}`);
  console.log(`Files marked for deletion: ${needsDeleting.length}`);
  console.log(`Original files (already split): ${alreadySplit.length}`);
  console.log(`Files from splits: ${fromSplit.length}`);
  console.log(`Files missing metadata: ${missingMetadata.length}`);
  console.log(`Files with errors: ${hasErrors.length}`);
  
  // Save to JSON if requested
  if (outputFile) {
    const output = {
      scanDate: new Date().toISOString(),
      directory: pdfsDir,
      totalFiles: pdfFiles.length,
      summary: {
        needsSplitting: needsSplitting.length,
        possibleDuplicates: possibleDuplicates.length,
        needsDeleting: needsDeleting.length,
        alreadySplit: alreadySplit.length,
        fromSplit: fromSplit.length,
        missingMetadata: missingMetadata.length,
        hasErrors: hasErrors.length,
        filesWithIssues: filesWithIssues.length
      },
      results: results,
      categorized: {
        needsSplitting,
        possibleDuplicates,
        needsDeleting,
        alreadySplit,
        fromSplit,
        missingMetadata,
        hasErrors
      }
    };
    
    const fs = await import('fs/promises');
    await fs.writeFile(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${outputFile}`);
  }
  
  console.log('\n');
}

// Run the screening
screenCollection().catch(error => {
  console.error('Error during screening:', error);
  process.exit(1);
});
