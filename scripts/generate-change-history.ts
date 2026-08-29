/**
 * Build the change-history manifest.
 *
 *   pnpm run history:manifest
 *
 * Runs where full history exists — the deploy job, which checks out with
 * `fetch-depth: 0`. The deployed runtime has no git at all, so without this the
 * change pages render every date as a dash and every pull-request count as zero.
 *
 * Fails loudly rather than emitting a thin manifest: a page that looks finished
 * and says nothing is the defect this exists to fix.
 */
import { buildChangeHistory, writeChangeHistory } from "../lib/change-visualizer/generate";
import { MANIFEST_PATH } from "../lib/change-visualizer/history-source";

async function main(): Promise<void> {
  const manifest = await buildChangeHistory();
  await writeChangeHistory(manifest);
  console.log(
    `generate-change-history: ${Object.keys(manifest.paths).length} paths, ` +
      `${Object.keys(manifest.merges).length} pull requests, at ` +
      `${manifest.commit.slice(0, 7)} (${manifest.commitDate.slice(0, 10)}) → ${MANIFEST_PATH}`,
  );
}

main().catch((error) => {
  console.error(
    `generate-change-history: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
