import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getValidAccessToken: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
  downloadDriveFile: vi.fn(),
  readEmbeddedMetadata: vi.fn(),
}));

vi.mock("@/lib/pdf-drive", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-drive")>("@/lib/pdf-drive");
  return {
    ...actual,
    getValidAccessToken: mocks.getValidAccessToken,
    getDriveHeadRevisionId: mocks.getDriveHeadRevisionId,
    downloadDriveFile: mocks.downloadDriveFile,
  };
});
vi.mock("@/lib/pdf-embedded", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-embedded")>("@/lib/pdf-embedded");
  return { ...actual, readEmbeddedMetadata: mocks.readEmbeddedMetadata };
});

import { checkFile, readFile } from "@/lib/pdf-file-read";
import { DriveFileMissing, DriveReauthorizationRequired } from "@/lib/pdf-drive";
import type { PdfDocument } from "@/lib/pdf-documents";

const BASELINE = { title: "HEB", subject: null, author: null, keywords: ["heb"], pageCount: 1 };
const IN_FILE = { title: "From the file", subject: null, author: null, keywords: [], pageCount: 3 };

function doc(overrides: Partial<PdfDocument> = {}): PdfDocument {
  return {
    driveFileId: "drive-1",
    fileBaseline: null,
    driveRevisionId: null,
    ...overrides,
  } as PdfDocument;
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getValidAccessToken.mockResolvedValue("token");
  mocks.getDriveHeadRevisionId.mockResolvedValue("rev-1");
  mocks.downloadDriveFile.mockResolvedValue(new ArrayBuffer(8));
  mocks.readEmbeddedMetadata.mockResolvedValue(IN_FILE);
});

describe("checkFile", () => {
  it("reads only the revision, never the bytes", async () => {
    expect(await checkFile(doc())).toEqual({ ok: true, accessToken: "token", head: "rev-1" });
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
  });

  it("reports a trashed or deleted file as missing", async () => {
    mocks.getDriveHeadRevisionId.mockRejectedValue(new DriveFileMissing("trashed"));
    expect(await checkFile(doc())).toEqual({ ok: false, reason: "missing" });
  });

  it("reports a lapsed grant as needing sign-in", async () => {
    mocks.getValidAccessToken.mockRejectedValue(new DriveReauthorizationRequired("revoked"));
    expect(await checkFile(doc())).toEqual({ ok: false, reason: "reauthorize" });
  });
});

describe("readFile", () => {
  const access = { ok: true as const, accessToken: "token", head: "rev-1" };

  // The point of the change: an edited document whose file hasn't moved is
  // shown without downloading it.
  it("uses the stored baseline when Drive still holds that revision", async () => {
    const state = await readFile(doc({ fileBaseline: BASELINE, driveRevisionId: "rev-1" }), access);
    expect(state).toEqual({ ok: true, embedded: BASELINE });
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
  });

  it("downloads when the file changed in Drive since the baseline", async () => {
    const state = await readFile(doc({ fileBaseline: BASELINE, driveRevisionId: "rev-0" }), access);
    expect(state).toEqual({ ok: true, embedded: IN_FILE });
    expect(mocks.downloadDriveFile).toHaveBeenCalledWith("token", "drive-1");
  });

  it("downloads a document never edited here", async () => {
    expect(await readFile(doc(), access)).toEqual({ ok: true, embedded: IN_FILE });
  });

  it("passes on a failed check without touching Drive", async () => {
    expect(await readFile(doc(), { ok: false, reason: "missing" })).toEqual({ ok: false, reason: "missing" });
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
  });

  it("reads a failed download as unreadable rather than throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.downloadDriveFile.mockRejectedValue(new Error("500"));
    expect(await readFile(doc(), access)).toEqual({ ok: false, reason: "unreadable" });
  });
});
