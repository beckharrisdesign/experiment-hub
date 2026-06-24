import { beforeEach, describe, expect, it, vi } from "vitest";

// Persistence tests: bounded wall time so a stuck Supabase mock cannot hang CI.
vi.setConfig({ testTimeout: 10_000 });

const persistMocks = vi.hoisted(() => {
  let insertResult: { data: Record<string, unknown> | null; error: unknown } = {
    data: null,
    error: { message: "insert not configured in test" },
  };
  let updateResult: { data: Record<string, unknown> | null; error: unknown } = {
    data: null,
    error: { message: "update not configured in test" },
  };

  const singleInsert = vi.fn(async () => insertResult);
  const insert = vi.fn(() => ({
    select: () => ({ single: singleInsert }),
  }));

  const singleUpdate = vi.fn(async () => updateResult);
  const updateChain = {
    eq: vi.fn(() => updateChain),
    select: () => ({ single: singleUpdate }),
  };
  const update = vi.fn(() => updateChain);

  const from = vi.fn(() => ({ insert, update }));

  return {
    from,
    insert,
    update,
    setInsertResult(r: typeof insertResult) {
      insertResult = r;
    },
    setUpdateResult(r: typeof updateResult) {
      updateResult = r;
    },
    singleInsert,
    singleUpdate,
  };
});

vi.mock("./supabase", () => ({
  supabase: {
    from: persistMocks.from,
  },
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

import { saveSeed, updateSeed } from "./storage";

function makeInsertedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "seed-new",
    name: "Tomato",
    variety: "Cherry",
    type: "vegetable",
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
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("storage saveSeed / updateSeed (mocked Supabase)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistMocks.setInsertResult({
      data: null,
      error: { message: "reset insert" },
    });
    persistMocks.setUpdateResult({
      data: null,
      error: { message: "reset update" },
    });
  });

  it("rejects when insert returns a Supabase error", async () => {
    persistMocks.setInsertResult({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    });

    await expect(
      saveSeed({
        id: "seed-1",
        name: "Tomato",
        variety: "Cherry",
        type: "vegetable",
      }),
    ).rejects.toThrow(/duplicate key/);
  });

  it("rejects when update returns a Supabase error", async () => {
    persistMocks.setUpdateResult({
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      updateSeed("seed-1", { name: "Updated" }, "user-1"),
    ).rejects.toThrow(/row-level security/);
  });

  it("returns a Seed when insert succeeds", async () => {
    const row = makeInsertedRow();
    persistMocks.setInsertResult({ data: row, error: null });

    const seed = await saveSeed({
      id: "seed-new",
      name: "Tomato",
      variety: "Cherry",
      type: "vegetable",
    });

    expect(seed.id).toBe("seed-new");
    expect(seed.name).toBe("Tomato");
    expect(seed.variety).toBe("Cherry");
    expect(seed.type).toBe("vegetable");
  });

  it("returns a Seed when update succeeds", async () => {
    const row = makeInsertedRow({ name: "Renamed" });
    persistMocks.setUpdateResult({ data: row, error: null });

    const seed = await updateSeed("seed-new", { name: "Renamed" }, "user-1");

    expect(seed).not.toBeNull();
    expect(seed!.name).toBe("Renamed");
  });
});
