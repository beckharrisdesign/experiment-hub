import { NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  getDriveHeadRevisionId,
  getValidAccessToken,
} from "@/lib/pdf-drive";

/**
 * A document's bytes, proxied from Drive through the session. Task 6.4.
 *
 * Gated by `middleware.ts`. The browser never receives a Drive URL or token —
 * this route is the only way bytes reach it, so revoking the session revokes
 * the preview too.
 *
 * Framed by the detail page, so `next.config.js` gives `/api/pdf-documents/*`
 * `frame-ancestors 'self'` rather than the hub-wide `'none'`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let document;
  try {
    document = await getPdfDocument(id);
  } catch (error) {
    console.error("pdf content: could not load document:", error);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let bytes: ArrayBuffer;
  try {
    const accessToken = await getValidAccessToken();
    // Drive serves a trashed file's bytes; the revision read is what says it
    // is gone (DriveFileMissing), so it comes first.
    await getDriveHeadRevisionId(accessToken, document.driveFileId);
    bytes = await downloadDriveFile(accessToken, document.driveFileId);
  } catch (error) {
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "Drive access needs re-authorizing. Sign in again." },
        { status: 409 },
      );
    }
    if (error instanceof DriveFileMissing) {
      // 410, not 404: the document exists here, its file does not. Keeps a
      // broken reference distinguishable from a bad id (task 5.6).
      return NextResponse.json(
        { error: "This file is no longer in Google Drive" },
        { status: 410 },
      );
    }
    console.error("pdf content: Drive download failed:", error);
    return NextResponse.json(
      { error: "Could not read the file from Drive" },
      { status: 502 },
    );
  }

  // RFC 5987 form, because household filenames carry em dashes.
  const name = document.filename ?? "document.pdf";
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      // Personal documents: never stored by a shared cache, and not by the
      // browser's disk cache either.
      "Cache-Control": "private, no-store",
    },
  });
}
