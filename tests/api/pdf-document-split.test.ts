import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ splitPdfDocument: vi.fn(), markSplitNotNeeded: vi.fn() }));
vi.mock("@/lib/pdf-split", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-split")>("@/lib/pdf-split");
  return { ...actual, splitPdfDocument: mocks.splitPdfDocument, markSplitNotNeeded: mocks.markSplitNotNeeded };
});

import { POST } from "@/app/api/pdf-documents/id/[id]/split/route";
import { POST as NOT_NEEDED } from "@/app/api/pdf-documents/id/[id]/split/not-needed/route";
import { AlreadySplit, InvalidSplit, SplitConflict, SplitNotRecorded } from "@/lib/pdf-split";
import { DriveFileMissing } from "@/lib/pdf-drive";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
const call = (body: unknown, id = ID) =>
  POST(
    new NextRequest(`http://localhost/api/pdf-documents/id/${id}/split`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  mocks.splitPdfDocument.mockReset();
  mocks.markSplitNotNeeded.mockReset();
});

describe("POST /api/pdf-documents/id/[id]/split", () => {
  it("404s a malformed id and 400s missing breaks, without splitting", async () => {
    expect((await call({ breaks: [1] }, "nope")).status).toBe(404);
    expect((await call({})).status).toBe(400);
    expect((await call({ breaks: [1.5] })).status).toBe(400);
    expect(mocks.splitPdfDocument).not.toHaveBeenCalled();
  });

  it("splits after the given pages and returns the new documents", async () => {
    mocks.splitPdfDocument.mockResolvedValue({ outputs: ["a", "b"] });
    const res = await call({ breaks: [2] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, outputs: ["a", "b"] });
    expect(mocks.splitPdfDocument).toHaveBeenCalledWith(ID, [2], {});
  });

  it("passes on what the parts are called and what they take (task 7g)", async () => {
    mocks.splitPdfDocument.mockResolvedValue({ outputs: ["a", "b"] });
    await call({
      breaks: [2],
      parts: [
        { title: " Camp art, 1 of 2 ", filename: "Camp art 1.pdf" },
        { title: "", filename: "Camp art 2.pdf" },
      ],
      copy: { subject: false, keywords: true },
    });
    expect(mocks.splitPdfDocument).toHaveBeenCalledWith(ID, [2], {
      parts: [
        { title: "Camp art, 1 of 2", filename: "Camp art 1.pdf" },
        { title: null, filename: "Camp art 2.pdf" },
      ],
      copy: { subject: false, keywords: true },
    });
  });

  it("400s names it can't make sense of, without splitting", async () => {
    for (const bad of [
      { parts: "Camp art" },
      { parts: [{ title: 7, filename: "a.pdf" }] },
      { parts: [{ title: null }] },
      { parts: [{ title: "x".repeat(1001), filename: "a.pdf" }] },
      { copy: { subject: "yes" } },
      { copy: null },
    ]) {
      expect((await call({ breaks: [1], ...bad })).status).toBe(400);
    }
    expect(mocks.splitPdfDocument).not.toHaveBeenCalled();
  });

  it("maps each refusal to its status", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cases: Array<[Error, number]> = [
      [new InvalidSplit("Choose at least one place to split"), 400],
      [new AlreadySplit("x"), 409],
      [new SplitConflict("x"), 409],
      [new DriveFileMissing("x"), 410],
      [new SplitNotRecorded("x", ["d"]), 500],
      [new Error("boom"), 502],
    ];
    for (const [error, status] of cases) {
      mocks.splitPdfDocument.mockRejectedValueOnce(error);
      expect((await call({ breaks: [1] })).status).toBe(status);
    }
  });
});

describe("POST /api/pdf-documents/id/[id]/split/not-needed", () => {
  it("marks the document as one document", async () => {
    mocks.markSplitNotNeeded.mockResolvedValue(true);
    const res = await NOT_NEEDED(new NextRequest("http://localhost/x", { method: "POST" }), {
      params: Promise.resolve({ id: ID }),
    });
    expect(res.status).toBe(200);
    expect(mocks.markSplitNotNeeded).toHaveBeenCalledWith(ID);
  });
});
