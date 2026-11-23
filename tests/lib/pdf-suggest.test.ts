import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/pdf-taxonomy", () => ({
  DECISION_TAGS: ["needs-deleting", "no-split-needed", "already-split", "from-split"],
  loadTaxonomy: vi.fn(),
}));

import {
  OPENAI_RESPONSES_URL,
  SuggestionsFailed,
  SuggestionsUnavailable,
  buildPrompt,
  cleanKeywords,
  filenameDate,
  parseSuggestions,
  suggestMetadata,
  suggestRequest,
} from "@/lib/pdf-suggest";
import type { Taxonomy } from "@/lib/pdf-taxonomy";

const TAXONOMY: Taxonomy = {
  documentTypes: ["receipt", "invoice"],
  categories: ["grocery"],
  actions: ["keep-annual"],
  statuses: ["active"],
  specials: ["original-scan"],
  locations: ["location-home"],
  people: ["firstname-m-lastname"],
  peopleWithNames: [{ name: "Firstname Lastname", slug: "firstname-m-lastname", aliases: ["Firstie"] }],
  vendors: ["foodmart"],
  vendorsWithNames: [{ name: "Foodmart", slug: "foodmart", aliases: ["FM"] }],
};
const INPUT = { filename: "05012025_Store Hours.pdf", title: "HEB", subject: null, keywords: ["heb"] };
const PDF = new Uint8Array([37, 80, 68, 70]);

function reply(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}
const answer = (obj: unknown) => ({
  output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(obj) }] }],
});

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("filenameDate", () => {
  it("reads v1's YYYY-MM-DD names and the scanner's MMDDYYYY_ names", () => {
    expect(filenameDate("2026-03-14 — Invoice.pdf")).toBe("2026-03-14");
    expect(filenameDate("05012025_Store Hours.pdf")).toBe("2025-05-01");
  });

  it("ignores names with no date, or digits that can't be one", () => {
    expect(filenameDate("Store Hours.pdf")).toBeNull();
    expect(filenameDate("13452025_x.pdf")).toBeNull();
    expect(filenameDate(null)).toBeNull();
  });
});

describe("buildPrompt", () => {
  const prompt = buildPrompt(INPUT, TAXONOMY);

  it("gives the model the taxonomy, entity aliases included", () => {
    expect(prompt).toContain("receipt, invoice");
    expect(prompt).toContain('"Firstname Lastname" (also: Firstie) → use slug: "firstname-m-lastname"');
    expect(prompt).toContain('"Foodmart" (also: FM) → use slug: "foodmart"');
  });

  it("passes the current values and the filename date as context", () => {
    expect(prompt).toContain("Title: HEB");
    expect(prompt).toContain("Subject: (empty)");
    expect(prompt).toContain("Keywords: heb");
    expect(prompt).toContain("2025-05-01");
  });

  // Renaming isn't ported, so a suggested filename would have nowhere to go.
  it("asks for no filename", () => {
    expect(prompt).not.toMatch(/suggested[- ]filename/i);
  });
});

describe("suggestRequest", () => {
  it("sends the PDF itself as a file, with a strict schema for the answer", () => {
    const body = suggestRequest(PDF, "a.pdf", "prompt");
    const [file, text] = body.input[0].content;
    expect(file).toEqual({ type: "input_file", filename: "a.pdf", file_data: "data:application/pdf;base64,JVBERg==" });
    expect(text).toEqual({ type: "input_text", text: "prompt" });
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
  });

  it("uses the hub's vision model unless the app overrides it", () => {
    delete process.env.PDF_OPENAI_MODEL;
    expect(suggestRequest(PDF, "a.pdf", "p").model).toBe("gpt-5");
    process.env.PDF_OPENAI_MODEL = "some-other-model";
    expect(suggestRequest(PDF, "a.pdf", "p").model).toBe("some-other-model");
  });
});

describe("cleanKeywords", () => {
  it("lowercases, hyphenates, de-duplicates and drops decision tags", () => {
    expect(cleanKeywords(["Receipt", "receipt", "keep annual", "needs-deleting", 4, ""])).toEqual([
      "receipt",
      "keep-annual",
    ]);
  });
});

describe("parseSuggestions", () => {
  it("reads the structured answer", () => {
    expect(parseSuggestions(answer({ title: " HEB receipt ", subject: "Groceries", keywords: ["receipt"] }))).toEqual({
      title: "HEB receipt",
      subject: "Groceries",
      keywords: ["receipt"],
    });
  });

  it("fails clearly on an empty or broken answer", () => {
    expect(() => parseSuggestions({ output: [] })).toThrow(SuggestionsFailed);
    expect(() =>
      parseSuggestions({ output: [{ content: [{ type: "output_text", text: "not json" }] }] }),
    ).toThrow(SuggestionsFailed);
  });
});

describe("suggestMetadata", () => {
  // Spec: without the key, everything else works and only suggestions say so.
  it("is unavailable, and says why, without an OpenAI key", async () => {
    delete process.env.OPENAI_API_KEY;
    const fetchMock = reply({});
    const error = await suggestMetadata(PDF, INPUT, fetchMock, async () => TAXONOMY).catch((e) => e);
    expect(error).toBeInstanceOf(SuggestionsUnavailable);
    expect(error.message).toContain("no OpenAI key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is unavailable, and says why, when Notion isn't set up", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const notion = Object.assign(new Error("Notion is not configured (missing NOTION_TOKEN)"), {
      name: "EntitiesUnavailable",
    });
    const error = await suggestMetadata(PDF, INPUT, reply({}), async () => {
      throw notion;
    }).catch((e) => e);
    expect(error).toBeInstanceOf(SuggestionsUnavailable);
    expect(error.message).toContain("NOTION_TOKEN");
  });

  it("posts to the Responses API with the key and returns the cleaned answer", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const fetchMock = reply(answer({ title: "HEB grocery receipt", subject: "Groceries", keywords: ["Receipt", "heb"] }));
    const result = await suggestMetadata(PDF, INPUT, fetchMock, async () => TAXONOMY);
    expect(result).toEqual({ title: "HEB grocery receipt", subject: "Groceries", keywords: ["receipt", "heb"] });
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(OPENAI_RESPONSES_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
  });

  it("fails clearly when OpenAI refuses", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = await suggestMetadata(PDF, INPUT, reply({ error: "nope" }, 429), async () => TAXONOMY).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(SuggestionsFailed);
    expect(error.message).toContain("429");
  });
});
