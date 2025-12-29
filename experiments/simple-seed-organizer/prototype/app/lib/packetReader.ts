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
 * Parse extracted text to identify seed packet information
 */
export function parsePacketText(text: string): ExtractedSeedData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const data: ExtractedSeedData = {};
  
  // Common patterns to look for
  const patterns = {
    // Brand names (common seed companies)
    brand: /\b(Burpee|Johnny's|Baker Creek|Seed Savers|Park Seed|Ferry-Morse|Botanical Interests|Renee's Garden|Territorial|High Mowing|Fedco|Southern Exposure)\b/i,
    
    // Year (4 digits, often at end of line or after "Packed for" or "Year")
    year: /\b(19|20)\d{2}\b/,
    
    // Quantity (numbers followed by words like "seeds", "pack", "count")
    quantity: /\b(\d+)\s*(seeds?|pack|count|pcs?)\b/i,
    
    // Days to germination (patterns like "7-14 days", "10-20 days to germinate")
    daysToGermination: /(\d+)\s*[-–]\s*(\d+)\s*(?:days?\s*)?(?:to\s*)?germinat/i,
    
    // Days to maturity (patterns like "70-80 days", "60 days to maturity")
    daysToMaturity: /(\d+)\s*[-–]?\s*(\d+)?\s*(?:days?\s*)?(?:to\s*)?matur/i,
    
    // Planting depth (patterns like "1/4 inch", "0.5\"", "1/2\" deep")
    plantingDepth: /(\d+\/\d+|\d+\.?\d*)\s*(?:inch|in|"|cm)\s*(?:deep)?/i,
    
    // Spacing (patterns like "12 inches", "12-18 inches apart", "12\" spacing")
    spacing: /(\d+)\s*[-–]?\s*(\d+)?\s*(?:inch|in|"|cm)\s*(?:apart|spacing)?/i,
    
    // Sun requirements
    sunRequirement: /\b(full\s*sun|partial\s*shade|full\s*shade|part\s*shade)\b/i,
  };
  
  // Try to extract brand
  for (const line of lines) {
    const brandMatch = line.match(patterns.brand);
    if (brandMatch) {
      data.brand = brandMatch[1];
      break;
    }
  }
  
  // Try to extract year
  for (const line of lines) {
    const yearMatch = line.match(patterns.year);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      if (year >= 2020 && year <= 2030) { // Reasonable range
        data.year = year;
        break;
      }
    }
  }
  
  // Try to extract quantity
  for (const line of lines) {
    const quantityMatch = line.match(patterns.quantity);
    if (quantityMatch) {
      data.quantity = quantityMatch[0];
      break;
    }
  }
  
  // Try to extract days to germination
  for (const line of lines) {
    const germMatch = line.match(patterns.daysToGermination);
    if (germMatch) {
      data.daysToGermination = germMatch[2] ? `${germMatch[1]}-${germMatch[2]}` : germMatch[1];
      break;
    }
  }
  
  // Try to extract days to maturity
  for (const line of lines) {
    const maturityMatch = line.match(patterns.daysToMaturity);
    if (maturityMatch) {
      data.daysToMaturity = maturityMatch[2] ? `${maturityMatch[1]}-${maturityMatch[2]}` : maturityMatch[1];
      break;
    }
  }
  
  // Try to extract planting depth
  for (const line of lines) {
    const depthMatch = line.match(patterns.plantingDepth);
    if (depthMatch) {
      data.plantingDepth = depthMatch[0];
      break;
    }
  }
  
  // Try to extract spacing
  for (const line of lines) {
    const spacingMatch = line.match(patterns.spacing);
    if (spacingMatch) {
      data.spacing = spacingMatch[2] ? `${spacingMatch[1]}-${spacingMatch[2]} inches` : `${spacingMatch[1]} inches`;
      break;
    }
  }
  
  // Try to extract sun requirement
  for (const line of lines) {
    const sunMatch = line.match(patterns.sunRequirement);
    if (sunMatch) {
      const sunText = sunMatch[1].toLowerCase();
      if (sunText.includes('full sun')) {
        data.sunRequirement = 'full-sun';
      } else if (sunText.includes('partial') || sunText.includes('part')) {
        data.sunRequirement = 'partial-shade';
      } else if (sunText.includes('full shade')) {
        data.sunRequirement = 'full-shade';
      }
      break;
    }
  }
  
  // Try to identify name and variety from first few lines
  // Usually the variety/cultivar name is prominent
  if (lines.length > 0) {
    const firstLine = lines[0];
    // If first line looks like a variety name (often in quotes or all caps)
    if (firstLine.length > 3 && firstLine.length < 50) {
      data.variety = firstLine;
    }
    
    // Second line might be the common name
    if (lines.length > 1 && lines[1].length > 3 && lines[1].length < 30) {
      data.name = lines[1];
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

