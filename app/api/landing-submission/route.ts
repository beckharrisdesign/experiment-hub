import { NextRequest, NextResponse } from 'next/server';
import { submitLandingPageResponse, LandingPageSubmission } from '@/lib/notion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      experiment, 
      email, 
      name, 
      seedCount,
      challenges,
      optOut,
      optedIn, // Legacy field name - inverse of optOut
      optOutReason, 
      source,
      notes,
    } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
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
    
    // Handle legacy optedIn field (inverse of optOut)
    const isOptOut = optOut ?? (optedIn === false);
    
    const submission: LandingPageSubmission = {
      experiment: experiment || 'Unknown',
      email,
      name,
      seedCount,
      challenges,
      optOut: isOptOut,
      optOutReason,
      source: source || 'landing-page',
      notes,
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
