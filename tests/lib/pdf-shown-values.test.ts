import { describe, it, expect } from "vitest";
import { listedValues, shownValues } from "@/lib/pdf-shown-values";

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

describe("listedValues", () => {
  const base = {
    title: null,
    subject: null,
    author: null,
    keywords: [] as string[],
    pageCount: null,
    fileBaseline: null,
    driveRevisionId: "rev-2",
    fileRead: null,
  };

  it("fills a never-edited row from a read of the revision Drive listed", () => {
    const d = { ...base, fileRead: { revision: "rev-2", embedded: IN_FILE } };
    expect(listedValues(d)).toEqual({
      title: "From file",
      subject: "File subject",
      author: "Scanner",
      keywords: ["a"],
      pageCount: 2,
    });
  });

  it("ignores a read of an older revision", () => {
    const d = { ...base, fileRead: { revision: "rev-1", embedded: IN_FILE } };
    expect(listedValues(d)).toEqual({ ...STORED_EMPTY, pageCount: null });
  });

  it("shows stored values once edited, with the baseline's page count as a fallback", () => {
    const d = {
      ...base,
      title: "Mine",
      fileBaseline: { ...IN_FILE, pageCount: 5 },
      fileRead: { revision: "rev-2", embedded: IN_FILE },
    };
    expect(listedValues(d)).toEqual({ ...STORED_EMPTY, title: "Mine", pageCount: 5 });
  });

  it("prefers the stored page count", () => {
    expect(listedValues({ ...base, pageCount: 7 }).pageCount).toBe(7);
  });

  it("leaves blanks when nothing has been read", () => {
    expect(listedValues(base)).toEqual({ ...STORED_EMPTY, pageCount: null });
  });
});

const STORED_EMPTY = { title: null, subject: null, author: null, keywords: [] as string[] };
