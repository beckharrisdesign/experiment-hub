#!/usr/bin/env node

/**
 * Test script to run AI suggestions on multiple PDFs and score them using the rubric
 * 
 * Usage: node test-ai-suggestions-batch.js
 */

import 'dotenv/config';
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
import { createCanvas } from 'canvas';
import { loadTaxonomy } from '../lib/taxonomy-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The SDK throws on an empty apiKey, so check first and fail with a message
// that says what to do rather than a constructor stack trace.
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set. This script calls the OpenAI API directly.');
  console.error('Set it in the hub root .env.local, or export it for this shell.');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Polyfill DOMMatrix for pdfjs-dist (must be before import)
global.DOMMatrix = class DOMMatrix {
  constructor(init) {
    if (init) {
      this.a = init.a || 1;
      this.b = init.b || 0;
      this.c = init.c || 0;
      this.d = init.d || 1;
      this.e = init.e || 0;
      this.f = init.f || 0;
    } else {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    }
  }
  multiply(other) {
    return new DOMMatrix({
      a: this.a * other.a + this.c * other.b,
      b: this.b * other.a + this.d * other.b,
      c: this.a * other.c + this.c * other.d,
      d: this.b * other.c + this.d * other.d,
      e: this.a * other.e + this.c * other.f + this.e,
      f: this.b * other.e + this.d * other.f + this.f
    });
  }
};


// Render PDF pages as images
async function renderPDFPagesAsImages(filePath, maxPages = 3) {
  try {
    const pdfBytes = await readFile(filePath);
    // Import pdfjs-dist after polyfill is set
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = `file://${join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs')}`;
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes) });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const pagesToProcess = Math.min(pageCount, maxPages);
    const images = [];

    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
      images.push(imageBase64);
    }

    return images;
  } catch (error) {
    console.error('Error rendering PDF pages:', error);
    return [];
  }
}

// Get AI suggestions
async function getAISuggestions(filename, pageImages, taxonomy) {
  const filePath = join(__dirname, '..', 'pdfs', filename);
  
  if (!existsSync(filePath)) {
    throw new Error('File not found');
  }

  const pdfBytes = await readFile(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const currentTitle = pdfDoc.getTitle() || '';
  const currentSubject = pdfDoc.getSubject() || '';
  const currentKeywords = pdfDoc.getKeywords() || [];
  const currentKeywordsStr = Array.isArray(currentKeywords) ? currentKeywords.join(', ') : String(currentKeywords);

  const taxonomyText = `
TAGGING TAXONOMY - You MUST use these exact tag slugs:

DOCUMENT TYPES (use 1-2): ${taxonomy.documentTypes.slice(0, 20).join(', ')}${taxonomy.documentTypes.length > 20 ? ' (and more)' : ''}

CATEGORIES (use 1-2): ${taxonomy.categories.join(', ')}

ACTIONS (use if applicable): ${taxonomy.actions.join(', ')}

STATUS (use if applicable): ${taxonomy.statuses.join(', ')}

SPECIAL FLAGS (use if applicable): ${taxonomy.specials.join(', ')}

LOCATIONS (use if applicable): ${taxonomy.locations.join(', ')}

PEOPLE (use exact slugs if found): ${taxonomy.people.join(', ')}

VENDORS (use exact slugs if found, first 30): ${taxonomy.vendors.slice(0, 30).join(', ')}${taxonomy.vendors.length > 30 ? ' (and more)' : ''}

CRITICAL RULES:
- Use EXACT tag slugs from the lists above - do not create new tags
- For people: Use format fname-mname-lname (e.g., "firstname-m-lastname", "spouse-x-lastname")
- For vendors: Use exact vendor slugs (e.g., "foodmart", "cityclinic", "firstbank", "unified-sd")
- Combine multiple tags with commas, no spaces (e.g., "receipt,grocery,foodmart,paid")
- Include document type, category, vendor (if found), person (if found), and action/status tags
- Add time period tags if date is clear (e.g., "year-2025", "month-03")
`;

  // Load prompt template
  const PROMPT_TEMPLATE_FILE = join(__dirname, '..', 'docs', 'ai-prompt-template.md');
  let promptText;
  try {
    const templateContent = await readFile(PROMPT_TEMPLATE_FILE, 'utf-8');
    const templateMatch = templateContent.match(/## Main Prompt Template\s*```\s*([\s\S]*?)\s*```/);
    if (templateMatch) {
      promptText = templateMatch[1]
        .replace(/\{\{currentTitle\}\}/g, currentTitle || '(empty)')
        .replace(/\{\{currentSubject\}\}/g, currentSubject || '(empty)')
        .replace(/\{\{currentKeywords\}\}/g, currentKeywordsStr || '(empty)')
        .replace(/\{\{taxonomyText\}\}/g, taxonomyText);
    } else {
      throw new Error('Template not found');
    }
  } catch (error) {
    console.error('Error loading template, using fallback');
    promptText = `Analyze this scanned document image and suggest appropriate metadata values using the predefined tagging taxonomy.

Current metadata:
- Title: ${currentTitle || '(empty)'}
- Subject: ${currentSubject || '(empty)'}
- Keywords: ${currentKeywordsStr || '(empty)'}

${taxonomyText}

Please provide suggestions in JSON format with the following structure:
{
  "filename": "suggested-filename-without-extension",
  "title": "concise descriptive title",
  "subject": "document category or subject",
  "keywords": "keyword1,keyword2,keyword3"
}

Guidelines:
- Filename: Use format YYYY-MM-DD — Type — Subject or Vendor — Person or persons.pdf (use em dashes — to separate sections, regular dashes only between date parts YYYY-MM-DD). Required elements: Date (YYYY-MM-DD), Document Type (receipt, invoice, bill, etc.), Subject/Vendor (category like "Grocery" or vendor name in title case like "Foodmart", "CityClinic", "FirstBank" - use recognizable vendor name from taxonomy), and Person (if document relates to specific person like "Firstname" or "Firstname"). If no date found, start with Type. No file extension.
- Title: Concise, descriptive title (max 100 characters)
- Subject: Concise summary of the document based on its content (10 words or less, max 50 characters)
- Keywords: 3-10 relevant tags as comma-separated values (NO SPACES), using EXACT slugs from the taxonomy above
- MUST use exact tag slugs - do not invent new tags
- Include: document type, category, vendor (if recognized), person (if found), action/status tags, and time period if date is clear

Return ONLY valid JSON, no other text.`;
  }

  const content = [
    { type: 'text', text: promptText },
    ...pageImages.map(img => ({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${img}` }
    }))
  ];

  const systemMessage = 'You are a helpful assistant that analyzes scanned document images and suggests appropriate metadata. Always respond with valid JSON only.';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: content }
    ],
    temperature: 0.3,
    max_tokens: 500
  });

  const responseText = completion.choices[0].message.content.trim();
  const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const suggestions = JSON.parse(cleanedResponse);

  return {
    filename: suggestions.filename || filename.replace(/\.pdf$/i, ''),
    title: suggestions.title || '',
    subject: suggestions.subject || '',
    keywords: Array.isArray(suggestions.keywords) 
      ? suggestions.keywords.join(',') 
      : (typeof suggestions.keywords === 'string' ? suggestions.keywords : '')
  };
}

// Score a suggestion using the rubric (simplified scoring)
function scoreSuggestion(suggestion, originalFilename) {
  const scores = {
    filename: 0,
    title: 0,
    subject: 0,
    keywordsCompliance: 0,
    keywordsCompleteness: 0,
    keywordsFormat: 0,
    accuracy: 0,
    usability: 0
  };

  // Filename scoring (simplified)
  const filename = suggestion.filename;
  if (filename.includes(' — ') && /^\d{4}-\d{2}-\d{2}/.test(filename)) {
    scores.filename = 4; // Good format
    if (filename.split(' — ').length >= 3) scores.filename = 5; // Has date, type, subject/vendor
  } else if (filename.includes(' — ')) {
    scores.filename = 3;
  } else {
    scores.filename = 2;
  }

  // Title scoring
  if (suggestion.title && suggestion.title.length > 5 && suggestion.title.length < 100) {
    scores.title = suggestion.title.length > 10 ? 5 : 4;
  } else if (suggestion.title) {
    scores.title = 3;
  }

  // Subject scoring (10 words or less)
  const subjectWords = suggestion.subject ? suggestion.subject.split(/\s+/).length : 0;
  if (subjectWords > 0 && subjectWords <= 10) {
    scores.subject = subjectWords <= 7 ? 5 : 4;
  } else if (subjectWords > 10) {
    scores.subject = 2;
  }

  // Keywords compliance (check for common taxonomy tags)
  const keywords = suggestion.keywords.split(',').map(k => k.trim());
  const hasValidTags = keywords.some(k => 
    ['receipt', 'invoice', 'bill', 'statement', 'grocery', 'medical', 'retail', 'foodmart', 'cityclinic', 'firstbank'].includes(k.toLowerCase())
  );
  scores.keywordsCompliance = hasValidTags ? 4 : 2;

  // Keywords completeness
  const keywordCount = keywords.length;
  if (keywordCount >= 5) scores.keywordsCompleteness = 5;
  else if (keywordCount >= 3) scores.keywordsCompleteness = 4;
  else if (keywordCount >= 2) scores.keywordsCompleteness = 3;
  else scores.keywordsCompleteness = 2;

  // Keywords format (no spaces, lowercase)
  const hasSpaces = suggestion.keywords.includes(', ');
  const hasUpperCase = /[A-Z]/.test(suggestion.keywords);
  if (!hasSpaces && !hasUpperCase) scores.keywordsFormat = 5;
  else if (hasSpaces || hasUpperCase) scores.keywordsFormat = 3;

  // Overall accuracy (consistency check)
  const filenameLower = filename.toLowerCase();
  const titleLower = suggestion.title.toLowerCase();
  const subjectLower = suggestion.subject.toLowerCase();
  const keywordsLower = suggestion.keywords.toLowerCase();
  
  // Check if vendor/type is consistent
  const hasConsistency = (
    (filenameLower.includes('foodmart') && (titleLower.includes('foodmart') || keywordsLower.includes('foodmart'))) ||
    (filenameLower.includes('receipt') && (keywordsLower.includes('receipt') || titleLower.includes('receipt')))
  );
  scores.accuracy = hasConsistency ? 4 : 3;

  // Practical usability
  if (scores.filename >= 4 && scores.title >= 4 && scores.subject >= 4) {
    scores.usability = 5;
  } else if (scores.filename >= 3 && scores.title >= 3 && scores.subject >= 3) {
    scores.usability = 4;
  } else {
    scores.usability = 3;
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const percentage = (total / 40) * 100;

  return { scores, total, percentage };
}

// Main execution
async function main() {
  console.log('\n🧪 Testing AI Suggestions on 5 PDFs\n');
  console.log('Loading taxonomy and PDFs...\n');

  const taxonomy = await loadTaxonomy();
  const pdfsDir = join(__dirname, '..', 'pdfs');
  const files = (await readdir(pdfsDir)).filter(f => f.endsWith('.pdf')).slice(0, 5);

  if (files.length === 0) {
    console.error('No PDF files found in pdfs directory');
    process.exit(1);
  }

  console.log(`Testing ${files.length} PDFs:\n`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${i + 1}/${files.length}: ${filename}`);
    console.log('='.repeat(60));

    try {
      console.log('  Rendering PDF pages...');
      const pageImages = await renderPDFPagesAsImages(join(pdfsDir, filename), 3);
      
      if (pageImages.length === 0) {
        console.log('  ⚠️  Could not render pages, skipping...');
        continue;
      }

      console.log(`  Getting AI suggestions (${pageImages.length} pages)...`);
      const suggestion = await getAISuggestions(filename, pageImages, taxonomy);
      
      console.log('\n  AI Suggestions:');
      console.log(`    Filename: ${suggestion.filename}`);
      console.log(`    Title: ${suggestion.title}`);
      console.log(`    Subject: ${suggestion.subject}`);
      console.log(`    Keywords: ${suggestion.keywords}`);

      console.log('\n  Scoring...');
      const { scores, total, percentage } = scoreSuggestion(suggestion, filename);
      
      console.log('\n  Scores:');
      console.log(`    1. Filename Quality: ${scores.filename}/5`);
      console.log(`    2. Title Quality: ${scores.title}/5`);
      console.log(`    3. Subject Quality: ${scores.subject}/5`);
      console.log(`    4. Keywords - Taxonomy Compliance: ${scores.keywordsCompliance}/5`);
      console.log(`    5. Keywords - Completeness: ${scores.keywordsCompleteness}/5`);
      console.log(`    6. Keywords - Format: ${scores.keywordsFormat}/5`);
      console.log(`    7. Overall Accuracy: ${scores.accuracy}/5`);
      console.log(`    8. Practical Usability: ${scores.usability}/5`);
      console.log(`\n    Total: ${total}/40 (${percentage.toFixed(1)}%)`);

      results.push({
        filename,
        suggestion,
        scores,
        total,
        percentage
      });

      // Small delay between requests
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${filename}:`, error.message);
      results.push({
        filename,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  if (successful.length > 0) {
    const avgScore = successful.reduce((sum, r) => sum + r.total, 0) / successful.length;
    const avgPercentage = successful.reduce((sum, r) => sum + r.percentage, 0) / successful.length;

    console.log(`\n✅ Successfully tested: ${successful.length} PDFs`);
    console.log(`📊 Average Score: ${avgScore.toFixed(1)}/40 (${avgPercentage.toFixed(1)}%)`);
    console.log(`\nIndividual Results:`);
    
    successful.forEach((r, i) => {
      const rating = r.percentage >= 87.5 ? 'Excellent' :
                     r.percentage >= 70 ? 'Good' :
                     r.percentage >= 50 ? 'Acceptable' : 'Needs Improvement';
      console.log(`\n  ${i + 1}. ${r.filename}`);
      console.log(`     Score: ${r.total}/40 (${r.percentage.toFixed(1)}%) - ${rating}`);
      console.log(`     Filename: ${r.suggestion.filename}`);
      console.log(`     Title: ${r.suggestion.title}`);
      console.log(`     Subject: ${r.suggestion.subject}`);
      console.log(`     Keywords: ${r.suggestion.keywords}`);
    });
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length} PDFs`);
    failed.forEach(r => {
      console.log(`  - ${r.filename}: ${r.error}`);
    });
  }

  console.log('\n');
}

main().catch(console.error);
