import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "child_process";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import {
  loadChangePage,
  listChangeIds,
  listChanges,
  extractIntent,
} from "@/lib/change-visualizer";
import { parseFigmaRef } from "@/lib/change-visualizer/design-ref";
import { parseSpec } from "@/lib/change-visualizer/specs";
import { prFromSubject, daysBetween } from "@/lib/change-visualizer/git";
import { listChangeArtifacts } from "@/lib/change-visualizer/artifacts";

const repo = process.cwd();

/**
 * These tests read real artifact history out of git. In a shallow clone there
 * is nothing to read, and the assertions fail in ways that do not name the
 * cause — so say it plainly instead. CI checks out with `fetch-depth: 0`.
 */
beforeAll(() => {
  const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
    cwd: repo,
    encoding: "utf8",
  }).trim();
  if (shallow === "true") {
    throw new Error(
      "change-visualizer tests need full git history; this clone is shallow. " +
        "Fetch it with `git fetch --unshallow`, or set fetch-depth: 0 on the checkout.",
    );
  }
});

describe("resolving a change", () => {
  it("opens an active change", async () => {
    const page = await loadChangePage("tell-the-story", repo);
    expect(page).not.toBeNull();
    expect(page!.archived).toBe(false);
  });

  it("opens an archived change by its bare id", async () => {
    const page = await loadChangePage("exec-function-per-track-cadence", repo);
    expect(page).not.toBeNull();
    expect(page!.archived).toBe(true);
  });

  it("returns null for a change that does not exist", async () => {
    expect(await loadChangePage("no-such-change", repo)).toBeNull();
  });

  it("refuses an id that could escape the changes directory", async () => {
    expect(await loadChangePage("../../etc", repo)).toBeNull();
  });
});

describe("the stage rail", () => {
  it("marks build as current on a change that has tasks and no archive record", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    expect(page.gates.find((g) => g.state === "current")?.id).toBe("apply");
    expect(page.gates.find((g) => g.id === "archive")!.state).toBe("pending");
  });

  it("marks a gate that was touched again after a later gate opened", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    // #314 revised the proposal and the spec while opening tasks, on 07-21.
    expect(page.gates.find((g) => g.id === "proposal")!.revisited).toBe(true);
    expect(page.gates.find((g) => g.id === "specs")!.revisited).toBe(true);
  });

  it("reports a gate older than the rule that would have governed it", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    const design = page.gates.find((g) => g.id === "design")!;
    // #304 merged 43 minutes before #305 introduced the Figma gate.
    expect(design.predatesRule).not.toBeNull();
    expect(design.predatesRule!.rule).toMatch(/Figma/);
  });

  it("names two gates that landed in one commit rather than sequencing them", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    expect(page.gates.find((g) => g.id === "design")!.sharedCommitWith).toContain("specs");
  });

  it("uses plain-language labels, not the schema's words", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    expect(page.gates.map((g) => g.label)).toEqual([
      "proposal",
      "requirements",
      "design",
      "tasks",
      "build",
      "archived",
    ]);
  });
});

describe("outcomes and capabilities", () => {
  it("lists every capability with its requirement count", async () => {
    const page = (await loadChangePage("pdf-metadata-viewer-cloud", repo))!;
    expect(page.capabilities.map((c) => c.name)).toEqual([
      "document-metadata-store",
      "drive-document-source",
      "hosted-instance-access",
    ]);
    expect(page.capabilities.map((c) => c.requirements.length)).toEqual([6, 7, 5]);
  });

  it("says a workstream task list cannot be split, instead of splitting it", async () => {
    const page = (await loadChangePage("pdf-metadata-viewer-cloud", repo))!;
    expect(page.outcomesAreScenarios).toBe(false);
    expect(page.outcomes).toHaveLength(0);
    expect(page.progress!.total).toBeGreaterThan(60);
  });

  it("carries an evidence kind on every outcome", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    expect(page.outcomes).toHaveLength(11);
    expect(page.outcomes.every((o) => o.evidence.length > 0)).toBe(true);
  });
});

describe("the history", () => {
  it("shows a long silence with its real length", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    const gaps = page.events.filter((e) => e.kind === "gap");
    expect(gaps.length).toBeGreaterThan(0);
    expect(Math.max(...gaps.map((g) => (g.kind === "gap" ? g.days : 0)))).toBeGreaterThan(25);
  });

  it("gives every event a stage", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    const work = page.events.filter((e) => e.kind === "work");
    expect(work.length).toBeGreaterThan(0);
    expect(work.every((e) => e.kind === "work" && e.stageLabel.length > 0)).toBe(true);
  });
});

describe("findings", () => {
  it("catches work that shipped while its task stayed unchecked", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    const finding = page.findings.find((f) => f.taskId === "3.11");
    expect(finding).toBeDefined();
    expect(finding!.evidence.join(" ")).toMatch(/notion-history/);
  });

  it("catches a task still waiting on a pull request that merged", async () => {
    const page = (await loadChangePage("pdf-metadata-viewer-cloud", repo))!;
    const finding = page.findings.find((f) => f.taskId === "2.1b");
    expect(finding).toBeDefined();
    expect(finding!.record).toMatch(/#389 merged on 2026-08-18/);
  });

  it("states both readings and never picks one", async () => {
    const page = (await loadChangePage("tell-the-story", repo))!;
    for (const finding of page.findings) {
      expect(finding.claims.length).toBeGreaterThan(0);
      expect(finding.record.length).toBeGreaterThan(0);
      expect(`${finding.claims} ${finding.record}`).not.toMatch(/should|must|wrong|fix/i);
    }
  });

  it("says nothing when a change and the record agree", async () => {
    const page = (await loadChangePage("exec-function-per-track-cadence", repo))!;
    expect(page.findings).toEqual([]);
  });
});

describe("small readers", () => {
  it("reads a pull request number off a squash subject", () => {
    expect(prFromSubject("feat(x): thing (#399)")).toBe(399);
    expect(prFromSubject("feat(x): thing")).toBeNull();
  });

  it("counts whole days and never goes negative", () => {
    expect(daysBetween("2026-07-22", "2026-08-22")).toBe(31);
    expect(daysBetween("2026-08-22", "2026-07-22")).toBe(0);
  });

  it("pulls the Figma file key and node id out of a design table", () => {
    const ref = parseFigmaRef(
      "| Frames | Page `02.1 Proposed — History preview`: frame (node `9:82`) |\n" +
        "| File | https://www.figma.com/design/HKy2SdRDyCJ37V29mvMpma |",
    );
    expect(ref).toEqual({
      fileKey: "HKy2SdRDyCJ37V29mvMpma",
      page: "02.1 Proposed — History preview",
      nodeId: "9:82",
    });
  });

  it("returns null when a design records no Figma file", () => {
    expect(parseFigmaRef("N/A — no UI")).toBeNull();
  });

  it("counts requirements and scenarios in a spec", () => {
    const parsed = parseSpec(
      ["### Requirement: One", "#### Scenario: A", "#### Scenario: B", "### Requirement: Two"].join("\n"),
    );
    expect(parsed.requirements).toEqual(["One", "Two"]);
    expect(parsed.scenarios).toEqual(["A", "B"]);
  });

  it("takes the anchor verbatim, and falls back to Why when there is none", () => {
    expect(extractIntent("## Human anchor\n\n> Exactly this.\n\n## Outcomes\n")).toEqual({
      text: "Exactly this.",
      source: "human anchor",
    });
    expect(extractIntent("## Why\n\nBecause of a thing.\n\n## What changes\n")?.source).toBe("why");
  });
});

describe("every change in the repo", () => {
  it("renders without throwing", { timeout: 180_000 }, async () => {
    const ids = await listChangeIds(repo);
    expect(ids.length).toBeGreaterThan(40);

    const empty: string[] = [];
    for (const id of ids) {
      const page = await loadChangePage(id, repo);
      expect(page, `${id} failed to resolve`).not.toBeNull();
      if (page!.gates.every((g) => g.firstDate === null) && page!.events.length === 0) {
        empty.push(id);
      }
    }
    // Reported rather than asserted away: a change with no history at all is a
    // real state (nothing committed yet), not a bug.
    expect(empty, `changes with no history: ${empty.join(", ")}`).toEqual([]);
  });
});

describe("read-only by construction", () => {
  it("has no write path to openspec/changes in its module graph", () => {
    const dir = path.join(repo, "lib", "change-visualizer");
    const sources = readdirSync(dir)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => readFileSync(path.join(dir, f), "utf8"))
      .join("\n");

    // Match calls, not prose — a comment about a folder being "renamed" is not
    // a write path, and a test that cannot tell the difference gets ignored.
    const writeCall =
      /\b(?:fs|fsp|promises)\s*\.\s*(?:writeFile|appendFile|mkdir|rm|rmdir|unlink|rename|copyFile|truncate)\s*\(/;
    expect(sources).not.toMatch(writeCall);
    expect(sources).not.toMatch(/createWriteStream\s*\(/);
    // git is read-only here too: no command that mutates the repository.
    expect(sources).not.toMatch(/"git",\s*\[\s*"(?:commit|add|checkout|push|rm|mv)"/);
  });
});

describe("artifact links for a linked change", () => {
  it("lists the change's artifacts, its renders, and its page on the hub", async () => {
    const links = await listChangeArtifacts("openspec-change-visualizer", repo);
    const labels = links.map((l) => l.label);

    expect(labels).toContain("Change page");
    expect(labels).toContain("Proposal");
    expect(labels).toContain("Design");
    expect(labels).toContain("Requirements — change-page");
    expect(labels).toContain("Requirements — change-claim-verification");
    expect(links.some((l) => l.group === "design")).toBe(true);

    // The hub link is internal; everything else points at the repo so it
    // survives the branch being deleted.
    const hub = links.find((l) => l.label === "Change page")!;
    expect(hub.href).toBe("/changes/openspec-change-visualizer");
    expect(
      links.filter((l) => l !== hub).every((l) => l.href.startsWith("https://github.com/")),
    ).toBe(true);
  });

  it("returns nothing for an experiment with no linked change", async () => {
    expect(await listChangeArtifacts("seed-finder", repo)).toEqual([]);
  });
});

describe("drift precision", () => {
  it("does not flag a task that cites the file it names as prior art", async () => {
    // generative-sandbox-build 3.3.1 says to follow
    // `lib/etsy-listing-kit/orders.ts (createSignedUrl)`. That symbol existing
    // is the premise of the task, not evidence the work is secretly done.
    const page = await loadChangePage("generative-sandbox-build", repo);
    if (!page) return; // the change belongs to another branch's work
    expect(page.findings.find((f) => f.taskId === "3.3.1")).toBeUndefined();
  });
});

describe("the index", () => {
  it("summarises every change without reading git", async () => {
    const changes = await listChanges(repo);
    const ids = await listChangeIds(repo);
    expect(changes).toHaveLength(ids.length);
    expect(changes.length).toBeGreaterThan(40);
    expect(changes.every((c) => c.stageLabel.length > 0)).toBe(true);
  });

  it("puts a change with an archive record in the archived group", async () => {
    const changes = await listChanges(repo);
    const archived = changes.find((c) => c.id === "exec-function-per-track-cadence");
    expect(archived?.archived).toBe(true);
    expect(archived?.stageLabel).toBe("archived");
  });

  it("calls a change with tasks and no archive record 'build'", async () => {
    const changes = await listChanges(repo);
    expect(changes.find((c) => c.id === "tell-the-story")?.stageLabel).toBe("build");
  });

  it("counts capabilities so a multi-capability change is visible as one", async () => {
    const changes = await listChanges(repo);
    expect(changes.find((c) => c.id === "pdf-metadata-viewer-cloud")?.capabilities).toBe(3);
  });

  it("works with no git available, which is what production has", async () => {
    // The deployed runtime has no .git, so anything commit-derived comes back
    // empty there. The index must not depend on it — artifact presence is a
    // filesystem read.
    const dir = path.join(repo, "lib", "change-visualizer");
    const source = readFileSync(path.join(dir, "index.ts"), "utf8");
    const fn = source.slice(
      source.indexOf("export async function listChanges"),
      source.indexOf("/** Every change id the hub can render"),
    );
    expect(fn).not.toMatch(/commitsFor|buildGates|attributePrs|findDrift/);
  });
});
