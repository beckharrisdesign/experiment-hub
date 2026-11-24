import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import DocumentsView from "@/app/pdf-metadata-viewer/DocumentsView";
import { DEFAULT_VIEW, type ListRow, type ListView } from "@/lib/pdf-list-view";

function row(id: string, o: Partial<ListRow> = {}): ListRow {
  return {
    id,
    filename: `${id}.pdf`,
    title: null,
    subject: null,
    author: null,
    keywords: [],
    pageCount: null,
    state: "committed",
    stateLabel: "Committed",
    ...o,
  };
}

const ROWS = [
  row("c", { title: "Water invoice", keywords: ["invoice", "utilities"], pageCount: 2 }),
  row("b", { title: "Statement", keywords: ["statement"], pageCount: 10 }),
  row("a", { title: "Gas invoice", keywords: ["invoice", "duplicate"], pageCount: 1, state: "pending", stateLabel: "1 pending edit" }),
];

function renderView(o: Partial<ListView> = {}) {
  return render(
    <DocumentsView
      rows={ROWS}
      pending={[{ id: "a", filename: "a.pdf" }]}
      excluded={0}
      initialView={{ ...DEFAULT_VIEW, ...o }}
    />,
  );
}

const table = () => within(screen.getByRole("table"));
const names = () =>
  table()
    .getAllByRole("link")
    .map((a) => a.textContent);
const search = () => screen.getByRole("searchbox", { name: "Search documents" });

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/pdf-metadata-viewer");
});
afterEach(() => vi.useRealTimers());

describe("DocumentsView (task 7e)", () => {
  it("starts as the list always has, with no count", () => {
    renderView();
    expect(names()).toEqual(["c.pdf", "b.pdf", "a.pdf"]);
    expect(screen.queryByText(/of 3 documents/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("narrows as you type and says how many match", () => {
    renderView();
    fireEvent.change(search(), { target: { value: "invoice" } });
    expect(names()).toEqual(["c.pdf", "a.pdf"]);
    expect(screen.getByText("2 of 3 documents")).toBeTruthy();
  });

  it("filters by a clicked keyword, and its × takes it off", () => {
    renderView();
    fireEvent.click(table().getByRole("button", { name: "utilities" }));
    expect(names()).toEqual(["c.pdf"]);
    expect(table().getByRole("button", { name: "utilities" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Remove utilities" }));
    expect(names()).toHaveLength(3);
  });

  it("sorts by a column name and says which way", () => {
    renderView();
    fireEvent.click(table().getByRole("button", { name: /Pages/ }));
    expect(names()).toEqual(["a.pdf", "c.pdf", "b.pdf"]);
    expect(table().getByRole("columnheader", { name: /Pages/ }).getAttribute("aria-sort")).toBe("ascending");
    fireEvent.click(table().getByRole("button", { name: /Pages/ }));
    expect(names()).toEqual(["b.pdf", "c.pdf", "a.pdf"]);
  });

  it("aligns cells top left, with numbers and their column name to the right", () => {
    renderView();
    const cells = within(table().getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells.map((c) => c.className.includes("text-right"))).toEqual([false, false, false, true, false]);
    expect(table().getAllByRole("row")[1].className).toContain("align-top");
    expect(table().getByRole("button", { name: /Pages/ }).className).toContain("flex-row-reverse");
    expect(table().getByRole("button", { name: /Title/ }).className).not.toContain("flex-row-reverse");
  });

  it("says when nothing matches and clears it", () => {
    renderView({ keywords: ["utilities"] });
    fireEvent.change(search(), { target: { value: "watr bill" } });
    expect(screen.getAllByText("No documents match “watr bill” with the keyword utilities").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Clear all" })[0]);
    expect(names()).toHaveLength(3);
  });

  it("puts the choices in the address and in every document's link", () => {
    renderView();
    fireEvent.change(search(), { target: { value: "gas" } });
    fireEvent.click(table().getByRole("button", { name: "invoice" }));
    expect(table().getByRole("link", { name: "a.pdf" }).getAttribute("href")).toBe(
      "/pdf-metadata-viewer/id/a?q=gas&kw=invoice",
    );
    act(() => void vi.advanceTimersByTime(300));
    expect(window.location.search).toBe("?q=gas&kw=invoice");
  });

  it("remembers the list when leaving before the address was written", () => {
    renderView();
    fireEvent.change(search(), { target: { value: "gas" } });
    fireEvent(window, new Event("pagehide"));
    expect(window.location.search).toBe("?q=gas");
  });

  it("keeps the search when switching to Review pending", () => {
    renderView({ q: "gas" });
    expect(screen.getAllByRole("link", { name: "Review pending" })[0].getAttribute("href")).toBe(
      "/pdf-metadata-viewer?q=gas&pending=1",
    );
  });

  it("commits every pending document, whatever the list shows", () => {
    renderView({ q: "statement" });
    expect(names()).toEqual(["b.pdf"]);
    expect(screen.getAllByRole("button", { name: "Commit 1 document to Drive" }).length).toBeGreaterThan(0);
  });
});
