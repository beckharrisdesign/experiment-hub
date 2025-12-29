/**
 * Seed Packet Image Reader
 * 
 * This module handles reading and extracting information from seed packet images.
 * It uses OCR to extract text and then parses that text to identify seed information.
 */

export interface ExtractedSeedData {
  name?: string;
  variety?: string;
  brand?: string;
  year?: number;
  quantity?: string;
  daysToGermination?: string;
  daysToMaturity?: string;
  plantingDepth?: string;
  spacing?: string;
  sunRequirement?: 'full-sun' | 'partial-shade' | 'full-shade';
  plantingMonths?: number[];
  notes?: string;
  confidence?: number; // Overall confidence score (0-1)
}

export interface PacketText {
  text: string;
  confidence: number;
}

/**
 * Extract text from an image using OCR (Tesseract.js)
 */
export async function extractTextFromImage(imageFile: File | string): Promise<PacketText> {
  // Dynamically import Tesseract to avoid SSR issues
  const { createWorker } = await import('tesseract.js');
  
  const worker = await createWorker('eng');
  
  try {
    let imageSource: string | File;
    
    // If it's a string (URL or base64), use it directly
    // If it's a File, we need to convert it to a format Tesseract can use
    if (typeof imageFile === 'string') {
      imageSource = imageFile;
    } else {
      // Convert File to data URL or use File directly (Tesseract accepts File objects)
      imageSource = imageFile;
    }
    
    const { data } = await worker.recognize(imageSource);
    
    await worker.terminate();
    
    return {
      text: data.text,
      confidence: data.confidence / 100, // Convert from 0-100 to 0-1
    };
  } catch (error) {
    await worker.terminate();
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clean and normalize OCR text
 */
function cleanOCRText(text: string): string {
  // Remove excessive whitespace and special characters that OCR often misreads
  return text
    .replace(/[|\\\/]/g, ' ') // Replace common OCR mistakes
    .replace(/[=+_~-]{2,}/g, ' ') // Replace multiple special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract potential seed names and varieties from text
 */
function extractSeedNameAndVariety(lines: string[]): { name?: string; variety?: string } {
  const result: { name?: string; variety?: string } = {};
  
  // Common seed type names (vegetables, herbs, flowers, fruits)
  const seedTypes = [
    'tomato', 'pepper', 'cucumber', 'squash', 'zucchini', 'eggplant', 'bean', 'pea',
    'lettuce', 'spinach', 'kale', 'carrot', 'radish', 'beet', 'onion', 'garlic',
    'basil', 'oregano', 'thyme', 'rosemary', 'parsley', 'cilantro', 'dill', 'sage',
    'marigold', 'sunflower', 'zinnia', 'petunia', 'nasturtium', 'cosmos', 'calendula',
    'strawberry', 'watermelon', 'cantaloupe', 'pumpkin', 'corn', 'broccoli', 'cauliflower'
  ];
  
  // Look for seed type names (usually the main name)
  for (const line of lines) {
    const cleaned = cleanOCRText(line).toLowerCase();
    for (const seedType of seedTypes) {
      if (cleaned.includes(seedType)) {
        result.name = line.trim();
        break;
      }
    }
    if (result.name) break;
  }
  
  // Look for variety names (often in all caps, or after the main name)
  // Or after words like "variety", "cultivar", or standalone capitalized words
  for (const line of lines) {
    const cleaned = cleanOCRText(line);
    // If line is mostly uppercase and 3-30 chars, likely a variety
    if (cleaned.length >= 3 && cleaned.length <= 30) {
      const upperRatio = (cleaned.match(/[A-Z]/g) || []).length / cleaned.length;
      if (upperRatio > 0.5 && !result.variety) {
        result.variety = cleaned;
      }
    }
  }
  
  return result;
}

/**
 * Parse extracted text to identify seed packet information
 */
export function parsePacketText(text: string): ExtractedSeedData {
  // Clean the text first
  const cleanedText = cleanOCRText(text);
  const lines = cleanedText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2); // Filter out very short lines (likely OCR noise)
  
  const data: ExtractedSeedData = {};
  
  // Extract name and variety first
  const nameVariety = extractSeedNameAndVariety(lines);
  if (nameVariety.name) data.name = nameVariety.name;
  if (nameVariety.variety) data.variety = nameVariety.variety;
  
  // Common patterns to look for (more flexible)
  const patterns = {
    // Brand names (common seed companies) - more flexible matching
    brand: /\b(Burpee|Johnny'?s|Baker\s*Creek|Seed\s*Savers?|Park\s*Seed|Ferry[\s-]?Morse|Botanical\s*Interests?|Renee'?s\s*Garden|Territorial|High\s*Mowing|Fedco|Southern\s*Exposure|Harris|American\s*Seed|Eden\s*Brothers)\b/i,
    
    // Year (4 digits, often at end of line or after "Packed for" or "Year")
    // Look for years between 2020-2030 (reasonable range)
    year: /\b(20[2-3]\d)\b/,
    
    // Quantity (numbers followed by words like "seeds", "pack", "count")
    // Also handle OCR mistakes like "SEEDS" with extra characters
    quantity: /\b(\d+)\s*(?:seeds?|pack|count|pcs?|seed)\b/i,
    
    // Days to germination (patterns like "7-14 days", "10-20 days to germinate")
    // Handle OCR mistakes with special chars
    daysToGermination: /(\d+)\s*[-–~=]?\s*(\d+)?\s*(?:days?\s*)?(?:to\s*)?(?:germinat|germ)/i,
    
    // Days to maturity (patterns like "70-80 days", "60 days to maturity")
    daysToMaturity: /(\d+)\s*[-–~=]?\s*(\d+)?\s*(?:days?\s*)?(?:to\s*)?(?:matur|harvest)/i,
    
    // Planting depth (patterns like "1/4 inch", "0.5\"", "1/2\" deep")
    plantingDepth: /(\d+\/\d+|\d+\.?\d*)\s*(?:inch|in|"|cm|inches?)\s*(?:deep)?/i,
    
    // Spacing (patterns like "12 inches", "12-18 inches apart", "12\" spacing")
    spacing: /(\d+)\s*[-–~=]?\s*(\d+)?\s*(?:inch|in|"|cm|inches?)\s*(?:apart|spacing)?/i,
    
    // Sun requirements - handle OCR variations
    sunRequirement: /\b(full\s*sun|partial\s*shade|full\s*shade|part\s*shade|sun|shade)\b/i,
    
    // Scientific names (often in italics in OCR, look for patterns like "Tagetes erecta")
    scientificName: /\b([A-Z][a-z]+\s+[a-z]+)\b/,
  };
  
  // Combine all text for pattern matching (some info might span lines)
  const fullText = lines.join(' ').toLowerCase();
  
  // Try to extract brand (search in full text for better matching)
  const brandMatch = fullText.match(patterns.brand);
  if (brandMatch) {
    // Find the original case from the lines
    for (const line of lines) {
      if (line.toLowerCase().includes(brandMatch[1].toLowerCase())) {
        const lineBrandMatch = line.match(patterns.brand);
        if (lineBrandMatch) {
          data.brand = lineBrandMatch[1];
          break;
        }
      }
    }
  }
  
  // Try to extract year (search in full text)
  const yearMatches = fullText.match(patterns.year);
  if (yearMatches) {
    for (const match of yearMatches) {
      const year = parseInt(match);
      if (year >= 2020 && year <= 2030) {
        data.year = year;
        break;
      }
    }
  }
  
  // Try to extract quantity (search in full text)
  const quantityMatch = fullText.match(patterns.quantity);
  if (quantityMatch) {
    // Find the original text to preserve formatting
    for (const line of lines) {
      const lineMatch = line.match(patterns.quantity);
      if (lineMatch) {
        data.quantity = lineMatch[0];
        break;
      }
    }
  }
  
  // Try to extract days to germination
  const germMatch = fullText.match(patterns.daysToGermination);
  if (germMatch) {
    data.daysToGermination = germMatch[2] ? `${germMatch[1]}-${germMatch[2]}` : germMatch[1];
  }
  
  // Try to extract days to maturity
  const maturityMatch = fullText.match(patterns.daysToMaturity);
  if (maturityMatch) {
    data.daysToMaturity = maturityMatch[2] ? `${maturityMatch[1]}-${maturityMatch[2]}` : maturityMatch[1];
  }
  
  // Try to extract planting depth
  const depthMatch = fullText.match(patterns.plantingDepth);
  if (depthMatch) {
    // Find original text
    for (const line of lines) {
      const lineMatch = line.match(patterns.plantingDepth);
      if (lineMatch) {
        data.plantingDepth = lineMatch[0];
        break;
      }
    }
  }
  
  // Try to extract spacing
  const spacingMatch = fullText.match(patterns.spacing);
  if (spacingMatch) {
    data.spacing = spacingMatch[2] ? `${spacingMatch[1]}-${spacingMatch[2]} inches` : `${spacingMatch[1]} inches`;
  }
  
  // Try to extract sun requirement
  const sunMatch = fullText.match(patterns.sunRequirement);
  if (sunMatch) {
    const sunText = sunMatch[1].toLowerCase();
    if (sunText.includes('full sun') || sunText === 'sun') {
      data.sunRequirement = 'full-sun';
    } else if (sunText.includes('partial') || sunText.includes('part')) {
      data.sunRequirement = 'partial-shade';
    } else if (sunText.includes('full shade') || sunText === 'shade') {
      data.sunRequirement = 'full-shade';
    }
  }
  
  // If we found a scientific name, it might help identify the seed type
  const scientificMatch = fullText.match(patterns.scientificName);
  if (scientificMatch && !data.name) {
    // Scientific names can help identify the common name
    const scientific = scientificMatch[1].toLowerCase();
    if (scientific.includes('tagetes')) {
      if (!data.name) data.name = 'Marigold';
    }
  }
  
  // If we still don't have name/variety, try to extract from prominent lines
  if (!data.name && !data.variety) {
    // Look for lines that are mostly letters (not numbers/symbols)
    for (const line of lines) {
      const cleaned = cleanOCRText(line);
      const letterRatio = (cleaned.match(/[A-Za-z]/g) || []).length / cleaned.length;
      if (letterRatio > 0.7 && cleaned.length >= 3 && cleaned.length <= 50) {
        // If it's all caps or mostly caps, likely a variety
        const upperRatio = (cleaned.match(/[A-Z]/g) || []).length / cleaned.length;
        if (upperRatio > 0.5 && !data.variety) {
          data.variety = cleaned;
        } else if (!data.name) {
          data.name = cleaned;
        }
        if (data.name && data.variety) break;
      }
    }
  }
  
  return data;
}

/**
 * Process both front and back images of a seed packet
 */
export async function processPacketImages(
  frontImage: File | string,
  backImage?: File | string
): Promise<ExtractedSeedData> {
  const frontText = await extractTextFromImage(frontImage);
  const backText = backImage ? await extractTextFromImage(backImage) : null;
  
  // Combine text from both sides
  const combinedText = backText 
    ? `${frontText.text}\n\n${backText.text}`
    : frontText.text;
  
  // Parse the combined text
  const extracted = parsePacketText(combinedText);
  
  // Calculate overall confidence (average of OCR confidence)
  if (backText) {
    extracted.confidence = (frontText.confidence + backText.confidence) / 2;
  } else {
    extracted.confidence = frontText.confidence;
  }
  
  return extracted;
}

