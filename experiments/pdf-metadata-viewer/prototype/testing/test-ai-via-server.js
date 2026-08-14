#!/usr/bin/env node

/**
 * Test AI suggestions by calling the server's API endpoint
 * Uses the server's existing rendering logic via HTTP
 */

import 'dotenv/config';
import { readdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the browser to render PDFs and get images, then call the API
// Since server-side rendering fails, we'll use puppeteer to get images from the browser
import puppeteer from 'puppeteer';

async function getPDFImagesViaBrowser(filename) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    await page.goto(`http://localhost:3000`, { waitUntil: 'networkidle2' });
    
    // Navigate to the file
    await page.waitForSelector('.file-list-view, .detail-view', { timeout: 5000 });
    
    // Try to click on the file
    try {
      await page.click(`text=${filename}`, { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      // File might already be open or in detail view
    }
    
    // Wait for PDF to render
    await page.waitForSelector('canvas', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get canvas images
    const images = await page.evaluate(() => {
      const canvases = document.querySelectorAll('#pdf-preview canvas');
      const imageArray = [];
      canvases.forEach((canvas, i) => {
        if (i < 3) { // Limit to first 3 pages
          const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
          imageArray.push(imageBase64);
        }
      });
      return imageArray;
    });
    
    await browser.close();
    return images;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function callAISuggestionsAPI(filename, images, attempt) {
  const response = await fetch(`http://localhost:3000/api/ai-suggestions/${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ images })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  
  return await response.json();
}

async function main() {
  console.log('\n🧪 Testing AI Suggestions via Server API\n');
  console.log('Loading PDFs...\n');

  const pdfsDir = join(__dirname, '..', 'pdfs');
  const files = (await readdir(pdfsDir)).filter(f => f.endsWith('.pdf')).slice(0, 5);

  if (files.length === 0) {
    console.error('No PDF files found');
    process.exit(1);
  }

  console.log(`Testing ${files.length} PDFs with 3 attempts each:\n`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');

  const allResults = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PDF ${i + 1}/${files.length}: ${filename}`);
    console.log('='.repeat(60));

    try {
      console.log('  Getting PDF images via browser...');
      const images = await getPDFImagesViaBrowser(filename);
      
      if (images.length === 0) {
        console.log('  ⚠️  Could not get images, skipping...');
        allResults.push({ filename, error: 'Could not get images' });
        continue;
      }

      console.log(`  Got ${images.length} page images`);
      console.log('  Getting AI suggestions (3 attempts)...\n');

      const attempts = [];
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`    Attempt ${attempt}: Calling API...`);
          const suggestion = await callAISuggestionsAPI(filename, images, attempt);
          attempts.push(suggestion);
          console.log(`    ✓ Attempt ${attempt} complete`);
          
          // Small delay between attempts
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.log(`    ❌ Attempt ${attempt} failed: ${error.message}`);
          attempts.push({ error: error.message });
        }
      }

      allResults.push({
        filename,
        attempts
      });

    } catch (error) {
      console.error(`  ❌ Error processing ${filename}:`, error.message);
      allResults.push({
        filename,
        error: error.message
      });
    }
  }

  // Write results to markdown file
  let markdown = `# AI Suggestions Test Results\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `Testing ${files.length} PDFs with 3 API calls each.\n\n`;
  markdown += `---\n\n`;

  allResults.forEach((result, i) => {
    markdown += `## Test ${i + 1}: ${result.filename}\n\n`;
    
    if (result.error) {
      markdown += `**Error:** ${result.error}\n\n`;
    } else {
      result.attempts.forEach((attempt, j) => {
        markdown += `### Attempt ${j + 1}\n\n`;
        if (attempt.error) {
          markdown += `**Error:** ${attempt.error}\n\n`;
        } else {
          markdown += `- **Filename:** ${attempt.filename}\n`;
          markdown += `- **Title:** ${attempt.title}\n`;
          markdown += `- **Subject:** ${attempt.subject}\n`;
          markdown += `- **Keywords:** ${attempt.keywords}\n\n`;
        }
      });
    }
    
    markdown += `---\n\n`;
  });

  // Summary
  markdown += `## Summary\n\n`;
  const successful = allResults.filter(r => !r.error && r.attempts && r.attempts.some(a => !a.error));
  markdown += `- **Successfully tested:** ${successful.length}/${files.length} PDFs\n`;
  markdown += `- **Total attempts:** ${allResults.reduce((sum, r) => sum + (r.attempts?.length || 0), 0)}\n`;
  markdown += `- **Successful attempts:** ${allResults.reduce((sum, r) => sum + (r.attempts?.filter(a => !a.error).length || 0), 0)}\n\n`;

  await writeFile(join(__dirname, 'test-results.md'), markdown);
  console.log('\n' + '='.repeat(60));
  console.log('✅ Results saved to test-results.md');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
