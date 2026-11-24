import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  DriveWriteRefused,
} from "@/lib/pdf-drive";
import { PdfNotWritable } from "@/lib/pdf-embedded";
import {
  AlreadySplit,
  InvalidSplit,
  SplitConflict,
  SplitNotRecorded,
  splitPdfDocument,
  type SplitOptions,
} from "@/lib/pdf-split";

/**
 * Split a document after the given pages (tasks 7b.2, 7b.3, 7g). Body:
 * `{ breaks: number[], parts?: { title, filename }[], copy?: { subject, author,
 * keywords } }`. Each break is "split after this page"; `parts` names each file
 * in order, and `copy` says what they take from the scan. Every refusal before
 * the record step leaves Drive and the database as they were.
 */

// A download, N uploads and the record step for a scanned PDF.
export const maxDuration = 60;

function parseBreaks(body: unknown): number[] | null {
  const breaks = (body as { breaks?: unknown } | null)?.breaks;
  if (!Array.isArray(breaks) || breaks.length === 0) return null;
  if (!breaks.every((b) => Number.isInteger(b))) return null;
  return breaks as number[];
}

const MAX_TITLE = 1000;
const MAX_FILENAME = 255;

/** Null when the request's naming isn't well formed. */
function parseOptions(body: unknown): SplitOptions | null {
  const { parts, copy } = (body ?? {}) as { parts?: unknown; copy?: unknown };
  const options: SplitOptions = {};
  if (parts !== undefined) {
    if (!Array.isArray(parts)) return null;
    options.parts = [];
    for (const part of parts) {
      const { title, filename } = (part ?? {}) as { title?: unknown; filename?: unknown };
      if (title !== null && (typeof title !== "string" || title.length > MAX_TITLE)) return null;
      if (typeof filename !== "string" || filename.length > MAX_FILENAME) return null;
      options.parts.push({ title: title?.trim() || null, filename });
    }
  }
  if (copy !== undefined) {
    if (!copy || typeof copy !== "object") return null;
    options.copy = {};
    for (const field of ["subject", "author", "keywords"] as const) {
      const value = (copy as Record<string, unknown>)[field];
      if (value === undefined) continue;
      if (typeof value !== "boolean") return null;
      options.copy[field] = value;
    }
  }
  return options;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const breaks = parseBreaks(body);
  if (!breaks) {
    return NextResponse.json({ error: "Choose at least one place to split." }, { status: 400 });
  }

  const options = parseOptions(body);
  if (!options) {
    return NextResponse.json({ error: "Those names can't be used. Nothing was created." }, { status: 400 });
  }

  try {
    const result = await splitPdfDocument(id, breaks, options);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof InvalidSplit) {
      return NextResponse.json({ error: `${error.message}.` }, { status: 400 });
    }
    if (error instanceof AlreadySplit) {
      return NextResponse.json({ error: "This document was already split." }, { status: 409 });
    }
    if (error instanceof SplitConflict) {
      return NextResponse.json(
        { error: "Not split: the file changed in Drive. Nothing was created.", conflict: true },
        { status: 409 },
      );
    }
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "Drive access needs re-authorizing. Nothing was created.", reauthorize: true },
        { status: 409 },
      );
    }
    if (error instanceof DriveFileMissing) {
      return NextResponse.json({ error: "This file is no longer in Google Drive." }, { status: 410 });
    }
    if (error instanceof PdfNotWritable) {
      return NextResponse.json({ error: `${error.message}.` }, { status: 422 });
    }
    if (error instanceof DriveWriteRefused) {
      return NextResponse.json(
        { error: "Drive refused to create the new files. Nothing was left behind." },
        { status: 502 },
      );
    }
    if (error instanceof SplitNotRecorded) {
      return NextResponse.json(
        {
          error:
            "The new files are in Drive, but this page couldn't record the split. Reload before splitting again.",
        },
        { status: 500 },
      );
    }
    console.error("pdf split: failed:", error);
    return NextResponse.json({ error: "Not split. Nothing was left behind. Try again." }, { status: 502 });
  }
}
