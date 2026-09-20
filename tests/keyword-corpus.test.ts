import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  bulkValueLabel,
  coverageLabel,
  loadKeywordCorpus,
  toRankedMatch,
} from "@/lib/keyword-corpus";
import { demandRatio, totalTagOccurrences } from "@/lib/keyword-metrics";

const REPO = path.resolve(__dirname, "..");
const PULLS = path.join(REPO, "docs", "pulls");

/**
 * Rows the generator will actually keep across the archived eRank keyword
 * exports — computed by calling its own `read_keyword_csv()`, not by
 * re-parsing CSVs in TypeScript.
 *
 * A naive "non-empty lines minus header" count diverges once a real export
 * carries eRank's long-tail suggestions: `christmas-embroidery.csv` has 702
 * rows, 686 of them missing Competition/KD (eRank found the phrase but
 * couldn't score it). `read_keyword_csv()` drops those on purpose — a
 * fabricated 0 would read as "no demand" — so the test has to agree with
 * that rule instead of assuming every physical line survives.
 */
function generatorKeptRowCount(): number {
  const out = execFileSync(
    "python3",
    [
      "-c",
      [
        "import importlib.util, json, pathlib",
        "spec = importlib.util.spec_from_file_location('ip', 'scripts/ingest-pulls.py')",
        "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
        "total = 0",
        "for capture, query, path in m.keyword_csvs():",
        "    total += len(m.read_keyword_csv(path))",
        "print(json.dumps(total))",
      ].join("\n"),
    ],
    { cwd: REPO, encoding: "utf8" },
  );
  return JSON.parse(out);
}

/** Run the generator in-process and return the corpus it would write. */
function buildCorpusViaScript(pulls?: string): {
  captures: { date: string }[];
  rows: {
    keyword: string;
    capture: string;
    searches: number | null;
    competition: number | null;
    kd: number | null;
    found_via: { query: string; tag_occurrences: number }[];
    current: boolean;
    superseded_by: string | null;
    coverage: { seen: number; of: number };
    ranked: {
      best: number;
      matches: { listing: string; page: number; position: number }[];
    } | null;
  }[];
} {
  const arg = pulls ? `pathlib.Path(${JSON.stringify(pulls)})` : "None";
  const out = execFileSync(
    "python3",
    [
      "-c",
      [
        "import importlib.util, json, pathlib",
        "spec = importlib.util.spec_from_file_location('ip', 'scripts/ingest-pulls.py')",
        "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
        `print(json.dumps(m.build_corpus(${arg})))`,
      ].join("\n"),
    ],
    { cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

/**
 * Call `read_keyword_csv()` directly against a given file and return its
 * parsed rows verbatim.
 *
 * Independent of `generatorKeptRowCount()` above: that helper proves the
 * *archive-wide total* agrees with the generator, which would stay green
 * even if a regression inside `read_keyword_csv()` dropped one row and kept
 * an extra malformed one, netting the same count. This checks the mapping
 * itself — known input rows in, known output rows out — against a small
 * fixture built for the purpose, not the real archive.
 */
function readKeywordCsvViaScript(csvPath: string): {
  keyword: string;
  searches: number;
  competition: number;
  kd: number;
  tag_occurrences: number;
}[] {
  const out = execFileSync(
    "python3",
    [
      "-c",
      [
        "import importlib.util, json, pathlib, sys",
        "spec = importlib.util.spec_from_file_location('ip', 'scripts/ingest-pulls.py')",
        "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
        `print(json.dumps(m.read_keyword_csv(pathlib.Path(${JSON.stringify(csvPath)}))))`,
      ].join("\n"),
    ],
    { cwd: REPO, encoding: "utf8" },
  );
  return JSON.parse(out);
}

interface RawBulkRow {
  keyword: string;
  avg_searches: number | null;
  avg_searches_censored: boolean;
  avg_clicks: number | null;
  avg_clicks_censored: boolean;
  avg_ctr: number | null;
  avg_ctr_censored: boolean;
  etsy_competition: number | null;
  kd: number | null;
}

function readBulkKeywordsCsvViaScript(csvPath: string): RawBulkRow[] {
  const out = execFileSync(
    "python3",
    [
      "-c",
      [
        "import importlib.util, json, pathlib, sys",
        "spec = importlib.util.spec_from_file_location('ip', 'scripts/ingest-pulls.py')",
        "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
        `print(json.dumps(m.read_bulk_keywords_csv(pathlib.Path(${JSON.stringify(csvPath)}))))`,
      ].join("\n"),
    ],
    { cwd: REPO, encoding: "utf8" },
  );
  return JSON.parse(out);
}

/** Same idea as `readKeywordCsvViaScript`, for the Spotted on Etsy parser. */
function readSpottedOnEtsyCsvViaScript(csvPath: string): {
  search_term: string;
  listing: string;
  page: number;
  position: number;
}[] {
  const out = execFileSync(
    "python3",
    [
      "-c",
      [
        "import importlib.util, json, pathlib, sys",
        "spec = importlib.util.spec_from_file_location('ip', 'scripts/ingest-pulls.py')",
        "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
        `print(json.dumps(m.read_spotted_on_etsy_csv(pathlib.Path(${JSON.stringify(csvPath)}))))`,
      ].join("\n"),
    ],
    { cwd: REPO, encoding: "utf8" },
  );
  return JSON.parse(out);
}

function buildBulkCorpusViaScript(pulls?: string): {
  captures: { date: string; files: number }[];
  rows: (RawBulkRow & {
    capture: string;
    current: boolean;
    superseded_by: string | null;
  })[];
} {
  const arg = pulls ? `pathlib.Path(${JSON.stringify(pulls)})` : "None";
  const out = execFileSync(
    "python3",
    [
      "-c",
      [
        "import importlib.util, json, pathlib",
        "spec = importlib.util.spec_from_file_location('ip', 'scripts/ingest-pulls.py')",
        "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
        `print(json.dumps(m.build_bulk_corpus(${arg})))`,
      ].join("\n"),
    ],
    { cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

describe("read_keyword_csv row-keeping, against a hand-built fixture", () => {
  // Five rows chosen to exercise every branch of the drop rule directly,
  // independent of whatever the real archive happens to contain today:
  // two clean rows, a comma-formatted number, a row eRank couldn't score
  // (Competition "-", KD empty — the christmas-embroidery.csv shape), and a
  // row with no keyword at all.
  const dir = mkdtempSync(path.join(tmpdir(), "kw-fixture-"));
  const fixture = path.join(dir, "2026-09-17-erank-keywords-fixturetest.csv");
  writeFileSync(
    fixture,
    [
      '"Keywords","Average Searches","Competition","KD","Tag Occurrences"',
      '"clean row one",100,200,"10","5"',
      '"clean row two",300,400,"20","7"',
      '"comma formatted",1234,"46,800","64","1"',
      '"unscorable long tail",50,"-","","0"',
      '"",10,20,"5","1"',
    ].join("\n"),
    "utf8",
  );

  const rows = readKeywordCsvViaScript(fixture);

  it("keeps every fully-numeric row, dropping nothing that should survive", () => {
    expect(rows.map((r) => r.keyword)).toContain("clean row one");
    expect(rows.map((r) => r.keyword)).toContain("clean row two");
  });

  it("strips commas from thousands-formatted numbers rather than dropping the row", () => {
    const row = rows.find((r) => r.keyword === "comma formatted");
    expect(row).toBeDefined();
    expect(row!.competition).toBe(46800);
  });

  it("drops a row eRank couldn't score, by value, not just by count", () => {
    // The exact row-keeping decision, not an aggregate that could hide a
    // compensating bug elsewhere in the parser.
    expect(rows.map((r) => r.keyword)).not.toContain("unscorable long tail");
  });

  it("skips a row with no keyword", () => {
    expect(rows.some((r) => r.keyword === "")).toBe(false);
  });

  it("keeps exactly the three rows the fixture says it should, no more and no fewer", () => {
    expect(rows.map((r) => r.keyword).sort()).toEqual(
      ["clean row one", "clean row two", "comma formatted"].sort(),
    );
  });
});

describe("read_bulk_keywords_csv, against a hand-built fixture", () => {
  // Six rows chosen to exercise every value shape the Bulk Keywords export
  // actually uses, none of which read_keyword_csv() ever sees: a clean
  // number, a censored "< 20" (real signal, capped, not the same as
  // unscored), "Unknown" (genuinely unscored), a percentage, a comma-
  // formatted thousands number, and a blank Keyword Difficulty.
  const dir = mkdtempSync(path.join(tmpdir(), "bulk-fixture-"));
  const fixture = path.join(
    dir,
    "2026-09-18-erank-bulk-keywords-fixturetest.csv",
  );
  writeFileSync(
    fixture,
    [
      '"Keywords","Avg Searches","Avg Clicks","Avg CTR","Etsy Competition","Keyword Difficulty"',
      '"clean row",368,399,"108%","1,969,232","100"',
      '"censored row","< 20","< 20","< 20%","37,062","100"',
      '"unscored row","Unknown","Unknown","Unknown","Unknown",""',
      '"",10,20,"5%","1,000","5"',
    ].join("\n"),
    "utf8",
  );

  const rows = readBulkKeywordsCsvViaScript(fixture);

  it("parses a clean numeric row without censoring it", () => {
    const row = rows.find((r) => r.keyword === "clean row")!;
    expect(row).toBeDefined();
    expect(row.avg_searches).toBe(368);
    expect(row.avg_searches_censored).toBe(false);
    expect(row.etsy_competition).toBe(1969232);
    expect(row.avg_ctr).toBe(108);
  });

  it("keeps a censored '< 20' distinct from both a real number and unscored", () => {
    const row = rows.find((r) => r.keyword === "censored row")!;
    expect(row.avg_searches).toBe(20);
    expect(row.avg_searches_censored).toBe(true);
    expect(row.avg_ctr).toBe(20);
    expect(row.avg_ctr_censored).toBe(true);
  });

  it("reads 'Unknown' and a blank Keyword Difficulty as null, never 0", () => {
    const row = rows.find((r) => r.keyword === "unscored row")!;
    expect(row.avg_searches).toBeNull();
    expect(row.avg_searches_censored).toBe(false);
    expect(row.etsy_competition).toBeNull();
    expect(row.kd).toBeNull();
  });

  it("skips a row with no keyword", () => {
    expect(rows.some((r) => r.keyword === "")).toBe(false);
  });

  it("keeps every row with a keyword, even one that is fully unscored", () => {
    // Unlike read_keyword_csv(), which drops an unscorable row, a Bulk
    // Keywords suggestion with no numbers is still a real related term.
    expect(rows.map((r) => r.keyword).sort()).toEqual(
      ["censored row", "clean row", "unscored row"].sort(),
    );
  });
});

describe("keyword corpus generation", () => {
  const corpus = buildCorpusViaScript();

  it("represents every kept CSV row as a query hit, and every hit as a kept row", () => {
    const hits = corpus.rows.reduce((n, r) => n + r.found_via.length, 0);
    // Every row the generator's own parser keeps becomes exactly one query
    // hit somewhere in the corpus — nothing extra, nothing lost. Compared
    // against the archive's real row count, not a fixed number: the archive
    // grows every time Katy lands a new pull.
    expect(hits).toBe(generatorKeptRowCount());
    // Multiple rows collapse into one keyword row whenever the same keyword
    // surfaces under more than one query — the row count is always <= hits.
    expect(corpus.rows.length).toBeLessThanOrEqual(hits);
  });

  it("keeps tag occurrences per query rather than merging them", () => {
    const row = corpus.rows.find((r) => r.keyword === "embroidery font");
    expect(row).toBeDefined();
    const byQuery = Object.fromEntries(
      row!.found_via.map((h) => [h.query, h.tag_occurrences]),
    );
    // The four counts from the original 2026-09-17 keyword batch — 80, 81,
    // 12 and 6 across four different queries the same day — must still be
    // present exactly. This is a subset check, not full equality: later
    // pulls are expected to surface "embroidery font" under new queries too
    // (that's the corpus doing its job), and each addition is its own
    // separate entry rather than merged into one of these four.
    expect(byQuery["embroidery designs"]).toBe(6);
    expect(byQuery["embroidery font"]).toBe(81);
    expect(byQuery["embroidery fonts"]).toBe(80);
    expect(byQuery["font bundle"]).toBe(12);
  });

  it("carries keyword-scoped fields once, not once per query", () => {
    const row = corpus.rows.find((r) => r.keyword === "embroidery font")!;
    // At least the original four queries; more may have joined since.
    expect(row.found_via.length).toBeGreaterThanOrEqual(4);
    // searches is a single number on the row, not an array or a per-query field
    expect(row.searches).toBe(2475);
    expect(
      Array.isArray((row as unknown as { searches: unknown }).searches),
    ).toBe(false);
  });

  it("never emits a zero or negative from absence", () => {
    // The exports are hand-filtered, so a keyword missing from a query is
    // unexplained. Every tag-occurrence value present must come from a CSV
    // cell; coverage must never exceed the capture count.
    //
    // The floor is 1 -- except for a ranked-only row (searches null): one
    // exists specifically *because* it was never in any Keyword Tool
    // capture, so "seen in 0 of N" is the true count there, not an omission.
    for (const row of corpus.rows) {
      const floor = row.searches === null ? 0 : 1;
      expect(row.coverage.seen).toBeGreaterThanOrEqual(floor);
      expect(row.coverage.seen).toBeLessThanOrEqual(row.coverage.of);
      for (const hit of row.found_via) {
        expect(hit.tag_occurrences).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(hit.tag_occurrences)).toBe(true);
      }
    }
  });

  it("marks current vs. superseded consistently, whatever the archive holds today", () => {
    // Not a fixed count: the real archive grows, and a repeat pull of an
    // existing seed (as of 2026-09-18, `wall art`) legitimately supersedes
    // some earlier rows. What must always hold, independent of how many
    // captures exist: a current row has no superseded_by, a superseded row
    // always points to a strictly later capture than its own, and every row
    // belongs to one of the archive's own captures.
    const captureDates = corpus.captures.map((c) => c.date);
    for (const row of corpus.rows) {
      expect(captureDates).toContain(row.capture);
      if (row.current) {
        expect(row.superseded_by).toBeNull();
      } else {
        expect(row.superseded_by).not.toBeNull();
        expect(row.superseded_by! > row.capture).toBe(true);
      }
    }
  });
});

describe("a repeat capture extends the series", () => {
  // A synthetic second capture of one query, built in a temp dir so the real
  // archive is untouched. This is the case the corpus exists for and the one
  // the single-capture archive cannot exercise yet.
  const dir = mkdtempSync(path.join(tmpdir(), "kw-corpus-"));
  const source = path.join(
    PULLS,
    "2026-09-17-erank-keywords-embroidery-font.csv",
  );
  copyFileSync(
    source,
    path.join(dir, "2026-09-17-erank-keywords-halloween.csv"),
  );
  copyFileSync(
    source,
    path.join(dir, "2026-12-01-erank-keywords-halloween.csv"),
  );

  const corpus = buildCorpusViaScript(dir);
  const rows = corpus.rows.filter((r) => r.keyword === "embroidery font");

  it("keeps both captures readable rather than overwriting", () => {
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.capture).sort()).toEqual([
      "2026-09-17",
      "2026-12-01",
    ]);
  });

  it("makes the newest current and points the older at it", () => {
    const current = rows.find((r) => r.current)!;
    const older = rows.find((r) => !r.current)!;
    expect(current.capture).toBe("2026-12-01");
    expect(current.superseded_by).toBeNull();
    expect(older.capture).toBe("2026-09-17");
    expect(older.superseded_by).toBe("2026-12-01");
  });

  it("reports coverage as seen-in-N-of-M, never as a decline", () => {
    for (const row of rows) {
      expect(row.coverage).toEqual({ seen: 2, of: 2 });
    }
    // A keyword in only one of the two captures reads 1 of 2 — a count, with
    // no field anywhere saying it fell, vanished, or hit zero.
    const partial = corpus.rows.filter((r) => r.coverage.seen === 1);
    for (const row of partial) {
      expect(row.coverage.of).toBe(2);
      expect(Object.keys(row)).not.toContain("delta");
      expect(Object.keys(row)).not.toContain("declined");
    }
  });
});

describe("bulk keyword corpus, against the real archive", () => {
  const bulk = buildBulkCorpusViaScript();

  it("dedupes a keyword repeated across same-day Bulk Keywords exports", () => {
    // The 2026-09-18 archive has six Bulk Keywords exports over overlapping
    // seed lists; several terms (e.g. `embroidery wall art`) appear in more
    // than one file. Each must land as exactly one row per capture day, not
    // once per file it happened to appear in.
    const byKeyword = new Map<string, number>();
    for (const row of bulk.rows) {
      const key = `${row.capture}:${row.keyword.toLowerCase()}`;
      byKeyword.set(key, (byKeyword.get(key) ?? 0) + 1);
    }
    for (const count of byKeyword.values()) {
      expect(count).toBe(1);
    }
  });

  it("never coerces a censored or unscored value to 0", () => {
    for (const row of bulk.rows) {
      if (row.avg_searches === null) {
        expect(row.avg_searches_censored).toBe(false);
      }
      if (row.avg_searches_censored) {
        expect(row.avg_searches).not.toBe(0);
        expect(row.avg_searches).not.toBeNull();
      }
    }
  });

  it("keeps every row with a keyword, including fully-unscored suggestions", () => {
    expect(bulk.rows.length).toBeGreaterThan(0);
    expect(bulk.rows.some((r) => r.avg_searches === null)).toBe(true);
  });
});

describe("a repeat bulk capture extends the series", () => {
  // A synthetic second capture of one Bulk Keywords export, built in a temp
  // dir so the real archive is untouched — the same case the single-day
  // real archive can't exercise yet.
  const dir = mkdtempSync(path.join(tmpdir(), "bulk-repeat-"));
  const source = path.join(PULLS, "2026-09-18-erank-bulk-keywords.csv");
  copyFileSync(source, path.join(dir, "2026-09-18-erank-bulk-keywords.csv"));
  copyFileSync(source, path.join(dir, "2026-12-01-erank-bulk-keywords.csv"));

  const bulk = buildBulkCorpusViaScript(dir);
  const rows = bulk.rows.filter((r) => r.keyword === "embroidery kits");

  it("keeps both captures readable rather than overwriting", () => {
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.capture).sort()).toEqual([
      "2026-09-18",
      "2026-12-01",
    ]);
  });

  it("makes the newest current and points the older at it", () => {
    const current = rows.find((r) => r.current)!;
    const older = rows.find((r) => !r.current)!;
    expect(current.capture).toBe("2026-12-01");
    expect(current.superseded_by).toBeNull();
    expect(older.capture).toBe("2026-09-18");
    expect(older.superseded_by).toBe("2026-12-01");
  });
});

describe("Ranked: joined from erank-spotted-on-etsy, against a fixture", () => {
  // Fully synthetic Spotted on Etsy export, not a copy of the real archived
  // CSV: depending on live docs/pulls content would make this test brittle
  // against a future re-pull changing "snow globe"'s real positions, or the
  // file simply being renamed/superseded — the same class of brittleness
  // already fixed elsewhere in this file. Every value here is owned by the
  // test.
  //
  // The Search Term casing ("Snow Globe") deliberately differs from the
  // keyword CSV's ("snow globe") to actually exercise the join's
  // case-insensitive match — same casing on both sides would pass this test
  // even if the `.lower()` normalisation regressed.
  const dir = mkdtempSync(path.join(tmpdir(), "kw-ranked-"));
  writeFileSync(
    path.join(dir, "2026-09-17-erank-spotted-on-etsy.csv"),
    [
      '"Shop/Listing","Search Term","Page","Position","Spotted By"',
      '"Listing A","Snow Globe",2,38,"eRank Monitor"',
      '"Listing B","Snow Globe",2,8,"eRank Monitor"',
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(dir, "2026-09-17-erank-keywords-test.csv"),
    [
      '"Keywords","Average Searches","Competition","KD","Tag Occurrences"',
      '"snow globe",210,180,"22","5"',
      '"unrelated thing",10,5,"3","1"',
    ].join("\n"),
    "utf8",
  );

  const corpus = buildCorpusViaScript(dir);
  const matched = corpus.rows.find((r) => r.keyword === "snow globe")!;
  const unmatched = corpus.rows.find((r) => r.keyword === "unrelated thing")!;

  it("attaches the best (lowest) position across every ranking listing", () => {
    expect(matched.ranked).not.toBeNull();
    expect(matched.ranked!.best).toBe(8);
  });

  it("retains every matching listing, not just the best one", () => {
    expect(matched.ranked!.matches).toHaveLength(2);
    expect(
      matched.ranked!.matches.map((m) => m.position).sort((a, b) => a - b),
    ).toEqual([8, 38]);
  });

  it("leaves ranked null, never 0, for a keyword with no Spotted on Etsy match", () => {
    expect(unmatched.ranked).toBeNull();
  });
});

describe("Ranked: a term with no Keyword Tool row still gets its own row", () => {
  // Katy, 2026-09-18: "add a row for the ranked keywords even if they don't
  // have entries from the erank data." "wooden wick candle" appears only in
  // the Spotted on Etsy fixture, never in the Keyword Tool one — the case
  // that used to make a ranked term invisible entirely, for lack of a row to
  // attach `ranked` to.
  const dir = mkdtempSync(path.join(tmpdir(), "kw-ranked-only-"));
  writeFileSync(
    path.join(dir, "2026-09-17-erank-spotted-on-etsy.csv"),
    [
      '"Shop/Listing","Search Term","Page","Position","Spotted By"',
      '"Listing A","Wooden Wick Candle",1,17,"eRank Monitor"',
      '"Listing B","snow globe",2,8,"eRank Monitor"',
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(dir, "2026-09-17-erank-keywords-test.csv"),
    [
      '"Keywords","Average Searches","Competition","KD","Tag Occurrences"',
      '"snow globe",210,180,"22","5"',
    ].join("\n"),
    "utf8",
  );

  const corpus = buildCorpusViaScript(dir);
  const row = corpus.rows.find((r) => r.keyword === "Wooden Wick Candle")!;

  it("exists as a row, at all", () => {
    expect(row).toBeDefined();
  });

  it("keeps the original casing from the Spotted on Etsy export, not the lowercase match key", () => {
    expect(row.keyword).toBe("Wooden Wick Candle");
  });

  it("carries the real ranking, not a fabricated one", () => {
    expect(row.ranked).not.toBeNull();
    expect(row.ranked!.best).toBe(17);
    expect(row.ranked!.matches).toHaveLength(1);
  });

  it("leaves searches, competition and KD null, never 0", () => {
    // 0 would read as "no demand" for a term W&H demonstrably ranks for —
    // exactly the fabricated-zero bug this archive exists to prevent.
    expect(row.searches).toBeNull();
    expect(row.competition).toBeNull();
    expect(row.kd).toBeNull();
  });

  it("reports coverage as seen in 0 of the Keyword Tool captures, the true count", () => {
    expect(row.coverage).toEqual({ seen: 0, of: 1 });
  });

  it("is current with no found_via queries, not a stray placeholder", () => {
    expect(row.current).toBe(true);
    expect(row.superseded_by).toBeNull();
    expect(row.found_via).toEqual([]);
  });

  it("does not duplicate a term that IS in the Keyword Tool export", () => {
    // "snow globe" is in both fixtures — it must stay the one, ordinary
    // Keyword Tool row (with its real searches/competition/kd), not also
    // spawn a second, ranked-only row for the same keyword.
    const snowGlobeRows = corpus.rows.filter(
      (r) => r.keyword.toLowerCase() === "snow globe",
    );
    expect(snowGlobeRows).toHaveLength(1);
    expect(snowGlobeRows[0].searches).toBe(210);
  });
});

describe("Ranked: a re-pull of the same term/listing does not duplicate the match", () => {
  // Repeat captures are an intentional part of this archive (proposal.md §
  // Why), but RankedListingMatch carries no capture identifier — so two
  // Spotted on Etsy exports observing the same listing for the same term
  // must collapse to one match, not grow `matches` by one entry per re-pull.
  // "Listing A" appears in both captures at different positions (38, then a
  // later re-pull sees it improve to 8); "Listing B" appears only in the
  // second capture, proving a genuinely new listing still gets its own entry.
  const dir = mkdtempSync(path.join(tmpdir(), "kw-ranked-repull-"));
  writeFileSync(
    path.join(dir, "2026-09-17-erank-spotted-on-etsy.csv"),
    [
      '"Shop/Listing","Search Term","Page","Position","Spotted By"',
      '"Listing A","snow globe",2,38,"eRank Monitor"',
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(dir, "2026-12-01-erank-spotted-on-etsy.csv"),
    [
      '"Shop/Listing","Search Term","Page","Position","Spotted By"',
      '"Listing A","snow globe",1,8,"eRank Monitor"',
      '"Listing B","snow globe",2,15,"eRank Monitor"',
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(dir, "2026-09-17-erank-keywords-test.csv"),
    [
      '"Keywords","Average Searches","Competition","KD","Tag Occurrences"',
      '"snow globe",210,180,"22","5"',
    ].join("\n"),
    "utf8",
  );

  const corpus = buildCorpusViaScript(dir);
  const matched = corpus.rows.find((r) => r.keyword === "snow globe")!;

  it("keeps one match per distinct listing, not one per observation", () => {
    // Two captures observed "Listing A"; without dedup this would be 3.
    expect(matched.ranked!.matches).toHaveLength(2);
    expect(matched.ranked!.matches.map((m) => m.listing).sort()).toEqual([
      "Listing A",
      "Listing B",
    ]);
  });

  it("keeps the better (lower) position when the same listing recurs across captures", () => {
    const listingA = matched.ranked!.matches.find(
      (m) => m.listing === "Listing A",
    )!;
    expect(listingA.position).toBe(8);
  });

  it("computes best across the deduped listings, not the raw observation count", () => {
    expect(matched.ranked!.best).toBe(8);
  });
});

describe("read_spotted_on_etsy_csv row-keeping, against a hand-built fixture", () => {
  // The blank/non-positive guard exists specifically to protect the
  // blank-never-zero invariant (a Copilot-round fix on this same PR) — a
  // fixture that never exercises it would let a regression back in silently.
  const dir = mkdtempSync(path.join(tmpdir(), "kw-spotted-fixture-"));
  const fixture = path.join(
    dir,
    "2026-09-17-erank-spotted-on-etsy-fixturetest.csv",
  );
  writeFileSync(
    fixture,
    [
      '"Shop/Listing","Search Term","Page","Position","Spotted By"',
      '"Good listing","good term",1,7,"eRank Monitor"',
      '"Blank position","blank position term",1,,"eRank Monitor"',
      '"Blank page","blank page term",,5,"eRank Monitor"',
      '"Zero position","zero position term",1,0,"eRank Monitor"',
    ].join("\n"),
    "utf8",
  );

  const rows = readSpottedOnEtsyCsvViaScript(fixture);

  it("keeps a fully-numeric row", () => {
    expect(rows.map((r) => r.search_term)).toContain("good term");
  });

  it("drops a row with a blank Position rather than defaulting it to 0", () => {
    expect(rows.map((r) => r.search_term)).not.toContain("blank position term");
  });

  it("drops a row with a blank Page rather than defaulting it to 0", () => {
    expect(rows.map((r) => r.search_term)).not.toContain("blank page term");
  });

  it("drops a row with a non-positive Position", () => {
    expect(rows.map((r) => r.search_term)).not.toContain("zero position term");
  });

  it("keeps exactly the one valid row, no more and no fewer", () => {
    expect(rows.map((r) => r.search_term)).toEqual(["good term"]);
  });
});

describe("toRankedMatch — snake_case to camelCase at the loader boundary", () => {
  // The checked-in corpus is all `ranked: null` today, so loadKeywordCorpus()
  // alone never exercises the non-null branch of this mapping. Tested
  // directly against a hand-built non-null raw row so a typo'd field or a
  // dropped match can't hide behind an all-null corpus staying green.
  it("maps every field through for a non-null match, dropping nothing", () => {
    const result = toRankedMatch({
      best: 8,
      matches: [
        { listing: "Listing A", page: 2, position: 38 },
        { listing: "Listing B", page: 2, position: 8 },
      ],
    });
    expect(result).toEqual({
      best: 8,
      matches: [
        { listing: "Listing A", page: 2, position: 38 },
        { listing: "Listing B", page: 2, position: 8 },
      ],
    });
  });

  it("passes null through as null", () => {
    expect(toRankedMatch(null)).toBeNull();
  });
});

describe("corpus loader", () => {
  const corpus = loadKeywordCorpus();

  it("normalises the generated file into camelCase rows", () => {
    expect(corpus.rows.length).toBeGreaterThan(0);
    const row = corpus.rows.find((r) => r.keyword === "embroidery font")!;
    // The original four counts must still be in there; later pulls may have
    // added more (see the generation describe block above), so this checks
    // containment rather than the exact set.
    const counts = row.keywordTool!.foundVia.map((h) => h.tagOccurrences);
    for (const expected of [6, 12, 80, 81]) {
      expect(counts).toContain(expected);
    }
    expect(row.keywordTool!.supersededBy).toBeNull();
  });

  it("sums tag occurrences only as a sort key, keeping the parts", () => {
    const row = corpus.rows.find((r) => r.keyword === "embroidery font")!;
    // The sum must always equal the sum of the parts on the row itself — a
    // self-consistency check, not a fixed total that would go stale every
    // time a new query surfaces this keyword.
    const expectedSum = row.keywordTool!.foundVia.reduce(
      (n, h) => n + h.tagOccurrences,
      0,
    );
    expect(totalTagOccurrences(row.keywordTool)).toBe(expectedSum);
    expect(row.keywordTool!.foundVia.length).toBeGreaterThanOrEqual(4);
  });

  it("reads coverage as a count, never as a trend", () => {
    const row = corpus.rows.find((r) => r.keywordTool !== null)!;
    expect(coverageLabel(row.keywordTool)).toMatch(/^seen in \d+ of \d+$/);
  });

  it("normalises ranked to null or a well-formed match, never a bare shape mismatch", () => {
    // NOT "every row is null today": the archive overlaps the Spotted on
    // Etsy pull series by design (proposal.md § Why) and a future re-pull is
    // expected to give some row a real match — asserting the current
    // (transient) all-null state would break on the very success condition
    // this join exists for, repeating the exact brittleness #501 fixed in
    // tests/keyword-corpus.test.ts's own history. The fixture-based describe
    // block above proves the mapping works on data that does overlap; this
    // checks the loader's normalisation holds for every row regardless of
    // how many currently match.
    for (const row of corpus.rows) {
      if (row.ranked === null) continue;
      expect(row.ranked.best).toBeGreaterThan(0);
      expect(Array.isArray(row.ranked.matches)).toBe(true);
      expect(row.ranked.matches.length).toBeGreaterThan(0);
      expect(Math.min(...row.ranked.matches.map((m) => m.position))).toBe(
        row.ranked.best,
      );
    }
  });

  it("returns null rather than Infinity when competition is zero", () => {
    // demandRatio only needs searches/competition — narrowed from the full
    // KeywordRow so it also accepts KeywordTableRow (lib/keyword-metrics.ts).
    expect(demandRatio({ searches: 10, competition: 0 })).toBeNull();
  });

  it("returns null, not a crash, when searches is null (a ranked-only row)", () => {
    expect(demandRatio({ searches: null, competition: 180 })).toBeNull();
  });

  it("normalises Bulk Keywords onto the merged row, not a separate array", () => {
    expect(corpus.rows.some((r) => r.bulkKeywords !== null)).toBe(true);
    const row = corpus.rows.find((r) => r.keyword === "embroidery kits")!;
    expect(row).toBeDefined();
    // The same keyword carries Keyword Tool AND Bulk Keywords — the whole
    // point of the merge, and impossible to assert before it.
    expect(row.keywordTool).not.toBeNull();
    expect(row.bulkKeywords).not.toBeNull();
    expect(row.bulkKeywords!.avgSearches).toBe(2918);
    expect(row.bulkKeywords!.avgSearchesCensored).toBe(false);
    expect(row.bulkKeywords!.current).toBe(true);
    expect(row.bulkKeywords!.supersededBy).toBeNull();
  });

  it("keeps a censored bulk value distinct from an unscored one", () => {
    const censored = corpus.rows.find(
      (r) => r.bulkKeywords?.avgSearchesCensored,
    )!;
    const unscored = corpus.rows.find(
      (r) => r.bulkKeywords !== null && r.bulkKeywords.avgSearches === null,
    )!;
    expect(censored.bulkKeywords!.avgSearches).not.toBeNull();
    expect(censored.bulkKeywords!.avgSearches).not.toBe(0);
    expect(unscored.bulkKeywords!.avgSearchesCensored).toBe(false);
  });
});

describe("bulkValueLabel", () => {
  it("renders an unscored value as an em dash, never 0", () => {
    expect(bulkValueLabel(null, false)).toBe("—");
  });

  it("renders a censored value with a '<' prefix", () => {
    expect(bulkValueLabel(20, true)).toBe("< 20");
  });

  it("renders a real value plainly, comma-formatted", () => {
    expect(bulkValueLabel(2918, false)).toBe("2,918");
  });
});
