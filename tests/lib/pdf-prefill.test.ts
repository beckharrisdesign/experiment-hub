import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/pdf-documents", () => ({ getPdfAdminClient: vi.fn() }));
vi.mock("@/lib/pdf-render", () => ({ openPdf: vi.fn(), shrinkJpeg: vi.fn() }));
vi.mock("@/lib/pdf-ocr", () => ({ openReader: vi.fn() }));

import { asksToSplit, canPrefill, isUntagged, makePrefill, type PrefillKnowledge } from "@/lib/pdf-prefill";
import type { PdfDocument } from "@/lib/pdf-documents";
import type { KeptPageText } from "@/lib/pdf-page-text";

const vendor = (name: string, slug: string, o: Record<string, unknown> = {}) => ({ name, slug, aliases: [], ...o });
const KNOWN: PrefillKnowledge = {
  entities: {
    vendorsWithNames: [
      vendor("Foodmart", "foodmart", { aliases: ["FM", "Food Mart Stores"], categories: ["Grocery"], location: "location-home-tx" }),
      vendor("Target", "target", { categories: ["retail"] }),
      vendor("Example Utility Co", "example-utility", { aliases: ["Example Utility"], categories: ["utilities"] }),
      vendor("Example", "example"),
      vendor("Smith & Sons", "smith-and-sons"),
    ],
    peopleWithNames: [
      { name: "Firstname Lastname", slug: "firstname-m-lastname", aliases: ["Firstie", "F. M. Lastname"] },
    ],
    locations: ["location-springfield-tx", "location-lake-made-up-ma", "location-tx"],
  },
  documentTypes: ["receipt", "invoice", "statement", "letter"],
  categories: ["grocery", "retail", "utilities"],
  specials: ["original-scan", "confidential"],
};
const page = (text: string, o: Partial<KeptPageText> = {}): KeptPageText => ({
  page: 1,
  text,
  source: "ocr",
  confidence: 80,
  ...o,
});
const TILL = "FOODMART\n100 Made Up Lane\nBread 3.10\nSubtotal 8.20\nTotal 8.95\nVISA 1234\nCashier 4";
const make = (text: string, o: { filename?: string | null; title?: string | null; pages?: KeptPageText[] } = {}) =>
  makePrefill({ filename: null, title: null, pages: [page(text)], ...o }, KNOWN);

// ---------------------------------------------------------------------------
// What it finds
// ---------------------------------------------------------------------------

describe("makePrefill", () => {
  it("fills in a scanned till receipt that never says receipt", () => {
    expect(make(TILL, { filename: "04252026_FOODMART.pdf" })).toEqual({
      title: "Foodmart grocery receipt",
      keywords: ["receipt", "grocery", "foodmart", "location-home-tx", "original-scan", "year-2026", "month-04"],
      why: {
        receipt: "Words a till prints",
        grocery: "Vendor’s category from Entities",
        foodmart: "Vendor’s name in the filename",
        "location-home-tx": "Vendor’s location from Entities",
        "original-scan": "Every page is a picture",
        "year-2026": "Date from the filename",
        "month-04": "Date from the filename",
        title: "From the vendor’s name and words a till prints",
      },
    });
  });

  it("names the type by its word, and where it found the vendor", () => {
    const found = make("Example Utility Co\nInvoice 48213\nTotal due April 18", {
      pages: [page("Example Utility Co\nInvoice 48213\nTotal due April 18", { source: "file", confidence: null })],
    })!;
    expect(found.title).toBe("Example Utility Co invoice");
    expect(found.why.title).toBe("From the vendor’s name and “invoice” on page 1");
    expect(found.why.invoice).toBe("“invoice” on page 1");
    expect(found.why["example-utility"]).toBe("Vendor’s name on page 1");
    // Said by the file itself, so not a scan.
    expect(found.keywords).not.toContain("original-scan");
  });

  it("finds a vendor by alias, through punctuation and case", () => {
    expect(make("FOOD-MART STORES #12 purchase receipt, thank you")!.keywords).toContain("foodmart");
    expect(make("Smith and Sons invoice for the garden work")!.keywords).toContain("smith-and-sons");
    expect(make("SMITH & SONS invoice for the garden work")!.keywords).toContain("smith-and-sons");
  });

  it("takes one vendor: the filename's, else the first on the page, the longer name first", () => {
    const text = "Target gift card bought at Foodmart, receipt enclosed";
    expect(make(text)!.keywords).toEqual(expect.arrayContaining(["target"]));
    expect(make(text)!.keywords).not.toContain("foodmart");
    expect(make(text, { filename: "04252026_FOODMART.pdf" })!.keywords).not.toContain("target");
    expect(make("Example Utility Co invoice for services in March")!.keywords).not.toContain("example");
  });

  it("finds a person by full name only", () => {
    expect(make("Patient: FIRSTNAME LASTNAME visited on Tuesday")!.keywords).toEqual(
      expect.arrayContaining(["firstname-m-lastname"]),
    );
    expect(make("Firstie came by about the receipt yesterday")!.keywords).not.toContain("firstname-m-lastname");
  });

  it("keeps a title the file already has", () => {
    expect(make(TILL, { title: "Weekly shop" })!.title).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// What it doesn't claim
// ---------------------------------------------------------------------------

describe("what it leaves alone", () => {
  it("doesn't take an ordinary word for a shop, or two letters for a name", () => {
    expect(make("the target date for this is the end of the month, thanks")).toBeNull();
    expect(make("we listened to FM radio for most of the afternoon there")).toBeNull();
    expect(make("a counterexample was examined by everybody in the room")).toBeNull();
  });

  it("makes nothing of a date and a scan alone", () => {
    expect(make("Some words on a page that name nobody and nothing known", { filename: "04252026_Scan.pdf" })).toBeNull();
  });

  it("makes nothing of a page tesseract wasn't sure of, or mostly unreadable pages", () => {
    expect(make("", { pages: [page(TILL, { confidence: 35 })] })).toBeNull();
    expect(
      make("", { pages: [page(TILL), page("~", { page: 2, confidence: 20 }), page("~", { page: 3, confidence: 20 })] }),
    ).toBeNull();
  });

  it("only uses tags the vocabulary has, with no spaces", () => {
    const odd: PrefillKnowledge = {
      ...KNOWN,
      documentTypes: [],
      categories: [],
      specials: [],
      entities: { ...KNOWN.entities, vendorsWithNames: [vendor("Foodmart", "food mart", { location: "Home TX" })] },
    };
    expect(makePrefill({ filename: null, title: null, pages: [page(TILL)] }, odd)).toBeNull();
  });

  it("finds a place by its city and state together, as in an address", () => {
    const tags = (text: string) => make(`${text}\nInvoice for the garden work`)!.keywords.filter((k) => k.startsWith("location-"));
    expect(tags("12 Main St, Springfield, TX 70000")).toEqual(["location-springfield-tx"]);
    expect(tags("SPRINGFIELD TEXAS")).toEqual(["location-springfield-tx"]);
    expect(tags("Lake Made Up, Massachusetts")).toEqual(["location-lake-made-up-ma"]);
    // The first on the page, and one only.
    expect(tags("Lake Made-Up, MA to Springfield, TX")).toEqual(["location-lake-made-up-ma"]);
    expect(make("Springfield, TX invoice for the garden work")!.why["location-springfield-tx"]).toBe("City and state on page 1");
  });

  it("doesn't take a city alone, a state alone, or another state's city for a place", () => {
    const tags = (text: string) => make(`${text}\nInvoice for the garden work`)!.keywords.filter((k) => k.startsWith("location-"));
    expect(tags("40 Springfield Avenue")).toEqual([]);
    expect(tags("Elsewhere, TX 70000")).toEqual([]);
    expect(tags("Springfield, MA 01000")).toEqual([]);
  });

  it("keeps the vendor's own place over the page's, and makes nothing of a place alone", () => {
    const found = make(`${TILL}\nSpringfield, TX 70000`)!;
    expect(found.keywords.filter((k) => k.startsWith("location-"))).toEqual(["location-home-tx"]);
    expect(make("Some words that name nobody known, sent to Springfield, TX 70000")).toBeNull();
  });

  it("leaves out a date still to come, and keeps the rest", () => {
    const found = make(TILL, { filename: "04252999_FOODMART.pdf" })!;
    expect(found.keywords).toContain("foodmart");
    expect(found.keywords.some((k) => /^(year|month)-/.test(k))).toBe(false);
  });

  it("never writes a subject", () => {
    expect(Object.keys(make(TILL)!)).toEqual(["title", "keywords", "why"]);
  });
});

// ---------------------------------------------------------------------------
// Which documents
// ---------------------------------------------------------------------------

describe("which documents", () => {
  const read = (keywords: string[], revision = "r1") => ({
    revision,
    embedded: { title: null, subject: null, author: null, keywords, pageCount: 1 },
  });
  const doc = (o: Partial<PdfDocument> = {}) =>
    ({
      title: null,
      subject: null,
      author: null,
      keywords: [],
      pageCount: 1,
      fileBaseline: null,
      fileRead: read([]),
      driveRevisionId: "r1",
      hasPendingEdits: false,
      committedAt: null,
      supersededAt: null,
      splitNotNeeded: false,
      ...o,
    }) as PdfDocument;

  it("takes only ones nobody has touched", () => {
    expect(isUntagged(doc())).toBe(true);
    expect(isUntagged(doc({ fileRead: read(["receipt"]) }))).toBe(false);
    // Not read yet, or since it changed: it may have tags of its own.
    expect(isUntagged(doc({ fileRead: null }))).toBe(false);
    expect(isUntagged(doc({ fileRead: read([], "r0") }))).toBe(false);
    expect(isUntagged(doc({ fileBaseline: read([]).embedded }))).toBe(false);
    expect(isUntagged(doc({ committedAt: "2026-11-24" }))).toBe(false);
    expect(isUntagged(doc({ hasPendingEdits: true }))).toBe(false);
    expect(isUntagged(doc({ supersededAt: "2026-11-24" }))).toBe(false);
  });

  it("asks about a long one instead, until it's said to be one document", () => {
    expect(asksToSplit(doc({ pageCount: 5 }))).toBe(false);
    expect(asksToSplit(doc({ pageCount: 6 }))).toBe(true);
    expect(canPrefill(doc({ pageCount: 6 }))).toBe(false);
    expect(asksToSplit(doc({ pageCount: 30, splitNotNeeded: true }))).toBe(false);
    expect(canPrefill(doc({ pageCount: 30, splitNotNeeded: true }))).toBe(true);
    expect(asksToSplit(doc({ pageCount: 30, fileRead: read(["letter"]) }))).toBe(false);
    expect(asksToSplit(doc({ pageCount: 30, fileRead: null }))).toBe(false);
  });
});
