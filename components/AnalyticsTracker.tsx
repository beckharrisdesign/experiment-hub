"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getAnalyticsDataFromElement,
  trackEvent,
  trackPageView,
} from "@/lib/analytics/ga";

function handleDocumentClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const trackedElement = target.closest("[data-analytics-event]");
  if (!(trackedElement instanceof HTMLElement)) {
    return;
  }

  const analyticsData = getAnalyticsDataFromElement(trackedElement);
  if (!analyticsData.eventName) {
    return;
  }

  trackEvent(analyticsData.eventName, analyticsData.params);
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    trackPageView(pagePath);
  }, [pathname, searchParams]);

  useEffect(() => {
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return null;
}
