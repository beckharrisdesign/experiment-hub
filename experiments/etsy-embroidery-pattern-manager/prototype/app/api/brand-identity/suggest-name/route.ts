import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visualStyle, brandTone } = body;

    const prompt = `Generate 5 creative store name suggestions for an embroidery pattern Etsy store. 
    Visual style: ${visualStyle || 'not specified'}
    Brand tone: ${brandTone || 'not specified'}
    
    Return only a JSON array of 5 store name strings, nothing else.`;

    const response = await generateContent(prompt);
    
    // Try to parse JSON array from response
    let suggestions: string[] = [];
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = response.match(/\[.*\]/s);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by lines and clean up
        suggestions = response
          .split('\n')
          .map((line) => line.replace(/[^a-zA-Z0-9\s-]/g, '').trim())
          .filter((line) => line.length > 0)
          .slice(0, 5);
      }
    } catch (e) {
      // Fallback suggestions
      suggestions = [
        'Stitch & Pattern',
        'Embroidery Dreams',
        'Thread & Design',
        'Pattern Play',
        'Stitch Craft',
      ];
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating store name suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions', suggestions: [] },
      { status: 500 }
    );
  }
}

