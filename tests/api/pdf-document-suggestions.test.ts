import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  getValidAccessToken: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
  downloadDriveFile: vi.fn(),
  suggestMetadata: vi.fn(),
}));

vi.mock("@/lib/pdf-documents", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-documents")>("@/lib/pdf-documents");
  return { ...actual, getPdfDocument: mocks.getPdfDocument };
});
vi.mock("@/lib/pdf-drive", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-drive")>("@/lib/pdf-drive");
  return {
    ...actual,
    getValidAccessToken: mocks.getValidAccessToken,
    getDriveHeadRevisionId: mocks.getDriveHeadRevisionId,
    downloadDriveFile: mocks.downloadDriveFile,
  };
});
vi.mock("@/lib/pdf-suggest", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-suggest")>("@/lib/pdf-suggest");
  return { ...actual, suggestMetadata: mocks.suggestMetadata };
});

import { POST } from "@/app/api/pdf-documents/id/[id]/suggestions/route";
import { DriveFileMissing } from "@/lib/pdf-drive";
import { SuggestionsFailed, SuggestionsUnavailable } from "@/lib/pdf-suggest";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
const DOC = {
  id: ID,
  driveFileId: "drive-abc",
  filename: "05012025_Store Hours.pdf",
  title: "HEB",
  subject: null,
  keywords: ["heb"],
};

function call(id: string) {
  return POST(new NextRequest(`http://localhost/api/pdf-documents/id/${id}/suggestions`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getValidAccessToken.mockResolvedValue("token");
  mocks.getDriveHeadRevisionId.mockResolvedValue("rev-1");
  mocks.downloadDriveFile.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
});

describe("POST /api/pdf-documents/id/[id]/suggestions", () => {
  it("404s a malformed or unknown id without touching Drive", async () => {
    expect((await call("nope")).status).toBe(404);
    mocks.getPdfDocument.mockResolvedValue(null);
    expect((await call(ID)).status).toBe(404);
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
  });

  it("returns suggestions from the file and the current values, and stages nothing", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.suggestMetadata.mockResolvedValue({ title: "HEB grocery receipt", subject: "Groceries", keywords: ["receipt"] });
    const res = await call(ID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      suggestions: { title: "HEB grocery receipt", subject: "Groceries", keywords: ["receipt"] },
    });
    const [bytes, input] = mocks.suggestMetadata.mock.calls[0];
    expect(Array.from(bytes as Uint8Array)).toEqual([1, 2, 3]);
    expect(input).toEqual({ filename: DOC.filename, title: "HEB", subject: null, keywords: ["heb"] });
  });

  it("503s with the reason when suggestions are switched off", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.suggestMetadata.mockRejectedValue(
      new SuggestionsUnavailable("AI suggestions are off: no OpenAI key is configured"),
    );
    const res = await call(ID);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: "AI suggestions are off: no OpenAI key is configured",
      unavailable: true,
    });
  });

  it("410s a file that has left Drive, without asking OpenAI", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.getDriveHeadRevisionId.mockRejectedValue(new DriveFileMissing("trashed"));
    expect((await call(ID)).status).toBe(410);
    expect(mocks.suggestMetadata).not.toHaveBeenCalled();
  });

  it("502s when OpenAI fails", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.suggestMetadata.mockRejectedValue(new SuggestionsFailed("OpenAI refused the request (429)"));
    expect((await call(ID)).status).toBe(502);
  });
});
