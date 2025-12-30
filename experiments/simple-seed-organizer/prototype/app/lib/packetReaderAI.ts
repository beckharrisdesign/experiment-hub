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
          text: `Analyze these seed packet images and extract all available information in a structured format. 
          
Please extract:
1. **Seed Name** (common name, e.g., "Tomato", "Marigold")
2. **Variety/Cultivar** (specific variety name, e.g., "Cherry Tomato", "Orange Hawaiian")
3. **Latin/Scientific Name** (e.g., "Tagetes erecta", "Solanum lycopersicum")
4. **Brand** (seed company name)
5. **Year** (packed for year)
6. **Quantity** (number of seeds)
7. **Days to Germination** (e.g., "7-14 days")
8. **Days to Maturity** (e.g., "70-80 days")
9. **Planting Depth** (e.g., "1/4 inch", "0.5 cm")
10. **Spacing** (e.g., "12-18 inches", "30 cm")
11. **Sun Requirement** (full sun, partial shade, full shade)
12. **Planting Instructions** (detailed instructions from the packet)
13. **Summary/Description** (any summary or description text about the plant)
14. **Additional Notes** (any other relevant information)

Return the information as a JSON object with these exact field names:
{
  "name": "string or null",
  "variety": "string or null",
  "latinName": "string or null",
  "brand": "string or null",
  "year": "number or null",
  "quantity": "string or null",
  "daysToGermination": "string or null",
  "daysToMaturity": "string or null",
  "plantingDepth": "string or null",
  "spacing": "string or null",
  "sunRequirement": "string or null (one of: 'full-sun', 'partial-shade', 'full-shade')",
  "plantingInstructions": "string or null",
  "summary": "string or null",
  "additionalNotes": "string or null"
}

Be thorough and extract all information you can see, even if the text is partially obscured or unclear.`
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
        model: 'gpt-4o', // or 'gpt-4-vision-preview' if available
        messages: messages,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.message || JSON.stringify(error);
      } catch (e) {
        // If response is not JSON, try to get text
        const errorText = await response.text();
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      throw new Error(`Invalid JSON response from OpenAI: ${text.substring(0, 200)}`);
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
 */
async function imageToBase64(image: File | string): Promise<string> {
  if (typeof image === 'string') {
    // If it's already a data URL, extract the base64 part
    if (image.startsWith('data:')) {
      return image.split(',')[1];
    }
    // If it's a URL, fetch it
    const response = await fetch(image);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // It's a File object
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(image);
    });
  }
}

/**
 * Normalize AI-extracted data to match our interface
 */
function normalizeAIData(data: Record<string, unknown>): AIExtractedData {
  return {
    name: data.name || undefined,
    variety: data.variety || undefined,
    latinName: data.latinName || undefined,
    brand: data.brand || undefined,
    year: data.year ? parseInt(data.year) : undefined,
    quantity: data.quantity || undefined,
    daysToGermination: data.daysToGermination || undefined,
    daysToMaturity: data.daysToMaturity || undefined,
    plantingDepth: data.plantingDepth || undefined,
    spacing: data.spacing || undefined,
    sunRequirement: normalizeSunRequirement(data.sunRequirement),
    plantingInstructions: data.plantingInstructions || undefined,
    summary: data.summary || undefined,
    additionalNotes: data.additionalNotes || undefined,
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

