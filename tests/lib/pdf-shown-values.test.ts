import { describe, it, expect } from "vitest";
import { shownValues } from "@/lib/pdf-shown-values";

const STORED = { title: null, subject: "Kept", author: null, keywords: [] as string[] };
const IN_FILE = { title: "From file", subject: "File subject", author: "Scanner", keywords: ["a"], pageCount: 2 };

describe("shownValues", () => {
  it("fills unread fields from the file before the first edit", () => {
    expect(shownValues(STORED, false, IN_FILE)).toEqual({
      title: "From file",
      subject: "Kept",
      author: "Scanner",
      keywords: ["a"],
    });
  });

  it("shows only stored values once editing has started", () => {
    expect(shownValues(STORED, true, IN_FILE)).toEqual(STORED);
  });

  it("shows stored values when the file couldn't be read", () => {
    expect(shownValues(STORED, false, undefined)).toEqual(STORED);
  });
});
