import { NextResponse } from "next/server";
import { listPdfDocuments } from "@/lib/pdf-documents";

/**
 * List documents for the dashboard.
 *
 * No auth guard here on purpose: `middleware.ts` gates every `/api/pdf-*` path
 * and returns before this handler runs, which is what makes "refused before any
 * storage, database, or third-party call" true structurally rather than by each
 * handler remembering to check.
 *
 * Serves entirely from Postgres. Nothing here touches Drive.
 */
export async function GET() {
  try {
    const documents = await listPdfDocuments();
    return NextResponse.json({ documents, total: documents.length });
  } catch (error) {
    console.error("Failed to list PDF documents:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 },
    );
  }
}
