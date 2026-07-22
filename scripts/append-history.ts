/**
 * Append-history writer (repo-local script — NOT a hub route).
 *
 * The publishing half of the accumulation loop. Takes the generator's month
 * candidates and appends the ones not already present to the "BHD Labs
 * History" Notion database, each with `Approved` UNCHECKED — so nothing it
 * writes is publicly visible until Katy approves it in Notion.
 *
 * Guarantees (all enforced structurally + by tests):
 *   - INSERT-ONLY. This module calls `pages.create` and nothing else that
 *     mutates — no update, no delete, no archive/trash. It can never change or
 *     remove a row Katy has edited or approved. (spec Req 5)
 *   - WATERMARKED. It reads the months already present for the experiment and
 *     appends only uncovered months, so a re-run is a no-op. (spec Req 5)
 *   - DRY-RUN BY DEFAULT. It prints what it would create and writes nothing
 *     unless `--write` is passed. The monthly Action passes `--write`; a stray
 *     local run cannot touch Notion.
 *
 * Usage:
 *   tsx scripts/append-history.ts <slug> [--write]
 */
import { getUncachableNotionClient } from "@/lib/notion";
import { getExperimentPageIdFromNotion } from "@/lib/notion-experiments";
import { filterUncoveredMonths } from "@/lib/history-rollup";
import { generateCandidates } from "./draft-history";

type AnyProps = Record<string, unknown>;

/** `YYYY-MM` of every History row already related to this experiment. */
async function coveredMonths(
  notion: Awaited<ReturnType<typeof getUncachableNotionClient>>,
  dataSourceId: string,
  experimentPageId: string,
): Promise<Set<string>> {
  const months = new Set<string>();
  let cursor: string | undefined;
  do {
    const res: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: "Experiment",
        relation: { contains: experimentPageId },
      },
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const page of res.results ?? []) {
      const start: string | undefined = page.properties?.Date?.date?.start;
      const m = start?.slice(0, 7);
      if (m) months.add(m);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return months;
}

export async function appendHistory(
  slug: string,
  opts: { write: boolean },
): Promise<{ created: number; skipped: number }> {
  const dataSourceId = process.env.NOTION_HISTORY_DATA_SOURCE_ID;
  if (!dataSourceId) {
    throw new Error(
      "NOTION_HISTORY_DATA_SOURCE_ID is not set; cannot append history.",
    );
  }

  const experimentPageId = await getExperimentPageIdFromNotion(slug);
  if (!experimentPageId) {
    throw new Error(
      `No Notion experiment row found for "${slug}"; nothing to relate history to.`,
    );
  }

  const notion = await getUncachableNotionClient();
  const covered = await coveredMonths(notion, dataSourceId, experimentPageId);
  const all = generateCandidates(slug);
  const fresh = filterUncoveredMonths(all, covered);

  process.stdout.write(
    `[append-history] ${slug}: ${all.length} candidate month(s), ` +
      `${covered.size} already present, ${fresh.length} to append` +
      `${opts.write ? "" : " (dry run — pass --write to create)"}.\n`,
  );

  if (!opts.write) {
    for (const c of fresh) process.stdout.write(`  + ${c.date}  ${c.milestone}\n`);
    return { created: 0, skipped: fresh.length };
  }

  let created = 0;
  for (const c of fresh) {
    const properties: AnyProps = {
      Milestone: { title: [{ text: { content: c.milestone } }] },
      Date: { date: { start: c.date } },
      Experiment: { relation: [{ id: experimentPageId }] },
      // The gate. Every appended row starts unapproved; only Katy checks it.
      Approved: { checkbox: false },
      Source: { rich_text: [{ text: { content: c.source } }] },
    };
    // Cast at the SDK boundary: the v5 client's create-parameter union is
    // stricter than this generic property map, but the payloads match the
    // History schema (title / date / relation / checkbox / rich_text).
    await notion.pages.create({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties,
    } as Parameters<typeof notion.pages.create>[0]);
    created += 1;
    process.stdout.write(`  ✓ created ${c.date}  ${c.milestone}\n`);
  }
  return { created, skipped: 0 };
}

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith("--"));
  if (!slug) {
    process.stderr.write(
      "Usage: tsx scripts/append-history.ts <slug> [--write]\n",
    );
    process.exit(1);
    return;
  }
  await appendHistory(slug, { write: args.includes("--write") });
}

if (process.argv[1] && process.argv[1].endsWith("append-history.ts")) {
  main().catch((err) => {
    process.stderr.write(`[append-history] ${err?.message ?? err}\n`);
    process.exit(1);
  });
}
