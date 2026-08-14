import { NextRequest, NextResponse } from "next/server";
import {
  getPdfDocumentHistory,
  isUuid,
  pdfDocumentExists,
} from "@/lib/pdf-documents";

/**
 * Field-level history for one document, newest first and uncapped.
 *
 * Existence is checked against rows including soft-deleted ones, because
 * history outlives the file: a deleted document still has a history worth
 * reading, and an empty array would otherwise be ambiguous between "no such
 * document" and "nothing recorded yet".
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    if (!(await pdfDocumentExists(id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const history = await getPdfDocumentHistory(id);
    return NextResponse.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error("Failed to load PDF document history:", error);
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 },
    );
  }
}
