import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * API route to extract a region from an image where a field is located
 * POST /api/packet/extract-region
 * 
 * Body: {
 *   fieldName: string,
 *   fieldValue: string,
 *   sourceImage: 'front' | 'back',
 *   imageBase64: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`ai:${user.id}`, { windowMs: 60_000, max: 30 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Please wait a moment before trying again.' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : {} }
      );
    }

    const body = await request.json();
    const { fieldName, fieldValue, sourceImage, imageBase64 } = body;

    if (!fieldName || !fieldValue || !sourceImage || !imageBase64) {
      return NextResponse.json(
        { error: 'fieldName, fieldValue, sourceImage, and imageBase64 are required' },
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

    // Ask OpenAI to identify the region where this field is located
    const regionPrompt = `Look at this seed packet image and identify the approximate region where the field "${fieldName}" with value "${fieldValue}" is located.

Return the bounding box coordinates as a percentage of the image dimensions (0-100) in JSON format:
{
  "x": number (left edge as percentage),
  "y": number (top edge as percentage),
  "width": number (width as percentage),
  "height": number (height as percentage)
}

Include some padding around the text (about 5-10% on each side) to show context.`;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: regionPrompt
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
        max_tokens: 200,
        response_format: { type: 'json_object' },
        temperature: 0.1
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

    let coordinates;
    try {
      coordinates = JSON.parse(content);
    } catch (e) {
      return NextResponse.json(
        { error: `Failed to parse coordinates: ${content.substring(0, 200)}` },
        { status: 500 }
      );
    }

    // Return coordinates - the client will crop the image
    return NextResponse.json({
      success: true,
      coordinates: coordinates
    });
  } catch (error) {
    console.error('Error extracting region:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract region',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
