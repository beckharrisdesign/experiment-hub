import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to analyze why a field extraction might be poor quality
 * POST /api/packet/analyze-quality
 * 
 * Body: {
 *   fieldName: string,
 *   extractedValue: string,
 *   sourceImage: 'front' | 'back',
 *   frontImageBase64?: string,
 *   backImageBase64?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fieldName, extractedValue, sourceImage, frontImageBase64, backImageBase64 } = body;

    if (!fieldName || !extractedValue || !sourceImage) {
      return NextResponse.json(
        { error: 'fieldName, extractedValue, and sourceImage are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    // Determine which image to use
    const imageBase64 = sourceImage === 'front' ? frontImageBase64 : backImageBase64;
    if (!imageBase64) {
      return NextResponse.json(
        { error: `Image for ${sourceImage} side is required` },
        { status: 400 }
      );
    }

    // Build the analysis prompt
    const analysisPrompt = `You are analyzing why a seed packet data extraction might be inaccurate.

FIELD BEING ANALYZED: "${fieldName}"
EXTRACTED VALUE: "${extractedValue}"
IMAGE SIDE: ${sourceImage === 'front' ? 'FRONT' : 'BACK'}

Please analyze the image and identify:
1. What is the actual correct value for this field on the packet?
2. Why might the extraction have been inaccurate? (e.g., text too small, poor contrast, ambiguous formatting, OCR confusion, wrong field identified)
3. What specific improvements to the extraction prompt would help get the correct value?
4. Is the field clearly visible and readable in the image?

Return your analysis as JSON:
{
  "actualValue": "what the field actually says (or null if not visible)",
  "issues": ["list of specific problems identified"],
  "promptImprovements": ["specific suggestions for improving the extraction prompt"],
  "visibility": "clear" | "unclear" | "not-visible",
  "confidence": number between 0 and 1
}`;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: analysisPrompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`
            }
          }
        ]
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { error: 'No content in OpenAI response' },
        { status: 500 }
      );
    }

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      return NextResponse.json(
        { error: `Failed to parse analysis: ${content.substring(0, 200)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error analyzing extraction quality:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze extraction quality',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
