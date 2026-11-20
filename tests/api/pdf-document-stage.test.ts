import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ stagePdfEdits: vi.fn() }));

vi.mock("@/lib/pdf-staging", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-staging")>(
    "@/lib/pdf-staging",
  );
  return { ...actual, stagePdfEdits: mocks.stagePdfEdits };
});

import { PATCH } from "@/app/api/pdf-documents/id/[id]/route";
import { DriveFileMissing, DriveReauthorizationRequired } from "@/lib/pdf-drive";
import { DriveFileUnstable } from "@/lib/pdf-staging";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";

function patch(id: string, body: string) {
  return PATCH(
    new NextRequest(`http://localhost/api/pdf-documents/id/${id}`, {
      method: "PATCH",
      body,
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/pdf-documents/id/[id]", () => {
  it("404s a malformed id before reading the body", async () => {
    const res = await patch("not-a-uuid", "{}");
    expect(res.status).toBe(404);
    expect(mocks.stagePdfEdits).not.toHaveBeenCalled();
  });

  it("400s a body that is not JSON", async () => {
    expect((await patch(ID, "title=x")).status).toBe(400);
  });

  it("400s an invalid edit with the reason", async () => {
    const res = await patch(ID, JSON.stringify({ keywords: ["year 2026"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("year-2026");
    expect(mocks.stagePdfEdits).not.toHaveBeenCalled();
  });

  it("404s a document that does not exist", async () => {
    mocks.stagePdfEdits.mockResolvedValue(null);
    expect((await patch(ID, JSON.stringify({ title: "x" }))).status).toBe(404);
  });

  it("stages the parsed edits and returns the document", async () => {
    mocks.stagePdfEdits.mockResolvedValue({ id: ID, title: "March invoice" });
    const res = await patch(ID, JSON.stringify({ title: " March invoice " }));
    expect(res.status).toBe(200);
    expect(mocks.stagePdfEdits).toHaveBeenCalledWith(ID, { title: "March invoice" });
    expect((await res.json()).document.title).toBe("March invoice");
  });

  it("409s with a re-authorize flag when Drive access lapsed", async () => {
    mocks.stagePdfEdits.mockRejectedValue(new DriveReauthorizationRequired("revoked"));
    const res = await patch(ID, JSON.stringify({ title: "x" }));
    expect(res.status).toBe(409);
    expect((await res.json()).reauthorize).toBe(true);
  });

  it("410s when the file is gone from Drive", async () => {
    mocks.stagePdfEdits.mockRejectedValue(new DriveFileMissing("gone"));
    expect((await patch(ID, JSON.stringify({ title: "x" }))).status).toBe(410);
  });

  it("409s when the file kept changing mid-read", async () => {
    mocks.stagePdfEdits.mockRejectedValue(new DriveFileUnstable("busy"));
    expect((await patch(ID, JSON.stringify({ title: "x" }))).status).toBe(409);
  });

  it("500s anything else without leaking the cause", async () => {
    mocks.stagePdfEdits.mockRejectedValue(new Error("connection reset by 10.0.0.4"));
    const res = await patch(ID, JSON.stringify({ title: "x" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.4");
  });
});
