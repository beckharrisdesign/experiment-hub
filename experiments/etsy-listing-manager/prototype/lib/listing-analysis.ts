import { Listing, Pattern, Template, BrandIdentity, SEOAnalysis } from '@/types';
import { getPattern } from './patterns';
import { getProductTemplate } from './product-templates';
import { getBrandIdentity } from './brand-identity';

export interface ListingAnalysis {
  listingId: string;
  overallScore: number; // 0-100
  seoScore: number; // 0-100
  brandConsistencyScore: number; // 0-100
  contentQualityScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  titleAnalysis: {
    length: number;
    maxLength: number;
    keywordDensity: number;
    brandMention: boolean;
    issues: string[];
    suggestions: string[];
  };
  descriptionAnalysis: {
    length: number;
    optimalLength: { min: number; max: number };
    structure: {
      hasOpening: boolean;
      hasWhatIncluded: boolean;
      hasPatternDetails: boolean;
      hasInstructions: boolean;
    };
    brandToneMatch: boolean;
    issues: string[];
    suggestions: string[];
  };
  tagsAnalysis: {
    count: number;
    requiredCount: number;
    duplicates: string[];
    coverage: {
      patternType: boolean;
      craftType: boolean;
      style: boolean;
      difficulty: boolean;
      useCases: boolean;
    };
    missingCategories: string[];
    suggestions: string[];
  };
  pricingAnalysis: {
    currentPrice?: number;
    suggestedPrice?: number;
    isReasonable: boolean;
    bundleDiscount?: number; // if bundle, what discount is applied
    issues: string[];
    suggestions: string[];
  };
  patternTemplateAlignment: {
    patternsMatchTemplate: boolean;
    issues: string[];
    suggestions: string[];
  };
}

/**
 * Analyze an existing listing using the agent's expertise
 */
export async function analyzeListing(listingId: string): Promise<ListingAnalysis> {
  const { getListing } = await import('./listings');
  const listing = getListing(listingId);
  
  if (!listing) {
    throw new Error('Listing not found');
  }

  const brandIdentity = getBrandIdentity();
  if (!brandIdentity) {
    throw new Error('Brand identity must be set to analyze listings');
  }

  // Get related data
  const patterns = listing.patternIds.map(id => {
    const pattern = getPattern(id);
    if (!pattern) {
      throw new Error(`Pattern ${id} not found`);
    }
    return pattern;
  });

  const productTemplate = getProductTemplate(listing.templateId);
  if (!productTemplate) {
    throw new Error('Template not found');
  }

  // Build context for analysis
  const listingContext = `Current Listing:
- Title: "${listing.title}" (${listing.title.length} characters)
- Description: ${listing.description.length} characters
- Tags: ${(listing.tags || []).length} tags - ${(listing.tags || []).join(', ')}
- Category: ${listing.category || 'Not set'}
- Price: ${listing.price ? `$${listing.price.toFixed(2)}` : 'Not set'}`;

  const patternsContext = patterns.map((pattern, idx) => {
    return `Pattern ${idx + 1}: "${pattern.name}"
${pattern.category ? `- Category: ${pattern.category}` : ''}
${pattern.difficulty ? `- Difficulty: ${pattern.difficulty}` : ''}
${pattern.style ? `- Style: ${pattern.style}` : ''}
${pattern.notes ? `- Notes: ${pattern.notes}` : ''}`;
  }).join('\n\n');

  const templateContext = `Template: "${productTemplate.name}"
- Types: ${productTemplate.types.join(', ')}
- Number of Items: ${productTemplate.numberOfItems}
${productTemplate.commonInstructions ? `- Common Instructions: ${productTemplate.commonInstructions}` : ''}`;

  const brandContext = `Store: "${brandIdentity.storeName}"
- Brand Tone: ${brandIdentity.brandTone}
- Visual Style: ${brandIdentity.creativeDirection.visualStyle}
${brandIdentity.creativeDirection.colorPalette.length > 0 ? `- Color Palette: ${brandIdentity.creativeDirection.colorPalette.join(', ')}` : ''}`;

  const systemPrompt = `You are an expert Etsy SEO copywriter and listing strategist. Your role is to analyze existing listings and provide detailed feedback on optimization, brand consistency, and content quality.

Analyze the listing and provide:
1. SEO optimization assessment
2. Brand consistency check
3. Content quality review
4. Specific, actionable suggestions for improvement

Return your analysis as a JSON object with this exact structure:
{
  "overallScore": 0-100,
  "seoScore": 0-100,
  "brandConsistencyScore": 0-100,
  "contentQualityScore": 0-100,
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...],
  "titleAnalysis": {
    "length": number,
    "maxLength": 140,
    "keywordDensity": 0-100,
    "brandMention": boolean,
    "issues": ["issue1", ...],
    "suggestions": ["suggestion1", ...]
  },
  "descriptionAnalysis": {
    "length": number,
    "optimalLength": {"min": 500, "max": 1000},
    "structure": {
      "hasOpening": boolean,
      "hasWhatIncluded": boolean,
      "hasPatternDetails": boolean,
      "hasInstructions": boolean
    },
    "brandToneMatch": boolean,
    "issues": ["issue1", ...],
    "suggestions": ["suggestion1", ...]
  },
  "tagsAnalysis": {
    "count": number,
    "requiredCount": 13,
    "duplicates": ["duplicate1", ...],
    "coverage": {
      "patternType": boolean,
      "craftType": boolean,
      "style": boolean,
      "difficulty": boolean,
      "useCases": boolean
    },
    "missingCategories": ["category1", ...],
    "suggestions": ["suggestion1", ...]
  },
  "pricingAnalysis": {
    "currentPrice": number or null,
    "suggestedPrice": number or null,
    "isReasonable": boolean,
    "bundleDiscount": number or null,
    "issues": ["issue1", ...],
    "suggestions": ["suggestion1", ...]
  },
  "patternTemplateAlignment": {
    "patternsMatchTemplate": boolean,
    "issues": ["issue1", ...],
    "suggestions": ["suggestion1", ...]
  }
}`;

  const userPrompt = `Analyze this existing listing and provide detailed feedback:

${brandContext}

${templateContext}

${patternsContext}

${listingContext}

Context:
- This is ${patterns.length > 1 ? `a bundle of ${patterns.length} patterns` : 'a single pattern listing'}
- Product type: ${productTemplate.types.join(' and ')}
- Expected brand tone: ${brandIdentity.brandTone}

Provide a comprehensive analysis covering:
1. SEO optimization (title length, keywords, tags, category)
2. Brand consistency (tone match, store name usage)
3. Content quality (description structure, completeness)
4. Pricing appropriateness
5. Pattern/template alignment
6. Specific, actionable improvement suggestions

Return your analysis as JSON with the exact structure specified in the system prompt.`;

  const { generateContent } = await import('./openai');
  
  const response = await generateContent(
    userPrompt,
    systemPrompt + '\n\nIMPORTANT: You must return ONLY valid JSON, no additional text or markdown formatting.',
    {
      temperature: 0.3, // Lower temperature for more consistent analysis
      maxTokens: 3000,
      responseFormat: { type: 'json_object' },
    }
  );

  // Parse JSON response
  let analysisData: any;
  try {
    analysisData = JSON.parse(response.trim());
  } catch (e) {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in agent analysis response');
    }
    analysisData = JSON.parse(jsonMatch[0]);
  }

  // Add listing ID and validate structure
  return {
    listingId,
    ...analysisData,
  };
}

/**
 * Analyze multiple listings and provide summary insights
 */
export async function analyzeListings(listingIds: string[]): Promise<{
  totalListings: number;
  averageScore: number;
  commonStrengths: string[];
  commonWeaknesses: string[];
  topSuggestions: string[];
  listings: ListingAnalysis[];
}> {
  const analyses = await Promise.all(
    listingIds.map(id => analyzeListing(id))
  );

  const averageScore = analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length;

  // Find common patterns
  const allStrengths = analyses.flatMap(a => a.strengths);
  const allWeaknesses = analyses.flatMap(a => a.weaknesses);
  const allSuggestions = analyses.flatMap(a => a.suggestions);

  // Count frequency
  const strengthCounts = allStrengths.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const weaknessCounts = allWeaknesses.reduce((acc, w) => {
    acc[w] = (acc[w] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const suggestionCounts = allSuggestions.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get top items (appearing in at least 30% of listings)
  const threshold = Math.ceil(analyses.length * 0.3);
  const commonStrengths = Object.entries(strengthCounts)
    .filter(([_, count]) => count >= threshold)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([strength]) => strength);

  const commonWeaknesses = Object.entries(weaknessCounts)
    .filter(([_, count]) => count >= threshold)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([weakness]) => weakness);

  const topSuggestions = Object.entries(suggestionCounts)
    .filter(([_, count]) => count >= threshold)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 10)
    .map(([suggestion]) => suggestion);

  return {
    totalListings: analyses.length,
    averageScore: Math.round(averageScore),
    commonStrengths,
    commonWeaknesses,
    topSuggestions,
    listings: analyses,
  };
}

