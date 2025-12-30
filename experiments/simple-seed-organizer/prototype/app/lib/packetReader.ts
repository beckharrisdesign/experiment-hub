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
 * Check if a line is likely noise (too many symbols, numbers, or special chars)
 */
function isNoiseLine(line: string): boolean {
  const cleaned = cleanOCRText(line);
  if (cleaned.length < 3) return true;
  
  // Count different character types
  const letters = (cleaned.match(/[A-Za-z]/g) || []).length;
  const numbers = (cleaned.match(/[0-9]/g) || []).length;
  const symbols = (cleaned.match(/[^A-Za-z0-9\s]/g) || []).length;
  const total = cleaned.length;
  
  // If more than 40% symbols, likely noise
  if (symbols / total > 0.4) return true;
  
  // If very few letters (less than 30%), likely noise
  if (letters / total < 0.3) return true;
  
  // If it's mostly numbers with few letters, likely noise
  if (numbers > letters * 2 && letters < 5) return true;
  
  return false;
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
  
  // Filter out noise lines first
  const cleanLines = lines.filter(line => !isNoiseLine(line));
  
  // Look for seed type names (usually the main name)
  // Prioritize lines that contain seed type words
  for (const line of cleanLines) {
    const cleaned = cleanOCRText(line).toLowerCase();
    for (const seedType of seedTypes) {
      if (cleaned.includes(seedType)) {
        // Extract just the seed name, not the whole noisy line
        const words = cleaned.split(/\s+/);
        const seedWord = words.find(w => w.includes(seedType));
        if (seedWord) {
          // Capitalize first letter
          result.name = seedWord.charAt(0).toUpperCase() + seedWord.slice(1);
        } else {
          result.name = seedType.charAt(0).toUpperCase() + seedType.slice(1);
        }
        break;
      }
    }
    if (result.name) break;
  }
  
  // Look for variety names (often in all caps, standalone, 3-30 chars)
  // Skip lines that are too long or have too many words
  for (const line of cleanLines) {
    const cleaned = cleanOCRText(line);
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    
    // Good variety candidates:
    // - 1-3 words
    // - 3-40 characters total
    // - Mostly letters
    if (words.length >= 1 && words.length <= 3 && cleaned.length >= 3 && cleaned.length <= 40) {
      const letterRatio = (cleaned.match(/[A-Za-z]/g) || []).length / cleaned.length;
      if (letterRatio > 0.6) {
        // If it's mostly uppercase, likely a variety name
        const upperRatio = (cleaned.match(/[A-Z]/g) || []).length / (cleaned.match(/[A-Za-z]/g) || []).length;
        if (upperRatio > 0.5 && !result.variety) {
          result.variety = cleaned;
        } else if (!result.name && letterRatio > 0.8) {
          // If we don't have a name yet and this looks like a good name
          result.name = cleaned;
        }
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
    // Normalize common OCR mistakes
    let brandName = brandMatch[1];
    if (brandName.toLowerCase().includes('pgake') || brandName.toLowerCase().includes('baker')) {
      brandName = 'Baker Creek';
    }
    
    // Find the original case from the lines
    for (const line of lines) {
      const lineLower = line.toLowerCase();
      if (lineLower.includes('baker') || lineLower.includes('pgake') || lineLower.includes('creek')) {
        if (lineLower.includes('baker') && lineLower.includes('creek')) {
          data.brand = 'Baker Creek';
          break;
        }
      }
    }
    
    // If we found a match but didn't set it from lines, use the normalized name
    if (!data.brand && brandName) {
      data.brand = brandName;
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
  
  // If we still don't have name/variety, try to extract from clean prominent lines
  if (!data.name && !data.variety) {
    // Look for lines that are mostly letters (not numbers/symbols)
    // Filter out noise first
    const cleanLines = lines.filter(line => !isNoiseLine(line));
    
    for (const line of cleanLines) {
      const cleaned = cleanOCRText(line);
      const letterRatio = (cleaned.match(/[A-Za-z]/g) || []).length / cleaned.length;
      if (letterRatio > 0.7 && cleaned.length >= 3 && cleaned.length <= 50) {
        // If it's all caps or mostly caps, likely a variety
        const upperRatio = (cleaned.match(/[A-Z]/g) || []).length / (cleaned.match(/[A-Za-z]/g) || []).length;
        if (upperRatio > 0.5 && !data.variety) {
          data.variety = cleaned;
        } else if (!data.name && letterRatio > 0.8) {
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

