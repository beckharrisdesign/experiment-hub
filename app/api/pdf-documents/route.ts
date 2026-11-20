import { NextResponse } from "next/server";
import { listPdfDocuments } from "@/lib/pdf-documents";
import { getDriveConnection } from "@/lib/pdf-drive";

/**
 * List documents for the dashboard.
 *
 * No auth guard here on purpose: `middleware.ts` gates every `/api/pdf-*` path
 * and returns before this handler runs, which is what makes "refused before any
 * storage, database, or third-party call" true structurally rather than by each
 * handler remembering to check.
 *
 * Serves entirely from Postgres. Nothing here touches Drive. Lists the chosen
 * folder's documents, the same set the dashboard shows.
 */
export async function GET() {
  try {
    const { folder } = await getDriveConnection();
    const documents = await listPdfDocuments(folder?.id ?? null);
    return NextResponse.json({
      success: true,
      documents,
      total: documents.length,
    });
  } catch (error) {
    console.error("Failed to list PDF documents:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 },
    );
  }
}
