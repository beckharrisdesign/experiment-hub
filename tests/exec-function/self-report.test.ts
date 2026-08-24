import { describe, it, expect } from "vitest";
import {
  INDICES,
  ITEMS,
  ITEMS_PER_SUBSCALE,
  RESPONSE_OPTIONS,
  SUBSCALES,
  isComplete,
  missingItems,
  score,
  type Responses,
  type ResponseValue,
  type SubscaleId,
} from "@/lib/exec-function/self-report";

function answerAll(value: ResponseValue): Responses {
  return Object.fromEntries(ITEMS.map((item) => [item.id, value]));
}

// ---------------------------------------------------------------------------
// Structure — mirrors BRIEF-A's architecture, not its content
// ---------------------------------------------------------------------------

describe("questionnaire structure", () => {
  it("uses a three-point Never / Sometimes / Often scale", () => {
    expect(RESPONSE_OPTIONS.map((o) => o.label)).toEqual(["Never", "Sometimes", "Often"]);
    expect(RESPONSE_OPTIONS.map((o) => o.value)).toEqual([1, 2, 3]);
  });

  it("organizes items into the nine conceptual subscales", () => {
    expect(Object.keys(SUBSCALES)).toEqual([
      "inhibit",
      "shift",
      "emotionalControl",
      "selfMonitor",
      "initiate",
      "workingMemory",
      "planOrganize",
      "taskMonitor",
      "organizationOfMaterials",
    ]);
  });

  it("rolls the subscales into two indices with no overlap and no gaps", () => {
    const assigned = [
      ...INDICES.behavioralRegulation.subscales,
      ...INDICES.metacognition.subscales,
    ];
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(new Set(assigned)).toEqual(new Set(Object.keys(SUBSCALES)));
  });

  it("assigns every subscale to the index it declares", () => {
    for (const [id, subscale] of Object.entries(SUBSCALES)) {
      expect(INDICES[subscale.index].subscales).toContain(id as SubscaleId);
    }
  });

  it("gives every subscale the same number of items", () => {
    for (const id of Object.keys(SUBSCALES) as SubscaleId[]) {
      expect(ITEMS.filter((item) => item.subscale === id)).toHaveLength(ITEMS_PER_SUBSCALE);
    }
    expect(ITEMS).toHaveLength(ITEMS_PER_SUBSCALE * 9);
  });

  it("has unique item ids and unique item text", () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    expect(new Set(ITEMS.map((i) => i.text)).size).toBe(ITEMS.length);
  });
});

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

describe("completeness", () => {
  it("reports every item as missing when nothing is answered", () => {
    expect(missingItems({})).toHaveLength(ITEMS.length);
    expect(isComplete({})).toBe(false);
  });

  it("reports complete once every item has a response", () => {
    expect(missingItems(answerAll(2))).toEqual([]);
    expect(isComplete(answerAll(2))).toBe(true);
  });

  it("refuses to score a partially answered questionnaire", () => {
    const partial = answerAll(2);
    delete partial[ITEMS[0].id];
    expect(() => score(partial)).toThrow(/unanswered/);
  });
});

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe("score", () => {
  it("puts an all-Never questionnaire at the floor of every scale", () => {
    const result = score(answerAll(1));
    expect(result.composite.raw).toBe(ITEMS.length);
    expect(result.composite.raw).toBe(result.composite.min);
    expect(result.composite.proportion).toBe(0);
    for (const scale of Object.values(result.subscales)) {
      expect(scale.raw).toBe(ITEMS_PER_SUBSCALE);
      expect(scale.proportion).toBe(0);
    }
  });

  it("puts an all-Often questionnaire at the ceiling of every scale", () => {
    const result = score(answerAll(3));
    expect(result.composite.raw).toBe(ITEMS.length * 3);
    expect(result.composite.raw).toBe(result.composite.max);
    expect(result.composite.proportion).toBe(1);
  });

  it("puts an all-Sometimes questionnaire at the midpoint", () => {
    const result = score(answerAll(2));
    expect(result.composite.proportion).toBeCloseTo(0.5, 10);
  });

  it("sums each index from exactly its own subscales", () => {
    const responses = Object.fromEntries(
      ITEMS.map((item, i) => [item.id, ((i % 3) + 1) as ResponseValue]),
    );
    const result = score(responses);

    for (const [indexId, index] of Object.entries(INDICES)) {
      const expected = index.subscales.reduce(
        (sum, s) => sum + result.subscales[s].raw,
        0,
      );
      expect(result.indices[indexId as keyof typeof INDICES].raw).toBe(expected);
    }
  });

  it("makes the composite the sum of the two indices", () => {
    const responses = Object.fromEntries(
      ITEMS.map((item, i) => [item.id, (((i * 7) % 3) + 1) as ResponseValue]),
    );
    const result = score(responses);
    expect(result.composite.raw).toBe(
      result.indices.behavioralRegulation.raw + result.indices.metacognition.raw,
    );
  });

  it("spans 45-135 on the composite and 20-60 / 25-75 on the indices", () => {
    const result = score(answerAll(2));
    expect([result.composite.min, result.composite.max]).toEqual([45, 135]);
    expect([
      result.indices.behavioralRegulation.min,
      result.indices.behavioralRegulation.max,
    ]).toEqual([20, 60]);
    expect([
      result.indices.metacognition.min,
      result.indices.metacognition.max,
    ]).toEqual([25, 75]);
  });

  it("moves every scale in the same direction — no reverse-keyed items", () => {
    // A rising composite must always mean more reported difficulty, or the
    // trend chart is unreadable.
    const low = score(answerAll(1));
    const high = score(answerAll(3));
    expect(high.composite.raw).toBeGreaterThan(low.composite.raw);
    for (const id of Object.keys(SUBSCALES) as SubscaleId[]) {
      expect(high.subscales[id].raw).toBeGreaterThan(low.subscales[id].raw);
    }
  });

  it("isolates a change to the subscale it belongs to", () => {
    const base = answerAll(1);
    const bumped: Responses = { ...base };
    for (const item of ITEMS.filter((i) => i.subscale === "workingMemory")) {
      bumped[item.id] = 3;
    }
    const result = score(bumped);

    expect(result.subscales.workingMemory.proportion).toBe(1);
    expect(result.subscales.inhibit.proportion).toBe(0);
    expect(result.indices.behavioralRegulation.proportion).toBe(0);
    expect(result.indices.metacognition.proportion).toBeGreaterThan(0);
  });
});
