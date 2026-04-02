const crypto = require("crypto");

const STATIC_FILE_EXTENSIONS =
  /\.(?:png|jpe?g|webp|gif|svg|ico|pdf|xml|txt|json|css|js|map|woff2?|ttf|eot)$/i;

const BLOCKED_PATH_PREFIXES = ["/api/", "/_next/", "/static/"];

function canonicalizeUrl(baseUrl, candidate, options = {}) {
  const { keepQuery = false } = options;

  try {
    const resolved = new URL(candidate, baseUrl);

    if (!["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }

    resolved.hash = "";
    if (!keepQuery) {
      resolved.search = "";
    }

    if (resolved.pathname !== "/" && resolved.pathname.endsWith("/")) {
      resolved.pathname = resolved.pathname.slice(0, -1);
    }

    return resolved.toString();
  } catch {
    return null;
  }
}

function isCrawlableUrl(url, baseUrl) {
  try {
    const candidate = new URL(url);
    const base = new URL(baseUrl);

    if (candidate.origin !== base.origin) {
      return false;
    }

    if (!["http:", "https:"].includes(candidate.protocol)) {
      return false;
    }

    if (
      BLOCKED_PATH_PREFIXES.some((prefix) => candidate.pathname.startsWith(prefix))
    ) {
      return false;
    }

    if (STATIC_FILE_EXTENSIONS.test(candidate.pathname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function toScreenshotFileName(url) {
  const parsed = new URL(url);
  const trimmed = parsed.pathname.replace(/^\/+|\/+$/g, "");
  const normalized = trimmed.length > 0 ? trimmed : "index";
  const queryHash = parsed.search
    ? `__q${crypto
        .createHash("sha1")
        .update(parsed.search)
        .digest("hex")
        .slice(0, 8)}`
    : "";

  return `${normalized.replace(/\//g, "__")}${queryHash}.png`;
}

function toNodeLabel(url, title) {
  if (title && title.trim()) {
    return title.trim();
  }

  const { pathname } = new URL(url);
  if (pathname === "/") {
    return "Home";
  }

  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[-_]/g, " "))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ");
}

module.exports = {
  canonicalizeUrl,
  isCrawlableUrl,
  toScreenshotFileName,
  toNodeLabel,
};
