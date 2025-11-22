import OpenAI from 'openai';

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Lazy initialization - only create client when needed
let openaiInstance: OpenAI | null = null;

function getOpenAI() {
  if (!openaiInstance) {
    openaiInstance = getOpenAIClient();
  }
  return openaiInstance;
}

// Export a proxy that only initializes when accessed
export const openai = {
  get chat() {
    return getOpenAI().chat;
  },
} as OpenAI;

export async function generateContent(
  prompt: string, 
  systemPrompt?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' };
  }
): Promise<string> {
  // Check for API key before attempting to use OpenAI
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables. OpenAI integration is not available.');
  }
  
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2000, // Increased for more comprehensive responses
    ...(options?.responseFormat ? { response_format: options.responseFormat } : {}),
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Analyze an image and generate a description using the listing agent approach
 * @param imagePath - Absolute path to the image file
 * @returns Generated description of the image
 */
export async function analyzeImage(imagePath: string): Promise<string> {
  // Check for API key before attempting to use OpenAI
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables. OpenAI integration is not available.');
  }

  const openai = getOpenAI();
  const fs = require('fs');
  const path = require('path');
  
  // Read and encode image
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  // Determine image MIME type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const mimeType = mimeTypes[ext] || 'image/png';

  // Use the listing agent's approach to analyze the image
  const systemPrompt = `You are an expert at analyzing embroidery patterns and craft designs. Your role is to observe images and provide detailed, useful descriptions that help users understand the pattern's characteristics, style, and potential uses.

Key responsibilities:
1. Analyze the visual elements of embroidery patterns and craft designs
2. Identify key features: style, complexity, subject matter, color schemes
3. Suggest appropriate categories, difficulty levels, and use cases
4. Provide clear, descriptive text that captures the essence of the design

Guidelines:
- Be specific about what you see (floral motifs, geometric patterns, text, etc.)
- Note the style (modern, vintage, minimalist, whimsical, etc.)
- Assess complexity/difficulty level if apparent
- Suggest appropriate categories
- Describe the overall aesthetic and mood
- Note any distinctive features or techniques visible

Return a clear, concise description that would be useful for someone creating a pattern listing.`;

  const userPrompt = `Analyze this embroidery pattern image and provide a detailed description. Include:
- What the pattern depicts (subject matter, motifs, design elements)
- Style and aesthetic (modern, vintage, botanical, geometric, etc.)
- Complexity assessment (if visible)
- Suggested category
- Notable features or techniques
- Overall description suitable for a pattern listing

Be specific and descriptive, focusing on details that would help someone understand and market this pattern.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('[OpenAI Image Analysis] Error analyzing image:', error);
    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

