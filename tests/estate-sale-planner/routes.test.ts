import { describe, it, expect } from "vitest";
import { cameraTarget, chromeFor, parseRoute, paths, tabFor } from "@/lib/estate-sale-planner/routes";
import { pickPhotos } from "@/lib/estate-sale-planner/capture";

const id = "esp_lx1abc_k9q2zz";

describe("parseRoute", () => {
  it("names every screen the shell knows", () => {
    expect(parseRoute(paths.home())).toEqual({ screen: "home" });
    expect(parseRoute(paths.newSale())).toEqual({ screen: "new" });
    expect(parseRoute(paths.sale(id))).toEqual({ screen: "items", saleId: id });
    expect(parseRoute(paths.sort(id))).toEqual({ screen: "sort", saleId: id });
    expect(parseRoute(paths.progress(id))).toEqual({ screen: "progress", saleId: id });
    expect(parseRoute(paths.capture(id))).toEqual({ screen: "capture", saleId: id });
    expect(parseRoute(paths.item(id, `${id}_p1_3`))).toEqual({ screen: "item", saleId: id, itemId: `${id}_p1_3` });
  });

  it("tolerates a trailing slash and calls everything else 'other'", () => {
    expect(parseRoute(`${paths.sale(id)}/`).screen).toBe("items");
    expect(parseRoute(paths.summary())).toEqual({ screen: "summary" });
    expect(parseRoute("/estate-sale-planner/sheet/0f8c1a52-7d3e-4c1b-9a51-2b6f0e4d9c11")).toEqual({ screen: "sheet" });
    expect(parseRoute(`${paths.sale(id)}/photos`).screen).toBe("other");
    expect(parseRoute("/etsy-listing-kit").screen).toBe("other");
  });
});

describe("tabs", () => {
  it("lights Items for an open item and nothing for the camera flows", () => {
    expect(tabFor("item")).toBe("items");
    expect(tabFor("new")).toBeNull();
    expect(tabFor("capture")).toBeNull();
    expect(tabFor("progress")).toBe("progress");
  });

  it("lights Sell list for the sell list, and nothing for a shared sheet", () => {
    expect(tabFor("summary")).toBe("sell");
    expect(tabFor("sheet")).toBeNull();
  });

  it("points the camera at the sale in context, else at a new sale", () => {
    expect(cameraTarget(id)).toBe(paths.capture(id));
    expect(cameraTarget(undefined)).toBe(paths.newSale());
  });
});

describe("chromeFor", () => {
  it("says where you are on every screen, with Back everywhere but Home", () => {
    expect(chromeFor({ screen: "home" })).toEqual({ title: "Estate Sale Planner" });
    expect(chromeFor({ screen: "items", saleId: id }, "Mom's house")).toEqual({ eyebrow: "Mom's house", title: "Items", back: paths.home() });
    expect(chromeFor({ screen: "sort", saleId: id }, "")).toMatchObject({ eyebrow: "Untitled sale", title: "Sort", back: paths.sale(id) });
    expect(chromeFor({ screen: "item", saleId: id, itemId: "x" }, "Mom's house", "Spinet cabinet").title).toBe("Spinet cabinet");
    expect(chromeFor({ screen: "item", saleId: id, itemId: "x" }, "Mom's house").title).toBe("Item");
    expect(chromeFor({ screen: "new" })).toMatchObject({ eyebrow: "New sale", back: paths.home() });
  });

  it("names the sell list and the shared sheet, with Back to the sale in context when there is one", () => {
    expect(chromeFor({ screen: "summary" }, "Mom's house", undefined, id)).toEqual({ eyebrow: "Mom's house", title: "Sell list", back: paths.sale(id) });
    expect(chromeFor({ screen: "summary" })).toMatchObject({ title: "Sell list", back: paths.home() });
    expect(chromeFor({ screen: "sheet" })).toEqual({ eyebrow: "Estate Sale Planner", title: "Sell Sheet", back: paths.home() });
  });
});

describe("pickPhotos", () => {
  const file = (name: string, type: string) => new File(["x"], name, { type });

  it("keeps only images, in order, within the budget", () => {
    const files = [file("a.jpg", "image/jpeg"), file("clip.mov", "video/quicktime"), file("b.heic", "image/heic")];
    expect(pickPhotos(files).map((f) => f.name)).toEqual(["a.jpg", "b.heic"]);
    expect(pickPhotos(Array.from({ length: 60 }, (_, i) => file(`${i}.jpg`, "image/jpeg")))).toHaveLength(48);
  });
});
