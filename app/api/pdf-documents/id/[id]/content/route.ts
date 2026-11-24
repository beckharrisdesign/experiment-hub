import { NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  getDriveHeadRevisionId,
  getValidAccessToken,
  openDriveFile,
} from "@/lib/pdf-drive";

/**
 * A document's bytes, proxied from Drive through the session. Task 6.4.
 *
 * Gated by `middleware.ts`. The browser never receives a Drive URL or token —
 * this route is the only way bytes reach it, so revoking the session revokes
 * the preview too.
 *
 * pdf.js fetches it to draw the detail preview and the splitter's pages
 * (task 7c.3); "Open full size" opens it in a tab of its own. It was once
 * framed by the detail page, which is why `next.config.js` still gives
 * `/api/pdf-documents/*` `frame-ancestors 'self'` rather than the hub-wide
 * `'none'`; nothing frames it now.
 */
/** One range of the form pdf.js asks for; anything else gets the whole file. */
const SINGLE_RANGE = /^bytes=\d+-\d*$/;

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

  // The preview asks for byte ranges, so a large scan's first page can be
  // drawn without downloading the rest (task 7c.3).
  const asked = request.headers.get("range");
  const range = asked && SINGLE_RANGE.test(asked) ? asked : null;

  let file: Response;
  try {
    const accessToken = await getValidAccessToken();
    // Drive serves a trashed file's bytes; the revision read is what says it
    // is gone (DriveFileMissing). The two run side by side, and a file found
    // gone is never sent: its download is cancelled before a byte passes on.
    const [revision, download] = await Promise.allSettled([
      getDriveHeadRevisionId(accessToken, document.driveFileId),
      openDriveFile(accessToken, document.driveFileId, range ?? undefined),
    ]);
    if (revision.status === "rejected") {
      if (download.status === "fulfilled") await download.value.body?.cancel();
      throw revision.reason;
    }
    if (download.status === "rejected") throw download.reason;
    file = download.value;
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
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
    // Personal documents: never stored by a shared cache, and not by the
    // browser's disk cache either.
    "Cache-Control": "private, no-store",
  };
  headers["Accept-Ranges"] = "bytes";
  const length = file.headers.get("content-length");
  if (length) headers["Content-Length"] = length;
  const contentRange = file.headers.get("content-range");
  const partial = file.status === 206 && contentRange !== null;
  if (partial) headers["Content-Range"] = contentRange;
  // Passed through as it arrives: the preview starts before the file is whole.
  return new NextResponse(file.body, { status: partial ? 206 : 200, headers });
}
