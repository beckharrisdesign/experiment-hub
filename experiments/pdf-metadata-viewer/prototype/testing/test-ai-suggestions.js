#!/usr/bin/env node

/**
 * Test script to run AI suggestions multiple times and score them using the rubric
 * 
 * Usage: node test-ai-suggestions.js <pdf-filename> [number-of-tests]
 * Example: node test-ai-suggestions.js "2025-02-27 Foodmart Groceries.pdf" 3
 */

import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import OpenAI from 'openai';
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


async function getAISuggestions(filename, pageImages) {
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

  const taxonomy = await loadTaxonomy();
  
  const taxonomyText = `
TAGGING TAXONOMY - You MUST use these exact tag slugs:

DOCUMENT TYPES (use 1-2): ${taxonomy.documentTypes.join(', ')}

CATEGORIES (use 1-2): ${taxonomy.categories.join(', ')}

ACTIONS (use if applicable): ${taxonomy.actions.join(', ')}

STATUS (use if applicable): ${taxonomy.statuses.join(', ')}

SPECIAL FLAGS (use if applicable): ${taxonomy.specials.join(', ')}

LOCATIONS (use if applicable): ${taxonomy.locations.join(', ')}

PEOPLE (use exact slugs if found): ${taxonomy.people.join(', ')}

VENDORS (use exact slugs if found): ${taxonomy.vendors.join(', ')}

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
- Filename: Use format YYYY-MM-DD Description with spaces.pdf style if date is found (dashes ONLY between date parts YYYY-MM-DD, use spaces between words in description, NOT dashes), otherwise use descriptive name with spaces between words. No file extension.
- Title: Concise, descriptive title (max 100 characters)
- Subject: Category or subject matter (max 50 characters)
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

// Main execution
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node test-ai-suggestions.js <pdf-filename> [number-of-tests]');
  console.error('Example: node test-ai-suggestions.js "2025-02-27 Foodmart Groceries.pdf" 3');
  process.exit(1);
}

const filename = args[0];
const numTests = parseInt(args[1] || '3', 10);

console.log(`\n🧪 Testing AI Suggestions`);
console.log(`📄 PDF: ${filename}`);
console.log(`🔄 Running ${numTests} tests...\n`);

// For testing, we need to get images from the PDF
// This is a simplified version - in production, images come from the frontend
console.log('⚠️  Note: This test script requires PDF page images.');
console.log('   For full testing, use the web interface and manually score results.\n');
console.log('📋 Use the rubric in docs/ai-suggestions-rubric.md to score each test.\n');

console.log('Test Results Template:');
console.log('─'.repeat(60));
for (let i = 1; i <= numTests; i++) {
  console.log(`
Test #: ${i}
PDF File: ${filename}
Date Tested: ${new Date().toISOString().split('T')[0]}

Scores:
1. Filename Quality: ___/5
2. Title Quality: ___/5
3. Subject Quality: ___/5
4. Keywords - Taxonomy Compliance: ___/5
5. Keywords - Completeness: ___/5
6. Keywords - Format: ___/5
7. Overall Accuracy: ___/5
8. Practical Usability: ___/5

Total Score: ___/40 (___%)

AI Suggestions:
- Filename: [run test to see]
- Title: [run test to see]
- Subject: [run test to see]
- Keywords: [run test to see]

Issues/Notes:
[Fill in after reviewing suggestions]

${i < numTests ? '─'.repeat(60) : ''}`);
}

console.log('\n💡 Tip: Run the AI suggestions feature in the web interface, then use this template to score each result.\n');
