import { createClient } from "@supabase/supabase-js";

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
  try {
    const { data, error } = await getAdminClient()
      .from("notes")
      .select("*")
      .eq("experiment_id", experimentId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as Note[];
  } catch {
    return [];
  }
}

export async function createNote(
  experimentId: string,
  note: {
    title?: string;
    content: string;
    note_type?: NoteType;
    source_file?: string;
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
