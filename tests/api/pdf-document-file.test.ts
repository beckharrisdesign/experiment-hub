import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getPdfDocument: vi.fn(), checkFile: vi.fn(), readFile: vi.fn() }));

vi.mock("@/lib/pdf-documents", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-documents")>("@/lib/pdf-documents");
  return { ...actual, getPdfDocument: mocks.getPdfDocument };
});
vi.mock("@/lib/pdf-file-read", () => ({ checkFile: mocks.checkFile, readFile: mocks.readFile }));

import { GET } from "@/app/api/pdf-documents/id/[id]/file/route";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
const call = (id: string) =>
  GET(new NextRequest(`http://localhost/api/pdf-documents/id/${id}/file`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.checkFile.mockResolvedValue({ ok: true, accessToken: "t", head: "rev-1" });
});

describe("GET /api/pdf-documents/id/[id]/file", () => {
  it("404s a malformed id without reading anything", async () => {
    expect((await call("nope")).status).toBe(404);
    expect(mocks.getPdfDocument).not.toHaveBeenCalled();
  });

  it("404s an unknown document without touching Drive", async () => {
    mocks.getPdfDocument.mockResolvedValue(null);
    expect((await call(ID)).status).toBe(404);
    expect(mocks.checkFile).not.toHaveBeenCalled();
  });

  it("returns what the file says, never the access token", async () => {
    mocks.getPdfDocument.mockResolvedValue({ id: ID });
    const embedded = { title: "T", subject: null, author: null, keywords: [], pageCount: 3 };
    mocks.readFile.mockResolvedValue({ ok: true, embedded });
    const res = await call(ID);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ ok: true, embedded });
    expect(body).not.toContain('"t"');
  });

  it("returns a problem as data for the page to show", async () => {
    mocks.getPdfDocument.mockResolvedValue({ id: ID });
    mocks.readFile.mockResolvedValue({ ok: false, reason: "missing" });
    const res = await call(ID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: "missing" });
  });
});
