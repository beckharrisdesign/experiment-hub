import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, seedCount, challenge } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!NOTION_DATABASE_ID) {
      console.error('NOTION_DATABASE_ID is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Prepare properties for Notion database
    const properties: any = {
      Email: {
        email: email,
      },
    };

    // Add name if provided
    if (name) {
      properties.Name = {
        rich_text: [
          {
            text: {
              content: name,
            },
          },
        ],
      };
    }

    // Add seed count if provided
    if (seedCount) {
      properties['Seed Count'] = {
        select: {
          name: seedCount,
        },
      };
    }

    // Add challenges if provided
    if (challenge && challenge.length > 0) {
      properties['Challenges'] = {
        multi_select: challenge.map((c: string) => ({ name: c })),
      };
    }

    // Add timestamp
    properties['Signed Up'] = {
      date: {
        start: new Date().toISOString(),
      },
    };

    // Create page in Notion database
    const response = await notion.pages.create({
      parent: {
        database_id: NOTION_DATABASE_ID,
      },
      properties,
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (error: any) {
    console.error('Error adding to Notion:', error);
    return NextResponse.json(
      { error: 'Failed to add to waitlist', details: error.message },
      { status: 500 }
    );
  }
}
