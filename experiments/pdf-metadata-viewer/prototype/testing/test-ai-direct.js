#!/usr/bin/env node

/**
 * Directly test AI suggestions by calling OpenAI API multiple times per PDF
 * Stores results in test-results.md
 */

// Polyfill DOMMatrix FIRST, before any imports that might use pdfjs-dist
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

import 'dotenv/config';
import { readFile, readdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
import { createCanvas } from 'canvas';
import { loadTaxonomy } from '../lib/taxonomy-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// Render PDF pages as images
async function renderPDFPagesAsImages(filePath, maxPages = 3) {
  try {
    const pdfBytes = await readFile(filePath);
    // Import pdfjs-dist dynamically after polyfill is set
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
async function getAISuggestions(filename, pageImages, taxonomy, attempt) {
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

  console.log(`    Attempt ${attempt}: Calling OpenAI API...`);
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

// Main execution
async function main() {
  console.log('\n🧪 Testing AI Suggestions - Direct API Calls\n');
  console.log('Loading taxonomy and PDFs...\n');

  const taxonomy = await loadTaxonomy();
  const pdfsDir = join(__dirname, '..', 'pdfs');
  const files = (await readdir(pdfsDir)).filter(f => f.endsWith('.pdf')).slice(0, 5);

  if (files.length === 0) {
    console.error('No PDF files found in pdfs directory');
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
      console.log('  Rendering PDF pages...');
      const pageImages = await renderPDFPagesAsImages(join(pdfsDir, filename), 3);
      
      if (pageImages.length === 0) {
        console.log('  ⚠️  Could not render pages, skipping...');
        allResults.push({ filename, error: 'Could not render pages' });
        continue;
      }

      console.log(`  Got ${pageImages.length} page images`);
      console.log('  Getting AI suggestions (3 attempts)...\n');

      const attempts = [];
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const suggestion = await getAISuggestions(filename, pageImages, taxonomy, attempt);
          attempts.push(suggestion);
          console.log(`    ✓ Attempt ${attempt} complete`);
          
          // Small delay between attempts
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
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
