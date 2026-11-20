import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ resolveConflict: vi.fn() }));

vi.mock("@/lib/pdf-resolve", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-resolve")>("@/lib/pdf-resolve");
  return { ...actual, resolveConflict: mocks.resolveConflict };
});

import { POST } from "@/app/api/pdf-documents/id/[id]/resolve/route";
import { ComparisonStale, SameDocumentUnconfirmed, UndecidedFields } from "@/lib/pdf-resolve";
import { DriveReauthorizationRequired } from "@/lib/pdf-drive";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";

function post(id: string, body: string) {
  return POST(
    new NextRequest(`http://localhost/api/pdf-documents/id/${id}/resolve`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
}

const VALID = JSON.stringify({
  action: "commit",
  choices: { title: "yours", keywords: "drive" },
  seenRevision: "rev-9",
  sameDocument: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST .../resolve", () => {
  it("404s a malformed id", async () => {
    expect((await post("nope", VALID)).status).toBe(404);
  });

  it.each([
    ["not json", "x"],
    ["no action", JSON.stringify({ choices: {} })],
    ["unknown action", JSON.stringify({ action: "merge" })],
    ["unknown field", JSON.stringify({ action: "commit", choices: { filename: "yours" } })],
    ["unknown choice", JSON.stringify({ action: "commit", choices: { title: "both" } })],
  ])("400s %s", async (_label, body) => {
    expect((await post(ID, body)).status).toBe(400);
    expect(mocks.resolveConflict).not.toHaveBeenCalled();
  });

  it("passes the parsed resolution through", async () => {
    mocks.resolveConflict.mockResolvedValue({ status: "committed", document: { id: ID }, changed: 2 });
    const res = await post(ID, VALID);
    expect(res.status).toBe(200);
    expect(mocks.resolveConflict).toHaveBeenCalledWith(ID, {
      action: "commit",
      choices: { title: "yours", keywords: "drive" },
      seenRevision: "rev-9",
      sameDocument: true,
    });
  });

  it.each([
    [new ComparisonStale("moved"), 409, { stale: true }],
    [new SameDocumentUnconfirmed("confirm"), 422, {}],
    [new UndecidedFields(["title"]), 422, { undecided: ["title"] }],
    [new DriveReauthorizationRequired("revoked"), 409, { reauthorize: true }],
  ])("maps %s to %i and says the edits are kept", async (error, status, extra) => {
    mocks.resolveConflict.mockRejectedValue(error);
    const res = await post(ID, VALID);
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body).toMatchObject(extra);
    expect(body.error).toContain("Your edits are kept.");
  });
});
