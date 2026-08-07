export const HUB_GA_MEASUREMENT_ID = "G-120M120GDY";
// Google Ads accounts (conversion tracking) — configured alongside GA4 on the
// same gtag.js load; conversion labels live with the features that fire them.
//
// The hub account covers general BHD Labs traffic. Etsy Listing Kit runs its own
// standalone account so its ad spend and conversions stay separable from hub
// traffic — do NOT collapse these into one id.
export const GOOGLE_ADS_ID = "AW-10904266222";
export const ELK_GOOGLE_ADS_ID = "AW-277034089";

/** Every Ads account to `gtag('config', …)` on page load. */
export const GOOGLE_ADS_IDS = [GOOGLE_ADS_ID, ELK_GOOGLE_ADS_ID] as const;
export const GA_SCRIPT_SRC = "https://www.googletagmanager.com";
export const GA_COLLECT_SRC = "https://www.google-analytics.com";
export const GA_REGION_COLLECT_SRC = "https://region1.google-analytics.com";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsSurfaceType = "hub" | "landing" | "prototype";

export interface AnalyticsEventParams {
  experiment_slug?: string;
  experiment_id?: string;
  link_label?: string;
  cta_name?: string;
  page_path?: string;
  page_location?: string;
  page_title?: string;
  source_url?: string;
  surface_name?: string;
  surface_type?: AnalyticsSurfaceType;
  target_path?: string;
  target_url?: string;
  destination_url?: string;
  value?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface AnalyticsLinkMetadata extends AnalyticsEventParams {
  event: string;
}

export function getHubGaMeasurementId() {
  return process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || HUB_GA_MEASUREMENT_ID;
}

export function isOptedOut() {
  try {
    return window.localStorage.getItem("analytics_optout") === "true";
  } catch {
    return false;
  }
}

export function isAnalyticsEnabled() {
  return Boolean(getHubGaMeasurementId()) && !isOptedOut();
}

interface SurfaceDescriptor {
  surface_name: string;
  surface_type: AnalyticsSurfaceType;
  experiment_slug?: string;
}

const HUB_SURFACE: SurfaceDescriptor = {
  surface_name: "BHD Labs",
  surface_type: "hub",
};

/**
 * Experiments that live inside the hub app but are their own product surface.
 * Without an entry here their pageviews report as generic "BHD Labs" hub
 * traffic, so per-experiment funnels and ad-campaign traffic can't be separated
 * from ordinary hub browsing in GA4. Longest-prefix wins, so a nested
 * experiment route can override a parent.
 */
const EXPERIMENT_SURFACES: ReadonlyArray<readonly [string, SurfaceDescriptor]> = [
  [
    "/etsy-listing-kit",
    {
      surface_name: "Etsy Listing Kit",
      surface_type: "landing",
      experiment_slug: "etsy-listing-kit",
    },
  ],
];

/** Map a pathname to the surface that owns it (query string ignored). */
export function resolveSurface(pathname: string): SurfaceDescriptor {
  const path = pathname.split(/[?#]/)[0];
  const matches = EXPERIMENT_SURFACES.filter(
    ([prefix]) => path === prefix || path.startsWith(`${prefix}/`),
  ).sort((a, b) => b[0].length - a[0].length);

  return matches.length ? matches[0][1] : HUB_SURFACE;
}

export function buildPageViewPayload(pathname: string): AnalyticsEventParams {
  const title =
    typeof document !== "undefined" ? document.title || undefined : undefined;
  const location =
    typeof window !== "undefined"
      ? new URL(pathname, window.location.origin).toString()
      : undefined;

  return {
    page_path: pathname,
    page_location: location,
    page_title: title,
    ...resolveSurface(pathname),
  };
}

export function trackEvent(
  eventName: string,
  params: AnalyticsEventParams = {},
) {
  if (
    typeof window === "undefined" ||
    typeof window.gtag !== "function" ||
    isOptedOut()
  ) {
    return;
  }

  window.gtag("event", eventName, params);
}

export function trackPageView(pathnameOrParams: string | AnalyticsEventParams) {
  const params =
    typeof pathnameOrParams === "string"
      ? buildPageViewPayload(pathnameOrParams)
      : pathnameOrParams;

  trackEvent("page_view", params);
}

export function trackLinkInteraction(metadata: AnalyticsLinkMetadata) {
  const { event, ...params } = metadata;
  trackEvent(event, params);
}

export function getAnalyticsDataset(element: HTMLElement) {
  return { ...element.dataset };
}

function toSnakeCase(value: string) {
  return value
    .replace(/^[A-Z]/, (match) => match.toLowerCase())
    .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function normalizeAnalyticsParamKey(key: string) {
  switch (key) {
    case "surface":
      return "surface_name";
    case "label":
      return "link_label";
    case "link_label":
      return "link_label";
    case "target":
      return "target_path";
    case "destination":
      return "destination_url";
    case "experiment":
      return "experiment_slug";
    default:
      return key;
  }
}

export function getAnalyticsDataFromElement(element: HTMLElement) {
  const dataset = getAnalyticsDataset(element);
  const eventName = dataset.analyticsEvent;
  const params: AnalyticsEventParams = {};

  Object.entries(dataset).forEach(([key, value]) => {
    if (!value || key === "analyticsEvent" || !key.startsWith("analytics")) {
      return;
    }

    const rawKey = key.slice("analytics".length);
    const normalizedKey = normalizeAnalyticsParamKey(toSnakeCase(rawKey));
    params[normalizedKey] = value;
  });

  if (!params.source_url && typeof window !== "undefined") {
    params.source_url = window.location.href;
  }

  if (element instanceof HTMLAnchorElement) {
    const href = element.getAttribute("href");
    if (href) {
      if (/^https?:\/\//.test(href)) {
        params.target_url = params.target_url ?? href;
      } else {
        params.target_path = params.target_path ?? href;
      }
    }
  }

  return {
    eventName,
    params,
  };
}
