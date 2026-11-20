import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/pdf-documents";
import { discardPdfEdits } from "@/lib/pdf-commit";

/**
 * Put every staged field back to what the file says. Writes nothing to Drive,
 * and history keeps both the edits and their reversal.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const document = await discardPdfEdits(id);
    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Failed to discard PDF edits:", error);
    return NextResponse.json({ error: "Could not discard the edits" }, { status: 500 });
  }
}
