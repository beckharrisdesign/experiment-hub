import { beforeEach, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 10_000 });

// Self-referential chainable, thenable builder.
// .single() and .then() both pop from `results` so tests control what each
// awaited call returns. Never call vi.clearAllMocks() against this — use the
// targeted mockClear() calls in beforeEach so implementations survive.
const mocks = vi.hoisted(() => {
  const results: Array<{ data?: unknown; error: unknown }> = [];
  const builder: any = {};

  builder.eq = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.single = vi.fn(
    async () => results.shift() ?? { data: null, error: null },
  );
  // Thenable so `await builder` works (used by deleteSeed's scoped delete).
  builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(results.shift() ?? { data: null, error: null }).then(
      resolve,
      reject,
    );

  const from = vi.fn(() => builder);
  // getUser default: no authenticated session; tests can override per-case.
  const getUser = vi.fn(async () => ({ data: { user: null }, error: null }));
  return { from, builder, results, getUser };
});

vi.mock("./supabase", () => ({
  supabase: { from: mocks.from, auth: { getUser: mocks.getUser } },
}));

vi.mock("./seed-photos", () => ({
  getPhotoUrl: vi.fn((path: string | null | undefined) =>
    path ? `https://storage.example/${path}` : undefined,
  ),
  resolvePhotoSrc: vi.fn((path: string | null | undefined) =>
    path ? `https://storage.example/${path}` : undefined,
  ),
  deleteSeedPhotos: vi.fn(),
}));

import { deleteSeed, getSeedById, updateSeed } from "./storage";

const BASE_ROW = {
  id: "seed-1",
  user_id: "user-42",
  name: "Basil",
  variety: "Genovese",
  type: "herb",
  brand: null,
  source: null,
  year: 2024,
  purchase_date: null,
  quantity: null,
  days_to_germination: null,
  days_to_maturity: null,
  planting_depth: null,
  spacing: null,
  sun_requirement: null,
  planting_months: null,
  description: null,
  planting_instructions: null,
  notes: null,
  my_notes: null,
  hidden_fields: [],
  custom_fields: [],
  instruction_annotations: [],
  raw_packet_text: [],
  photo_front_path: null,
  photo_back_path: null,
  photo_front: null,
  photo_back: null,
  use_first: false,
  custom_expiration_date: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

function eqCols() {
  return mocks.builder.eq.mock.calls.map(([col]: [string]) => col);
}

beforeEach(() => {
  // Targeted clear — only resets call history, not implementations.
  mocks.results.length = 0;
  mocks.builder.eq.mockClear();
  mocks.builder.select.mockClear();
  mocks.builder.update.mockClear();
  mocks.builder.delete.mockClear();
  mocks.builder.single.mockClear();
  mocks.from.mockClear();
  mocks.getUser.mockClear();
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// ── updateSeed ───────────────────────────────────────────────────────────────

describe("updateSeed userId filtering", () => {
  it("applies user_id filter when userId provided", async () => {
    mocks.results.push({ data: BASE_ROW, error: null });
    await updateSeed("seed-1", { name: "Basil Updated" }, "user-42");
    expect(eqCols()).toContain("user_id");
  });

  it("does NOT apply user_id filter when userId omitted", async () => {
    mocks.results.push({ data: BASE_ROW, error: null });
    await updateSeed("seed-1", { name: "Basil Updated" });
    expect(eqCols()).not.toContain("user_id");
  });

  it("throws when Supabase returns an error with userId", async () => {
    mocks.results.push({ data: null, error: { message: "RLS violation" } });
    await expect(
      updateSeed("seed-1", { name: "Bad" }, "user-42"),
    ).rejects.toThrow(/RLS violation/);
  });

  it("returns null when Supabase returns no data row", async () => {
    mocks.results.push({ data: null, error: null });
    const result = await updateSeed("seed-1", { name: "Missing" }, "user-42");
    expect(result).toBeNull();
  });
});

// ── getSeedById ──────────────────────────────────────────────────────────────

describe("getSeedById userId filtering", () => {
  // getSeedById always resolves effectiveUserId = auth.getUser()?.id ?? userId.
  // If neither is available it returns null without querying.
  // The mock defaults getUser() to { data: { user: null }, error: null }.

  it("applies user_id filter when userId provided", async () => {
    mocks.results.push({ data: BASE_ROW, error: null });
    await getSeedById("seed-1", "user-42");
    expect(eqCols()).toContain("user_id");
  });

  it("returns null without querying when no userId and no auth session", async () => {
    // getUser returns no user AND no userId param → effectiveUserId undefined → early null
    const result = await getSeedById("seed-1");
    expect(result).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns null on PGRST116 (no rows found)", async () => {
    mocks.results.push({
      data: null,
      error: { code: "PGRST116", message: "no rows returned" },
    });
    const result = await getSeedById("seed-1", "user-42");
    expect(result).toBeNull();
  });

  it("throws on a non-not-found Supabase error", async () => {
    mocks.results.push({
      data: null,
      error: { code: "PGRST301", message: "permission denied" },
    });
    await expect(getSeedById("seed-1", "user-42")).rejects.toThrow(
      /permission denied/,
    );
  });
});

// ── deleteSeed ───────────────────────────────────────────────────────────────

describe("deleteSeed userId filtering", () => {
  it("scopes delete to user_id and returns true on success", async () => {
    mocks.results.push({ error: null });
    const result = await deleteSeed("seed-1", "user-42");
    expect(result).toBe(true);
    expect(eqCols()).toContain("user_id");
  });

  it("retries without user_id on missing-column error (42703)", async () => {
    mocks.results.push({
      error: {
        code: "42703",
        message: "column seeds.user_id does not exist",
      },
    });
    mocks.results.push({ error: null });
    const result = await deleteSeed("seed-1", "user-42");
    expect(result).toBe(true);
  });

  it("throws on non-missing-column error when userId provided", async () => {
    mocks.results.push({
      error: { code: "PGRST302", message: "permission denied on table" },
    });
    await expect(deleteSeed("seed-1", "user-42")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("deletes by id only when userId omitted", async () => {
    mocks.results.push({ error: null });
    const result = await deleteSeed("seed-1");
    expect(result).toBe(true);
    expect(eqCols()).not.toContain("user_id");
  });
});
