import { describe, expect, it } from "vitest";
import { createLatest } from "../../src/lib/latest";

// Copilot review on PR #591: two quick uploads could finish out of order and the older one won.
describe("latest-wins guard", () => {
  it("only the newest token is current", () => {
    const loads = createLatest();
    const a = loads.next();
    const b = loads.next();
    expect(loads.isCurrent(a)).toBe(false);
    expect(loads.isCurrent(b)).toBe(true);
  });
});
