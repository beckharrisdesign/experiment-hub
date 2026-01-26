/**
 * AI-Powered Seed Packet Reader using OpenAI Vision API
 * 
 * This module uses OpenAI's vision capabilities to extract structured
 * information from seed packet images with better accuracy than OCR alone.
 */

import { ExtractedSeedData } from './packetReader';

export interface AIExtractedData extends ExtractedSeedData {
  latinName?: string;
  plantingInstructions?: string;
  summary?: string;
  additionalNotes?: string;
  rawKeyValuePairs?: Array<{ key: string; value: string; source?: 'front' | 'back' }>;
  fieldSources?: Record<string, 'front' | 'back'>;
}

/**
 * Extract structured data from seed packet images using OpenAI Vision API
 */
export async function extractWithAI(
  frontImage: File | string,
  backImage?: File | string,
  apiKey?: string
): Promise<AIExtractedData> {
  // Get API key from parameter or environment variable
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY must be provided as parameter or set as environment variable');
  }

  // Convert images to base64 if they're File objects
  const frontImageBase64 = await imageToBase64(frontImage);
  const backImageBase64 = backImage ? await imageToBase64(backImage) : undefined;

  interface MessageContent {
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }

  interface Message {
    role: string;
    content: MessageContent[];
  }

  const messages: Message[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Extract ALL key-value pairs and structured data from these seed packet images. Focus on accuracy - extract exactly what you see, do not summarize or interpret.

IMPORTANT: The first image is the FRONT of the packet, the second image (if provided) is the BACK of the packet.

Your task is to identify and extract every piece of information visible on the packet as key-value pairs, and indicate which image (front or back) each piece of data came from.

Extract these specific fields if present:
- name (common plant name)
- variety (cultivar/variety name)
- latinName (scientific name)
- brand (seed company name)
- year (packed for year, as number)
- quantity (number of seeds)
- daysToGermination (e.g., "7-14 days")
- daysToMaturity (e.g., "70-80 days")
- plantingDepth (e.g., "1/4 inch")
- spacing (e.g., "12-18 inches")
- sunRequirement (one of: "full-sun", "partial-shade", "full-shade")
- plantingInstructions (full text of planting instructions)

Additionally, extract ALL other key-value pairs you find on the packet that are not covered above. Include them in a "rawKeyValuePairs" array with source information.

Return as JSON:
{
  "name": "exact text or null",
  "variety": "exact text or null",
  "latinName": "exact text or null",
  "brand": "exact text or null",
  "year": number or null,
  "quantity": "exact text or null",
  "daysToGermination": "exact text or null",
  "daysToMaturity": "exact text or null",
  "plantingDepth": "exact text or null",
  "spacing": "exact text or null",
  "sunRequirement": "full-sun" | "partial-shade" | "full-shade" | null,
  "plantingInstructions": "exact text or null",
  "fieldSources": {
    "name": "front" | "back",
    "variety": "front" | "back",
    ... (include source for each field that has a value)
  },
  "rawKeyValuePairs": [{"key": "label text", "value": "value text", "source": "front" | "back"}, ...]
}

IMPORTANT: 
- Extract text exactly as written, do not summarize
- Include ALL visible information in rawKeyValuePairs
- For each field and key-value pair, indicate "front" or "back" as the source
- If a field is not visible, use null
- Be precise and accurate - this is for data extraction, not summarization`
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${frontImageBase64}`
          }
        }
      ]
    }
  ];

  if (backImageBase64) {
    messages[0].content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${backImageBase64}`
      }
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective model optimized for structured data extraction
        messages: messages,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        temperature: 0.1 // Low temperature for more deterministic, accurate extraction
      })
    });

    // Read response body once
    const responseText = await response.text();
    
    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = JSON.parse(responseText);
        errorMessage = error.error?.message || error.message || JSON.stringify(error);
      } catch (e) {
        // If response is not JSON, use the text directly
        errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from OpenAI: ${responseText.substring(0, 200)}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Unexpected response format from OpenAI API');
    }

    const content = data.choices[0].message.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    // Parse the JSON response
    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse JSON from AI response: ${content.substring(0, 200)}`);
    }
    
    // Normalize the data
    return normalizeAIData(extracted);
  } catch (error) {
    throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert image File or string to base64
 * Works in both Node.js (server) and browser environments
 */
async function imageToBase64(image: File | string): Promise<string> {
  if (typeof image === 'string') {
    // If it's already a data URL, extract the base64 part
    if (image.startsWith('data:')) {
      return image.split(',')[1];
    }
    // If it's a URL, fetch it
    const response = await fetch(image);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } else {
    // It's a File object - convert to Buffer in Node.js
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  }
}

/**
 * Normalize AI-extracted data to match our interface
 */
function normalizeAIData(data: Record<string, unknown>): AIExtractedData {
  // Parse rawKeyValuePairs if present
  let rawPairs: Array<{ key: string; value: string; source?: 'front' | 'back' }> = [];
  if (data.rawKeyValuePairs && Array.isArray(data.rawKeyValuePairs)) {
    rawPairs = data.rawKeyValuePairs.map((pair: any) => ({
      key: String(pair.key || ''),
      value: String(pair.value || ''),
      source: pair.source === 'front' || pair.source === 'back' ? pair.source : undefined
    }));
  }

  // Parse fieldSources
  const fieldSources = data.fieldSources as Record<string, 'front' | 'back'> | undefined;

  return {
    name: data.name || undefined,
    variety: data.variety || undefined,
    latinName: data.latinName || undefined,
    brand: data.brand || undefined,
    year: typeof data.year === 'number' ? data.year : (data.year ? parseInt(String(data.year)) : undefined),
    quantity: data.quantity || undefined,
    daysToGermination: data.daysToGermination || undefined,
    daysToMaturity: data.daysToMaturity || undefined,
    plantingDepth: data.plantingDepth || undefined,
    spacing: data.spacing || undefined,
    sunRequirement: normalizeSunRequirement(data.sunRequirement),
    plantingInstructions: data.plantingInstructions || undefined,
    summary: data.summary || undefined,
    additionalNotes: data.additionalNotes || undefined,
    rawKeyValuePairs: rawPairs.length > 0 ? rawPairs : undefined,
    fieldSources: fieldSources,
    confidence: 0.9, // AI extraction is generally high confidence
  };
}

/**
 * Normalize sun requirement to our enum values
 */
function normalizeSunRequirement(sun?: string): 'full-sun' | 'partial-shade' | 'full-shade' | undefined {
  if (!sun) return undefined;
  const lower = sun.toLowerCase();
  if (lower.includes('full sun') || lower === 'sun') return 'full-sun';
  if (lower.includes('partial') || lower.includes('part shade')) return 'partial-shade';
  if (lower.includes('full shade') || lower === 'shade') return 'full-shade';
  return undefined;
}

