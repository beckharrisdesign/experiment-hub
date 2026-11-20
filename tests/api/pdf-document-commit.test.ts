import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ commitPdfDocument: vi.fn(), discardPdfEdits: vi.fn() }));

vi.mock("@/lib/pdf-commit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-commit")>("@/lib/pdf-commit");
  return {
    ...actual,
    commitPdfDocument: mocks.commitPdfDocument,
    discardPdfEdits: mocks.discardPdfEdits,
  };
});

import { POST as COMMIT } from "@/app/api/pdf-documents/id/[id]/commit/route";
import { POST as DISCARD } from "@/app/api/pdf-documents/id/[id]/discard/route";
import { CommitConflict, CommitNotRecorded } from "@/lib/pdf-commit";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  DriveWriteRefused,
} from "@/lib/pdf-drive";
import { PdfNotWritable } from "@/lib/pdf-embedded";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";

type Handler = (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

function call(handler: Handler, id: string) {
  return handler(new NextRequest(`http://localhost/api/pdf-documents/id/${id}/x`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST .../commit", () => {
  it("404s a malformed id without committing", async () => {
    expect((await call(COMMIT, "nope")).status).toBe(404);
    expect(mocks.commitPdfDocument).not.toHaveBeenCalled();
  });

  it("404s a document that does not exist", async () => {
    mocks.commitPdfDocument.mockResolvedValue(null);
    expect((await call(COMMIT, ID)).status).toBe(404);
  });

  it("returns the result of a commit", async () => {
    mocks.commitPdfDocument.mockResolvedValue({ status: "committed", document: { id: ID }, changed: 2 });
    const res = await call(COMMIT, ID);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, status: "committed", changed: 2 });
  });

  it.each([
    [new CommitConflict("moved"), 409, { conflict: true }],
    [new DriveReauthorizationRequired("revoked"), 409, { reauthorize: true }],
    [new DriveFileMissing("gone"), 410, {}],
    [new PdfNotWritable("This PDF is encrypted"), 422, {}],
    [new DriveWriteRefused("403"), 502, {}],
    [new Error("socket hang up"), 502, {}],
  ])("maps %s to %i and says the edits are kept", async (error, status, extra) => {
    mocks.commitPdfDocument.mockRejectedValue(error);
    const res = await call(COMMIT, ID);
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body).toMatchObject(extra);
    expect(body.error).toContain("Your edits are kept.");
  });

  it("does not claim the edits are kept when the file was already written", async () => {
    mocks.commitPdfDocument.mockRejectedValue(new CommitNotRecorded("rpc failed"));
    const res = await call(COMMIT, ID);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("written to Drive");
    expect(body.error).not.toContain("Your edits are kept.");
  });
});

describe("POST .../discard", () => {
  it("404s a malformed id", async () => {
    expect((await call(DISCARD, "nope")).status).toBe(404);
  });

  it("returns the document after discarding", async () => {
    mocks.discardPdfEdits.mockResolvedValue({ id: ID, hasPendingEdits: false });
    const res = await call(DISCARD, ID);
    expect(res.status).toBe(200);
    expect((await res.json()).document.hasPendingEdits).toBe(false);
  });

  it("500s a failure", async () => {
    mocks.discardPdfEdits.mockRejectedValue(new Error("db"));
    expect((await call(DISCARD, ID)).status).toBe(500);
  });
});
