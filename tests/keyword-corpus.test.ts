import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  coverageLabel,
  demandRatio,
  loadKeywordCorpus,
  totalTagOccurrences,
} from "@/lib/keyword-corpus";

const REPO = path.resolve(__dirname, "..");
const PULLS = path.join(REPO, "docs", "pulls");

/** Data rows across the archived eRank keyword exports, counted from the CSVs. */
function rawDataRowCount(): number {
  return readdirSync(PULLS)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-erank-keywords-.+\.csv$/.test(f))
    .reduce((total, f) => {
      const lines = readFileSync(path.join(PULLS, f), "utf8")
        .split("\n")
        .filter((l) => l.trim().length > 0);
      return total + Math.max(0, lines.length - 1); // minus the header
    }, 0);
}

/** Run the generator in-process and return the corpus it would write. */
function buildCorpusViaScript(pulls?: string): {
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

describe("keyword corpus generation", () => {
  const corpus = buildCorpusViaScript();

  it("represents every CSV data row as a query hit", () => {
    const hits = corpus.rows.reduce((n, r) => n + r.found_via.length, 0);
    // 83 CSV rows collapse to 71 keyword rows because 12 are the same keyword
    // seen under a second query. Nothing is dropped: the hit count is the
    // invariant, not the row count.
    expect(hits).toBe(rawDataRowCount());
    expect(corpus.rows.length).toBeLessThan(hits);
  });

  it("keeps tag occurrences per query rather than merging them", () => {
    const row = corpus.rows.find((r) => r.keyword === "embroidery font");
    expect(row).toBeDefined();
    const byQuery = Object.fromEntries(
      row!.found_via.map((h) => [h.query, h.tag_occurrences]),
    );
    expect(byQuery).toEqual({
      "embroidery designs": 6,
      "embroidery font": 81,
      "embroidery fonts": 80,
      "font bundle": 12,
    });
  });

  it("carries keyword-scoped fields once, not once per query", () => {
    const row = corpus.rows.find((r) => r.keyword === "embroidery font")!;
    expect(row.found_via.length).toBe(4);
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

  it("marks a single capture as current with nothing superseded", () => {
    expect(corpus.rows.every((r) => r.current)).toBe(true);
    expect(corpus.rows.every((r) => r.superseded_by === null)).toBe(true);
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
  copyFileSync(source, path.join(dir, "2026-09-17-erank-keywords-halloween.csv"));
  copyFileSync(source, path.join(dir, "2026-12-01-erank-keywords-halloween.csv"));

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

describe("corpus loader", () => {
  const corpus = loadKeywordCorpus();

  it("normalises the generated file into camelCase rows", () => {
    expect(corpus.rows.length).toBeGreaterThan(0);
    const row = corpus.rows.find((r) => r.keyword === "embroidery font")!;
    expect(
      row.foundVia.map((h) => h.tagOccurrences).sort((a, b) => a - b),
    ).toEqual([6, 12, 80, 81]);
    expect(row.supersededBy).toBeNull();
  });

  it("sums tag occurrences only as a sort key, keeping the parts", () => {
    const row = corpus.rows.find((r) => r.keyword === "embroidery font")!;
    expect(totalTagOccurrences(row)).toBe(6 + 81 + 80 + 12);
    expect(row.foundVia.length).toBe(4);
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
});
