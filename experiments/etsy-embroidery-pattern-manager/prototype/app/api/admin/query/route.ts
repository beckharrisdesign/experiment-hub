import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Only allow SELECT queries for safety
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return NextResponse.json(
        { error: 'Only SELECT queries are allowed' },
        { status: 400 }
      );
    }

    try {
      const result = db.prepare(query).all() as any[];

      if (result.length === 0) {
        return NextResponse.json({
          columns: [],
          rows: [],
          message: 'Query executed successfully, no results',
        });
      }

      // Extract column names from first row
      const columns = Object.keys(result[0]);
      const rows = result.map((row) => columns.map((col) => row[col]));

      return NextResponse.json({
        columns,
        rows,
      });
    } catch (dbError: any) {
      return NextResponse.json(
        { error: dbError.message || 'Query execution failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json(
      { error: 'Failed to execute query' },
      { status: 500 }
    );
  }
}

