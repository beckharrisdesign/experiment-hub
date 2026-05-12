import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => {
  const state: {
    responses: Array<{ data: unknown[] | null; error: any }>;
    selectedColumns: string[];
  } = {
    responses: [],
    selectedColumns: [],
  };

  const order = vi.fn(async () => {
    const response = state.responses.shift();
    if (!response) return { data: null, error: null };
    return response;
  });

  const select = vi.fn((columns: string) => {
    state.selectedColumns.push(columns);
    return { order };
  });

  const from = vi.fn(() => ({ select }));

  return { state, from, select, order };
});

vi.mock('./supabase', () => ({
  supabase: {
    from: storageMocks.from,
  },
}));

vi.mock('./seed-photos', () => ({
  getPhotoUrl: vi.fn((path: string | null | undefined) =>
    path ? `https://storage.example/${path}` : undefined,
  ),
  deleteSeedPhotos: vi.fn(),
}));

import { getSeedsWithoutPhotos } from './storage';

function makeDbSeed(overrides: Record<string, unknown> = {}) {
  return {
    id: 'seed-1',
    name: 'Tomato',
    variety: 'Cherokee Purple',
    type: 'vegetable',
    brand: 'Seed Co',
    year: 2024,
    planting_months: '[3,4,5]',
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('storage seed loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.state.responses = [];
    storageMocks.state.selectedColumns = [];
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('retries without user_id when production has a pre-auth seeds schema', async () => {
    storageMocks.state.responses = [
      {
        data: null,
        error: {
          code: '42703',
          message: 'column seeds.user_id does not exist',
        },
      },
      {
        data: [makeDbSeed({ source: 'hardware store', quantity: '25 seeds' })],
        error: null,
      },
    ];

    const seeds = await getSeedsWithoutPhotos();

    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toMatchObject({
      id: 'seed-1',
      source: 'hardware store',
      quantity: '25 seeds',
    });
    expect(storageMocks.state.selectedColumns[0]).toContain('user_id');
    expect(storageMocks.state.selectedColumns[1]).not.toContain('user_id');
  });

  it('falls back to a legacy column set when newer seed columns are missing', async () => {
    storageMocks.state.responses = [
      {
        data: null,
        error: {
          code: 'PGRST204',
          message:
            "Could not find the 'quantity' column of 'seeds' in the schema cache",
        },
      },
      {
        data: null,
        error: {
          code: 'PGRST204',
          message:
            "Could not find the 'quantity' column of 'seeds' in the schema cache",
        },
      },
      {
        data: [makeDbSeed()],
        error: null,
      },
    ];

    const seeds = await getSeedsWithoutPhotos();

    expect(seeds).toHaveLength(1);
    expect(seeds[0].name).toBe('Tomato');
    expect(storageMocks.state.selectedColumns).toHaveLength(3);
    expect(storageMocks.state.selectedColumns[2]).toBe(
      'id,name,variety,type,brand,year,planting_months,notes,created_at,updated_at',
    );
  });

  it('ignores malformed planting month values instead of failing the whole collection', async () => {
    storageMocks.state.responses = [
      {
        data: [makeDbSeed({ planting_months: 'spring' })],
        error: null,
      },
    ];

    const seeds = await getSeedsWithoutPhotos();

    expect(seeds).toHaveLength(1);
    expect(seeds[0].plantingMonths).toBeUndefined();
  });

  it('accepts comma-separated planting month values from legacy rows', async () => {
    storageMocks.state.responses = [
      {
        data: [makeDbSeed({ planting_months: '2, 4, 13, 8' })],
        error: null,
      },
    ];

    const seeds = await getSeedsWithoutPhotos();

    expect(seeds[0].plantingMonths).toEqual([2, 4, 8]);
  });
});
