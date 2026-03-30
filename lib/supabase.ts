import { createClient } from "@supabase/supabase-js";

// Server-side only — uses the service role key to bypass RLS.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
// Lazy-initialized so the module can be imported safely without env vars
// (e.g. in test files that skip when secrets are absent).
function getClient() {
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
export async function insertSubmission(
  submission: ExperimentSubmission,
): Promise<{ id: string }> {
  const { data, error } = await getClient()
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
