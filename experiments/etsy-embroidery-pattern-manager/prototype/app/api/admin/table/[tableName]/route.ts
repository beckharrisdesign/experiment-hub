import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableName: string }> | { tableName: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const tableName = resolvedParams.tableName;
    
    // Sanitize table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      );
    }

    // Get column names
    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((row: any) => row.name);

    // Get all rows
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all() as any[];

    // Convert rows to arrays
    const rowArrays = rows.map((row) => columns.map((col) => row[col]));

    return NextResponse.json({
      tableName,
      columns,
      rows: rowArrays,
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}

