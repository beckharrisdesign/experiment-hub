export interface HostedCaptureUrls {
  launcherUrl: string;
  captureScriptUrl: string;
}

export interface LauncherBookmarkletOptions {
  mode?: "clipboard" | "file";
  selector?: string;
  delayMs?: number;
  verbose?: boolean;
  endpoint?: string;
  captureId?: string;
}

const DEFAULT_LOADER_PATH = "/lib/figma-capture-launcher.js";
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
  };
}

/**
 * Build a bookmarklet that injects the hosted launcher and optional config.
 */
export function buildLauncherBookmarklet(
  launcherUrl: string,
  options: LauncherBookmarkletOptions = {},
): string {
  const config = JSON.stringify({
    mode: options.mode ?? "clipboard",
    selector: options.selector ?? "body",
    delayMs: typeof options.delayMs === "number" ? options.delayMs : 0,
    verbose: options.verbose ?? true,
    endpoint: options.endpoint,
    captureId: options.captureId,
  });
  const escapedLauncherUrl = launcherUrl.replace(/"/g, '\\"');
  const escapedConfig = config.replace(/"/g, '\\"');

  return `javascript:(function(){window.__FIGMA_CAPTURE_CONFIG=${escapedConfig};var s=document.createElement("script");s.src="${escapedLauncherUrl}?v="+Date.now();s.async=true;document.head.appendChild(s);})();`;
}
