import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  bulkValueLabel,
  coverageLabel,
  demandRatio,
  loadKeywordCorpus,
  totalTagOccurrences,
} from "@/lib/keyword-corpus";

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
    searches: number;
    found_via: { query: string; tag_occurrences: number }[];
    current: boolean;
    superseded_by: string | null;
    coverage: { seen: number; of: number };
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
    // cell; coverage must never exceed the capture count or drop below one.
    for (const row of corpus.rows) {
      expect(row.coverage.seen).toBeGreaterThanOrEqual(1);
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

describe("corpus loader", () => {
  const corpus = loadKeywordCorpus();

  it("normalises the generated file into camelCase rows", () => {
    expect(corpus.rows.length).toBeGreaterThan(0);
    const row = corpus.rows.find((r) => r.keyword === "embroidery font")!;
    // The original four counts must still be in there; later pulls may have
    // added more (see the generation describe block above), so this checks
    // containment rather than the exact set.
    const counts = row.foundVia.map((h) => h.tagOccurrences);
    for (const expected of [6, 12, 80, 81]) {
      expect(counts).toContain(expected);
    }
    expect(row.supersededBy).toBeNull();
  });

  it("sums tag occurrences only as a sort key, keeping the parts", () => {
    const row = corpus.rows.find((r) => r.keyword === "embroidery font")!;
    // The sum must always equal the sum of the parts on the row itself — a
    // self-consistency check, not a fixed total that would go stale every
    // time a new query surfaces this keyword.
    const expectedSum = row.foundVia.reduce((n, h) => n + h.tagOccurrences, 0);
    expect(totalTagOccurrences(row)).toBe(expectedSum);
    expect(row.foundVia.length).toBeGreaterThanOrEqual(4);
  });

  it("reads coverage as a count, never as a trend", () => {
    const row = corpus.rows[0];
    expect(coverageLabel(row)).toMatch(/^seen in \d+ of \d+$/);
  });

  it("returns null rather than Infinity when competition is zero", () => {
    expect(
      demandRatio({
        keyword: "x",
        capture: "2026-09-17",
        searches: 10,
        competition: 0,
        kd: 0,
        foundVia: [],
        current: true,
        supersededBy: null,
        coverage: { seen: 1, of: 1 },
      }),
    ).toBeNull();
  });

  it("normalises bulk keyword rows into camelCase, alongside the main rows", () => {
    expect(corpus.bulkKeywordRows.length).toBeGreaterThan(0);
    const row = corpus.bulkKeywordRows.find(
      (r) => r.keyword === "embroidery kits",
    )!;
    expect(row).toBeDefined();
    expect(row.avgSearches).toBe(2918);
    expect(row.avgSearchesCensored).toBe(false);
    expect(row.current).toBe(true);
    expect(row.supersededBy).toBeNull();
  });

  it("keeps a censored bulk row distinct from an unscored one", () => {
    const censored = corpus.bulkKeywordRows.find((r) => r.avgSearchesCensored)!;
    const unscored = corpus.bulkKeywordRows.find(
      (r) => r.avgSearches === null,
    )!;
    expect(censored.avgSearches).not.toBeNull();
    expect(censored.avgSearches).not.toBe(0);
    expect(unscored.avgSearchesCensored).toBe(false);
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
