import { NextRequest, NextResponse } from "next/server";
import {
  DriveFolderNotFound,
  DriveReauthorizationRequired,
  getDriveFolder,
  getValidAccessToken,
  listPdfsInFolder,
} from "@/lib/pdf-drive";
import { getPdfAdminClient } from "@/lib/pdf-documents";

/**
 * Make a folder the one the archive shows, and import its PDFs as references.
 *
 * Copies no bytes. A row records where a document lives and what Drive's
 * listing says about it; the PDF itself stays in Drive. Choosing a folder again
 * (the same one, or a different one) runs this again: new PDFs are added, and
 * existing documents keep their staged edits and baseline (migration 026).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const folderId =
    typeof body === "object" && body !== null
      ? (body as { folderId?: unknown }).folderId
      : undefined;

  if (typeof folderId !== "string" || !folderId.trim()) {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 });
  }

  let folder;
  let files;
  try {
    const accessToken = await getValidAccessToken();
    folder = await getDriveFolder(accessToken, folderId);
    files = await listPdfsInFolder(accessToken, folder.id);
  } catch (error) {
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        // Human-readable: FolderPicker renders `error` straight into its status
        // line. The 409 remains the machine-readable signal.
        { error: "Drive access needs re-authorizing. Sign in again." },
        { status: 409 },
      );
    }
    if (error instanceof DriveFolderNotFound) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("pdf-drive import: could not list folder:", error);
    return NextResponse.json(
      { error: "Could not read that folder from Drive" },
      { status: 502 },
    );
  }

  // One transaction: record the folder, then add or refresh each reference
  // without touching staged edits or a captured baseline.
  const { data, error } = await getPdfAdminClient().rpc("pdf_import_folder", {
    folder_id: folder.id,
    folder_name: folder.name,
    files,
  });

  if (error) {
    console.error("pdf-drive import: could not store references:", error);
    return NextResponse.json(
      { error: "Could not store document references" },
      { status: 500 },
    );
  }

  const result = (data ?? {}) as { inserted?: number; total?: number };
  return NextResponse.json({
    success: true,
    folder,
    imported: result.total ?? files.length,
    added: result.inserted ?? 0,
    total: files.length,
  });
}
