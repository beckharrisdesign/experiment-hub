/**
 * Task 6.6 — v1's `testing/test-entity-projection.js`, run against the ported
 * module. The projected entities go into the OpenAI prompt, so a regression
 * here ships household account numbers to a third party.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@experiment-hub/notion-auth", () => ({
  hasNotionAuth: () => Boolean(process.env.NOTION_TOKEN),
  resolveNotionToken: async () => process.env.NOTION_TOKEN ?? "",
}));

import {
  ALLOWED_PROPERTIES,
  DENIED_PROPERTIES,
  EntitiesUnavailable,
  clearEntityCache,
  loadEntities,
  projectEntity,
  shapeEntities,
  type Entity,
} from "@/lib/pdf-entities";

const title = (text: string) => ({ title: [{ plain_text: text }] });
const richText = (text: string) => ({ rich_text: [{ plain_text: text }] });
const select = (name: string) => ({ select: { name } });
const multiSelect = (names: string[]) => ({ multi_select: names.map((name) => ({ name })) });

// A Notion page carrying every sensitive field the real database has.
const sensitivePage = {
  properties: {
    Slug: title("firstname-m-lastname"),
    Name: richText("Firstname Lastname"),
    Aliases: richText("Firstname, Firstie"),
    Kind: select("Person"),
    Relationship: select("Self"),
    Category: multiSelect(["medical", "financial"]),
    Status: select("Active"),
    Location: select("location-somewhere-st"),
    // None of the following may appear in the output.
    "Account Number": richText("4111-1111-1111-1111"),
    Address: richText("123 Private Road"),
    Phone: { phone_number: "555-0100" },
    Email: { email: "private@example.com" },
    Website: { url: "https://bank.example.com/login" },
    Notes: richText("Sensitive free-text note"),
  },
};

describe("projectEntity", () => {
  it("never carries contact or account data", () => {
    const serialized = JSON.stringify(projectEntity(sensitivePage));
    for (const marker of [
      "4111-1111-1111-1111",
      "123 Private Road",
      "555-0100",
      "private@example.com",
      "bank.example.com",
      "Sensitive free-text note",
    ]) {
      expect(serialized).not.toContain(marker);
    }
  });

  it("keeps the allowlisted fields", () => {
    const entity = projectEntity(sensitivePage)!;
    expect(entity.slug).toBe("firstname-m-lastname");
    expect(entity.name).toBe("Firstname Lastname");
    expect(entity.aliases).toEqual(["Firstname", "Firstie"]);
    expect(entity.kind).toBe("Person");
    expect(entity.categories).toEqual(["medical", "financial"]);
  });

  // Mixed separators in the real database: splitting on comma alone collapses
  // multi-alias rows into one unmatchable blob.
  it("splits aliases on ; and , but not on & inside a name", () => {
    const aliases = (text: string) =>
      projectEntity({ properties: { Slug: title("s"), Aliases: richText(text) } })!.aliases;
    expect(aliases("Alpha; Bravo; Charlie")).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(aliases("Alpha; Bravo, Charlie")).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(aliases("Alpha & Bravo")).toEqual(["Alpha & Bravo"]);
  });

  it("ignores a column added in Notion that the allowlist doesn't name", () => {
    const page = {
      properties: { ...sensitivePage.properties, "Social Security Number": richText("000-00-0000") },
    };
    expect(JSON.stringify(projectEntity(page))).not.toContain("000-00-0000");
  });

  it("drops an entity with no slug, which can't be a tag", () => {
    expect(projectEntity({ properties: { Name: richText("No Slug") } })).toBeNull();
  });

  it("keeps the allow and deny lists apart", () => {
    expect(ALLOWED_PROPERTIES.every((p) => !(DENIED_PROPERTIES as readonly string[]).includes(p))).toBe(true);
  });
});

describe("shapeEntities", () => {
  it("leaves Former entities out of suggestions but keeps their locations", () => {
    const base = { aliases: [], relationship: "", categories: [] };
    const shaped = shapeEntities([
      { ...base, slug: "a-person", name: "A", kind: "Person", status: "Active", location: "loc-1" },
      { ...base, slug: "old-vendor", name: "B", kind: "Organization", status: "Former", location: "loc-2" },
      { ...base, slug: "cur-vendor", name: "C", kind: "Organization", status: "Active", location: "loc-1" },
    ] as Entity[]);
    expect(shaped.people).toEqual(["a-person"]);
    expect(shaped.vendors).toEqual(["cur-vendor"]);
    expect(shaped.locations).toEqual(["loc-1", "loc-2"]);
  });
});

describe("loadEntities", () => {
  const saved = { ...process.env };
  beforeEach(() => clearEntityCache());
  afterEach(() => {
    process.env = { ...saved };
  });

  // An empty list would make suggestions look like a bad model rather than a
  // broken integration, so a missing configuration is an error, not [].
  it("refuses rather than returning nobody when Notion isn't configured", async () => {
    delete process.env.NOTION_ENTITIES_DATA_SOURCE_ID;
    delete process.env.NOTION_TOKEN;
    const error = await loadEntities().catch((e) => e);
    expect(error).toBeInstanceOf(EntitiesUnavailable);
    expect(error.message).toContain("NOTION_ENTITIES_DATA_SOURCE_ID");
    expect(error.message).toContain("NOTION_TOKEN");
  });
});
