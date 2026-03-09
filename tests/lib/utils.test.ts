import { describe, it, expect } from "vitest";
import { slugify, getExperimentSlug } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases and hyphenates a basic two-word name", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });

  it("collapses multiple spaces to a single hyphen", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("replaces underscores with hyphens", () => {
    expect(slugify("hello_world")).toBe("hello-world");
  });

  it("collapses consecutive hyphens to one", () => {
    expect(slugify("hello--world")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("PRD & Market Research (v2)!")).toBe("prd-market-research-v2");
  });

  it("removes apostrophes", () => {
    expect(slugify("Beck's Seed Organizer")).toBe("becks-seed-organizer");
  });

  it("handles all-caps input", () => {
    expect(slugify("HELLO WORLD")).toBe("hello-world");
  });

  it("preserves numbers", () => {
    expect(slugify("Experiment 1")).toBe("experiment-1");
  });

  it("handles input that is already a valid slug", () => {
    expect(slugify("hello-world")).toBe("hello-world");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("strips leading and trailing hyphens that result from removal", () => {
    // Leading/trailing special chars should not leave dangling hyphens
    expect(slugify("!hello!")).toBe("hello");
  });

  it("handles a realistic experiment name", () => {
    expect(slugify("Simple Seed Organizer")).toBe("simple-seed-organizer");
  });

  it("handles a name with slash", () => {
    expect(slugify("AI/ML Dashboard")).toBe("aiml-dashboard");
  });
});

describe("getExperimentSlug", () => {
  it("delegates to slugify", () => {
    expect(getExperimentSlug("Simple Seed Organizer")).toBe("simple-seed-organizer");
  });

  it("returns the same result as calling slugify directly", () => {
    const name = "Etsy Listing Manager!";
    expect(getExperimentSlug(name)).toBe(slugify(name));
  });
});
