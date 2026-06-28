import { createClient } from "@supabase/supabase-js";
import type {
  Experiment,
  ExperimentKind,
  ExperimentStatus,
  ExperimentScores,
  ScoreRationale,
  ValidationLandingPage,
  Prototype,
  PrototypeStatus,
  Documentation,
  ExperimentPullRequest,
  PullRequestState,
} from "@/types";

// Publishable key client — safe for server-side API routes, no RLS bypass.
// Used for public-facing operations like form submissions.
function getPublishableClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
  }
  return createClient(url, key);
}

// Admin client — bypasses RLS. Used for content editing (requires ADMIN_SECRET gate).
// Optional: getContent/upsertContent fail gracefully if not configured.
function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key);
}

export interface ExperimentSubmission {
  experiment: string;
  email: string;
  name?: string;
  source?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a waitlist signup into the shared experiment_submissions table.
 *
 * Required Supabase table (run once in the SQL editor):
 *
 *   create table experiment_submissions (
 *     id          uuid        default gen_random_uuid() primary key,
 *     experiment  text        not null,
 *     email       text        not null,
 *     name        text,
 *     source      text        default 'landing-page',
 *     notes       text,
 *     metadata    jsonb,
 *     created_at  timestamptz default now()
 *   );
 */
export async function getContent(
  experimentId: string,
  contentType: "prd" | "business_case",
): Promise<string | null> {
  try {
    const { data, error } = await getAdminClient()
      .from("experiment_content")
      .select("content")
      .eq("experiment_id", experimentId)
      .eq("content_type", contentType)
      .single();
    if (error || !data) return null;
    return data.content;
  } catch {
    return null;
  }
}

export async function upsertContent(
  experimentId: string,
  contentType: "prd" | "business_case",
  content: string,
): Promise<void> {
  let client;
  try {
    client = getAdminClient();
  } catch {
    return;
  }
  const { error } = await client.from("experiment_content").upsert(
    {
      experiment_id: experimentId,
      content_type: contentType,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "experiment_id,content_type" },
  );
  if (error) throw error;
}

export type NoteType =
  | "observation"
  | "decision"
  | "learning"
  | "question"
  | "idea";

export interface Note {
  id: string;
  experiment_id: string;
  title: string | null;
  content: string;
  note_type: NoteType;
  source_file: string | null;
  created_at: string;
  updated_at: string;
}

export async function getNotes(experimentId: string): Promise<Note[]> {
  const { data, error } = await getAdminClient()
    .from("notes")
    .select("*")
    .eq("experiment_id", experimentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function createNote(
  experimentId: string,
  note: {
    title?: string | null;
    content: string;
    note_type?: NoteType;
    source_file?: string | null;
    created_at?: string;
  },
): Promise<Note> {
  const payload: Record<string, unknown> = {
    experiment_id: experimentId,
    content: note.content,
    note_type: note.note_type ?? "observation",
  };
  if (note.title !== undefined) payload.title = note.title;
  if (note.source_file !== undefined) payload.source_file = note.source_file;
  if (note.created_at !== undefined) payload.created_at = note.created_at;

  const { data, error } = await getAdminClient()
    .from("notes")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(
  id: string,
  updates: {
    title?: string | null;
    content?: string;
    note_type?: NoteType;
  },
): Promise<Note> {
  const { data, error } = await getAdminClient()
    .from("notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await getAdminClient().from("notes").delete().eq("id", id);
  if (error) throw error;
}

// ─── Experiments ─────────────────────────────────────────────────────────────

function dbToExperiment(row: Record<string, unknown>): Experiment {
  return {
    id: row.id as string,
    name: row.name as string,
    statement: row.statement as string,
    type: (row.type as ExperimentKind) ?? undefined,
    directory: row.directory as string,
    documentationId: (row.documentation_id as string) ?? "",
    prototypeId: (row.prototype_id as string) ?? "",
    status: row.status as ExperimentStatus,
    createdDate: (row.created_date as string) ?? "",
    lastModified: (row.last_modified as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    scores: (row.scores as ExperimentScores) ?? undefined,
    scoreRationale: (row.score_rationale as ScoreRationale) ?? undefined,
    validation: (row.validation as ValidationLandingPage) ?? undefined,
    openspecChangeId: (row.openspec_change_id as string) ?? undefined,
    openspecSchema: (row.openspec_schema as string) ?? undefined,
  };
}

export async function getExperimentsFromSupabase(): Promise<Experiment[]> {
  const { data, error } = await getPublishableClient()
    .from("experiments")
    .select("*")
    .order("last_modified", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(dbToExperiment);
}

export async function getExperimentByIdFromSupabase(
  id: string,
): Promise<Experiment | null> {
  const { data, error } = await getPublishableClient()
    .from("experiments")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return dbToExperiment(data as Record<string, unknown>);
}

// ─── Prototypes ───────────────────────────────────────────────────────────────

function dbToPrototype(row: Record<string, unknown>): Prototype {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    linkPath: (row.link_path as string) ?? "",
    experimentId: (row.experiment_id as string) ?? "",
    status: row.status as PrototypeStatus,
    createdDate: (row.created_date as string) ?? "",
    lastModified: (row.last_modified as string) ?? "",
    tags: (row.tags as string[]) ?? [],
    port: (row.port as number) ?? undefined,
  };
}

export async function getPrototypesFromSupabase(): Promise<Prototype[]> {
  const { data, error } = await getPublishableClient()
    .from("prototypes")
    .select("*");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(dbToPrototype);
}

export async function getPrototypeByExperimentIdFromSupabase(
  experimentId: string,
): Promise<Prototype | null> {
  const { data, error } = await getPublishableClient()
    .from("prototypes")
    .select("*")
    .eq("experiment_id", experimentId)
    .single();
  if (error || !data) return null;
  return dbToPrototype(data as Record<string, unknown>);
}

// ─── Documentation ────────────────────────────────────────────────────────────

function dbToDocumentation(row: Record<string, unknown>): Documentation {
  return {
    id: row.id as string,
    title: row.title as string,
    content: (row.content as string) ?? "",
    experimentId: (row.experiment_id as string) ?? "",
    createdDate: (row.created_date as string) ?? "",
    lastModified: (row.last_modified as string) ?? "",
    tags: (row.tags as string[]) ?? [],
  };
}

export async function getDocumentationFromSupabase(): Promise<Documentation[]> {
  const { data, error } = await getPublishableClient()
    .from("documentation")
    .select("*");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(dbToDocumentation);
}

export async function getDocumentationByExperimentIdFromSupabase(
  experimentId: string,
): Promise<Documentation | null> {
  const { data, error } = await getPublishableClient()
    .from("documentation")
    .select("*")
    .eq("experiment_id", experimentId)
    .single();
  if (error || !data) return null;
  return dbToDocumentation(data as Record<string, unknown>);
}

// ─── Pull Requests ────────────────────────────────────────────────────────────

function dbToPullRequest(row: Record<string, unknown>): ExperimentPullRequest {
  return {
    id: row.id as string,
    experimentId: row.experiment_id as string,
    repo: row.repo as string,
    prNumber: row.pr_number as number,
    title: (row.title as string) ?? "",
    state: (row.state as PullRequestState) ?? "open",
    url: (row.url as string) ?? "",
    branch: (row.branch as string) ?? "",
    author: (row.author as string) ?? "",
    labels: (row.labels as string[]) ?? [],
    openedAt: (row.opened_at as string) ?? "",
    mergedAt: (row.merged_at as string) ?? null,
    syncedAt: (row.synced_at as string) ?? "",
  };
}

export async function getPullRequests(
  experimentId: string,
): Promise<ExperimentPullRequest[]> {
  try {
    const { data, error } = await getPublishableClient()
      .from("experiment_pull_requests")
      .select("*")
      .eq("experiment_id", experimentId)
      .order("opened_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(dbToPullRequest);
  } catch {
    return [];
  }
}

export async function upsertPullRequests(
  rows: {
    experiment_id: string;
    repo: string;
    pr_number: number;
    title: string;
    state: string;
    url: string;
    branch: string;
    author: string;
    labels: string[];
    opened_at: string;
    merged_at: string | null;
  }[],
): Promise<ExperimentPullRequest[]> {
  const { data, error } = await getAdminClient()
    .from("experiment_pull_requests")
    .upsert(
      rows.map((r) => ({ ...r, synced_at: new Date().toISOString() })),
      { onConflict: "repo,pr_number" },
    )
    .select();
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(dbToPullRequest);
}

export async function updateExperiment(
  id: string,
  fields: Record<string, unknown>,
): Promise<Experiment> {
  const { data, error } = await getAdminClient()
    .from("experiments")
    .update({ ...fields, last_modified: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return dbToExperiment(data as Record<string, unknown>);
}

export async function insertSubmission(
  submission: ExperimentSubmission,
): Promise<{ id: string }> {
  const { data, error } = await getPublishableClient()
    .from("experiment_submissions")
    .insert({
      experiment: submission.experiment,
      email: submission.email,
      name: submission.name ?? null,
      source: submission.source ?? "landing-page",
      notes: submission.notes ?? null,
      metadata: submission.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}
