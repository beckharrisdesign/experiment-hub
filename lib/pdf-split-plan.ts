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
