import { describe, it, expect } from "vitest";
import { addToSaleTitle } from "@/app/estate-sale-planner/PhotoGrid";

// Founder, 2026-10-27: "'Send this photo' is a strange prompt. Make it 'Add to the [name] sale?'"
describe("addToSaleTitle", () => {
  it("names the sale, without doubling a name that already ends in Sale", () => {
    expect(addToSaleTitle("Mom's house")).toBe("Add to the Mom's house sale?");
    expect(addToSaleTitle("2027 Jumble Sale")).toBe("Add to the 2027 Jumble Sale?");
  });

  it("a new sale with no name yet", () => {
    expect(addToSaleTitle("")).toBe("Add to a new sale?");
    expect(addToSaleTitle(undefined)).toBe("Add to a new sale?");
  });
});
