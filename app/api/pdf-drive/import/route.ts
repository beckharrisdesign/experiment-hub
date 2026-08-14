import { NextRequest, NextResponse } from "next/server";
import {
  DriveReauthorizationRequired,
  getValidAccessToken,
  listPdfsInFolder,
} from "@/lib/pdf-drive";
import { getPdfAdminClient } from "@/lib/pdf-documents";

/**
 * Import a granted folder into reference rows.
 *
 * Copies no bytes. A row records where a document lives and what its metadata
 * currently is; the PDF itself stays in Drive.
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

  let files;
  try {
    const accessToken = await getValidAccessToken();
    files = await listPdfsInFolder(accessToken, folderId);
  } catch (error) {
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "reauthorize", message: error.message },
        { status: 409 },
      );
    }
    console.error("pdf-drive import: could not list folder:", error);
    return NextResponse.json(
      { error: "Could not read that folder from Drive" },
      { status: 502 },
    );
  }

  if (files.length === 0) {
    return NextResponse.json({
      success: true,
      imported: 0,
      skipped: 0,
      total: 0,
    });
  }

  // `drive_file_id` is unique, so re-importing a folder updates the reference
  // rather than duplicating the document. Metadata columns are deliberately not
  // overwritten here — a re-import must not clobber staged edits.
  const rows = files.map((f) => ({
    drive_file_id: f.id,
    filename: f.name,
    drive_head_revision_id: f.headRevisionId ?? null,
    file_snapshot: f.snapshot,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await getPdfAdminClient()
    .from("pdf_documents")
    .upsert(rows, { onConflict: "drive_file_id", ignoreDuplicates: false })
    .select("id");

  if (error) {
    console.error("pdf-drive import: could not store references:", error);
    return NextResponse.json(
      { error: "Could not store document references" },
      { status: 500 },
    );
  }

  // Same shape as the empty-folder branch above: a caller should not have to
  // discover which fields exist by checking whether the folder had anything in
  // it. `skipped` is what the upsert did not return a row for.
  const imported = data?.length ?? 0;
  return NextResponse.json({
    success: true,
    imported,
    skipped: files.length - imported,
    total: files.length,
  });
}
