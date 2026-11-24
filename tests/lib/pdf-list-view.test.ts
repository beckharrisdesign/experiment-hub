import { describe, it, expect } from "vitest";
import {
  applyListView,
  DEFAULT_VIEW,
  isFiltering,
  listViewQuery,
  parseListView,
  toggleKeyword,
  toggleSort,
  type ListRow,
  type ListView,
} from "@/lib/pdf-list-view";

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
const view = (o: Partial<ListView> = {}): ListView => ({ ...DEFAULT_VIEW, ...o });
const ids = (rows: ListRow[]) => rows.map((r) => r.id).join("");

/** As the server sends them: Filename, Z to A. */
const ROWS = [
  row("d", { title: "March electricity invoice", keywords: ["invoice", "utilities"], pageCount: 2, state: "pending" }),
  row("c", { title: "Account statement", subject: "Fourth quarter", keywords: ["statement", "year-2025"], pageCount: 10 }),
  row("b", { author: "Example Water Co", keywords: ["Invoice", "utilities", "paid"], pageCount: 1 }),
  row("a", { state: "untagged" }),
];

// ---------------------------------------------------------------------------
// The page address
// ---------------------------------------------------------------------------

describe("the page address", () => {
  it("is empty for the default view", () => {
    expect(listViewQuery(DEFAULT_VIEW)).toBe("");
    expect(parseListView({})).toEqual(DEFAULT_VIEW);
  });

  it("round-trips everything", () => {
    const v = view({ q: "march & co", keywords: ["invoice", "year-2026"], sort: "pages", dir: "desc", pending: true });
    const p = new URLSearchParams(listViewQuery(v));
    expect(
      parseListView({
        q: p.get("q")!,
        kw: p.getAll("kw"),
        sort: p.get("sort")!,
        dir: p.get("dir")!,
        pending: p.get("pending")!,
      }),
    ).toEqual(v);
  });

  it("takes one keyword as a string", () => {
    expect(parseListView({ kw: "invoice" }).keywords).toEqual(["invoice"]);
  });

  it("ignores what it doesn't recognise", () => {
    expect(parseListView({ sort: "size", dir: "sideways", pending: "yes", kw: ["", " ", "x", "X"] })).toEqual(
      view({ keywords: ["x"] }),
    );
  });

  it("caps what it accepts", () => {
    const v = parseListView({ q: "x".repeat(500), kw: Array.from({ length: 50 }, (_, i) => `k${i}`) });
    expect(v.q).toHaveLength(200);
    expect(v.keywords).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

describe("finding documents", () => {
  it("shows every row in the order given by default", () => {
    expect(ids(applyListView(ROWS, DEFAULT_VIEW))).toBe("dcba");
  });

  it("searches filename, title, subject, author and keywords, ignoring case", () => {
    const found = (q: string) => ids(applyListView(ROWS, view({ q })));
    expect(found("A.PDF")).toBe("a");
    expect(found("ELECTRICITY")).toBe("d");
    expect(found("quarter")).toBe("c");
    expect(found("water")).toBe("b");
    expect(found("year-2025")).toBe("c");
  });

  it("needs every word, wherever it is", () => {
    expect(ids(applyListView(ROWS, view({ q: "  march   utilities " })))).toBe("d");
    expect(ids(applyListView(ROWS, view({ q: "march paid" })))).toBe("");
  });

  it("needs every chosen keyword, whole and in any case", () => {
    expect(ids(applyListView(ROWS, view({ keywords: ["invoice"] })))).toBe("db");
    expect(ids(applyListView(ROWS, view({ keywords: ["invoice", "paid"] })))).toBe("b");
    expect(ids(applyListView(ROWS, view({ keywords: ["util"] })))).toBe("");
  });

  it("combines with Review pending", () => {
    expect(ids(applyListView(ROWS, view({ pending: true })))).toBe("d");
    expect(ids(applyListView(ROWS, view({ pending: true, q: "paid" })))).toBe("");
  });

  it("keeps the open document's place even when the view no longer matches it", () => {
    const found = applyListView(ROWS, view({ keywords: ["invoice"] }), "c");
    expect(ids(found)).toBe("dcb");
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe("sorting", () => {
  it("reverses the filename order it was given", () => {
    expect(ids(applyListView(ROWS, view({ dir: "asc" })))).toBe("abcd");
  });

  it("puts pages in number order, blanks last both ways", () => {
    expect(ids(applyListView(ROWS, view({ sort: "pages", dir: "asc" })))).toBe("bdca");
    expect(ids(applyListView(ROWS, view({ sort: "pages", dir: "desc" })))).toBe("cdba");
  });

  it("puts blank titles last both ways, in the order given", () => {
    expect(ids(applyListView(ROWS, view({ sort: "title", dir: "asc" })))).toBe("cdba");
    expect(ids(applyListView(ROWS, view({ sort: "title", dir: "desc" })))).toBe("dcba");
  });

  it("puts pending documents first by state", () => {
    expect(ids(applyListView(ROWS, view({ sort: "state", dir: "asc" })))).toBe("dacb");
  });

  it("puts a blank filename last both ways", () => {
    const rows = [row("n", { filename: null }), ...ROWS];
    expect(ids(applyListView(rows, view()))).toBe("dcban");
    expect(ids(applyListView(rows, view({ dir: "asc" })))).toBe("abcdn");
  });

  it("sorts up on the first click and reverses on the next", () => {
    const once = toggleSort(DEFAULT_VIEW, "pages");
    expect(once).toMatchObject({ sort: "pages", dir: "asc" });
    expect(toggleSort(once, "pages")).toMatchObject({ sort: "pages", dir: "desc" });
    expect(toggleSort(DEFAULT_VIEW, "filename")).toMatchObject({ sort: "filename", dir: "asc" });
  });
});

describe("keywords", () => {
  it("adds one, then removes it whatever its case", () => {
    const on = toggleKeyword(DEFAULT_VIEW, "Invoice");
    expect(on.keywords).toEqual(["Invoice"]);
    expect(toggleKeyword(on, "invoice").keywords).toEqual([]);
  });

  it("counts as filtering; Review pending alone does not", () => {
    expect(isFiltering(view({ keywords: ["x"] }))).toBe(true);
    expect(isFiltering(view({ q: "  " }))).toBe(false);
    expect(isFiltering(view({ pending: true }))).toBe(false);
  });
});
