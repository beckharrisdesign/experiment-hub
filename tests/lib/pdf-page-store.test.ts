import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = {
  document_id: string;
  drive_revision: string;
  set_id: string;
  page_count: number | null;
  drawn_at: string | null;
  created_at: string;
};

/** Just enough of Supabase: one table keyed by document and revision, one bucket. */
const db = vi.hoisted(() => ({
  rows: [] as Row[],
  objects: new Map<string, Uint8Array>(),
  failUploads: false,
  down: false,
  nextSet: 1,
}));

const { openPdf, shrinkJpeg } = vi.hoisted(() => ({ openPdf: vi.fn(), shrinkJpeg: vi.fn() }));
vi.mock("@/lib/pdf-render", () => ({ openPdf, shrinkJpeg }));

vi.mock("@/lib/pdf-documents", () => {
  const table = () => {
    const filters: [keyof Row, unknown][] = [];
    const hit = () => db.rows.filter((r) => filters.every(([k, v]) => r[k] === v));
    const done = (data: unknown) =>
      Promise.resolve(db.down ? { data: null, error: { message: "down" } } : { data, error: null });
    let act: () => unknown = hit;
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (k: keyof Row, v: unknown) => (filters.push([k, v]), q),
      maybeSingle: () => done(hit()[0] ?? null),
      upsert: (r: Partial<Row>, o: { ignoreDuplicates?: boolean }) => {
        if (!db.down) {
          const i = db.rows.findIndex(
            (x) => x.document_id === r.document_id && x.drive_revision === r.drive_revision,
          );
          const fresh = {
            set_id: `set-${db.nextSet}`,
            page_count: null,
            drawn_at: null,
            created_at: "2026-11-24T10:00:00Z",
            ...r,
          } as Row;
          if (i < 0) {
            db.nextSet += 1;
            db.rows.push(fresh);
          } else if (!o.ignoreDuplicates) db.rows[i] = { ...db.rows[i], ...r } as Row;
        }
        return done(null);
      },
      update: (r: Partial<Row>) => ((act = () => hit().forEach((x) => Object.assign(x, r))), q),
      delete: () => {
        act = () => {
          const gone = hit();
          db.rows = db.rows.filter((r) => !gone.includes(r));
        };
        return q;
      },
      then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => done(db.down ? null : act()).then(ok, bad),
    };
    return q;
  };
  const bucket = {
    upload: async (path: string, bytes: Uint8Array) => {
      if (db.failUploads) return { error: { message: "full" } };
      db.objects.set(path, bytes);
      return { error: null };
    },
    download: async (path: string) =>
      db.objects.has(path)
        ? { data: new Blob([db.objects.get(path)! as BlobPart]), error: null }
        : { data: null, error: { message: "not found" } },
    list: async (prefix: string) => ({
      data: [...db.objects.keys()]
        .filter((k) => k.startsWith(`${prefix}/`))
        .map((k) => ({ name: k.slice(prefix.length + 1) })),
      error: null,
    }),
    remove: async (paths: string[]) => (paths.forEach((p) => db.objects.delete(p)), { error: null }),
  };
  return { getPdfAdminClient: () => ({ from: table, storage: { from: () => bucket } }) };
});

import {
  carryPages,
  getKeptPage,
  isRevision,
  keepPage,
  STORED_WIDTH,
  syncPages,
  type PageSyncOptions,
  type WantedDocument,
} from "@/lib/pdf-page-store";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff]);
const SMALL = new Uint8Array([0xff]);
const pagesIn = () => [...db.objects.keys()].filter((k) => !k.includes(".t.")).length;
const STARTED = new Date("2026-11-24T12:00:00Z");

const want = (id: string, revision = "r1", pageCount: number | null = 2): WantedDocument => ({
  id,
  driveFileId: `file-${id}`,
  revision,
  pageCount,
});

function sync(o: Partial<PageSyncOptions> & { wanted: WantedDocument[] }) {
  const heads = new Map(o.wanted.map((d) => [d.driveFileId, d.revision]));
  return syncPages({
    download: vi.fn(async () => new ArrayBuffer(8)),
    headRevision: vi.fn(async (id: string) => heads.get(id) ?? null),
    outOfTime: () => false,
    startedAt: STARTED,
    ...o,
  });
}

const draw = vi.fn();
const close = vi.fn();

beforeEach(() => {
  db.rows = [];
  db.objects.clear();
  db.failUploads = false;
  db.down = false;
  db.nextSet = 1;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  draw.mockReset().mockImplementation(async () => ({ jpeg: JPEG, pageCount: 2, width: 1, height: 1 }));
  close.mockReset().mockResolvedValue(undefined);
  shrinkJpeg.mockReset().mockResolvedValue(SMALL);
  openPdf.mockReset().mockImplementation(async () => ({ pageCount: 2, draw, close }));
});

// ---------------------------------------------------------------------------
// One page
// ---------------------------------------------------------------------------

describe("one page", () => {
  it("is null until kept, then comes back with the page count", async () => {
    expect(await getKeptPage("d", "r1", 1)).toBeNull();
    await keepPage("d", "r1", 1, { jpeg: JPEG, pageCount: 2 });
    const kept = await getKeptPage("d", "r1", 1);
    expect(kept?.pageCount).toBe(2);
    expect(kept?.jpeg?.size).toBe(3);
    expect(await getKeptPage("d", "r1", 2)).toBeNull();
  });

  it("is only for the version it was drawn from", async () => {
    await keepPage("d", "r1", 1, { jpeg: JPEG, pageCount: 2 });
    expect(await getKeptPage("d", "r2", 1)).toBeNull();
    expect(await getKeptPage("other", "r1", 1)).toBeNull();
  });

  it("says when the page is past the end", async () => {
    await keepPage("d", "r1", 1, { jpeg: JPEG, pageCount: 2 });
    expect(await getKeptPage("d", "r1", 3)).toEqual({ jpeg: null, pageCount: 2 });
  });

  it("never fails the request it is part of", async () => {
    db.down = true;
    expect(await getKeptPage("d", "r1", 1)).toBeNull();
    await expect(keepPage("d", "r1", 1, { jpeg: JPEG, pageCount: 2 })).resolves.toBeUndefined();
    await expect(carryPages("d", "r1", "r2")).resolves.toBeUndefined();
  });

  it("takes only revision-shaped revisions", () => {
    expect(isRevision("0B1x_Y-z9")).toBe(true);
    for (const bad of ["", "../x", "a/b", "a b", null, undefined, "x".repeat(201)]) expect(isRevision(bad)).toBe(false);
  });
});

describe("a small copy", () => {
  it("is kept with its page", async () => {
    await keepPage("d", "r1", 1, { jpeg: JPEG, pageCount: 2 });
    const small = await getKeptPage("d", "r1", 1, "thumb");
    expect(small?.jpeg?.size).toBe(SMALL.length);
    expect(small?.later).toBeUndefined();
  });

  it("is made from a page kept before small copies were, then kept", async () => {
    await keepPage("d", "r1", 1, { jpeg: JPEG, pageCount: 2 });
    for (const key of [...db.objects.keys()]) if (key.includes(".t.")) db.objects.delete(key);
    const small = await getKeptPage("d", "r1", 1, "thumb");
    expect(small?.jpeg?.size).toBe(SMALL.length);
    await small!.later!();
    expect((await getKeptPage("d", "r1", 1, "thumb"))?.later).toBeUndefined();
  });

  it("is null when the page isn't kept, and never stops a page being kept", async () => {
    expect(await getKeptPage("d", "r1", 1, "thumb")).toBeNull();
    shrinkJpeg.mockRejectedValue(new Error("no"));
    await keepPage("d", "r1", 1, { jpeg: JPEG, pageCount: 2 });
    expect((await getKeptPage("d", "r1", 1))?.jpeg?.size).toBe(3);
    expect(await getKeptPage("d", "r1", 1, "thumb")).toBeNull();
    expect(await sync({ wanted: [want("e")] })).toMatchObject({ pagesDrawn: 2, pagesWaiting: 0 });
  });
});

// ---------------------------------------------------------------------------
// A commit
// ---------------------------------------------------------------------------

describe("a commit", () => {
  it("takes the drawn pages along to the new revision, copying nothing", async () => {
    await sync({ wanted: [want("d")] });
    const before = [...db.objects.keys()];
    await carryPages("d", "r1", "r2");
    expect((await getKeptPage("d", "r2", 2))?.jpeg).not.toBeNull();
    expect([...db.objects.keys()]).toEqual(before);
  });

  it("is not drawn again afterwards, and the old version's row is cleared without its images", async () => {
    await sync({ wanted: [want("d")] });
    await carryPages("d", "r1", "r2");
    draw.mockClear();
    const result = await sync({ wanted: [want("d", "r2")] });
    expect(result).toEqual({ pagesDrawn: 0, pagesWaiting: 0, setsRemoved: 1 });
    expect(draw).not.toHaveBeenCalled();
    expect(pagesIn()).toBe(2);
    expect(db.rows.map((r) => r.drive_revision)).toEqual(["r2"]);
  });

  it("does nothing without both revisions, or when nothing was kept", async () => {
    await carryPages("d", null, "r2");
    await carryPages("d", "r1", null);
    await carryPages("d", "r1", "r2");
    expect(db.rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The sync
// ---------------------------------------------------------------------------

describe("drawing ahead", () => {
  it("draws every page of each document once, at the kept size", async () => {
    const wanted = [want("a"), want("b")];
    expect(await sync({ wanted })).toEqual({ pagesDrawn: 4, pagesWaiting: 0, setsRemoved: 0 });
    expect(draw.mock.calls.every(([, w]) => w === STORED_WIDTH)).toBe(true);
    expect(await sync({ wanted })).toEqual({ pagesDrawn: 0, pagesWaiting: 0, setsRemoved: 0 });
    expect(openPdf).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("starts with the shortest documents", async () => {
    const download = vi.fn(async () => new ArrayBuffer(8));
    await sync({ wanted: [want("long", "r1", 119), want("unknown", "r1", null), want("short", "r1", 1)], download });
    expect(download.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["file-short", "file-long", "file-unknown"]);
  });

  it("picks up where it stopped when time runs out", async () => {
    let checks = 0;
    const first = await sync({ wanted: [want("a")], outOfTime: () => ++checks > 2 });
    expect(first).toMatchObject({ pagesDrawn: 1, pagesWaiting: 1 });
    expect(db.rows[0].drawn_at).toBeNull();
    expect(await sync({ wanted: [want("a")] })).toMatchObject({ pagesDrawn: 1, pagesWaiting: 0 });
    expect(draw.mock.calls.map(([n]) => n)).toEqual([1, 2]);
  });

  it("keeps nothing when the file changed while it was downloaded", async () => {
    const result = await sync({ wanted: [want("a")], headRevision: async () => "r2" });
    expect(result).toMatchObject({ pagesDrawn: 0, pagesWaiting: 1 });
    expect(db.rows).toEqual([]);
  });

  it("remembers a file it can't draw, so it isn't tried every hour", async () => {
    openPdf.mockRejectedValue(new Error("not a PDF"));
    expect(await sync({ wanted: [want("a")] })).toMatchObject({ pagesWaiting: 0 });
    expect(await getKeptPage("a", "r1", 1)).toBeNull();
    openPdf.mockClear();
    await sync({ wanted: [want("a")] });
    expect(openPdf).not.toHaveBeenCalled();
  });

  it("tries again later when a page couldn't be kept, and goes on to the next document", async () => {
    db.failUploads = true;
    expect(await sync({ wanted: [want("a"), want("b")] })).toMatchObject({ pagesDrawn: 0, pagesWaiting: 2 });
    expect(openPdf).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(2);
    expect(db.rows.every((r) => r.drawn_at === null)).toBe(true);
  });
});

describe("clearing out", () => {
  it("removes the images of a file that left the folder", async () => {
    await sync({ wanted: [want("a"), want("b")] });
    const result = await sync({ wanted: [want("b")] });
    expect(result.setsRemoved).toBe(1);
    expect(db.rows.map((r) => r.document_id)).toEqual(["b"]);
    // Pages and small copies both: two of each are left, of b's.
    expect(db.objects.size).toBe(4);
  });

  it("replaces the images of a file that changed in Drive", async () => {
    await sync({ wanted: [want("a")] });
    expect(await sync({ wanted: [want("a", "r9")] })).toEqual({ pagesDrawn: 2, pagesWaiting: 0, setsRemoved: 1 });
    expect(db.objects.size).toBe(4);
    expect(await getKeptPage("a", "r1", 1)).toBeNull();
  });

  it("leaves alone what was made during this run", async () => {
    db.rows.push({
      document_id: "a",
      drive_revision: "newer",
      set_id: "set-x",
      page_count: 2,
      drawn_at: null,
      created_at: "2026-11-24T12:00:05Z",
    });
    expect((await sync({ wanted: [want("a")] })).setsRemoved).toBe(0);
  });
});
