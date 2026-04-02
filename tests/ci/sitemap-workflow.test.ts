import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const workflowPath = path.join(
  process.cwd(),
  ".github/workflows/sitemap-capture.yml"
);

describe("sitemap capture workflow", () => {
  it("exists for manual web-triggered runs", () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  it("supports workflow_dispatch and uploads artifacts", () => {
    const yaml = fs.readFileSync(workflowPath, "utf8");
    expect(yaml).toContain("workflow_dispatch:");
    expect(yaml).toContain("actions/upload-artifact");
    expect(yaml).toContain("npm run sitemap:capture --");
    expect(yaml).toContain("figma-mcp-prompt.txt");
  });
});
