/**
 * The artifacts a change generated, as links.
 *
 * An experiment's detail page is where someone lands when they want the story;
 * the artifacts that story was made from should be one click away rather than
 * buried in a pull request body that outlives its branch by nothing.
 */
import { promises as fs } from "fs";
import path from "path";
import { resolveChangeDir } from "@/lib/openspec-server";

export type ArtifactLink = {
  label: string;
  href: string;
  /** Short note — requirement counts, task progress. */
  detail?: string;
  group: "change" | "design" | "hub";
};

const REPO_BLOB =
  "https://github.com/beckharrisdesign/experiment-hub/blob/main";

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Links for one change, or an empty list when no change folder resolves.
 *
 * Empty is the common case — most experiments have no linked change — and the
 * caller drops the section entirely rather than rendering an empty heading.
 */
export async function listChangeArtifacts(
  changeId: string,
  cwd = process.cwd(),
): Promise<ArtifactLink[]> {
  const dir = await resolveChangeDir(changeId);
  if (!dir) return [];

  const repoRel = path.relative(cwd, dir);
  const links: ArtifactLink[] = [
    {
      label: "Change page",
      href: `/changes/${changeId}`,
      detail: "where it stands, and how it got there",
      group: "hub",
    },
  ];

  for (const [file, label] of [
    ["proposal.md", "Proposal"],
    ["design.md", "Design"],
    ["tasks.md", "Tasks"],
    ["archive.md", "Archive record"],
  ] as const) {
    if (await exists(path.join(dir, file))) {
      links.push({ label, href: `${REPO_BLOB}/${repoRel}/${file}`, group: "change" });
    }
  }

  try {
    for (const capability of (await fs.readdir(path.join(dir, "specs"))).sort()) {
      const spec = path.join(dir, "specs", capability, "spec.md");
      if (!(await exists(spec))) continue;
      links.push({
        label: `Requirements — ${capability}`,
        href: `${REPO_BLOB}/${repoRel}/specs/${capability}/spec.md`,
        group: "change",
      });
    }
  } catch {
    // No specs yet.
  }

  try {
    for (const asset of (await fs.readdir(path.join(dir, "assets"))).sort()) {
      if (!/\.(png|jpe?g|svg|webp)$/i.test(asset)) continue;
      links.push({
        label: asset.replace(/\.[a-z]+$/i, "").replace(/-/g, " "),
        href: `${REPO_BLOB}/${repoRel}/assets/${asset}`,
        group: "design",
      });
    }
  } catch {
    // No committed renders.
  }

  return links;
}
