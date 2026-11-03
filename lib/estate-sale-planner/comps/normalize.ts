/**
 * The comps cache key (sold-comps design D4), with no dependencies so the device can use it
 * too: lowercase, accents folded, punctuation gone except `#` and a `.` inside a number,
 * spaces collapsed, word order kept. "Lodge No. 8 skillet" and "lodge no 8 skillet" share a
 * row.
 */
export function normalizeQuery(query: string): string {
  return query
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/(\d)\.(?=\d)/g, "$1")
    .replace(/[^\p{L}\p{N}#\s]/gu, " ")
    .replace(//g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * What a lookup is about (design D22): the item's name, mark reading and lot size, normalized.
 * The device keys its own comps on it (`compsKey`) and the server remembers a search and its
 * matches under it, so the same item gets the same answer from any sale.
 */
export function subjectKey(item: { name: string; markReading?: string | null; lotCount?: number }): string {
  return [normalizeQuery(item.name), normalizeQuery(item.markReading ?? ""), item.lotCount && item.lotCount > 1 ? item.lotCount : 1].join("|");
}

/**
 * Cut model text to a length at a word boundary. Strict JSON schema output doesn't enforce
 * `maxLength`, so a long answer is clipped here instead of failing the call (2026-11-03).
 */
export function clipText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : t.slice(0, max)).trimEnd();
}
