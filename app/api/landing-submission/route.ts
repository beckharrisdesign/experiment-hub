import { NextRequest, NextResponse } from 'next/server';
import { submitLandingPageResponse, LandingPageSubmission } from '@/lib/notion';

const CORS_ORIGIN = process.env.LANDING_CORS_ORIGIN || '*';

function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

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
      return withCors(NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      ));
    }
    
    const databaseId = process.env.NOTION_LANDING_DATABASE_ID;
    
    if (!databaseId) {
      return withCors(NextResponse.json(
        { error: 'Notion database ID not configured' },
        { status: 500 }
      ));
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
    return withCors(NextResponse.json({ success: true, pageId: response.id }));
  } catch (error: any) {
    console.error('Error submitting landing page response:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    const res = NextResponse.json(
      { error: 'Failed to submit response', details: error?.message || String(error) },
      { status: 500 }
    );
    return withCors(res);
  }
}
