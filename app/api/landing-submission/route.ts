import { NextRequest, NextResponse } from 'next/server';
import { submitLandingPageResponse, LandingPageSubmission } from '@/lib/notion';

const CORS_ORIGIN = process.env.LANDING_CORS_ORIGIN || 'null';

/** Derive env key from experiment name: "Best Day Ever" → NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER */
function getDatabaseIdEnvKey(experiment: string): string {
  const slug = (experiment || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
  return slug ? `NOTION_LANDING_DATABASE_ID_${slug}` : 'NOTION_LANDING_DATABASE_ID';
}

/** Resolve Notion database ID for this experiment: per-experiment env first, then root fallback. */
function getDatabaseIdForExperiment(experiment: string): { databaseId: string | undefined; envKey: string } {
  const key = getDatabaseIdEnvKey(experiment);
  const perExperiment = process.env[key];
  if (perExperiment) {
    return { databaseId: perExperiment, envKey: key };
  }
  const fallback = process.env.NOTION_LANDING_DATABASE_ID;
  if (fallback) {
    return { databaseId: fallback, envKey: 'NOTION_LANDING_DATABASE_ID' };
  }
  return { databaseId: undefined, envKey: key };
}

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
    
    const { databaseId, envKey } = getDatabaseIdForExperiment(experiment || '');
    
    if (!databaseId) {
      return withCors(NextResponse.json(
        {
          error: 'Notion database ID not configured for this experiment',
          details: `Set ${getDatabaseIdEnvKey(experiment || '')} or NOTION_LANDING_DATABASE_ID in the hub environment.`,
        },
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
    return withCors(NextResponse.json({
      success: true,
      pageId: response.id,
      target: process.env.NODE_ENV !== 'production' ? envKey : undefined,
    }));
  } catch (error: any) {
    console.error('Error submitting landing page response:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    // Surface Notion API errors (e.g. object_not_found, database doesn't exist or not shared)
    const notionCode = error?.body?.code ?? error?.code;
    const notionMessage = error?.body?.message ?? error?.message;
    const details =
      notionCode && notionMessage
        ? `[${notionCode}] ${notionMessage}`
        : notionMessage || String(error);

    const res = NextResponse.json(
      {
        error: 'Failed to submit response',
        details,
        debug: process.env.NODE_ENV !== 'production' ? { notionCode: notionCode ?? null } : undefined,
      },
      { status: 500 }
    );
    return withCors(res);
  }
}
