import { describe, expect, it } from "vitest";
import { buildIssueBody } from "../experiments/snap-issue/extension/github.js";

describe("buildIssueBody", () => {
  const base = {
    issueType: "bug",
    pageUrl: "https://example.com/page",
    pageTitle: "Example",
    capturedAtIso: "2026-05-19T12:00:00.000Z",
    browserLine: "TestAgent/1.0",
    viewport: { width: 1200, height: 800 },
    dpr: 2,
    note: "Something looks off",
    screenshotFilename: "snap-issue-2026-05-19T120000000Z-ab12cd34.png",
  };

  it("embeds GitHub markdown image and local filename line", () => {
    const md = "![Snap Issue capture](https://raw.githubusercontent.com/o/r/branch/snap-issue-captures/x.png)";
    const body = buildIssueBody({
      ...base,
      screenshotMarkdownImage: md,
    });
    expect(body).toContain(md);
    expect(body).toContain("Also saved locally (Downloads):");
    expect(body).toContain(base.screenshotFilename);
    expect(body).toContain("## Screenshot");
  });

  it("falls back when hosted image is missing", () => {
    const body = buildIssueBody({
      ...base,
      screenshotMarkdownImage: "",
    });
    expect(body).toContain("GitHub-hosted image unavailable");
    expect(body).toContain("Also saved locally (Downloads):");
  });

  it("shows upload failure note when inline image was skipped", () => {
    const body = buildIssueBody({
      ...base,
      screenshotMarkdownImage: "",
      uploadFailureMessage: "Could not upload: Repository rule violations found",
    });
    expect(body).toContain("No inline screenshot");
    expect(body).toContain("Repository rule violations");
    expect(body).toContain("Upload branch for screenshots");
  });
});
