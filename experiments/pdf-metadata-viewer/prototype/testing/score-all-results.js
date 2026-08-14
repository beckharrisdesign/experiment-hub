#!/usr/bin/env node

/**
 * Score all test results using the rubric and add scores to test-results.md
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadTaxonomy } from '../lib/taxonomy-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load taxonomy for validation (using shared loader)
async function loadTaxonomyForScoring() {
  const taxonomy = await loadTaxonomyForScoring();
  return {
    ...taxonomy,
    allTags: [
      ...taxonomy.documentTypes,
      ...taxonomy.categories,
      ...taxonomy.actions,
      ...taxonomy.statuses,
      ...taxonomy.specials,
      ...taxonomy.locations,
      ...taxonomy.people,
      ...taxonomy.vendors
    ]
  };
}

function scoreSuggestion(originalFilename, suggestedFilename, title, subject, keywords, taxonomy) {
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
  const issues = [];

  // 1. Filename Quality
  const hasEmDash = suggestedFilename.includes(' — ');
  const hasDate = /^\d{4}-\d{2}-\d{2}/.test(suggestedFilename);
  const parts = hasEmDash ? suggestedFilename.split(' — ') : suggestedFilename.split(/[-_]/);
  
  if (hasEmDash && hasDate && parts.length >= 3) {
    // Check if it has type and subject/vendor
    const hasType = parts.some(p => taxonomy.documentTypes.some(dt => p.toLowerCase().includes(dt)));
    const hasVendorOrSubject = parts.some(p => taxonomy.vendors.some(v => p.toLowerCase().includes(v)) || 
                                                taxonomy.categories.some(c => p.toLowerCase().includes(c)));
    if (hasType && hasVendorOrSubject) {
      scores.filename = 5;
    } else {
      scores.filename = 4;
      issues.push('Filename missing type or subject/vendor');
    }
  } else if (hasEmDash && hasDate) {
    scores.filename = 4;
    issues.push('Filename missing some required elements');
  } else if (hasDate && parts.length >= 3) {
    scores.filename = 3;
    issues.push('Filename missing em dashes (—)');
  } else if (hasDate) {
    scores.filename = 2;
    issues.push('Filename missing em dashes and some elements');
  } else {
    scores.filename = 2;
    issues.push('Filename format issues');
  }

  // 2. Title Quality
  if (title && title.length > 10 && title.length < 100) {
    scores.title = title.length > 15 ? 5 : 4;
  } else if (title && title.length > 5) {
    scores.title = 3;
    issues.push('Title could be more descriptive');
  } else if (title) {
    scores.title = 2;
    issues.push('Title too short or generic');
  } else {
    scores.title = 0;
    issues.push('Title missing');
  }

  // 3. Subject Quality (10 words or less)
  const subjectWords = subject ? subject.split(/\s+/).length : 0;
  if (subjectWords > 0 && subjectWords <= 10) {
    scores.subject = subjectWords <= 7 ? 5 : 4;
  } else if (subjectWords > 10) {
    scores.subject = 2;
    issues.push(`Subject too long (${subjectWords} words, max 10)`);
  } else if (subject) {
    scores.subject = 3;
    issues.push('Subject could be more specific');
  } else {
    scores.subject = 0;
    issues.push('Subject missing');
  }

  // 4. Keywords - Taxonomy Compliance
  const keywordArray = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
  const validTags = taxonomy.allTags.map(t => t.toLowerCase());
  const invalidTags = keywordArray.filter(k => !validTags.includes(k) && !k.match(/^(year|month|week|day)-\d+$/));
  
  const validCount = keywordArray.filter(k => validTags.includes(k) || k.match(/^(year|month|week|day)-\d+$/)).length;
  const totalCount = keywordArray.length;
  const complianceRatio = totalCount > 0 ? validCount / totalCount : 0;
  
  if (complianceRatio >= 0.9 && invalidTags.length === 0) {
    scores.keywordsCompliance = 5;
  } else if (complianceRatio >= 0.7 && invalidTags.length <= 1) {
    scores.keywordsCompliance = 4;
    if (invalidTags.length > 0) issues.push(`Invalid tags: ${invalidTags.join(', ')}`);
  } else if (complianceRatio >= 0.5) {
    scores.keywordsCompliance = 3;
    issues.push(`Some invalid tags: ${invalidTags.join(', ')}`);
  } else {
    scores.keywordsCompliance = 2;
    issues.push(`Many invalid tags: ${invalidTags.join(', ')}`);
  }

  // Check for duplicates
  const duplicates = keywordArray.filter((item, index) => keywordArray.indexOf(item) !== index);
  if (duplicates.length > 0) {
    issues.push(`Duplicate keywords: ${[...new Set(duplicates)].join(', ')}`);
  }

  // 5. Keywords - Completeness
  const hasDocType = keywordArray.some(k => taxonomy.documentTypes.includes(k));
  const hasCategory = keywordArray.some(k => taxonomy.categories.includes(k));
  const hasVendor = keywordArray.some(k => taxonomy.vendors.includes(k));
  const hasPerson = keywordArray.some(k => taxonomy.people.includes(k));
  const hasAction = keywordArray.some(k => taxonomy.actions.includes(k));
  const hasTimePeriod = keywordArray.some(k => k.match(/^(year|month|week|day)-\d+$/));
  
  let completenessScore = 0;
  if (hasDocType) completenessScore++;
  if (hasCategory) completenessScore++;
  if (hasVendor) completenessScore++;
  if (hasPerson) completenessScore++;
  if (hasAction) completenessScore++;
  if (hasTimePeriod) completenessScore++;
  
  if (completenessScore >= 5 && totalCount >= 5) {
    scores.keywordsCompleteness = 5;
  } else if (completenessScore >= 4 && totalCount >= 4) {
    scores.keywordsCompleteness = 4;
  } else if (completenessScore >= 3 && totalCount >= 3) {
    scores.keywordsCompleteness = 3;
    if (!hasDocType) issues.push('Missing document type tag');
    if (!hasCategory) issues.push('Missing category tag');
  } else {
    scores.keywordsCompleteness = 2;
    issues.push('Keywords missing many relevant tags');
  }

  // 6. Keywords - Format
  const hasSpaces = keywords.includes(', ');
  const hasUpperCase = /[A-Z]/.test(keywords);
  if (!hasSpaces && !hasUpperCase) {
    scores.keywordsFormat = 5;
  } else if (hasSpaces && hasUpperCase) {
    scores.keywordsFormat = 2;
    issues.push('Keywords have spaces and uppercase');
  } else if (hasSpaces) {
    scores.keywordsFormat = 3;
    issues.push('Keywords have spaces after commas');
  } else {
    scores.keywordsFormat = 3;
    issues.push('Keywords have uppercase letters');
  }

  // 7. Overall Accuracy (Consistency)
  const filenameLower = suggestedFilename.toLowerCase();
  const titleLower = title.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const keywordsLower = keywords.toLowerCase();
  
  // Check vendor consistency
  const vendors = taxonomy.vendors.map(v => v.toLowerCase());
  const filenameVendor = vendors.find(v => filenameLower.includes(v));
  const titleVendor = vendors.find(v => titleLower.includes(v));
  const keywordsVendor = vendors.find(v => keywordsLower.includes(v));
  
  const vendorConsistent = !filenameVendor || (filenameVendor === titleVendor || filenameVendor === keywordsVendor || (!titleVendor && !keywordsVendor));
  
  // Check document type consistency
  const docTypes = taxonomy.documentTypes.map(t => t.toLowerCase());
  const filenameType = docTypes.find(t => filenameLower.includes(t));
  const keywordsType = docTypes.find(t => keywordsLower.includes(t));
  const typeConsistent = !filenameType || filenameType === keywordsType || !keywordsType;
  
  // Check person consistency
  const people = taxonomy.people.map(p => p.toLowerCase());
  const filenamePerson = people.find(p => filenameLower.includes(p.split('-')[0])); // Check first name
  const titlePerson = people.find(p => titleLower.includes(p.split('-')[0]));
  const keywordsPerson = people.find(p => keywordsLower.includes(p));
  const personConsistent = !filenamePerson || !titlePerson || !keywordsPerson || 
                          (filenamePerson === keywordsPerson && titlePerson === keywordsPerson);
  
  if (vendorConsistent && typeConsistent && personConsistent) {
    scores.accuracy = 5;
  } else if (vendorConsistent && typeConsistent) {
    scores.accuracy = 4;
    if (!personConsistent) issues.push('Person name inconsistency');
  } else if (vendorConsistent || typeConsistent) {
    scores.accuracy = 3;
    issues.push('Some inconsistencies between fields');
  } else {
    scores.accuracy = 2;
    issues.push('Major inconsistencies between fields');
  }

  // 8. Practical Usability
  if (scores.filename >= 4 && scores.title >= 4 && scores.subject >= 4 && scores.keywordsCompliance >= 4) {
    scores.usability = 5;
  } else if (scores.filename >= 3 && scores.title >= 3 && scores.subject >= 3 && scores.keywordsCompliance >= 3) {
    scores.usability = 4;
  } else if (scores.filename >= 2 && scores.title >= 2 && scores.subject >= 2) {
    scores.usability = 3;
  } else {
    scores.usability = 2;
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const percentage = (total / 40) * 100;

  return { scores, total, percentage, issues };
}

async function main() {
  const taxonomy = await loadTaxonomyForScoring();
  const resultsFile = join(__dirname, '..', 'test-results.md');
  const content = await readFile(resultsFile, 'utf-8');
  
  // Parse the markdown to extract attempts
  const testSections = content.split(/## Test \d+:/);
  let newContent = testSections[0]; // Keep header and summary
  
  for (let i = 1; i < testSections.length; i++) {
    const section = testSections[i];
    const filenameMatch = section.match(/^([^\n]+)/);
    if (!filenameMatch) continue;
    
    const filename = filenameMatch[1].trim();
    newContent += `## Test ${i}: ${filename}\n\n`;
    
    // Check if there's an error
    if (section.includes('**Error:**')) {
      const errorMatch = section.match(/\*\*Error:\*\* ([^\n]+)/);
      newContent += `**Error:** ${errorMatch ? errorMatch[1] : 'Unknown error'}\n\n`;
      newContent += `---\n\n`;
      continue;
    }
    
    // Extract attempts
    const attempts = section.match(/### Attempt \d+[\s\S]*?(?=### Attempt|\n---|$)/g) || [];
    
    attempts.forEach((attempt, idx) => {
      const attemptNum = idx + 1;
      const filenameMatch = attempt.match(/- \*\*Filename:\*\* ([^\n]+)/);
      const titleMatch = attempt.match(/- \*\*Title:\*\* ([^\n]+)/);
      const subjectMatch = attempt.match(/- \*\*Subject:\*\* ([^\n]+)/);
      const keywordsMatch = attempt.match(/- \*\*Keywords:\*\* ([^\n]+)/);
      
      if (filenameMatch && titleMatch && subjectMatch && keywordsMatch) {
        const suggestedFilename = filenameMatch[1].trim();
        const title = titleMatch[1].trim();
        const subject = subjectMatch[1].trim();
        const keywords = keywordsMatch[1].trim();
        
        const { scores, total, percentage, issues } = scoreSuggestion(
          filename, suggestedFilename, title, subject, keywords, taxonomy
        );
        
        const rating = percentage >= 87.5 ? 'Excellent' :
                       percentage >= 70 ? 'Good' :
                       percentage >= 50 ? 'Acceptable' : 'Needs Improvement';
        
        newContent += `### Attempt ${attemptNum}\n\n`;
        newContent += `- **Filename:** ${suggestedFilename}\n`;
        newContent += `- **Title:** ${title}\n`;
        newContent += `- **Subject:** ${subject}\n`;
        newContent += `- **Keywords:** ${keywords}\n\n`;
        
        newContent += `#### Scores:\n\n`;
        newContent += `1. Filename Quality: ${scores.filename}/5\n`;
        newContent += `2. Title Quality: ${scores.title}/5\n`;
        newContent += `3. Subject Quality: ${scores.subject}/5\n`;
        newContent += `4. Keywords - Taxonomy Compliance: ${scores.keywordsCompliance}/5\n`;
        newContent += `5. Keywords - Completeness: ${scores.keywordsCompleteness}/5\n`;
        newContent += `6. Keywords - Format: ${scores.keywordsFormat}/5\n`;
        newContent += `7. Overall Accuracy: ${scores.accuracy}/5\n`;
        newContent += `8. Practical Usability: ${scores.usability}/5\n\n`;
        newContent += `**Total Score: ${total}/40 (${percentage.toFixed(1)}%) - ${rating}**\n\n`;
        
        if (issues.length > 0) {
          newContent += `**Issues:**\n`;
          issues.forEach(issue => {
            newContent += `- ${issue}\n`;
          });
          newContent += `\n`;
        }
      }
    });
    
    newContent += `---\n\n`;
  }
  
  // Update summary with average scores
  const allScores = [];
  const scoreMatches = newContent.matchAll(/\*\*Total Score: (\d+)\/40/g);
  for (const match of scoreMatches) {
    allScores.push(parseInt(match[1]));
  }
  
  const avgScore = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : 0;
  const avgPercentage = allScores.length > 0 ? ((avgScore / 40) * 100).toFixed(1) : 0;
  
  // Replace summary section
  const summaryMatch = newContent.match(/## Summary[\s\S]*$/);
  if (summaryMatch) {
    newContent = newContent.replace(/## Summary[\s\S]*$/, `## Summary\n\n`);
    newContent += `- **Successfully tested:** 4/5 PDFs\n`;
    newContent += `- **Total attempts:** 12\n`;
    newContent += `- **Successful attempts:** 12\n`;
    newContent += `- **Average Score:** ${avgScore}/40 (${avgPercentage}%)\n`;
    newContent += `- **Score Range:** ${Math.min(...allScores)}-${Math.max(...allScores)}/40\n\n`;
  }
  
  await writeFile(resultsFile, newContent);
  console.log('✅ Scores added to test-results.md');
  console.log(`   Average Score: ${avgScore}/40 (${avgPercentage}%)`);
}

main().catch(console.error);
