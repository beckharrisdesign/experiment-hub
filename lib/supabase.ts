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
  const { error } = await getAdminClient().from("experiment_content").upsert(
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
