/**
 * One-time seed script: reads data/*.json and upserts into Supabase.
 * Run with: pnpm exec tsx scripts/seed-supabase.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 * Safe to re-run — all operations are upserts on primary key.
 */

import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment.",
  );
  process.exit(1);
}

const client = createClient(url, key);
const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(filename: string): Promise<T[]> {
  const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf8");
  return JSON.parse(raw);
}

async function seedExperiments() {
  const experiments =
    await readJson<Record<string, unknown>>("experiments.json");
  const rows = experiments.map((exp) => ({
    id: exp.id,
    name: exp.name,
    statement: exp.statement,
    type: exp.type ?? "commercial",
    directory: exp.directory,
    documentation_id: exp.documentationId ?? "",
    prototype_id: exp.prototypeId ?? "",
    status: exp.status,
    created_date: exp.createdDate ?? null,
    last_modified: exp.lastModified ?? null,
    tags: exp.tags ?? [],
    scores: exp.scores ?? null,
    score_rationale: exp.scoreRationale ?? null,
    validation: exp.validation ?? null,
    openspec_change_id: exp.openspecChangeId ?? null,
    openspec_schema: exp.openspecSchema ?? null,
  }));

  const { error } = await client
    .from("experiments")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
  console.log(`✓ experiments: ${rows.length} rows`);
}

async function seedPrototypes() {
  const prototypes = await readJson<Record<string, unknown>>("prototypes.json");
  const rows = prototypes.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    link_path: p.linkPath ?? null,
    experiment_id: p.experimentId ?? null,
    status: p.status,
    created_date: p.createdDate ?? null,
    last_modified: p.lastModified ?? null,
    tags: p.tags ?? [],
    port: p.port ?? null,
  }));

  const { error } = await client
    .from("prototypes")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
  console.log(`✓ prototypes: ${rows.length} rows`);
}

async function seedDocumentation() {
  const docs = await readJson<Record<string, unknown>>("documentation.json");
  const rows = docs.map((d) => ({
    id: d.id,
    title: d.title,
    content: d.content ?? null,
    experiment_id: d.experimentId ?? null,
    created_date: d.createdDate ?? null,
    last_modified: d.lastModified ?? null,
    tags: d.tags ?? [],
  }));

  const { error } = await client
    .from("documentation")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
  console.log(`✓ documentation: ${rows.length} rows`);
}

async function main() {
  console.log("Seeding Supabase from JSON files…\n");
  await seedExperiments();
  await seedPrototypes();
  await seedDocumentation();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
