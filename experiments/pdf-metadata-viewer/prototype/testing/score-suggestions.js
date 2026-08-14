#!/usr/bin/env node

/**
 * Score AI suggestions using the rubric
 * 
 * Usage: node score-suggestions.js <filename> <suggested-filename> <title> <subject> <keywords>
 * 
 * Example: node score-suggestions.js "test.pdf" "2025-02-27 — Receipt — Grocery — Foodmart" "Foodmart Grocery Receipt" "Foodmart grocery receipt for household items" "receipt,grocery,retail,foodmart,firstname-m-lastname,keep-annual"
 */

const args = process.argv.slice(2);

if (args.length < 5) {
  console.error('Usage: node score-suggestions.js <original-filename> <suggested-filename> <title> <subject> <keywords>');
  process.exit(1);
}

const [originalFilename, suggestedFilename, title, subject, keywords] = args;

function scoreSuggestion(originalFilename, suggestedFilename, title, subject, keywords) {
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

  // 1. Filename Quality
  const hasEmDash = suggestedFilename.includes(' — ');
  const hasDate = /^\d{4}-\d{2}-\d{2}/.test(suggestedFilename);
  const parts = suggestedFilename.split(' — ');
  
  if (hasEmDash && hasDate && parts.length >= 3) {
    scores.filename = 5; // Has date, type, and subject/vendor
  } else if (hasEmDash && hasDate) {
    scores.filename = 4;
  } else if (hasEmDash) {
    scores.filename = 3;
  } else {
    scores.filename = 2;
  }

  // 2. Title Quality
  if (title && title.length > 10 && title.length < 100) {
    scores.title = title.length > 15 ? 5 : 4;
  } else if (title && title.length > 5) {
    scores.title = 3;
  } else if (title) {
    scores.title = 2;
  }

  // 3. Subject Quality (10 words or less)
  const subjectWords = subject ? subject.split(/\s+/).length : 0;
  if (subjectWords > 0 && subjectWords <= 10) {
    scores.subject = subjectWords <= 7 ? 5 : 4;
  } else if (subjectWords > 10) {
    scores.subject = 2;
  } else if (subject) {
    scores.subject = 3;
  }

  // 4. Keywords - Taxonomy Compliance
  const keywordArray = keywords.split(',').map(k => k.trim().toLowerCase());
  const validTags = ['receipt', 'invoice', 'bill', 'statement', 'tax-form', 'medical-record', 
                     'grocery', 'retail', 'medical', 'financial', 'school', 'vehicle',
                     'foodmart', 'cityclinic', 'firstbank', 'unified-sd', 'bigboxstore', 'fuelstation', 'fuelcorp',
                     'firstname-m-lastname', 'spouse-x-lastname', 'child-a-lastname', 'child-b-lastname',
                     'needs-payment', 'keep-annual', 'keep-7yr', 'keep-permanent',
                     'year-2025', 'month-02', 'active', 'paid'];
  
  const validCount = keywordArray.filter(k => validTags.includes(k)).length;
  const totalCount = keywordArray.length;
  const complianceRatio = totalCount > 0 ? validCount / totalCount : 0;
  
  if (complianceRatio >= 0.9) scores.keywordsCompliance = 5;
  else if (complianceRatio >= 0.7) scores.keywordsCompliance = 4;
  else if (complianceRatio >= 0.5) scores.keywordsCompliance = 3;
  else if (complianceRatio >= 0.3) scores.keywordsCompliance = 2;
  else scores.keywordsCompliance = 1;

  // 5. Keywords - Completeness
  const hasDocType = keywordArray.some(k => ['receipt', 'invoice', 'bill', 'statement', 'tax-form'].includes(k));
  const hasCategory = keywordArray.some(k => ['grocery', 'retail', 'medical', 'financial', 'school'].includes(k));
  const hasVendor = keywordArray.some(k => ['foodmart', 'cityclinic', 'firstbank', 'unified-sd', 'bigboxstore'].includes(k));
  
  if (totalCount >= 5 && hasDocType && hasCategory) {
    scores.keywordsCompleteness = 5;
  } else if (totalCount >= 3 && hasDocType) {
    scores.keywordsCompleteness = 4;
  } else if (totalCount >= 2) {
    scores.keywordsCompleteness = 3;
  } else {
    scores.keywordsCompleteness = 2;
  }

  // 6. Keywords - Format
  const hasSpaces = keywords.includes(', ');
  const hasUpperCase = /[A-Z]/.test(keywords);
  if (!hasSpaces && !hasUpperCase) {
    scores.keywordsFormat = 5;
  } else if (hasSpaces && hasUpperCase) {
    scores.keywordsFormat = 2;
  } else {
    scores.keywordsFormat = 3;
  }

  // 7. Overall Accuracy (Consistency)
  const filenameLower = suggestedFilename.toLowerCase();
  const titleLower = title.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const keywordsLower = keywords.toLowerCase();
  
  // Check vendor consistency
  const vendors = ['foodmart', 'cityclinic', 'firstbank', 'unified-sd', 'bigboxstore', 'fuelstation', 'fuelcorp', 'autodealer', 'national-health', 'mutual-life'];
  const filenameVendor = vendors.find(v => filenameLower.includes(v));
  const titleVendor = vendors.find(v => titleLower.includes(v));
  const keywordsVendor = vendors.find(v => keywordsLower.includes(v));
  
  const vendorConsistent = !filenameVendor || (filenameVendor === titleVendor || filenameVendor === keywordsVendor || !titleVendor && !keywordsVendor);
  
  // Check document type consistency
  const docTypes = ['receipt', 'invoice', 'bill', 'statement', 'report-card', 'tax-form'];
  const filenameType = docTypes.find(t => filenameLower.includes(t));
  const keywordsType = docTypes.find(t => keywordsLower.includes(t));
  const typeConsistent = !filenameType || filenameType === keywordsType || !keywordsType;
  
  if (vendorConsistent && typeConsistent) {
    scores.accuracy = 5;
  } else if (vendorConsistent || typeConsistent) {
    scores.accuracy = 4;
  } else {
    scores.accuracy = 3;
  }

  // 8. Practical Usability
  if (scores.filename >= 4 && scores.title >= 4 && scores.subject >= 4 && scores.keywordsCompliance >= 4) {
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

const { scores, total, percentage } = scoreSuggestion(originalFilename, suggestedFilename, title, subject, keywords);

const rating = percentage >= 87.5 ? 'Excellent' :
               percentage >= 70 ? 'Good' :
               percentage >= 50 ? 'Acceptable' : 'Needs Improvement';

console.log('\n' + '='.repeat(60));
console.log('SCORING RESULTS');
console.log('='.repeat(60));
console.log(`\nOriginal File: ${originalFilename}`);
console.log(`\nAI Suggestions:`);
console.log(`  Filename: ${suggestedFilename}`);
console.log(`  Title: ${title}`);
console.log(`  Subject: ${subject}`);
console.log(`  Keywords: ${keywords}`);
console.log(`\nScores:`);
console.log(`  1. Filename Quality: ${scores.filename}/5`);
console.log(`  2. Title Quality: ${scores.title}/5`);
console.log(`  3. Subject Quality: ${scores.subject}/5`);
console.log(`  4. Keywords - Taxonomy Compliance: ${scores.keywordsCompliance}/5`);
console.log(`  5. Keywords - Completeness: ${scores.keywordsCompleteness}/5`);
console.log(`  6. Keywords - Format: ${scores.keywordsFormat}/5`);
console.log(`  7. Overall Accuracy: ${scores.accuracy}/5`);
console.log(`  8. Practical Usability: ${scores.usability}/5`);
console.log(`\nTotal Score: ${total}/40 (${percentage.toFixed(1)}%) - ${rating}\n`);
