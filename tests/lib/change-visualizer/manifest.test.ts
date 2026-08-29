import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, cpSync, mkdirSync, writeFileSync, existsSync } from "fs";
import os from "os";
import path from "path";
import { loadChangePage } from "@/lib/change-visualizer";
import {
  buildChangeHistory,
  serializeChangeHistory,
  writeChangeHistory,
  ShallowCheckoutError,
} from "@/lib/change-visualizer/generate";
import { __resetHistorySource, readManifest, describeSource } from "@/lib/change-visualizer/history-source";

const repo = process.cwd();
const MANIFEST = path.join("data", "change-history.json");

/**
 * A copy of the repo's change artifacts and the manifest, with **no `.git`** —
 * which is what the deployed runtime looks like. Everything asserted here fails
 * on production today.
 */
let noGit: string;

beforeAll(async () => {
  noGit = mkdtempSync(path.join(os.tmpdir(), "change-history-"));
  mkdirSync(path.join(noGit, "openspec"), { recursive: true });
  cpSync(path.join(repo, "openspec", "changes"), path.join(noGit, "openspec", "changes"), {
    recursive: true,
  });
  mkdirSync(path.join(noGit, "data"), { recursive: true });
  if (!existsSync(path.join(repo, MANIFEST))) {
    await writeChangeHistory(await buildChangeHistory(repo), repo);
  }
  cpSync(path.join(repo, MANIFEST), path.join(noGit, MANIFEST));
  __resetHistorySource();
});

afterAll(() => {
  rmSync(noGit, { recursive: true, force: true });
  __resetHistorySource();
});

describe("a runtime with no git", () => {
  it("still shows stage dates", async () => {
    const page = (await loadChangePage("tell-the-story", noGit))!;
    expect(page.historySource.kind).toBe("manifest");
    const dated = page.gates.filter((g) => g.firstDate !== null);
    expect(dated.length).toBeGreaterThanOrEqual(4);
  });

  it("still shows pull requests, not zero", async () => {
    const page = (await loadChangePage("tell-the-story", noGit))!;
    expect(page.prs.prs.length).toBeGreaterThanOrEqual(10);
  });

  it("still shows the long silence", async () => {
    const page = (await loadChangePage("tell-the-story", noGit))!;
    const gaps = page.events.filter((e) => e.kind === "gap");
    expect(Math.max(...gaps.map((g) => (g.kind === "gap" ? g.days : 0)))).toBeGreaterThan(25);
  });

  it("still finds a task waiting on a pull request that merged", async () => {
    const page = (await loadChangePage("pdf-metadata-viewer-cloud", noGit))!;
    const finding = page.findings.find((f) => f.taskId === "2.1b");
    expect(finding?.record).toMatch(/#389 merged on 2026-08-18/);
  });

  it("names the manifest as its source", async () => {
    const page = (await loadChangePage("tell-the-story", noGit))!;
    expect(page.historySourceLabel).toMatch(/manifest built at \d{4}-\d{2}-\d{2}/);
  });
});

describe("live git wins where it exists", () => {
  it("reads the repository, not the manifest", async () => {
    __resetHistorySource();
    const page = (await loadChangePage("tell-the-story", repo))!;
    expect(page.historySource.kind).toBe("repository");
    expect(page.historySourceLabel).toBe("History read from the repository.");
  });
});

describe("the manifest itself", () => {
  it("covers every change and stamps the commit it was built from", async () => {
    const manifest = (await readManifest(repo))!;
    expect(manifest.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(manifest.commitDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Object.keys(manifest.paths).length).toBeGreaterThan(100);
    expect(Object.keys(manifest.merges).length).toBeGreaterThan(100);
  });

  it("regenerates byte-identically at the same commit", async () => {
    const once = serializeChangeHistory(await buildChangeHistory(repo));
    const twice = serializeChangeHistory(await buildChangeHistory(repo));
    expect(twice).toBe(once);
  }, 180_000);

  it("writes nothing back into openspec/changes", () => {
    const dirty = execFileSync("git", ["status", "--porcelain", "openspec/changes"], {
      cwd: repo,
      encoding: "utf8",
    });
    expect(dirty.trim()).toBe("");
  });

  it("refuses to run on a shallow clone", async () => {
    // Built from scratch rather than cloned from this repository: a
    // `git clone --depth 1` of the working repo left a `.git/shallow` behind in
    // the *source*, which silently broke every history read until it was
    // noticed. A test must not be able to do that.
    const scratch = mkdtempSync(path.join(os.tmpdir(), "shallow-src-"));
    const source = path.join(scratch, "source");
    const clone = path.join(scratch, "clone");
    try {
      mkdirSync(source, { recursive: true });
      const git = (args: string[], cwd: string) =>
        execFileSync("git", args, {
          cwd,
          stdio: "ignore",
          env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t",
                 GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" },
        });
      git(["init", "-q", "-b", "main"], source);
      for (const n of [1, 2]) {
        writeFileSync(path.join(source, `f${n}.txt`), `${n}\n`);
        git(["add", "-A"], source);
        git(["commit", "-m", `c${n}`], source);
      }
      execFileSync("git", ["clone", "--depth", "1", `file://${source}`, clone], {
        stdio: "ignore",
      });

      await expect(buildChangeHistory(clone)).rejects.toBeInstanceOf(ShallowCheckoutError);
      await expect(buildChangeHistory(clone)).rejects.toThrow(/shallow/i);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }, 120_000);
});

describe("empty is not the same as unreadable", () => {
  it("words them differently", () => {
    expect(describeSource({ kind: "none" })).toMatch(/No history source available/);
    expect(describeSource({ kind: "repository" })).not.toMatch(/No history source/);
  });
});
