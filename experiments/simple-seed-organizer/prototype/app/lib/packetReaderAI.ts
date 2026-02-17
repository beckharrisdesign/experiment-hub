/**
 * AI-Powered Seed Packet Reader using OpenAI Vision API
 * 
 * This module uses OpenAI's vision capabilities to extract structured
 * information from seed packet images with better accuracy than OCR alone.
 */

import { ExtractedSeedData } from './packetReader';

export interface AIExtractedData extends ExtractedSeedData {
  description?: string;
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
          text: `You are a TEXT EXTRACTION TOOL. Your ONLY job is to copy text EXACTLY as it appears on the seed packet images. You are NOT allowed to modify, combine, paraphrase, summarize, or interpret ANY text.

CRITICAL: The first image is the FRONT of the packet, the second image (if provided) is the BACK of the packet.

IMPORTANT: Look for text in ALL orientations - horizontal, vertical, sideways, rotated, or at any angle. Text may appear along edges, in margins, or rotated 90/180 degrees. Extract ALL visible text regardless of orientation.

SPECIFIC EXAMPLE OF THE ERROR TO AVOID:
If you see on the packet:
- "or direct-seed after last frost in ordinary garden soil."
- And separately: "Sow in ordinary garden soil."

WRONG (DO NOT DO THIS): "or direct-seed after last frost in ordinary garden soil. Sow in ordinary garden soil."
CORRECT: Extract the text exactly as it appears. If "Sow in ordinary garden soil." appears as a separate sentence elsewhere, do NOT append it to the first sentence. Extract only what you see in the planting instructions section, exactly as written.

Extract these specific fields if present:
- name (common plant name)
- variety (cultivar/variety name)
- latinName (scientific name - extract EXACT text as written, e.g., "Tagetes erecta", "Lycopersicon esculentum", etc. Do NOT add parentheses, italics, or change capitalization)
- brand (seed company name)
- year (packed for year, as number)
- quantity (number of seeds)
- daysToGermination (e.g., "7-14 days" - may appear as "Sprouts in" with a value)
- daysToMaturity (e.g., "70-80 days")
- plantingDepth (e.g., "1/4 inch" - may appear as "seed depth" with a value, possibly rotated/sideways)
- spacing (e.g., "12-18 inches")
- sunRequirement (extract EXACT text as written, e.g., "Min full sun", "Full sun", "Partial shade", "Full shade", etc. - do NOT normalize or change the wording)
- description (intro text, major description, or marketing copy about the plant - may appear on the FRONT or BACK of the packet. Look for prominent descriptive paragraphs on BOTH sides. Extract EXACT text as written, word-for-word, from whichever side it appears on)
- plantingInstructions (CRITICAL: Find the planting instructions section on the packet. Extract ONLY the text that appears in that specific section, word-for-word, character-for-character. Do NOT look for related text elsewhere on the packet and combine it. Extract ONLY what is in the planting instructions area.)

Look for common sideways/rotated labels such as:
- "Sprouts in" (may be rotated)
- "Ideal temp" or "Ideal temperature" (may be rotated)
- "seed depth" or "Seed depth" (may be rotated)
- Any text along edges or margins that may be at an angle

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
  "sunRequirement": "exact text as written on packet or null",
  "description": "exact text or null",
  "plantingInstructions": "exact text or null",
  "fieldSources": {
    "name": "front" | "back",
    "variety": "front" | "back",
    ... (include source for each field that has a value)
  },
  "rawKeyValuePairs": [{"key": "label text", "value": "value text", "source": "front" | "back"}, ...]
}

ABSOLUTE RULES - NO EXCEPTIONS:
1. Scan the ENTIRE image for text in ALL orientations - horizontal, vertical, sideways, rotated, or at any angle
2. Look for text along edges, in margins, and in all areas of the packet, not just the main body
3. For description: Check BOTH the front AND back images for intro text, major descriptions, or marketing copy. Extract from whichever side it appears on (or both if present on both sides - extract each separately).
4. For plantingInstructions: Locate the planting instructions section on the packet. Extract ONLY the text that appears within that specific section's boundaries. Do NOT search for related text elsewhere.
4. Copy text CHARACTER-BY-CHARACTER exactly as it appears, regardless of orientation
5. Do NOT combine separate sentences, even if they seem related
6. Do NOT append text from one location to text from another location
7. Do NOT paraphrase or reword anything - you are a copy machine, not a writer
8. Do NOT add words that are not visible on the packet
9. Preserve ALL punctuation, capitalization, spacing, and line breaks exactly as they appear
10. If text appears in multiple locations, extract each occurrence separately in rawKeyValuePairs with its specific source
11. If a field is not visible, use null
12. You are OCR software - you copy what you see in any orientation, you do not interpret, improve, or combine text from different locations`
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
        model: 'gpt-4o', // Using gpt-4o for better instruction following on exact text extraction
        messages: messages,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        temperature: 0.0 // Zero temperature for maximum determinism and exact text extraction
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

  const str = (v: unknown) => (typeof v === 'string' && v) || undefined;
  return {
    name: str(data.name),
    variety: str(data.variety),
    latinName: str(data.latinName),
    brand: str(data.brand),
    year: typeof data.year === 'number' ? data.year : (data.year ? parseInt(String(data.year)) : undefined),
    quantity: str(data.quantity),
    daysToGermination: str(data.daysToGermination),
    daysToMaturity: str(data.daysToMaturity),
    plantingDepth: str(data.plantingDepth),
    spacing: str(data.spacing),
    sunRequirement: str(data.sunRequirement),
    description: str(data.description),
    plantingInstructions: str(data.plantingInstructions),
    summary: str(data.summary),
    additionalNotes: str(data.additionalNotes),
    rawKeyValuePairs: rawPairs.length > 0 ? rawPairs : undefined,
    fieldSources: fieldSources,
    confidence: 0.9, // AI extraction is generally high confidence
  };
}

// Removed normalizeSunRequirement - we now preserve exact text as written on the packet

/**
 * Extract from a single image (front or back only). All extracted fields are tagged with the given source.
 * Use this for parallel extraction - call once per image.
 */
export async function extractSingleImageWithAI(
  image: File | string,
  side: 'front' | 'back',
  apiKey?: string
): Promise<AIExtractedData> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY must be provided as parameter or set as environment variable');
  }

  const imageBase64 = await imageToBase64(image);
  const sideLabel = side === 'front' ? 'FRONT' : 'BACK';

  const prompt = `You are a TEXT EXTRACTION TOOL. Your ONLY job is to copy text EXACTLY as it appears on the seed packet image. You are NOT allowed to modify, combine, paraphrase, summarize, or interpret ANY text.

CRITICAL: This image is the ${sideLabel} of the packet ONLY. Tag ALL extracted fields with "source": "${side}" in fieldSources and rawKeyValuePairs.

IMPORTANT: Look for text in ALL orientations - horizontal, vertical, sideways, rotated, or at any angle. Text may appear along edges, in margins, or rotated 90/180 degrees. Extract ALL visible text regardless of orientation.

Extract these specific fields if present:
- name (common plant name)
- variety (cultivar/variety name)
- latinName (scientific name - extract EXACT text as written)
- brand (seed company name)
- year (packed for year, as number)
- quantity (number of seeds)
- daysToGermination (e.g., "7-14 days")
- daysToMaturity (e.g., "70-80 days")
- plantingDepth (e.g., "1/4 inch")
- spacing (e.g., "12-18 inches")
- sunRequirement (extract EXACT text as written)
- description (intro text, major description)
- plantingInstructions (text in the planting instructions section only)

Additionally, extract ALL other key-value pairs in "rawKeyValuePairs" with source: "${side}".

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
  "sunRequirement": "exact text or null",
  "description": "exact text or null",
  "plantingInstructions": "exact text or null",
  "fieldSources": { "name": "${side}", "variety": "${side}", ... },
  "rawKeyValuePairs": [{"key": "...", "value": "...", "source": "${side}"}, ...]
}

Copy text CHARACTER-BY-CHARACTER exactly as it appears. If a field is not visible, use null.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      temperature: 0.0,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    let errorMessage = 'Unknown error';
    try {
      const error = JSON.parse(responseText);
      errorMessage = error.error?.message || error.message || JSON.stringify(error);
    } catch {
      errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(`OpenAI API error: ${errorMessage}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid JSON response from OpenAI: ${responseText.substring(0, 200)}`);
  }

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('No content in OpenAI response');
  }

  let extracted: Record<string, unknown>;
  try {
    extracted = JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error(`Failed to parse JSON from AI response: ${data.choices[0].message.content.substring(0, 200)}`);
  }

  // Ensure all fieldSources and rawKeyValuePairs use the correct side
  const fieldSources: Record<string, 'front' | 'back'> = {};
  for (const [k, v] of Object.entries(extracted)) {
    if (k !== 'rawKeyValuePairs' && k !== 'fieldSources' && v != null && v !== '') {
      fieldSources[k] = side;
    }
  }
  if (extracted.fieldSources && typeof extracted.fieldSources === 'object') {
    Object.assign(fieldSources, extracted.fieldSources);
  }
  extracted.fieldSources = fieldSources;

  if (Array.isArray(extracted.rawKeyValuePairs)) {
    extracted.rawKeyValuePairs = extracted.rawKeyValuePairs.map((p: any) => ({
      ...p,
      source: side,
    }));
  }

  return normalizeAIData(extracted);
}

