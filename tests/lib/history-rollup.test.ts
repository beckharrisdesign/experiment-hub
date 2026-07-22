import { describe, it, expect } from "vitest";
import {
  isExperimentScoped,
  filterExperimentCommits,
  formatMilestone,
  parseConventionalPrefix,
  rollupByMonth,
  filterUncoveredMonths,
  type CommitRecord,
  type PrRecord,
} from "@/lib/history-rollup";

const SLUG = "best-day-ever";

function commit(
  hash: string,
  dateIso: string,
  files: string[],
  subject = "docs: x",
): CommitRecord {
  return { hash, dateIso, subject, files };
}

// ---------------------------------------------------------------------------
// isExperimentScoped — the "never invent activity" gate
// ---------------------------------------------------------------------------

describe("isExperimentScoped", () => {
  it("counts a commit whose files are all within the experiment", () => {
    const c = commit("a", "2026-03-09", [
      "experiments/best-day-ever/PRD.md",
      "public/landing/best-day-ever/index.html",
    ]);
    expect(isExperimentScoped(c, SLUG)).toBe(true);
  });

  it("excludes a hub-wide CI commit that only incidentally touches the folder", () => {
    // Mirrors BDE's real a78ef49 / 0d25a7c — CI/deploy changes sweeping paths.
    const c = commit(
      "b",
      "2026-07-14",
      [".github/workflows/deploy.yml", "turbo.json", "public/landing/best-day-ever/index.html"],
      "ci: skip unaffected builds",
    );
    expect(isExperimentScoped(c, SLUG)).toBe(false);
  });

  it("excludes a platform refactor even when most files are the experiment's", () => {
    // Real fdda7ba: a shared-auth refactor that rewrote BDE's landing files —
    // 7 of 11 files are BDE (fraction 0.64), but it is platform work, not
    // founder progress on BDE. The `refactor` type excludes it; without that
    // rule it would falsely show BDE active in June, months after it stalled.
    const c = commit(
      "fdda7ba",
      "2026-06-22",
      [
        ".env.example",
        "experiments/best-day-ever/landing/config.js",
        "experiments/best-day-ever/landing/index.html",
        "experiments/best-day-ever/landing/script.js",
        "experiments/best-day-ever/landing/scripts/build.js",
        "lib/supabase.ts",
        "public/landing/best-day-ever/config.js",
        "public/landing/best-day-ever/index.html",
        "public/landing/best-day-ever/script.js",
        "tests/landing/build-output.test.ts",
        "tests/lib/supabase.test.ts",
      ],
      "refactor: use publishable key for landing submissions",
    );
    expect(isExperimentScoped(c, SLUG)).toBe(false);
  });

  it("keeps a platform-type commit when its scope names the experiment", () => {
    // `chore(best-day-ever): …` is the author explicitly claiming it as BDE work.
    const c = commit(
      "scoped-chore",
      "2026-03-15",
      ["experiments/best-day-ever/notes.md"],
      "chore(best-day-ever): clean up session artifacts",
    );
    expect(isExperimentScoped(c, SLUG)).toBe(true);
  });

  it("excludes the repo-init commit that scaffolds every experiment at once", () => {
    const c = commit("init", "2025-11-12", [
      "package.json",
      "app/page.tsx",
      "experiments/best-day-ever/README.md",
      "experiments/other/README.md",
      "lib/data.ts",
    ]);
    expect(isExperimentScoped(c, SLUG)).toBe(false);
  });

  it("excludes a commit that touches only other experiments", () => {
    const c = commit("c", "2026-04-01", [
      "experiments/etsy-notion-sync/run.ts",
    ]);
    expect(isExperimentScoped(c, SLUG)).toBe(false);
  });

  it("excludes a commit with no files", () => {
    expect(isExperimentScoped(commit("e", "2026-03-01", []), SLUG)).toBe(false);
  });

  it("counts a commit where the experiment is the majority", () => {
    const c = commit("d", "2026-03-20", [
      "experiments/best-day-ever/a.md",
      "experiments/best-day-ever/b.md",
      "lib/shared.ts",
    ]);
    expect(isExperimentScoped(c, SLUG)).toBe(true);
  });
});

describe("parseConventionalPrefix", () => {
  it("extracts type and scope", () => {
    expect(parseConventionalPrefix("feat(best-day-ever): add landing")).toEqual({
      type: "feat",
      scope: "best-day-ever",
    });
    expect(parseConventionalPrefix("refactor: shared change")).toEqual({
      type: "refactor",
      scope: "",
    });
    expect(parseConventionalPrefix("no prefix here")).toEqual({
      type: "",
      scope: "",
    });
  });
});

describe("filterExperimentCommits", () => {
  it("keeps only the experiment's own commits", () => {
    const commits = [
      commit("own", "2026-03-09", ["experiments/best-day-ever/PRD.md"]),
      commit("ci", "2026-07-14", [".github/workflows/deploy.yml"]),
    ];
    expect(filterExperimentCommits(commits, SLUG).map((c) => c.hash)).toEqual([
      "own",
    ]);
  });
});

// ---------------------------------------------------------------------------
// formatMilestone
// ---------------------------------------------------------------------------

describe("formatMilestone", () => {
  it("assembles a count-based draft from commits and PRs", () => {
    expect(
      formatMilestone({ commitCount: 5, prNumbers: [300, 302], figmaCount: 0 }),
    ).toBe("Pushed 5 commits and 2 PRs (#300, #302).");
  });

  it("singularizes and folds in Figma iterations", () => {
    expect(
      formatMilestone({ commitCount: 1, prNumbers: [], figmaCount: 1 }),
    ).toBe("Pushed 1 commit and 1 Figma iteration.");
  });
});

// ---------------------------------------------------------------------------
// rollupByMonth — grouping, quiet-month rule, ordering
// ---------------------------------------------------------------------------

describe("rollupByMonth", () => {
  const prs: PrRecord[] = [];

  it("groups scoped commits by month, oldest first, first-of-month date", () => {
    const commits = [
      commit("c2", "2026-04-20", ["experiments/best-day-ever/prd.md"]),
      commit("c1", "2026-03-09", ["experiments/best-day-ever/landing.md"]),
      commit("c3", "2026-03-30", ["experiments/best-day-ever/copy.md"]),
    ];
    const out = rollupByMonth({ commits, prs }, SLUG);
    expect(out.map((c) => c.month)).toEqual(["2026-03", "2026-04"]);
    expect(out[0].date).toBe("2026-03-01");
    expect(out[0].milestone).toBe("Pushed 2 commits.");
    expect(out[1].milestone).toBe("Pushed 1 commit.");
  });

  it("produces NO candidate for a month with only hub-wide commits", () => {
    // The three real BDE hub-wide commits — the platform refactor (majority
    // BDE files but `refactor` type) and two CI commits — all excluded.
    const commits = [
      commit(
        "fdda7ba",
        "2026-06-22",
        [
          "experiments/best-day-ever/landing/index.html",
          "public/landing/best-day-ever/config.js",
          "lib/supabase.ts",
        ],
        "refactor: use publishable key for landing submissions",
      ),
      commit(
        "a78ef49",
        "2026-07-14",
        [".github/workflows/ci.yml", "turbo.json"],
        "ci: skip unaffected builds",
      ),
      commit(
        "0d25a7c",
        "2026-07-20",
        [".github/workflows/deploy.yml"],
        "ci: deploy hub only on app changes",
      ),
    ];
    expect(rollupByMonth({ commits, prs }, SLUG)).toEqual([]);
  });

  it("produces no candidates at all for a quiet experiment", () => {
    expect(rollupByMonth({ commits: [], prs: [] }, SLUG)).toEqual([]);
  });

  it("folds merged PRs into their month even without a commit that month", () => {
    const out = rollupByMonth(
      {
        commits: [],
        prs: [{ number: 313, title: "x", mergedAtIso: "2026-05-10" }],
      },
      SLUG,
    );
    expect(out).toHaveLength(1);
    expect(out[0].month).toBe("2026-05");
    expect(out[0].milestone).toBe("Pushed 1 PR (#313).");
    expect(out[0].source).toBe("PRs #313");
  });
});

// ---------------------------------------------------------------------------
// filterUncoveredMonths — the accumulation watermark
// ---------------------------------------------------------------------------

describe("filterUncoveredMonths", () => {
  const candidates = [
    { month: "2026-03", date: "2026-03-01", milestone: "a", source: "" },
    { month: "2026-04", date: "2026-04-01", milestone: "b", source: "" },
  ];

  it("drops months already covered by an existing row", () => {
    expect(
      filterUncoveredMonths(candidates, ["2026-03"]).map((c) => c.month),
    ).toEqual(["2026-04"]);
  });

  it("returns nothing when every month is already covered (re-run is a no-op)", () => {
    expect(filterUncoveredMonths(candidates, ["2026-03", "2026-04"])).toEqual(
      [],
    );
  });

  it("returns all candidates when nothing is covered yet", () => {
    expect(filterUncoveredMonths(candidates, []).map((c) => c.month)).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });
});
