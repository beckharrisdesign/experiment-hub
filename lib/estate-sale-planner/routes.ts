/**
 * The app's URLs and the chrome each one gets (round 05a). One place decides
 * what the breadcrumb says, which tab is lit, and whether the tab bar shows, so
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
  photo: (id: string, itemId: string) => `${APP_ROOT}/sales/${id}/items/${itemId}/photo`,
  summary: () => `${APP_ROOT}/summary`,
} as const;

export type Screen = "home" | "new" | "items" | "sort" | "progress" | "capture" | "item" | "photo" | "summary" | "sheet" | "other";

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
  if (parts.length === 5 && parts[2] === "items" && parts[4] === "photo") return { screen: "photo", saleId, itemId: parts[3] };
  return { screen: "other" };
}

export type Tab = "home" | "items" | "sort" | "progress" | "sell";

/** The lit tab. An open item lights Items (it is where you came from); camera flows light none. */
export function tabFor(screen: Screen): Tab | null {
  switch (screen) {
    case "home":
      return "home";
    case "items":
    case "item":
    case "photo":
      return "items";
    case "sort":
      return "sort";
    case "progress":
      return "progress";
    case "summary":
      return "sell";
    default:
      return null;
  }
}

export interface Crumb {
  label: string;
  href: string;
}

/**
 * The header is a breadcrumb (sold-comps design D11; founder, 2026-10-27: "just do a simple
 * breadcrumb style header and let that function as the back button too"). Every ancestor is a
 * link; the last one is Back, so there is no separate Back button.
 */
export interface Chrome {
  /** Ancestors, root first. Empty on Home. */
  crumbs: Crumb[];
  /** The current page, last in the trail. */
  title: string;
  /** The last crumb's href — where Back goes. Absent on Home. */
  back?: string;
}

export const APP_NAME = "Estate Sale Planner";

/**
 * What the top bar shows for a route. `saleName` and `itemName` are optional — the bar still reads without them.
 * `contextSaleId` is the sale the shell has in context, for screens whose URL carries none (the sell list).
 */
export function chromeFor(route: RouteInfo, saleName?: string, itemName?: string, contextSaleId?: string): Chrome {
  const sale = saleName?.trim() || "Untitled sale";
  const home: Crumb = { label: "Home", href: paths.home() };
  const trail = (title: string, crumbs: Crumb[]): Chrome => ({ title, crumbs, ...(crumbs.length ? { back: crumbs[crumbs.length - 1].href } : {}) });
  const inSale = (id: string): Crumb[] => [home, { label: sale, href: paths.sale(id) }];
  const item = itemName?.trim() || "Item";
  switch (route.screen) {
    case "home":
      return trail(APP_NAME, []);
    case "new":
      return trail("Take photos", [home]);
    case "items":
      return trail(sale, [home]);
    case "sort":
      return trail("Sort", inSale(route.saleId!));
    case "progress":
      return trail("Progress", inSale(route.saleId!));
    case "capture":
      return trail("Add photos", inSale(route.saleId!));
    case "item":
      return trail(item, inSale(route.saleId!));
    case "photo":
      return trail("Source photo", [...inSale(route.saleId!), { label: item, href: paths.item(route.saleId!, route.itemId!) }]);
    case "summary":
      return trail("Sell list", contextSaleId ? inSale(contextSaleId) : [home]);
    case "sheet":
      return trail("Sell Sheet", [home]);
    default:
      return trail(APP_NAME, [home]);
  }
}

/** Where the center camera button goes: add photos to the sale in context, else start a sale. */
export function cameraTarget(saleId?: string): string {
  return saleId ? paths.capture(saleId) : paths.newSale();
}
