export const HUB_GA_MEASUREMENT_ID = "G-120M120GDY";
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
  return (
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || HUB_GA_MEASUREMENT_ID
  );
}

export function isAnalyticsEnabled() {
  return Boolean(getHubGaMeasurementId());
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
    surface_name: "BHD Labs",
    surface_type: "hub",
  };
}

export function trackEvent(
  eventName: string,
  params: AnalyticsEventParams = {},
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

export function trackPageView(
  pathnameOrParams: string | AnalyticsEventParams,
) {
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
