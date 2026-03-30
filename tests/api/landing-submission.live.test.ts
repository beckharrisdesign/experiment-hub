/**
 * Live integration test — POST /api/landing-submission → Supabase
 *
 * Runs against the real Supabase project. Requires:
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set in the environment.
 *
 * Skips automatically if either var is missing (safe for local dev without secrets).
 * Cleans up the test row after each test so the table stays tidy.
 *
 * Run manually:  npm run test:live
 * In CI:         push to main (github workflow injects secrets)
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/landing-submission/route";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSecrets = Boolean(supabaseUrl && supabaseKey);

// All tests in this file are skipped when secrets are absent.
const describeIf = hasSecrets ? describe : describe.skip;

// Direct Supabase client for setup/teardown — bypasses the API route.
const db = hasSecrets ? createClient(supabaseUrl!, supabaseKey!) : null;

const TEST_EXPERIMENT = "ci-live-test";

async function deleteTestRows() {
  if (!db) return;
  await db
    .from("experiment_submissions")
    .delete()
    .eq("experiment", TEST_EXPERIMENT);
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/landing-submission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describeIf("POST /api/landing-submission — live Supabase", () => {
  beforeAll(deleteTestRows);
  afterEach(deleteTestRows);

  it("inserts a row and returns 200 with an id", async () => {
    const res = await POST(
      makeRequest({
        experiment: TEST_EXPERIMENT,
        email: "ci-test@example.com",
        name: "CI Test",
        source: "ci",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.id).toBe("string");
  });

  it("row appears in experiment_submissions with correct fields", async () => {
    await POST(
      makeRequest({
        experiment: TEST_EXPERIMENT,
        email: "ci-verify@example.com",
        name: "Verify Test",
        source: "ci",
        notes: "written by live test",
      }),
    );

    const { data, error } = await db!
      .from("experiment_submissions")
      .select("*")
      .eq("experiment", TEST_EXPERIMENT)
      .eq("email", "ci-verify@example.com")
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      experiment: TEST_EXPERIMENT,
      email: "ci-verify@example.com",
      name: "Verify Test",
      source: "ci",
      notes: "written by live test",
    });
    expect(data.id).toBeTruthy();
    expect(data.created_at).toBeTruthy();
  });

  it("packs extra fields into metadata jsonb column", async () => {
    await POST(
      makeRequest({
        experiment: TEST_EXPERIMENT,
        email: "ci-metadata@example.com",
        seedCount: "20-50",
        challenges: ["Buying duplicates"],
      }),
    );

    const { data, error } = await db!
      .from("experiment_submissions")
      .select("metadata")
      .eq("experiment", TEST_EXPERIMENT)
      .eq("email", "ci-metadata@example.com")
      .single();

    expect(error).toBeNull();
    expect(data!.metadata).toMatchObject({
      seedCount: "20-50",
      challenges: ["Buying duplicates"],
    });
  });
});
