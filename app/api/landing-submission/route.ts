import { NextRequest, NextResponse } from 'next/server';
import { submitLandingPageResponse, LandingPageSubmission } from '@/lib/notion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { experiment, email, name, optedIn, optOutReason, source, ...customFields } = body;
    
    if (!experiment || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: experiment, email' },
        { status: 400 }
      );
    }
    
    const databaseId = process.env.NOTION_LANDING_DATABASE_ID;
    
    if (!databaseId) {
      return NextResponse.json(
        { error: 'Notion database ID not configured' },
        { status: 500 }
      );
    }
    
    // Build notes from name and any custom fields
    const notesArray: string[] = [];
    if (name) {
      notesArray.push(`Name: ${name}`);
    }
    // Add any custom fields to notes (seedCount, challenge, etc.)
    Object.entries(customFields).forEach(([key, value]) => {
      if (value && key !== 'experiment' && key !== 'email' && key !== 'source' && key !== 'optedIn') {
        const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
        notesArray.push(`${key}: ${formattedValue}`);
      }
    });
    
    const submission: LandingPageSubmission = {
      experiment,
      email,
      optedIn: optedIn ?? true,
      optOutReason,
      source: source || 'landing-page',
      notes: notesArray.join('\n'),
    };
    
    const response = await submitLandingPageResponse(databaseId, submission);
    
    return NextResponse.json({ success: true, pageId: response.id });
  } catch (error) {
    console.error('Error submitting landing page response:', error);
    return NextResponse.json(
      { error: 'Failed to submit response' },
      { status: 500 }
    );
  }
}
