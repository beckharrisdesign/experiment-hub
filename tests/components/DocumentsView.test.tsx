import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

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

  it("reviews what is prefilled, apart from what is pending (task 7i)", () => {
    const rows = [
      ...ROWS,
      row("p", {
        title: "Foodmart receipt",
        keywords: ["foodmart"],
        state: "prefilled",
        stateLabel: "Prefilled",
        prefilledTitle: true,
        prefilledKeywords: true,
      }),
      row("long", { state: "split", stateLabel: "Split first?", pageCount: 30 }),
    ];
    const props = { rows, pending: [{ id: "a", filename: "a.pdf" }], excluded: 0 };
    const { unmount } = render(<DocumentsView {...props} initialView={DEFAULT_VIEW} />);
    expect(table().getByText("Split first?")).toBeTruthy();
    expect(table().getByRole("button", { name: "foodmart" }).className).toContain("border-dashed");
    expect(screen.getAllByRole("link", { name: "Review prefilled" })[0].getAttribute("href")).toBe(
      "/pdf-metadata-viewer?prefilled=1",
    );
    // Commit still counts only the one pending.
    expect(screen.getAllByRole("button", { name: "Commit 1 document to Drive" }).length).toBeGreaterThan(0);
    unmount();

    render(<DocumentsView {...props} initialView={{ ...DEFAULT_VIEW, prefilled: true }} />);
    expect(names()).toEqual(["p.pdf"]);
    expect(screen.getByText("Prefilled documents")).toBeTruthy();
    expect(table().getByRole("link", { name: "p.pdf" }).getAttribute("href")).toBe("/pdf-metadata-viewer/id/p?prefilled=1");
  });

  describe("a row that asks to be split (task 7j)", () => {
    const long = row("long", { state: "split", stateLabel: "Split first?", pageCount: 30, revision: "r 1" });
    const other = row("other", { state: "split", stateLabel: "Split first?", pageCount: 8, revision: "r2" });
    const show = (rows = [long, other, ...ROWS], o: Partial<ListView> = {}) =>
      render(<DocumentsView rows={rows} pending={[]} excluded={0} initialView={{ ...DEFAULT_VIEW, ...o }} />);
    const pills = () => table().getAllByRole("button", { name: "Split first?" });
    const question = () => table().queryByText("30 pages. Is this more than one document?");

    beforeEach(() => refresh.mockClear());
    afterEach(() => vi.unstubAllGlobals());

    it("opens in place, with both buttons, and closes again", () => {
      show(undefined, { q: "pdf" });
      expect(question()).toBeNull();
      fireEvent.click(pills()[0]);
      expect(question()).toBeTruthy();
      expect(pills()[0].getAttribute("aria-expanded")).toBe("true");
      expect(table().getByRole("button", { name: "It's one document" })).toBeTruthy();
      // Straight to the split page, with the list as it is.
      expect(table().getByRole("link", { name: "Split pages" }).getAttribute("href")).toBe(
        "/pdf-metadata-viewer/id/long/split?q=pdf",
      );
      fireEvent.click(pills()[0]);
      expect(question()).toBeNull();
    });

    it("has one row open at a time", () => {
      show();
      fireEvent.click(pills()[0]);
      fireEvent.click(pills()[1]);
      expect(question()).toBeNull();
      expect(table().getByText("8 pages. Is this more than one document?")).toBeTruthy();
    });

    it("shows a place for every page, and asks only for kept small copies", () => {
      show();
      fireEvent.click(pills()[0]);
      const pages = within(table().getByRole("list", { name: "Pages" })).getAllByRole("listitem");
      expect(pages).toHaveLength(30);
      expect(table().getByAltText("Page 2").getAttribute("src")).toBe(
        "/api/pdf-documents/id/long/pages/2?rev=r%201&size=thumb&kept=1",
      );
      // One that isn't kept keeps its empty place.
      fireEvent.error(table().getByAltText("Page 2"));
      expect(table().queryByAltText("Page 2")).toBeNull();
    });

    it("fetches a page only once it is near the strip's view", () => {
      const seen: { el: Element; tell: (near: boolean) => void }[] = [];
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(private done: (e: { isIntersecting: boolean }[]) => void) {}
          observe(el: Element) {
            seen.push({ el, tell: (near) => this.done([{ isIntersecting: near }]) });
          }
          disconnect() {}
        },
      );
      show();
      fireEvent.click(pills()[0]);
      expect(table().queryAllByRole("img")).toHaveLength(0);
      const mine = seen.filter((s) => screen.getByRole("table").contains(s.el));
      act(() => mine[0].tell(true));
      act(() => mine[1].tell(false));
      expect(table().queryAllByRole("img", { hidden: true })).toHaveLength(1);
    });

    it("saves 'It's one document' in place", async () => {
      vi.useRealTimers();
      const fetchMock = vi.fn(async () => new Response("{}"));
      vi.stubGlobal("fetch", fetchMock);
      show();
      fireEvent.click(pills()[0]);
      fireEvent.click(table().getByRole("button", { name: "It's one document" }));
      await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
      expect(fetchMock).toHaveBeenCalledWith("/api/pdf-documents/id/long/split/not-needed", { method: "POST" });
    });

    it("says what went wrong, and can be pressed again", async () => {
      vi.useRealTimers();
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Not now." }), { status: 500 })));
      show();
      fireEvent.click(pills()[0]);
      fireEvent.click(table().getByRole("button", { name: "It's one document" }));
      await waitFor(() => expect(table().getByRole("alert").textContent).toBe("Not now."));
      expect((table().getByRole("button", { name: "It's one document" }) as HTMLButtonElement).disabled).toBe(false);
      expect(refresh).not.toHaveBeenCalled();
    });

    it("isn't open once it no longer asks", () => {
      const props = { pending: [], excluded: 0, initialView: DEFAULT_VIEW };
      const { rerender } = render(<DocumentsView rows={[long]} {...props} />);
      fireEvent.click(pills()[0]);
      rerender(<DocumentsView rows={[row("long", { state: "untagged", stateLabel: "Not yet tagged" })]} {...props} />);
      expect(question()).toBeNull();
    });
  });

  it("has no Review prefilled when nothing is", () => {
    renderView();
    expect(screen.queryByRole("link", { name: "Review prefilled" })).toBeNull();
  });

  it("commits every pending document, whatever the list shows", () => {
    renderView({ q: "statement" });
    expect(names()).toEqual(["b.pdf"]);
    expect(screen.getAllByRole("button", { name: "Commit 1 document to Drive" }).length).toBeGreaterThan(0);
  });
});
