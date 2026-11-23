import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

import { DocumentsSection } from "@/app/pdf-metadata-viewer/DocumentsSection";

const PENDING = [
  { id: "a", filename: "a.pdf" },
  { id: "b", filename: "b.pdf" },
  { id: "c", filename: "c.pdf" },
];

function respond(map: Record<string, { status: number; body: unknown }>) {
  const fetchMock = vi.fn(async (url: string) => {
    const id = url.split("/id/")[1].split("/")[0];
    const r = map[id];
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Click the button inside the confirm step, not the identical ones bracketing the table. */
function confirm(name: string) {
  const box = screen.getByText(/Write the pending edits into/).parentElement as HTMLElement;
  fireEvent.click(within(box).getByRole("button", { name }));
}

function renderSection(pending = PENDING, excluded = 0) {
  return render(
    <DocumentsSection pending={pending} excluded={excluded} totalDocuments={10} reviewing={false}>
      <table />
    </DocumentsSection>,
  );
}

beforeEach(() => refresh.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe("DocumentsSection bulk commit (task 8.7)", () => {
  it("asks before writing anything to Drive", () => {
    const fetchMock = respond({});
    renderSection();
    fireEvent.click(screen.getAllByRole("button", { name: "Commit 3 documents to Drive" })[0]);
    expect(screen.getByText(/Write the pending edits into 3 files in Drive\?/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("commits each document on its own, in order, and one failure stops nothing else", async () => {
    const fetchMock = respond({
      a: { status: 200, body: { success: true, status: "committed" } },
      b: {
        status: 409,
        body: { error: "Not written: the file changed in Drive after you started editing. Your edits are kept.", conflict: true },
      },
      c: { status: 200, body: { success: true, status: "committed" } },
    });
    renderSection();
    fireEvent.click(screen.getAllByRole("button", { name: "Commit 3 documents to Drive" })[0]);
    confirm("Commit 3 documents to Drive");

    await waitFor(() => expect(screen.getByText(/2 written to Drive · 1 not written/)).toBeTruthy());
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/pdf-documents/id/a/commit",
      "/api/pdf-documents/id/b/commit",
      "/api/pdf-documents/id/c/commit",
    ]);
    expect(screen.getByText(/Nothing was lost/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Compare" }).getAttribute("href")).toBe(
      "/pdf-metadata-viewer/id/b/compare",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("does not count a document with nothing left to write as written", async () => {
    respond({
      a: { status: 200, body: { success: true, status: "nothing-pending" } },
    });
    renderSection([PENDING[0]]);
    fireEvent.click(screen.getAllByRole("button", { name: "Commit 1 document to Drive" })[0]);
    confirm("Commit 1 document to Drive");
    await waitFor(() => expect(screen.getByText(/0 written to Drive/)).toBeTruthy());
  });

  it("offers nothing to commit when nothing is pending", () => {
    renderSection([]);
    const button = screen.getByRole("button", { name: "Commit 0 documents to Drive" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("says how many pending documents it leaves out, so the button count is what it attempts", () => {
    renderSection(PENDING.slice(0, 2), 1);
    expect(screen.getAllByRole("button", { name: "Commit 2 documents to Drive" }).length).toBeGreaterThan(0);
    expect(screen.getByText("1 excluded — see Needs attention")).toBeTruthy();
    expect(screen.getByText("10 documents · 3 pending")).toBeTruthy();
  });

  it("links Review pending to the filtered list", () => {
    renderSection();
    expect(screen.getAllByRole("link", { name: "Review pending" })[0].getAttribute("href")).toBe(
      "/pdf-metadata-viewer?pending=1",
    );
  });
});
