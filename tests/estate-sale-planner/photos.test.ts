/**
 * The originals kept on the device (sold-comps spec: item-correction, "The
 * original photos stay on the device"; design D1).
 */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { deleteSalePhotos, getLocalPhoto, getPhoto, itemPhotoKey, photoKey, planEviction, putPhotos, photoUsage } from "@/lib/estate-sale-planner/photos";

const blob = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });

describe("photoKey", () => {
  it("names a photo by sale, pass and frame", () => {
    expect(photoKey("esp_a", 2, 7)).toBe("esp_a/2/7");
  });
});

describe("planEviction", () => {
  const sales = [
    { saleId: "old", bytes: 40, oldest: 1 },
    { saleId: "mid", bytes: 40, oldest: 2 },
    { saleId: "new", bytes: 10, oldest: 3 },
  ];

  it("evicts nothing while the new photos fit", () => {
    expect(planEviction(sales, 10, 100, "new")).toEqual([]);
  });

  it("drops the oldest sale's originals first, then the next, until the new photos fit", () => {
    expect(planEviction(sales, 20, 100, "new")).toEqual(["old"]);
    expect(planEviction(sales, 70, 100, "new")).toEqual(["old", "mid"]);
  });

  it("never evicts the sale being written to", () => {
    expect(planEviction(sales, 500, 100, "new")).toEqual(["old", "mid"]);
  });
});

describe("the photo store", () => {
  beforeEach(async () => {
    for (const id of ["a", "b", "c"]) await deleteSalePhotos(id);
  });

  it("keeps each photo and gives it back by key", async () => {
    await putPhotos("a", 1, [{ frame: 0, blob: blob(10) }, { frame: 1, blob: blob(12) }], { now: 1 });
    const got = await getPhoto(photoKey("a", 1, 1));
    expect(got?.size).toBe(12);
    expect(got?.type).toBe("image/jpeg");
    expect(await getPhoto(photoKey("a", 1, 9))).toBeNull();
  });

  it("a photo added to one item by hand is kept under its own key", async () => {
    await putPhotos("a", 0, [{ frame: 0, blob: blob(9), id: itemPhotoKey("a", "a_u1") }], { now: 1 });
    expect((await getPhoto("a/item/a_u1"))?.size).toBe(9);
  });

  it("past the cap, the oldest sale's originals go first and the new ones are kept", async () => {
    await putPhotos("a", 1, [{ frame: 0, blob: blob(40) }], { now: 1, capBytes: 100 });
    await putPhotos("b", 1, [{ frame: 0, blob: blob(40) }], { now: 2, capBytes: 100 });
    const evicted = await putPhotos("c", 1, [{ frame: 0, blob: blob(40) }], { now: 3, capBytes: 100 });
    expect(evicted).toEqual(["a"]);
    expect(await getPhoto(photoKey("a", 1, 0))).toBeNull();
    expect(await getPhoto(photoKey("c", 1, 0))).not.toBeNull();
    const usage = await photoUsage();
    expect(usage.sales.map((s) => s.saleId).sort()).toEqual(["b", "c"]);
  });
});

describe("getPhoto falls back to the server (esp-server-sales D5)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads an original the phone no longer has, and keeps it on the phone again", async () => {
    await deleteSalePhotos("esp_srv");
    // Raw bytes: under jsdom a jsdom Blob body would arrive as the text "[object Blob]".
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(321), { status: 200, headers: { "content-type": "image/jpeg" } }));
    vi.stubGlobal("fetch", fetchMock);
    const got = await getPhoto("esp_srv/1/0");
    expect(got?.size).toBe(321);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe("/estate-sale-planner/api/photos?saleId=esp_srv&key=esp_srv%2F1%2F0");
    expect((await getLocalPhoto("esp_srv/1/0"))?.size).toBe(321);
  });

  it("is null when the server doesn't have it either, or can't be reached", async () => {
    await deleteSalePhotos("esp_none");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    expect(await getPhoto("esp_none/1/0")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await getPhoto("esp_none/1/0")).toBeNull();
    expect(await getLocalPhoto("esp_none/1/0")).toBeNull();
  });

  it("never asks the server for a photo the phone has", async () => {
    await putPhotos("esp_here", 1, [{ frame: 0, blob: blob(50) }]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await getPhoto("esp_here/1/0"))?.size).toBe(50);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
