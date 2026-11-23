/**
 * AI suggestions for a document's title, subject and keywords.
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D6
 * (`POST …/suggestions`, "Vision suggestions"); spec hosted-instance-access
 * ("Credential absent": everything else works, only suggestions are unavailable).
 *
 * Ported from the v1 prototype's `/api/ai-suggestions` and its
 * `config/ai-prompt-template.md`. What changed:
 *
 * - The PDF itself goes to OpenAI (Responses API `input_file`), which reads both
 *   its text and its page images. v1 rendered page images in the browser and
 *   posted them; the hub has no pdf.js renderer to do that.
 * - No filename suggestion: renaming isn't ported yet, so a suggested name
 *   would have nowhere to go.
 * - The answer comes back through a strict JSON schema instead of being fished
 *   out of free text.
 *
 * Suggestions are never validated against the taxonomy — a non-goal in
 * design.md. The person reviewing them is the check.
 */
import { DECISION_TAGS, loadTaxonomy, type Taxonomy } from "@/lib/pdf-taxonomy";

export const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

/** The hub's vision model (as the estate-sale planner), overridable per app. */
export function suggestModel(): string {
  return process.env.PDF_OPENAI_MODEL || "gpt-5";
}

/** Suggestions can't be made here: no OpenAI key, or Notion not set up. Says which. */
export class SuggestionsUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SuggestionsUnavailable";
  }
}

/** OpenAI answered, but not with something usable. */
export class SuggestionsFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SuggestionsFailed";
  }
}

export interface Suggestions {
  title: string;
  subject: string;
  keywords: string[];
}

export interface SuggestInput {
  filename: string | null;
  title: string | null;
  subject: string | null;
  keywords: string[];
}

/**
 * A date at the start of the filename: `YYYY-MM-DD…` (v1's naming) or the
 * scanner's `MMDDYYYY_…`. Returned as YYYY-MM-DD, or null.
 */
export function filenameDate(filename: string | null): string | null {
  if (!filename) return null;
  const iso = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const scanner = filename.match(/^(\d{2})(\d{2})(\d{4})_/);
  if (scanner) {
    const [, mm, dd, yyyy] = scanner;
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return null;
}

function entityLines(list: Array<{ name: string; slug: string; aliases: string[] }>): string {
  if (list.length === 0) return "  (none)";
  return list
    .map((e) => {
      const aliases = e.aliases.length > 0 ? ` (also: ${e.aliases.join("; ")})` : "";
      return `  - "${e.name}"${aliases} → use slug: "${e.slug}"`;
    })
    .join("\n");
}

/** The taxonomy as the model sees it (v1's taxonomyText, entity aliases included). */
export function taxonomyText(t: Taxonomy): string {
  return `TAGGING TAXONOMY - You MUST use these exact tag slugs:

DOCUMENT TYPES (use 1-2): ${t.documentTypes.join(", ")}

CATEGORIES (use 1-2): ${t.categories.join(", ")}

ACTIONS (use if applicable): ${t.actions.join(", ")}

STATUS (use if applicable): ${t.statuses.join(", ")}

SPECIAL FLAGS (use if applicable): ${t.specials.join(", ")}

LOCATIONS (use if applicable): ${t.locations.join(", ")}

PEOPLE (REQUIRED if person found - match name or alias to slug):
${entityLines(t.peopleWithNames)}

VENDORS (REQUIRED if vendor found - match business name or alias to slug):
${entityLines(t.vendorsWithNames)}`;
}

export const SYSTEM_MESSAGE =
  "You analyze scanned household documents and suggest metadata for them, choosing keywords only from the taxonomy you are given.";

/** v1's main prompt, without the filename parts. */
export function buildPrompt(input: SuggestInput, taxonomy: Taxonomy): string {
  const date = filenameDate(input.filename);
  return `Analyze this scanned document and suggest metadata values using the predefined tagging taxonomy.

Current filename: ${input.filename ?? "(none)"}
${date ? `- Date found in the filename: ${date}. Prefer it for time-period tags unless the document clearly shows a different date.\n` : ""}
Current metadata:
- Title: ${input.title || "(empty)"}
- Subject: ${input.subject || "(empty)"}
- Keywords: ${input.keywords.length > 0 ? input.keywords.join(", ") : "(empty)"}

${taxonomyText(taxonomy)}

Guidelines:

Title:
- Concise and descriptive, at most 100 characters, sentence case (proper nouns capitalized).
- Specific, not generic: "Foodmart grocery receipt", not "Receipt".

Subject:
- What the document is about, from its content. At most 10 words and 50 characters.

Keywords:
- 3 to 10 tags, all lowercase and hyphenated, using EXACT slugs from the taxonomy above. Never invent a tag.
- Include: document type (required), category (required), vendor if recognized, person if found, action or status tags if they apply, and time-period tags (year-YYYY, month-MM) if the date is clear.
- No duplicates.

Entity matching:
- When you see a person's name, find the matching entry in PEOPLE by full name, partial name or alias, and use its EXACT slug. If they are not listed, leave them out.
- When you see a business name, find the matching entry in VENDORS by name or alias (abbreviations and trading names count when the list records them), and use its EXACT slug. If it is not listed, leave it out.

Consistency: the title, subject and keywords must describe the same document, and a vendor or person named in the title should appear in the keywords.`;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Concise descriptive title, sentence case, at most 100 characters" },
    subject: { type: "string", description: "What the document is about, at most 10 words" },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "3 to 10 exact taxonomy slugs",
    },
  },
  required: ["title", "subject", "keywords"],
} as const;

/** The request body, exported so a test can pin its shape without a network. */
export function suggestRequest(pdf: Uint8Array, filename: string, prompt: string) {
  return {
    model: suggestModel(),
    instructions: SYSTEM_MESSAGE,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename,
            file_data: `data:application/pdf;base64,${Buffer.from(pdf).toString("base64")}`,
          },
          { type: "input_text", text: prompt },
        ],
      },
    ],
    text: { format: { type: "json_schema", name: "pdf_metadata_suggestions", strict: true, schema: SCHEMA } },
  };
}

/** Tidy what the model chose: lowercase, no spaces, no repeats, no decision tags. */
export function cleanKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const tag = value.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !DECISION_TAGS.includes(tag)) seen.add(tag);
  }
  return [...seen];
}

/** The first output_text in a Responses API reply. */
function outputText(json: unknown): string | null {
  const output = (json as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }).output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return null;
}

export function parseSuggestions(json: unknown): Suggestions {
  const text = outputText(json);
  if (!text) throw new SuggestionsFailed("OpenAI returned no answer");
  let parsed: { title?: unknown; subject?: unknown; keywords?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SuggestionsFailed("OpenAI's answer wasn't valid JSON");
  }
  return {
    title: typeof parsed.title === "string" ? parsed.title.trim().slice(0, 100) : "",
    subject: typeof parsed.subject === "string" ? parsed.subject.trim() : "",
    keywords: cleanKeywords(parsed.keywords),
  };
}

/** OpenAI's own limit per file; refusing here gives a clearer message. */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

/**
 * Ask OpenAI for suggestions on one PDF. Reads nothing from the database and
 * writes nothing anywhere: the caller decides what, if anything, to stage.
 */
export async function suggestMetadata(
  pdf: Uint8Array,
  input: SuggestInput,
  fetchImpl: typeof fetch = fetch,
  taxonomyLoader: () => Promise<Taxonomy> = loadTaxonomy,
): Promise<Suggestions> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new SuggestionsUnavailable("AI suggestions are off: no OpenAI key is configured");
  if (pdf.byteLength > MAX_PDF_BYTES) {
    throw new SuggestionsUnavailable("This PDF is over 50 MB, too large for AI suggestions");
  }

  let taxonomy: Taxonomy;
  try {
    taxonomy = await taxonomyLoader();
  } catch (error) {
    if (error instanceof Error && error.name === "EntitiesUnavailable") {
      throw new SuggestionsUnavailable(`AI suggestions are off: ${error.message}`);
    }
    // Notion grants access per database, not per workspace: a token that works
    // for the hub's other databases still gets object_not_found here until the
    // Entities database is shared with its connection.
    const code = (error as { code?: unknown } | null)?.code;
    if (code === "object_not_found" || code === "unauthorized" || code === "restricted_resource") {
      console.error("pdf suggest: Notion refused the Entities database:", error);
      throw new SuggestionsUnavailable(
        "AI suggestions are off: the hub's Notion connection can't read the Entities database. Share it with that connection in Notion",
      );
    }
    throw error;
  }

  const response = await fetchImpl(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(
      suggestRequest(pdf, input.filename ?? "document.pdf", buildPrompt(input, taxonomy)),
    ),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`pdf suggest: OpenAI ${response.status}:`, detail.slice(0, 500));
    throw new SuggestionsFailed(`OpenAI refused the request (${response.status})`);
  }
  return parseSuggestions(await response.json());
}
