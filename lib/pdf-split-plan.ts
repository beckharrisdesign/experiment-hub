/**
 * The pure half of splitting, shared by the server (lib/pdf-split.ts) and the
 * split page in the browser, so both describe the same parts the same way.
 */

/** The breaks don't describe a split of this document. */
export class InvalidSplit extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSplit";
  }
}

/**
 * Pages each part takes, 1-based and inclusive, from breaks that each say
 * "split after this page". Breaks must be whole pages strictly inside the
 * document; order and repeats don't matter.
 */
export function planParts(pageCount: number, breaks: number[]): Array<[number, number]> {
  if (!Number.isInteger(pageCount) || pageCount < 2) {
    throw new InvalidSplit("A document needs at least two pages to split");
  }
  const after = [...new Set(breaks)].sort((a, b) => a - b);
  if (after.length === 0) throw new InvalidSplit("Choose at least one place to split");
  for (const b of after) {
    if (!Number.isInteger(b) || b < 1 || b >= pageCount) {
      throw new InvalidSplit(`A split must fall between pages 1 and ${pageCount}`);
    }
  }
  const parts: Array<[number, number]> = [];
  let start = 1;
  for (const b of after) {
    parts.push([start, b]);
    start = b + 1;
  }
  parts.push([start, pageCount]);
  return parts;
}

/** v1's naming: the original's name with -001, -002, … before the extension. */
export function partName(filename: string | null, index: number): string {
  const base = (filename ?? "document.pdf").replace(/\.pdf$/i, "");
  return `${base}-${String(index).padStart(3, "0")}.pdf`;
}

/** What a part is called before it's tagged: its title and its file's name. */
export interface PartNaming {
  title: string | null;
  filename: string;
}

export interface NamingChoices {
  /** The title the parts share, typed on the split page or the scan's own. */
  title: string;
  /** "Camp art" becomes "Camp art, 1 of 3". */
  number: boolean;
  /** Files take their titles' names instead of the scan's. */
  nameFromTitle: boolean;
  /**
   * Titles typed for one part, by the part's first page: adding or removing a
   * break elsewhere leaves them with the pages they were typed for.
   */
  edited: ReadonlyMap<number, string>;
}

const MAX_NAME = 150;

/**
 * A file name without its extension, safe anywhere the file might be synced to:
 * no control characters, none of \\ / : * ? " < > |, no doubled spaces, nothing
 * hidden or trailing by way of dots. Empty when nothing is left.
 */
export function safeFileName(name: string): string {
  return name
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME)
    .replace(/^[. ]+|[. ]+$/g, "");
}

/** The title each part gets. */
export function partTitles(
  parts: Array<[number, number]>,
  { title, number, edited }: Pick<NamingChoices, "title" | "number" | "edited">,
): string[] {
  const base = title.trim();
  return parts.map(([first], i) => {
    const own = edited.get(first);
    if (own !== undefined) return own.trim();
    return base && number && parts.length > 1 ? `${base}, ${i + 1} of ${parts.length}` : base;
  });
}

/** Title and file name for every part, as the split page shows and sends them. */
export function namePartsOf(
  filename: string | null,
  parts: Array<[number, number]>,
  choices: NamingChoices,
): PartNaming[] {
  const titles = partTitles(parts, choices);
  const base = safeFileName(choices.title);
  const width = String(parts.length).length;
  const used = new Set<string>();
  return parts.map(([first], i) => {
    const title = titles[i] || null;
    let stem = "";
    if (choices.nameFromTitle && title) {
      const numbered = choices.number && !choices.edited.has(first) && parts.length > 1;
      // Padded, so nineteen files sort in page order: "Camp art 01".
      // A title no file could carry leaves nothing to number.
      if (!numbered) stem = safeFileName(title);
      else if (base) stem = `${base} ${String(i + 1).padStart(width, "0")}`;
    }
    if (!stem) stem = partName(filename, i + 1).replace(/\.pdf$/i, "");
    let unique = stem;
    for (let n = 2; used.has(unique.toLowerCase()); n++) unique = `${stem} ${n}`;
    used.add(unique.toLowerCase());
    return { title, filename: `${unique}.pdf` };
  });
}

/**
 * This document was split; its parts are the documents now. Editing or
 * committing the original would change a file nothing lists any more.
 */
export class DocumentReplaced extends Error {
  constructor(message = "This document was split into parts. Edit the parts instead.") {
    super(message);
    this.name = "DocumentReplaced";
  }
}
