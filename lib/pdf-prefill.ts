/**
 * What a document's own text says about it, worked out by rule (task 7i).
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D16.
 *
 * On screen this is "Prefilled". It is matching, not judgment: dates, names the
 * Entities database knows, and the words for a few kinds of document. Each value
 * says where it came from, because any of them can be wrong.
 *
 * Pure: nothing here reads or writes anything, and nothing goes to any service.
 */
import type { Entities, NamedSlug } from "@/lib/pdf-entities";
import { hasEnoughText, SURE_ENOUGH, type KeptPageText } from "@/lib/pdf-page-text";
import type { PdfDocument } from "@/lib/pdf-documents";
import { filenameDate } from "@/lib/pdf-suggest";
import { listedValues } from "@/lib/pdf-shown-values";

/** More pages than this is likely to be several documents (a guess; D16). */
export const LONG_PAGES = 5;

export interface Prefill {
  title: string | null;
  keywords: string[];
  /** Where each value came from: "title", and each keyword by name. */
  why: Record<string, string>;
}

/**
 * Not touched by anyone: no edits, nothing written from here, no tags of its own.
 * A file not read yet may have tags, so it doesn't count.
 */
export function isUntagged(d: PdfDocument): boolean {
  return (
    d.fileBaseline === null &&
    d.fileRead !== null &&
    d.fileRead.revision === d.driveRevisionId &&
    !d.hasPendingEdits &&
    d.committedAt === null &&
    d.supersededAt === null &&
    listedValues(d).keywords.length === 0
  );
}

/** Long, untagged, and nobody has said it is one document: split it first? */
export function asksToSplit(d: PdfDocument): boolean {
  const pages = listedValues(d).pageCount;
  return isUntagged(d) && !d.splitNotNeeded && pages !== null && pages > LONG_PAGES;
}

/** Worth prefilling, if its text says anything. */
export function canPrefill(d: PdfDocument): boolean {
  return isUntagged(d) && !asksToSplit(d);
}

// ---------------------------------------------------------------------------
// Finding names
// ---------------------------------------------------------------------------

const words = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Where a name first appears as whole words, or -1. At least one of the words
 * has to have a capital in it: a shop called Target isn't in "target date".
 */
function findName(text: string[], name: string): number {
  const wanted = words(name);
  if (wanted.length === 0) return -1;
  for (let i = 0; i + wanted.length <= text.length; i++) {
    const here = text.slice(i, i + wanted.length);
    if (here.every((w, j) => same(w, wanted[j])) && here.some((w) => /\p{Lu}|\p{N}/u.test(w))) return i;
  }
  return -1;
}

/** Names worth looking for: two letters alone match anything. */
function names(entity: NamedSlug): string[] {
  return [entity.name, ...entity.aliases].filter((n) => words(n).join("").length >= 3);
}

function firstMention(text: string[], entity: NamedSlug): number {
  const found = names(entity)
    .map((n) => findName(text, n))
    .filter((i) => i >= 0);
  return found.length > 0 ? Math.min(...found) : -1;
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

const STATES: Record<string, string> = Object.fromEntries(
  (
    "al Alabama,ak Alaska,az Arizona,ar Arkansas,ca California,co Colorado,ct Connecticut,de Delaware,dc District of Columbia," +
    "fl Florida,ga Georgia,hi Hawaii,id Idaho,il Illinois,in Indiana,ia Iowa,ks Kansas,ky Kentucky,la Louisiana,me Maine," +
    "md Maryland,ma Massachusetts,mi Michigan,mn Minnesota,ms Mississippi,mo Missouri,mt Montana,ne Nebraska,nv Nevada," +
    "nh New Hampshire,nj New Jersey,nm New Mexico,ny New York,nc North Carolina,nd North Dakota,oh Ohio,ok Oklahoma," +
    "or Oregon,pa Pennsylvania,ri Rhode Island,sc South Carolina,sd South Dakota,tn Tennessee,tx Texas,ut Utah,vt Vermont," +
    "va Virginia,wa Washington,wv West Virginia,wi Wisconsin,wy Wyoming"
  )
    .split(",")
    .map((s) => [s.slice(0, 2), s.slice(3)]),
);

/**
 * The first place on the page that Entities has a tag for: its city with its state
 * right after, as in an address. A city alone is too often a street or a name, and a
 * state alone is on most pages (measured on the tagged documents; task 7i.7).
 */
function findLocation(text: string[], locations: string[]): string | null {
  const found = locations
    .flatMap((tag) => {
      const [, city, state] = tag.match(/^location-(.+)-([a-z]{2})$/) ?? [];
      if (!city || !STATES[state]) return [];
      const at = [state, STATES[state]]
        .map((s) => findName(text, `${city.replace(/-/g, " ")} ${s}`))
        .filter((i) => i >= 0);
      return at.length > 0 ? [{ tag, at: Math.min(...at) }] : [];
    })
    .sort((a, b) => a.at - b.at);
  return found[0]?.tag ?? null;
}

// ---------------------------------------------------------------------------
// Kinds of document
// ---------------------------------------------------------------------------

/**
 * Only words that name a document when they are on it. "Form", "map", "home" and
 * the like are in the vocabulary but are ordinary words.
 */
const TYPE_WORDS: [slug: string, pattern: RegExp][] = [
  ["receipt", /\breceipt\b/i],
  ["invoice", /\binvoice\b/i],
  ["statement", /\b(account|billing|monthly|annual|bank) statement\b|\bstatement (date|period|of)\b/i],
  ["prescription", /\bprescription\b/i],
  ["report-card", /\breport card\b/i],
  ["registration", /\bregistration (certificate|renewal|receipt)\b|\bvehicle registration\b/i],
  ["certificate", /\bcertificate of\b/i],
  ["itinerary", /\bitinerary\b/i],
  ["warranty", /\b(limited|manufacturer'?s?) warranty\b/i],
];

/** What a till prints. Receipts often don't say "receipt". */
const TILL_WORDS = [
  /\bsub ?total\b/i,
  /\bchange( due)?\b/i,
  /\b(visa|mastercard|amex|debit|credit card)\b/i,
  /\b(cashier|register|terminal)\b/i,
  /\b(auth|approval)( code)?\b/i,
  /\bitems? sold\b/i,
];

function documentType(firstPage: string): { slug: string; why: string } | null {
  const named = TYPE_WORDS.map(([slug, pattern]) => ({ slug, at: firstPage.search(pattern) }))
    .filter((t) => t.at >= 0)
    .sort((a, b) => a.at - b.at)[0];
  if (named) return { slug: named.slug, why: `“${named.slug.replace("-", " ")}” on page 1` };
  const till = TILL_WORDS.filter((w) => w.test(firstPage)).length;
  if (till >= 2 && /\btotal\b/i.test(firstPage)) return { slug: "receipt", why: "words a till prints" };
  return null;
}

// ---------------------------------------------------------------------------
// Putting it together
// ---------------------------------------------------------------------------

export interface PrefillInput {
  filename: string | null;
  /** The document's own title, which is kept. */
  title: string | null;
  pages: KeptPageText[];
}

export interface PrefillKnowledge {
  entities: Pick<Entities, "peopleWithNames" | "vendorsWithNames" | "locations">;
  documentTypes: string[];
  categories: string[];
  specials: string[];
}

/** Most people a household document is about. */
const MAX_PEOPLE = 3;

/** A tag can't hold a space (design.md D0). */
const isTag = (s: string) => s !== "" && !/\s/.test(s);

/**
 * What the text says, or null when it says too little to be worth reviewing: a
 * date and a scan flag alone aren't.
 */
export function makePrefill(input: PrefillInput, known: PrefillKnowledge): Prefill | null {
  const readable = input.pages
    .filter((p) => hasEnoughText(p.text) && (p.source === "file" || (p.confidence ?? 0) >= SURE_ENOUGH))
    .sort((a, b) => a.page - b.page);
  if (readable.length === 0 || readable.length * 2 < input.pages.length) return null;

  const first = readable[0];
  const firstPage = first.text;
  const onFirst = words(firstPage);
  const inName = words((input.filename ?? "").replace(/\.pdf$/i, ""));
  const why: Record<string, string> = {};
  const keywords: string[] = [];
  const add = (tag: string, reason: string) => {
    if (!isTag(tag) || keywords.includes(tag)) return;
    keywords.push(tag);
    why[tag] = reason;
  };
  const onPage = `page ${first.page}`;

  const type = documentType(firstPage);
  if (type && known.documentTypes.includes(type.slug)) add(type.slug, `${type.why[0].toUpperCase()}${type.why.slice(1)}`);

  // One vendor: the one the scanner's filename names, else the first on the page.
  const vendor = known.entities.vendorsWithNames
    .map((v) => ({ v, inName: firstMention(inName, v), onPage: firstMention(onFirst, v) }))
    .filter((m) => m.inName >= 0 || m.onPage >= 0)
    .sort(
      (a, b) =>
        Number(b.inName >= 0) - Number(a.inName >= 0) ||
        (a.onPage < 0 ? Infinity : a.onPage) - (b.onPage < 0 ? Infinity : b.onPage) ||
        // "Example Utility" before "Example", where both start at the same word.
        words(b.v.name).length - words(a.v.name).length ||
        (a.v.slug < b.v.slug ? -1 : 1),
    )[0];
  const categories: string[] = [];
  if (vendor) {
    for (const category of vendor.v.categories ?? []) {
      const slug = category.trim().toLowerCase().replace(/\s+/g, "-");
      if (known.categories.includes(slug)) categories.push(slug);
    }
    for (const c of categories) add(c, "Vendor’s category from Entities");
    add(vendor.v.slug, vendor.inName >= 0 ? "Vendor’s name in the filename" : `Vendor’s name on ${onPage}`);
  }

  // One place: the vendor's own, else the one the page names.
  const place = findLocation(onFirst, known.entities.locations);
  if (vendor?.v.location) add(vendor.v.location, "Vendor’s location from Entities");

  // People by full name only: a first name alone could be anyone.
  let people = 0;
  for (const person of known.entities.peopleWithNames) {
    const full = { ...person, aliases: person.aliases.filter((a) => words(a).length >= 2) };
    const found =
      (words(person.name).length >= 2 && findName(onFirst, person.name) >= 0) ||
      full.aliases.some((a) => findName(onFirst, a) >= 0);
    if (found && people < MAX_PEOPLE) {
      add(person.slug, `Person’s name on ${onPage}`);
      people += 1;
    }
  }

  // A place, like a date or a scan, isn't worth reviewing on its own.
  if (keywords.length === 0) return null;
  if (place && !vendor?.v.location) add(place, `City and state on ${onPage}`);

  if (known.specials.includes("original-scan") && input.pages.every((p) => p.source === "ocr")) {
    add("original-scan", "Every page is a picture");
  }
  const date = filenameDate(input.filename);
  if (date) {
    add(`year-${date.slice(0, 4)}`, "Date from the filename");
    add(`month-${date.slice(5, 7)}`, "Date from the filename");
  }

  let title: string | null = null;
  if (!input.title && vendor && type) {
    // "Foodmart grocery receipt": the category only where it says what kind.
    const kind = type.slug === "receipt" && categories.length === 1 ? `${categories[0]} ` : "";
    title = `${vendor.v.name} ${kind}${type.slug.replace("-", " ")}`;
    why.title = `From the vendor’s name and ${type.why}`;
  }
  return { title, keywords, why };
}
