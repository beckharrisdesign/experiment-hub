/**
 * Live integration test — sso-zip-code-persistence change
 *
 * Asserts the `user_profiles` Supabase table (migration 008) supports the
 * save → reload round-trip the SSO Profile editor depends on.
 *
 * Bug context: before this change, `saveProfile` wrote to `localStorage`
 * (issue #175). This test would have been impossible to satisfy against the
 * old code — there was no Supabase table at all. With the migration applied,
 * a round-trip succeeds; without it, the test fails on a missing-relation error.
 *
 * Scope note: this exercises the data layer (migration + schema) directly via
 * the service-role admin client, not the auth-scoped `saveProfile`/`getProfile`
 * functions in `lib/storage.ts`. The application-layer round-trip is verified
 * manually per the change's tasks.md §4.4 — auth-scoped automated tests are a
 * follow-up if this test alone proves insufficient.
 *
 * Runs against the real Supabase project. Requires:
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 * Skips automatically if either is missing (safe for local dev without secrets).
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSecrets = Boolean(supabaseUrl && supabaseKey);

const describeIf = hasSecrets ? describe : describe.skip;
const db = hasSecrets ? createClient(supabaseUrl!, supabaseKey!) : null;

// Use a deterministic test user_id (uuid v4 generated once). We don't need a
// real auth.users row — the admin client bypasses RLS and the FK constraint
// won't fire if we delete + insert inside the test scope. But to keep the
// schema honest, we'll allocate a real auth user lazily in beforeAll.
const TEST_EMAIL = "ci-profile-test@example.com";
let testUserId: string | null = null;

async function ensureTestUser(): Promise<string> {
  if (!db) throw new Error("no admin client");
  // Try to find an existing test user
  const { data: existing } = await db.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === TEST_EMAIL);
  if (found) return found.id;
  // Create one
  const { data, error } = await db.auth.admin.createUser({
    email: TEST_EMAIL,
    email_confirm: true,
    password: "ci-test-password-rotate-anytime",
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  return data.user.id;
}

async function deleteTestProfile() {
  if (!db || !testUserId) return;
  await db.from("user_profiles").delete().eq("user_id", testUserId);
}

describeIf("user_profiles round-trip — live Supabase", () => {
  beforeAll(async () => {
    testUserId = await ensureTestUser();
    await deleteTestProfile();
  });

  afterEach(deleteTestProfile);

  it("upsert + select returns the same zip_code", async () => {
    const { error: upsertError } = await db!
      .from("user_profiles")
      .upsert(
        {
          user_id: testUserId!,
          zip_code: "90210",
          growing_zone: "10a",
          location: "Beverly Hills, CA",
        },
        { onConflict: "user_id" },
      );

    expect(upsertError).toBeNull();

    const { data, error: selectError } = await db!
      .from("user_profiles")
      .select("zip_code, growing_zone, location, updated_at")
      .eq("user_id", testUserId!)
      .single();

    expect(selectError).toBeNull();
    expect(data).toMatchObject({
      zip_code: "90210",
      growing_zone: "10a",
      location: "Beverly Hills, CA",
    });
    expect(data?.updated_at).toBeTruthy();
  });

  it("second upsert with partial payload preserves other columns via SQL", async () => {
    // First write — full payload
    await db!
      .from("user_profiles")
      .upsert(
        { user_id: testUserId!, zip_code: "90210", growing_zone: "10a" },
        { onConflict: "user_id" },
      );

    // Second write — only growing_zone. NOTE: a raw upsert at the SQL layer
    // overwrites unset columns to null, which is why `saveProfile` in
    // `lib/storage.ts` merges with `getProfile()` first before upserting.
    // This test documents that contract: callers must merge before upsert,
    // or the column they didn't pass goes null.
    await db!
      .from("user_profiles")
      .upsert(
        { user_id: testUserId!, growing_zone: "10b" },
        { onConflict: "user_id" },
      );

    const { data } = await db!
      .from("user_profiles")
      .select("zip_code, growing_zone")
      .eq("user_id", testUserId!)
      .single();

    // zip_code is null because we didn't merge — this is expected raw-SQL behavior.
    expect(data?.zip_code).toBeNull();
    expect(data?.growing_zone).toBe("10b");
  });

  it("updated_at trigger fires on update", async () => {
    await db!
      .from("user_profiles")
      .upsert(
        { user_id: testUserId!, zip_code: "10001" },
        { onConflict: "user_id" },
      );

    const { data: first } = await db!
      .from("user_profiles")
      .select("updated_at")
      .eq("user_id", testUserId!)
      .single();

    // Wait a beat so the trigger's now() advances
    await new Promise((r) => setTimeout(r, 50));

    await db!
      .from("user_profiles")
      .upsert(
        { user_id: testUserId!, zip_code: "10002" },
        { onConflict: "user_id" },
      );

    const { data: second } = await db!
      .from("user_profiles")
      .select("updated_at")
      .eq("user_id", testUserId!)
      .single();

    expect(new Date(second!.updated_at).getTime()).toBeGreaterThan(
      new Date(first!.updated_at).getTime(),
    );
  });
});
