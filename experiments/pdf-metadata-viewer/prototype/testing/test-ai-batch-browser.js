#!/usr/bin/env node

/**
 * Browser automation script to test AI suggestions on multiple PDFs
 * Requires: npm install puppeteer
 * 
 * Usage: node test-ai-batch-browser.js
 */

import puppeteer from 'puppeteer';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAISuggestions() {
  console.log('\n🧪 Testing AI Suggestions via Browser Automation\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Navigate to the app
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Get list of PDFs
  const pdfsDir = join(__dirname, '..', 'pdfs');
  const files = (await readdir(pdfsDir)).filter(f => f.endsWith('.pdf')).slice(0, 5);
  
  console.log(`Testing ${files.length} PDFs:\n`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('   Automating browser to get AI suggestions...\n');
  
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${i + 1}/${files.length}: ${filename}`);
    console.log('='.repeat(60));
    
    try {
      // Wait for file list to load, then click on the file
      await page.waitForSelector('.file-list-view, .detail-view', { timeout: 5000 });
      
      // Check if we're in list view or detail view
      const isListView = await page.$('.file-list-view');
      
      if (isListView) {
        // Click on the file in the list - try multiple selectors
        const fileRow = await page.evaluateHandle((name) => {
          const rows = Array.from(document.querySelectorAll('tr'));
          return rows.find(row => row.textContent.includes(name));
        }, filename);
        
        if (fileRow) {
          await fileRow.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Try clicking by text
          await page.click(`text=${filename}`, { timeout: 5000 }).catch(() => {});
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Wait for PDF preview to load
      await page.waitForSelector('canvas', { timeout: 10000 });
      console.log('  ✓ PDF preview loaded');
      
      // Wait a bit for PDF to fully render
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Click "Get AI Suggestions" button
      const suggestionsBtn = await page.$('#ai-suggestions-btn');
      if (suggestionsBtn) {
        await suggestionsBtn.click();
        console.log('  ✓ Clicked "Get AI Suggestions"');
        
        // Wait for suggestions to appear (check for either success or error)
        try {
          await page.waitForSelector('.ai-suggestion-item, .placeholder.error', { timeout: 30000 });
          const hasError = await page.$('.placeholder.error');
          if (hasError) {
            const errorText = await page.$eval('.placeholder.error', el => el.textContent);
            throw new Error(errorText);
          }
          console.log('  ✓ Suggestions received');
        } catch (err) {
          console.log(`  ⚠️  ${err.message}`);
          continue;
        }
        
        // Extract suggestions
        const suggestions = await page.evaluate(() => {
          const items = document.querySelectorAll('.ai-suggestion-item');
          const result = {};
          items.forEach(item => {
            const label = item.querySelector('.ai-suggestion-label')?.textContent?.toLowerCase();
            const value = item.querySelector('.ai-suggestion-value')?.textContent?.trim();
            if (label && value) {
              if (label.includes('filename')) {
                result.filename = value.replace('.pdf', '');
              } else if (label.includes('title')) {
                result.title = value;
              } else if (label.includes('subject')) {
                result.subject = value;
              } else if (label.includes('keyword')) {
                // Extract tags from the display
                const tags = Array.from(item.querySelectorAll('.tag')).map(t => t.textContent.trim());
                result.keywords = tags.join(',');
              }
            }
          });
          return result;
        });
        
        console.log('\n  AI Suggestions:');
        console.log(`    Filename: ${suggestions.filename || '(empty)'}`);
        console.log(`    Title: ${suggestions.title || '(empty)'}`);
        console.log(`    Subject: ${suggestions.subject || '(empty)'}`);
        console.log(`    Keywords: ${suggestions.keywords || '(empty)'}`);
        
        results.push({
          filename,
          suggestion: suggestions
        });
        
        // Close suggestions section
        const closeBtn = await page.$('#close-ai-suggestions-btn');
        if (closeBtn) {
          await closeBtn.click();
        }
      }
      
      // Small delay between tests
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Go back to file list
        const backBtn = await page.$('.back-to-list-btn');
        if (backBtn) {
          await backBtn.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      results.push({
        filename,
        error: error.message
      });
    }
  }
  
  await browser.close();
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => !r.error && r.suggestion);
  console.log(`\n✅ Successfully tested: ${successful.length} PDFs\n`);
  
  successful.forEach((r, i) => {
    console.log(`${i + 1}. ${r.filename}`);
    console.log(`   Filename: ${r.suggestion.filename || '(empty)'}`);
    console.log(`   Title: ${r.suggestion.title || '(empty)'}`);
    console.log(`   Subject: ${r.suggestion.subject || '(empty)'}`);
    console.log(`   Keywords: ${r.suggestion.keywords || '(empty)'}`);
    console.log('');
  });
  
  console.log('\n💡 Use score-suggestions.js to score each result:\n');
  successful.forEach((r, i) => {
    const filename = r.suggestion.filename || 'unknown';
    const title = r.suggestion.title || 'unknown';
    const subject = r.suggestion.subject || 'unknown';
    const keywords = r.suggestion.keywords || 'unknown';
    console.log(`node score-suggestions.js "${r.filename}" "${filename}" "${title}" "${subject}" "${keywords}"`);
  });
  console.log('');
}

// Check if puppeteer is available
try {
  await testAISuggestions();
} catch (error) {
  if (error.message.includes('Cannot find module')) {
    console.error('\n❌ Puppeteer not installed. Installing...\n');
    console.log('Run: npm install puppeteer');
    console.log('Then run this script again.\n');
  } else {
    console.error('Error:', error.message);
  }
  process.exit(1);
}
