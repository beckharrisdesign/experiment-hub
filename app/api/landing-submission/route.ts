import { NextRequest, NextResponse } from 'next/server';
import { submitLandingPageResponse, LandingPageSubmission } from '@/lib/notion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { experimentId, experimentName, email, optedIn, optOutReason, source, notes } = body;
    
    if (!experimentId || !experimentName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: experimentId, experimentName, email' },
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
    
    const submission: LandingPageSubmission = {
      experimentId,
      experimentName,
      email,
      optedIn: optedIn ?? true,
      optOutReason,
      source,
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
