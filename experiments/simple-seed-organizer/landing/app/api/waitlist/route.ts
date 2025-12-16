import { NextRequest, NextResponse } from 'next/server';

const HUB_API_URL = process.env.HUB_API_URL || 'http://localhost:5000';

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

    const notesContent: string[] = [];
    if (name) {
      notesContent.push(`Name: ${name}`);
    }
    if (seedCount) {
      notesContent.push(`Seed Count: ${seedCount}`);
    }
    if (challenge && challenge.length > 0) {
      notesContent.push(`Challenges: ${challenge.join(', ')}`);
    }

    const response = await fetch(`${HUB_API_URL}/api/landing-submission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        experimentId: 'simple-seed-organizer',
        experimentName: 'Simple Seed Organizer',
        email,
        optedIn: true,
        source: 'Landing Page',
        notes: notesContent.join('\n'),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Hub API error:', errorData);
      return NextResponse.json({ 
        success: true, 
        message: 'Thank you for your interest! We\'ll be in touch soon.',
      });
    }

    const result = await response.json();
    return NextResponse.json({ success: true, id: result.pageId });
  } catch (error: any) {
    console.error('Error submitting to hub:', error);
    return NextResponse.json({ 
      success: true, 
      message: 'Thank you for your interest! We\'ll be in touch soon.',
    });
  }
}
