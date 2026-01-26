import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple test endpoint to verify OpenAI API authentication
 * GET /api/test-auth
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'OPENAI_API_KEY environment variable is not set',
          keyPresent: false
        },
        { status: 500 }
      );
    }

    // Make a minimal API call to test authentication
    // Using the models endpoint which is lightweight
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = JSON.parse(responseText);
        errorMessage = error.error?.message || error.message || JSON.stringify(error);
      } catch (e) {
        errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
      }
      
      return NextResponse.json({
        success: false,
        error: `OpenAI API error: ${errorMessage}`,
        status: response.status,
        keyPresent: true,
        keyPrefix: apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4)
      }, { status: response.status });
    }

    // Parse the models list
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON response from OpenAI',
        keyPresent: true
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication successful!',
      keyPresent: true,
      keyPrefix: apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4),
      modelCount: data.data?.length || 0,
      sampleModels: data.data?.slice(0, 3).map((m: any) => m.id) || []
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      keyPresent: !!process.env.OPENAI_API_KEY
    }, { status: 500 });
  }
}
