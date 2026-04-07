export interface HostedCaptureUrls {
  launcherUrl: string;
  captureScriptUrl: string;
  bookmarkletLoaderUrl: string;
}

const DEFAULT_LOADER_PATH = "/scripts/web-to-figma-grabber-loader.js";
const DEFAULT_BOOKMARKLET_LOADER_PATH = "/scripts/web-to-figma-grabber-bookmarklet.js";
const DEFAULT_CAPTURE_PATH = "/lib/capture.js";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Resolve canonical hosted URLs for script-first capture.
 */
export function getHostedCaptureUrls(origin: string): HostedCaptureUrls {
  const cleanOrigin = stripTrailingSlash(origin);
  return {
    launcherUrl: `${cleanOrigin}${DEFAULT_LOADER_PATH}`,
    captureScriptUrl: `${cleanOrigin}${DEFAULT_CAPTURE_PATH}`,
    bookmarkletLoaderUrl: `${cleanOrigin}${DEFAULT_BOOKMARKLET_LOADER_PATH}`,
  };
}

/**
 * Build a bookmarklet that injects the hosted launcher.
 */
export function buildLauncherBookmarklet(
  launcherUrl: string,
): string {
  const escapedLauncherUrl = launcherUrl.replace(/"/g, '\\"');
  return `javascript:(function(){var s=document.createElement("script");s.src="${escapedLauncherUrl}?v="+Date.now();s.async=true;document.head.appendChild(s);})();`;
}

/**
 * Build a one-line console snippet for visible picker-overlay capture.
 */
export function createOneClickClipboardSnippet(
  launcherUrl: string,
): string {
  const escapedLauncherUrl = launcherUrl.replace(/"/g, '\\"');
  return `(function(){window.__FIGMA_CAPTURE_CONFIG={mode:"clipboard",usePickerOverlay:true,verbose:true};var s=document.createElement("script");s.src="${escapedLauncherUrl}";s.async=true;document.head.appendChild(s);})();`;
}
