/**
 * The app's URLs and the chrome each one gets (round 05a). One place decides
 * what the top bar says, which tab is lit, and whether the tab bar shows, so
 * the shell layout is a lookup and the pages stay about their content.
 *
 * Founder, 2026-10-15: "no persistent nav - can't really tell where I am in
 * the app."
 */

export const APP_ROOT = "/estate-sale-planner";

export const paths = {
  home: () => APP_ROOT,
  newSale: () => `${APP_ROOT}/new`,
  sale: (id: string) => `${APP_ROOT}/sales/${id}`,
  sort: (id: string) => `${APP_ROOT}/sales/${id}/sort`,
  progress: (id: string) => `${APP_ROOT}/sales/${id}/progress`,
  capture: (id: string) => `${APP_ROOT}/sales/${id}/capture`,
  item: (id: string, itemId: string) => `${APP_ROOT}/sales/${id}/items/${itemId}`,
  summary: () => `${APP_ROOT}/summary`,
} as const;

export type Screen = "home" | "new" | "items" | "sort" | "progress" | "capture" | "item" | "summary" | "sheet" | "other";

export interface RouteInfo {
  screen: Screen;
  saleId?: string;
  itemId?: string;
}

/** Which screen a pathname is, and the ids in it. Trailing slashes are tolerated. */
export function parseRoute(pathname: string): RouteInfo {
  const rel = pathname.startsWith(APP_ROOT) ? pathname.slice(APP_ROOT.length) : null;
  if (rel === null) return { screen: "other" };
  const parts = rel.split("/").filter(Boolean);
  if (parts.length === 0) return { screen: "home" };
  if (parts[0] === "new" && parts.length === 1) return { screen: "new" };
  if (parts[0] === "summary" && parts.length === 1) return { screen: "summary" };
  if (parts[0] === "sheet" && parts.length === 2) return { screen: "sheet" };
  if (parts[0] !== "sales" || !parts[1]) return { screen: "other" };
  const saleId = parts[1];
  if (parts.length === 2) return { screen: "items", saleId };
  if (parts.length === 3 && (parts[2] === "sort" || parts[2] === "progress" || parts[2] === "capture")) {
    return { screen: parts[2], saleId };
  }
  if (parts.length === 4 && parts[2] === "items") return { screen: "item", saleId, itemId: parts[3] };
  return { screen: "other" };
}

export type Tab = "home" | "items" | "sort" | "progress";

/** The lit tab. An open item lights Items (it is where you came from); camera flows light none. */
export function tabFor(screen: Screen): Tab | null {
  switch (screen) {
    case "home":
      return "home";
    case "items":
    case "item":
      return "items";
    case "sort":
      return "sort";
    case "progress":
    case "summary":
      return "progress";
    default:
      return null;
  }
}

export interface Chrome {
  /** Small caps above the title — the sale's name, or what kind of thing this is. */
  eyebrow?: string;
  /** Where you are, in one or two words. The page body keeps its own h1. */
  title: string;
  /** Where Back goes; absent on Home. */
  back?: string;
}

export const APP_NAME = "Estate Sale Planner";

/**
 * What the top bar shows for a route. `saleName` and `itemName` are optional — the bar still reads without them.
 * `contextSaleId` is the sale the shell has in context, for screens whose URL carries none (the sell list).
 */
export function chromeFor(route: RouteInfo, saleName?: string, itemName?: string, contextSaleId?: string): Chrome {
  const sale = saleName?.trim() || "Untitled sale";
  switch (route.screen) {
    case "home":
      return { title: APP_NAME };
    case "new":
      return { eyebrow: "New sale", title: "Photograph a room", back: paths.home() };
    case "items":
      return { eyebrow: sale, title: "Items", back: paths.home() };
    case "sort":
      return { eyebrow: sale, title: "Sort", back: paths.sale(route.saleId!) };
    case "progress":
      return { eyebrow: sale, title: "Progress", back: paths.sale(route.saleId!) };
    case "capture":
      return { eyebrow: sale, title: "Add a room", back: paths.sale(route.saleId!) };
    case "item":
      return { eyebrow: sale, title: itemName?.trim() || "Item", back: paths.sale(route.saleId!) };
    case "summary":
      return { eyebrow: sale, title: "Sell list", back: contextSaleId ? paths.progress(contextSaleId) : paths.home() };
    case "sheet":
      return { eyebrow: APP_NAME, title: "Sell Sheet", back: paths.home() };
    default:
      return { title: APP_NAME, back: paths.home() };
  }
}

/** Where the center camera button goes: add a room to the sale in context, else start a sale. */
export function cameraTarget(saleId?: string): string {
  return saleId ? paths.capture(saleId) : paths.newSale();
}
