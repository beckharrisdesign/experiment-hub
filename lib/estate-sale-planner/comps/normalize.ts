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
