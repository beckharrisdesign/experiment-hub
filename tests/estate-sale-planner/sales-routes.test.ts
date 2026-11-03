// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { DEVICE_COOKIE, hashDevice } from "@/lib/estate-sale-planner/device";

/**
 * In-memory stand-in for the service-role client: esp_sales, esp_sale_photos, the
 * esp_save_sale function (newer version wins, same device only) and the esp-photos bucket.
 */
function fakeSupabase() {
  const tables: Record<string, any[]> = { esp_sales: [], esp_sale_photos: [] };
  const bucket = new Map<string, { bytes: number; type: string; data: ArrayBuffer }>();
  const query = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    let order: string | null = null;
    const rows = () => tables[table].filter((r) => filters.every(([k, v]) => r[k] === v));
    const q: any = {
      select: () => q,
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      order: (k: string) => ((order = k), q),
      limit: async () => ({ data: [...rows()].sort((a, b) => (order ? String(b[order]).localeCompare(String(a[order])) : 0)), error: null }),
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      // Awaiting the builder itself runs the select, as supabase-js does.
      then: (resolve: (v: unknown) => void) => resolve({ data: rows(), error: null }),
      upsert: async (row: any, { onConflict }: { onConflict: string }) => {
        const keys = onConflict.split(",");
        const i = tables[table].findIndex((r) => keys.every((k) => r[k] === row[k]));
        if (i >= 0) tables[table][i] = { ...tables[table][i], ...row };
        else tables[table].push(row);
        return { error: null };
      },
      delete: () => {
        const d: any = {
          eq: (k: string, v: unknown) => {
            filters.push([k, v]);
            return Object.assign(Promise.resolve().then(() => {
              const gone = rows();
              tables[table] = tables[table].filter((r) => !gone.includes(r));
              if (table === "esp_sales") tables.esp_sale_photos = tables.esp_sale_photos.filter((p) => !gone.some((s) => s.id === p.sale_id));
              return { error: null };
            }), d);
          },
        };
        return d;
      },
    };
    return q;
  };
  let tick = 0;
  return {
    tables,
    bucket,
    from: query,
    rpc: async (_fn: string, a: { p_id: string; p_device_hash: string; p_version: number; p_session: unknown }) => {
      const row = tables.esp_sales.find((r) => r.id === a.p_id);
      const updated_at = `2026-11-03T12:00:${String(tick++).padStart(2, "0")}Z`;
      if (!row) {
        tables.esp_sales.push({ id: a.p_id, device_hash: a.p_device_hash, version: a.p_version, session: a.p_session, updated_at });
        return { data: true, error: null };
      }
      if (row.version < a.p_version && row.device_hash === a.p_device_hash) {
        Object.assign(row, { version: a.p_version, session: a.p_session, updated_at });
        return { data: true, error: null };
      }
      return { data: false, error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string, data: ArrayBuffer, o: { contentType: string }) => (bucket.set(path, { bytes: data.byteLength, type: o.contentType, data }), { error: null }),
        download: async (path: string) => {
          const f = bucket.get(path);
          return f ? { data: new Blob([f.data], { type: f.type }), error: null } : { data: null, error: new Error("not found") };
        },
        remove: async (paths: string[]) => (paths.forEach((p) => bucket.delete(p)), { error: null }),
        createSignedUrl: async (path: string, seconds: number) => ({ data: { signedUrl: `https://storage.example/${path}?expires=${seconds}` }, error: null }),
      }),
    },
  };
}

let db: ReturnType<typeof fakeSupabase>;
vi.mock("@/lib/estate-sale-planner/supabase-admin", () => ({ createAdminSupabaseClient: () => db }));

const PHONE = "p".repeat(43);
const OTHER = "o".repeat(43);
const BASE = "http://localhost/estate-sale-planner/api";
const sale = (id: string, name = "Mom's house") => ({ id, createdAt: "2026-11-03T10:00:00Z", name, items: [{ id: `${id}_0`, name: "Lodge skillet", room: "Kitchen", flagged: true, band: "$50–$100", reason: "r", confidence: "medium", frame: 0, box: null, destination: "sell" }], history: [] });

function req(path: string, init: { method?: string; body?: BodyInit; json?: unknown; cookie?: string | null } = {}) {
  const headers: Record<string, string> = {};
  if (init.cookie !== null) headers.cookie = `${DEVICE_COOKIE}=${init.cookie ?? PHONE}`;
  if (init.json !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(`${BASE}/${path}`, { method: init.method ?? (init.json !== undefined || init.body ? "POST" : "GET"), headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
}

let routes: {
  sales: typeof import("@/app/estate-sale-planner/api/sales/route");
  one: typeof import("@/app/estate-sale-planner/api/sales/one/route");
  del: typeof import("@/app/estate-sale-planner/api/sales/delete/route");
  photos: typeof import("@/app/estate-sale-planner/api/photos/route");
};

beforeEach(async () => {
  db = fakeSupabase();
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Fresh modules per test: the throttle windows live at module scope.
  vi.resetModules();
  routes = {
    sales: await import("@/app/estate-sale-planner/api/sales/route"),
    one: await import("@/app/estate-sale-planner/api/sales/one/route"),
    del: await import("@/app/estate-sale-planner/api/sales/delete/route"),
    photos: await import("@/app/estate-sale-planner/api/photos/route"),
  };
});

const save = (id: string, version: number, cookie?: string | null, s = sale(id)) => routes.sales.POST(req("sales", { json: { id, version, session: s }, cookie }));
const upload = (saleId: string, key: string, cookie?: string | null, type = "image/jpeg", size = 1000) => {
  const form = new FormData();
  form.set("saleId", saleId);
  form.set("key", key);
  form.set("photo", new Blob([new Uint8Array(size)], { type }), "p.jpg");
  return routes.photos.POST(req("photos", { body: form, cookie }));
};

describe("saving a sale", () => {
  it("an edit reaches the server, stored under the phone's hash, never its cookie", async () => {
    const res = await save("esp_a", 100);
    expect(await res.json()).toEqual({ success: true, saved: true });
    expect(db.tables.esp_sales[0]).toMatchObject({ id: "esp_a", device_hash: await hashDevice(PHONE), version: 100 });
    expect(JSON.stringify(db.tables)).not.toContain(PHONE);
  });

  it("an older copy never overwrites a newer one", async () => {
    await save("esp_a", 200, undefined, sale("esp_a", "New name"));
    const late = await save("esp_a", 150, undefined, sale("esp_a", "Old name"));
    expect(await late.json()).toEqual({ success: true, saved: false });
    expect(db.tables.esp_sales[0].session.name).toBe("New name");
  });

  it("another phone can't overwrite a sale, and is told it doesn't exist", async () => {
    await save("esp_a", 100);
    const res = await save("esp_a", 999, OTHER, sale("esp_a", "Hijacked"));
    expect(res.status).toBe(404);
    expect(db.tables.esp_sales[0].session.name).toBe("Mom's house");
  });

  it("refuses no cookie, a malformed sale, or a mismatched id", async () => {
    expect((await save("esp_a", 1, null)).status).toBe(404);
    expect((await routes.sales.POST(req("sales", { json: { id: "esp_a", version: 1, session: { ...sale("esp_b") } } }))).status).toBe(400);
    expect((await routes.sales.POST(req("sales", { json: { id: "esp_a", version: -1, session: sale("esp_a") } }))).status).toBe(400);
    expect((await routes.sales.POST(req("sales", { json: [] }))).status).toBe(400);
    expect(db.tables.esp_sales).toEqual([]);
  });

  it("throttles a burst from one phone", async () => {
    let last = 200;
    for (let i = 1; i <= 62; i++) last = (await save("esp_a", i)).status;
    expect(last).toBe(429);
  });
});

describe("loading sales", () => {
  it("lists only this phone's sales as Home rows with their versions", async () => {
    await save("esp_a", 100);
    await save("esp_b", 100, OTHER);
    const body = await (await routes.sales.GET(req("sales"))).json();
    expect(body.sales).toHaveLength(1);
    expect(body.sales[0]).toMatchObject({ id: "esp_a", name: "Mom's house", items: 1, sell: 1, version: 100 });
  });

  it("a phone with no id yet just has no sales", async () => {
    expect(await (await routes.sales.GET(req("sales", { cookie: null }))).json()).toEqual({ success: true, sales: [] });
  });

  it("opens one sale for its own phone, and 404s for anyone else or a guessed id", async () => {
    await save("esp_a", 100);
    const mine = await routes.one.GET(req("sales/one?id=esp_a"));
    expect(await mine.json()).toMatchObject({ success: true, version: 100, session: { id: "esp_a" } });
    expect((await routes.one.GET(req("sales/one?id=esp_a", { cookie: OTHER }))).status).toBe(404);
    expect((await routes.one.GET(req("sales/one?id=esp_a", { cookie: null }))).status).toBe(404);
    expect((await routes.one.GET(req("sales/one?id=esp_nope"))).status).toBe(404);
  });
});

describe("photos", () => {
  it("stores an original privately under its sale, once the sale is saved", async () => {
    expect((await upload("esp_a", "esp_a/0/0")).status).toBe(404); // not saved yet
    await save("esp_a", 100);
    expect(await (await upload("esp_a", "esp_a/0/0")).json()).toEqual({ success: true });
    expect([...db.bucket.keys()]).toEqual(["esp_a/0/0.jpg"]);
    expect(db.tables.esp_sale_photos[0]).toMatchObject({ sale_id: "esp_a", key: "esp_a/0/0", bytes: 1000 });
    await upload("esp_a", "esp_a/0/0"); // a retry doesn't duplicate
    expect(db.tables.esp_sale_photos).toHaveLength(1);
  });

  it("refuses another phone's sale, a key outside the sale, and anything but a small JPEG or PNG", async () => {
    await save("esp_a", 100);
    expect((await upload("esp_a", "esp_a/0/0", OTHER)).status).toBe(404);
    expect((await upload("esp_a", "esp_b/0/0")).status).toBe(400);
    expect((await upload("esp_a", "esp_a/../x")).status).toBe(400);
    expect((await upload("esp_a", "esp_a/0/0", undefined, "image/gif")).status).toBe(400);
    expect((await upload("esp_a", "esp_a/0/0", undefined, "image/jpeg", 3 * 1024 * 1024)).status).toBe(400);
    expect(db.bucket.size).toBe(0);
  });

  it("serves the photo's bytes to its own phone, from this origin, never as a link — and nobody else anything", async () => {
    await save("esp_a", 100);
    await upload("esp_a", "esp_a/0/0");
    const res = await routes.photos.GET(req("photos?saleId=esp_a&key=esp_a/0/0"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.arrayBuffer()).byteLength).toBe(1000);
    expect((await routes.photos.GET(req("photos?saleId=esp_a&key=esp_a/0/0", { cookie: OTHER }))).status).toBe(404);
    expect((await routes.photos.GET(req("photos?saleId=esp_a&key=esp_a/9/9"))).status).toBe(404);
  });
});

describe("deleting a sale", () => {
  it("removes the sale, its photo rows and its photos, for its own phone only", async () => {
    await save("esp_a", 100);
    await upload("esp_a", "esp_a/0/0");
    expect((await routes.del.POST(req("sales/delete", { json: { id: "esp_a" }, cookie: OTHER }))).status).toBe(404);
    expect(db.tables.esp_sales).toHaveLength(1);
    expect(await (await routes.del.POST(req("sales/delete", { json: { id: "esp_a" } }))).json()).toEqual({ success: true });
    expect(db.tables.esp_sales).toEqual([]);
    expect(db.tables.esp_sale_photos).toEqual([]);
    expect(db.bucket.size).toBe(0);
  });
});
