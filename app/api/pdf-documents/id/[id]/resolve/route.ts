import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  DriveWriteRefused,
} from "@/lib/pdf-drive";
import { PdfNotWritable } from "@/lib/pdf-embedded";
import { CommitConflict, CommitNotRecorded } from "@/lib/pdf-commit";
import { CONFLICT_FIELDS, type Choices } from "@/lib/pdf-conflict";
import {
  ComparisonStale,
  SameDocumentUnconfirmed,
  UndecidedFields,
  resolveConflict,
} from "@/lib/pdf-resolve";
import { DriveFileUnstable } from "@/lib/pdf-staging";

/**
 * Resolve a conflict from the Compare page (task 8.4).
 *
 * Body: { action: "commit" | "discard", choices: { field: "yours" | "drive" },
 * seenRevision, sameDocument }. The server re-reads Drive and re-classifies
 * rather than trusting the page, so a file that moved again is caught here.
 */
export const maxDuration = 60;

const KEPT = "Your edits are kept.";

function parse(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.action !== "commit" && b.action !== "discard") return null;
  const choices: Choices = {};
  if (b.choices && typeof b.choices === "object") {
    for (const [field, choice] of Object.entries(b.choices as Record<string, unknown>)) {
      if (!(CONFLICT_FIELDS as readonly string[]).includes(field)) return null;
      if (choice !== "yours" && choice !== "drive") return null;
      choices[field as keyof Choices] = choice;
    }
  }
  return {
    action: b.action,
    choices,
    seenRevision: typeof b.seenRevision === "string" ? b.seenRevision : null,
    sameDocument: b.sameDocument === true,
  } as const;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  const input = parse(body);
  if (!input) {
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  }

  try {
    const result = await resolveConflict(id, input);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof ComparisonStale || error instanceof CommitConflict) {
      return NextResponse.json(
        {
          error: `The file changed in Drive again. Reload to compare against the latest version. ${KEPT}`,
          stale: true,
        },
        { status: 409 },
      );
    }
    if (error instanceof SameDocumentUnconfirmed) {
      return NextResponse.json({ error: `${error.message} ${KEPT}` }, { status: 422 });
    }
    if (error instanceof UndecidedFields) {
      return NextResponse.json(
        { error: `Choose a value for ${error.fields.join(", ")}. ${KEPT}`, undecided: error.fields },
        { status: 422 },
      );
    }
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: `Drive access needs re-authorizing. ${KEPT}`, reauthorize: true },
        { status: 409 },
      );
    }
    if (error instanceof DriveFileMissing) {
      return NextResponse.json(
        { error: `This file is no longer in Google Drive. ${KEPT}` },
        { status: 410 },
      );
    }
    if (error instanceof DriveFileUnstable) {
      return NextResponse.json(
        { error: `The file kept changing in Drive. Try again in a moment. ${KEPT}` },
        { status: 409 },
      );
    }
    if (error instanceof PdfNotWritable) {
      return NextResponse.json({ error: `${error.message}. ${KEPT}` }, { status: 422 });
    }
    if (error instanceof DriveWriteRefused) {
      return NextResponse.json(
        { error: `Drive refused to change this file. It may be shared with you read-only. ${KEPT}` },
        { status: 502 },
      );
    }
    if (error instanceof CommitNotRecorded) {
      return NextResponse.json(
        {
          error:
            "The file was written to Drive, but this page couldn't record it. Reload before editing again.",
        },
        { status: 500 },
      );
    }
    console.error("Failed to resolve PDF conflict:", error);
    return NextResponse.json({ error: `Could not resolve the conflict. ${KEPT}` }, { status: 502 });
  }
}
